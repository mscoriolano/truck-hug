import { createClient } from "npm:@supabase/supabase-js@2";
import { gunzipSync, strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { authenticateSync } from "../_shared/request-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ XML helpers ============
function parseXmlValue(xml: string, tagName: string): string | null {
  const tagRegex = new RegExp(`<${tagName}(?: [^>]*)?>([^<]*)</${tagName}>`, "i");
  const tagMatch = tagRegex.exec(xml);
  if (tagMatch && tagMatch[1] !== undefined) {
    const val = tagMatch[1].trim();
    return val.length > 0 ? val : null;
  }
  return null;
}

function parseXmlAttribute(elementXml: string, attrName: string): string | null {
  const regex = new RegExp(`${attrName}=["']([^"']*)["']`, "i");
  const match = regex.exec(elementXml);
  return match ? match[1] : null;
}

function parseXmlFloat(xml: string, tagName: string): number | null {
  const val = parseXmlValue(xml, tagName);
  if (!val) return null;
  const num = parseFloat(val.replace(",", "."));
  return isNaN(num) ? null : num;
}

function parseXmlInt(xml: string, tagName: string): number | null {
  const val = parseXmlValue(xml, tagName);
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function parseCoordinates(coordStr: string | null): number | null {
  if (!coordStr) return null;
  const cleaned = coordStr.trim().replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseBrazilianDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
  }
  try {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***MASKED***</senha>");
}

function buildTelemetryRequestXml(user: string, pass: string, options?: { veiID?: string; mId?: number }): string {
  let inner = "";
  if (options?.veiID) {
    inner += `\n    <veiID>${escapeXml(options.veiID)}</veiID>`;
  }
  if (options?.mId && options.mId > 0) {
    inner += `\n    <mId>${options.mId}</mId>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(pass)}</senha>${inner}
</RequestMensagemCB>`;
}

function decodeTrucksControlBody(bytes: Uint8Array): { text: string; wasZip: boolean } {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const nameLen = bytes[26] | (bytes[27] << 8);
      const extraLen = bytes[28] | (bytes[29] << 8);
      const dataStart = 30 + nameLen + extraLen;
      const compression = bytes[8] | (bytes[9] << 8);

      if (compression === 8) {
        return { text: strFromU8(pako.inflateRaw(bytes.slice(dataStart)) as Uint8Array), wasZip: true };
      }
      if (compression === 0) {
        return { text: strFromU8(bytes.slice(dataStart)), wasZip: true };
      }
    } catch {
      // Fallback
    }
    try {
      return { text: strFromU8(gunzipSync(bytes)), wasZip: true };
    } catch {
      // Continua fallback para texto bruto
    }
  }
  return { text: strFromU8(bytes), wasZip: false };
}

// ============ Handler de Execução ============
const handler = async (input: { veiID?: string; debug?: boolean } = {}): Promise<Response> => {
  const FETCH_TIMEOUT_MS = 110_000;
  const MAX_RETRIES = 0;

  try {
    const debugEnabled = Boolean(input.debug);

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Configuração ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============ Busca último mId ============
    let lastMld = 1;
    const { data: mldData } = await supabase
      .from("vehicle_telemetry")
      .select("last_mld")
      .not("last_mld", "is", null)
      .order("last_mld", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mldData?.last_mld) {
      const parsed = Number(mldData.last_mld);
      if (Number.isInteger(parsed) && parsed > 0) lastMld = parsed;
    }

    console.log(`[truckscontrol-telemetry] start mId=${lastMld}`);

    const xmlRequest = buildTelemetryRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, {
      veiID: input.veiID,
      mId: lastMld,
    });

    if (debugEnabled) {
      console.log("[truckscontrol-telemetry] XML REQUEST:");
      console.log(maskPasswordInXml(xmlRequest));
    }

    // ============ Fetch ============
    let responseText = "";
    let fetchSuccess = false;
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch("https://webservice.newrastreamentoonline.com.br", {
          method: "POST",
          headers: { "Content-Type": "text/xml", "User-Agent": "Mozilla/5.0" },
          body: xmlRequest,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const decoded = decodeTrucksControlBody(bytes);
        responseText = decoded.text;

        console.log(`[truckscontrol-telemetry] HTTP ${response.status} bytes=${bytes.length} zip=${decoded.wasZip}`);
        fetchSuccess = true;
        break;
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[truckscontrol-telemetry] tentativa ${attempt + 1} falhou: ${lastError}`);
      }
    }

    if (!fetchSuccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha ao consultar TrucksControl: ${lastError}`,
          timestamp: new Date().toISOString(),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (debugEnabled) {
      console.log("[truckscontrol-telemetry] XML RESPONSE (preview 1500 chars):");
      console.log(responseText.substring(0, 1500));
    }

    // ============ Verificação de Erro na Resposta ============
    const codigoErro = parseXmlValue(responseText, "codigo");
    const msgErro = parseXmlValue(responseText, "msg");
    if (codigoErro && codigoErro !== "0") {
      const errorMsg = `Erro TrucksControl (${codigoErro}): ${msgErro || "Sem descrição"}`;
      console.error(`[truckscontrol-telemetry] API retornou erro: ${errorMsg}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
          codigo: codigoErro,
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ Parse das Mensagens ============
    const messageRegex = /<item\s+mId="([^"]+)"[^>]*>([\s\S]*?)<\/item>/gi;
    const messageNodes: Array<{ mId: string; content: string }> = [];
    let match;
    while ((match = messageRegex.exec(responseText)) !== null) {
      messageNodes.push({ mId: match[1], content: match[2] });
    }

    // Fallback para tags simples <mensagem> ou <item> sem mId
    if (messageNodes.length === 0) {
      const fallbackRegex = /<(?:item|mensagem)[^>]*>([\s\S]*?)<\/(?:item|mensagem)>/gi;
      let fMatch;
      while ((fMatch = fallbackRegex.exec(responseText)) !== null) {
        const mId = parseXmlValue(fMatch[1], "mId") || "0";
        messageNodes.push({ mId, content: fMatch[1] });
      }
    }

    console.log(`[truckscontrol-telemetry] Mensagens parseadas: ${messageNodes.length}`);

    if (messageNodes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          messagesReceived: 0,
          telemetryUpdated: 0,
          message: "Nenhuma nova mensagem de telemetria.",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ Busca Veículos e Motoristas do Banco ============
    const { data: dbVehicles } = await supabase.from("vehicles").select("id, plate, truckscontrol_id");
    const { data: dbDrivers } = await supabase.from("drivers").select("id, name, cpf, truckscontrol_id");
    const { data: geofenceZones } = await supabase.from("geofence_zones").select("*");

    const vehicleByPlate = new Map((dbVehicles || []).map((v) => [v.plate.toUpperCase().trim(), v]));
    const vehicleByTcId = new Map(
      (dbVehicles || []).filter((v) => v.truckscontrol_id).map((v) => [String(v.truckscontrol_id), v]),
    );

    const driverByTcId = new Map(
      (dbDrivers || []).filter((d) => d.truckscontrol_id).map((d) => [String(d.truckscontrol_id), d]),
    );
    const driverByName = new Map((dbDrivers || []).map((d) => [d.name.toLowerCase().trim(), d]));

    // ============ Processamento das Mensagens ============
    let telemetryUpdated = 0;
    let alertsCreated = 0;
    let journeyEventsCreated = 0;
    let behaviorEventsCreated = 0;
    let driversLinked = 0;
    let complianceUpdated = 0;
    let maxMldReceived = lastMld;

    const telemetryRows: any[] = [];
    const historyRows: any[] = [];
    const alerts: any[] = [];
    const journeyEvents: any[] = [];
    const behaviorEvents: any[] = [];
    const complianceUpdates: any[] = [];

    // Agrupa mensagens por veículo para atualizar a posição mais recente
    const latestByVehicle = new Map<string, any>();

    for (const node of messageNodes) {
      const xml = node.content;
      const mIdNum = Number(node.mId);
      if (Number.isInteger(mIdNum) && mIdNum > maxMldReceived) {
        maxMldReceived = mIdNum;
      }

      const veiID = parseXmlValue(xml, "veiID");
      const placa = parseXmlValue(xml, "placa")?.toUpperCase().trim();
      const dtStr = parseXmlValue(xml, "dt");
      const dt = parseBrazilianDate(dtStr);

      const lat = parseCoordinates(parseXmlValue(xml, "lat")) ?? 0;
      const lon = parseCoordinates(parseXmlValue(xml, "lon")) ?? 0;
      const vel = parseXmlFloat(xml, "vel") ?? 0;
      const rpm = parseXmlInt(xml, "rpm");
      const odm = parseXmlFloat(xml, "odm");
      const ignStr = parseXmlValue(xml, "ign");
      const ign = ignStr === "1" || ignStr?.toLowerCase() === "true" || ignStr?.toLowerCase() === "sim";
      const horimetro = parseXmlFloat(xml, "hor");
      const tensao = parseXmlFloat(xml, "ten");
      const temperatura = parseXmlFloat(xml, "temp");
      const direcao = parseXmlInt(xml, "dir");
      const locationName = parseXmlValue(xml, "des") || parseXmlValue(xml, "loc");

      // Identifica veículo
      let vehicle = placa ? vehicleByPlate.get(placa) : null;
      if (!vehicle && veiID) {
        vehicle = vehicleByTcId.get(veiID);
      }
      if (!vehicle) continue;

      // Identifica motorista
      const motID = parseXmlValue(xml, "motID");
      const motNome = parseXmlValue(xml, "motNome") || parseXmlValue(xml, "mot");
      let driver = motID ? driverByTcId.get(motID) : null;
      if (!driver && motNome) {
        driver = driverByName.get(motNome.toLowerCase().trim());
      }
      const driverId = driver?.id || null;
      const driverName = driver?.name || motNome || null;

      if (driverId) driversLinked++;

      // Histórico de telemetria
      historyRows.push({
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        driver_id: driverId,
        driver_name: driverName,
        latitude: lat,
        longitude: lon,
        speed: vel,
        rpm: rpm,
        odometer: odm,
        ignition_on: ign,
        engine_hours: horimetro,
        battery_voltage: tensao,
        engine_temp: temperatura,
        direction: direcao,
        location_name: locationName,
        gps_timestamp: dt || new Date().toISOString(),
        raw_data: { mId: node.mId, veiID, motID, motNome },
      });

      // Posição mais recente por veículo
      const existingLatest = latestByVehicle.get(vehicle.id);
      if (
        !existingLatest ||
        (dt && (!existingLatest.gps_timestamp || new Date(dt) > new Date(existingLatest.gps_timestamp)))
      ) {
        latestByVehicle.set(vehicle.id, {
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          truckscontrol_id: veiID || vehicle.truckscontrol_id,
          latitude: lat,
          longitude: lon,
          speed: vel,
          rpm: rpm,
          odometer: odm,
          ignition_on: ign,
          engine_hours: horimetro,
          battery_voltage: tensao,
          engine_temp: temperatura,
          direction: direcao,
          location_name: locationName,
          last_mld: node.mId,
          gps_timestamp: dt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 🚦 Eventos de Comportamento e Alertas
      if (vel > 90) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "speeding",
          severity: vel > 110 ? "critical" : "warning",
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          speed: vel,
          rpm: rpm,
          event_timestamp: dt || new Date().toISOString(),
          details: { speed: vel, limit: 90 },
        });

        alerts.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          alert_type: "speeding",
          severity: vel > 110 ? "critical" : "warning",
          title: `Excesso de velocidade: ${vel} km/h`,
          message: `Veículo ${vehicle.plate} atingiu ${vel} km/h (limite: 90 km/h)${locationName ? ` em ${locationName}` : ""}`,
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      if (rpm && rpm > 2200) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "high_rpm",
          severity: rpm > 2600 ? "critical" : "warning",
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          speed: vel,
          rpm: rpm,
          event_timestamp: dt || new Date().toISOString(),
          details: { rpm, limit: 2200 },
        });
      }

      // Alertas nativos do XML da TrucksControl
      const aleStr = parseXmlValue(xml, "ale");
      const aleDesc = parseXmlValue(xml, "aleDesc") || parseXmlValue(xml, "aleDes");
      if (aleStr && aleStr !== "0") {
        alerts.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          alert_type: "tracker_alert",
          severity: "warning",
          title: aleDesc || `Alerta do rastreador: código ${aleStr}`,
          message: `Alerta código ${aleStr} recebido para ${vehicle.plate}${locationName ? ` em ${locationName}` : ""}`,
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      // ⏱️ Eventos de Jornada
      const jorStr = parseXmlValue(xml, "jor");
      const tfrID = parseXmlValue(xml, "tfrID");
      if (driverId && (jorStr || tfrID)) {
        journeyEvents.push({
          driver_id: driverId,
          vehicle_id: vehicle.id,
          event_type: jorStr || tfrID || "telemetry_ping",
          timestamp: dt || new Date().toISOString(),
          location: locationName || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          raw_data: { jor: jorStr, tfrID, mId: node.mId },
        });
      }

      // 🗺️ Geofencing
      if (lat !== 0 && lon !== 0 && geofenceZones && geofenceZones.length > 0) {
        for (const zone of geofenceZones) {
          const distance = haversineDistance(lat, lon, Number(zone.latitude), Number(zone.longitude));
          const isInside = distance <= zone.radius_meters;

          if (!isInside && zone.alert_on_exit && zone.zone_type === "allowed") {
            behaviorEvents.push({
              vehicle_id: vehicle.id,
              vehicle_plate: vehicle.plate,
              driver_id: driverId,
              driver_name: driverName,
              event_type: "geofence_exit",
              severity: "warning",
              latitude: lat,
              longitude: lon,
              location_name: locationName,
              speed: vel,
              details: { zone_name: zone.name, distance_m: Math.round(distance), radius_m: zone.radius_meters },
              event_timestamp: dt || new Date().toISOString(),
            });

            alerts.push({
              vehicle_id: vehicle.id,
              vehicle_plate: vehicle.plate,
              driver_id: driverId,
              driver_name: driverName,
              alert_type: "geofence_violation",
              severity: "warning",
              title: `Fora da zona: ${zone.name}`,
              message: `Veículo ${vehicle.plate} saiu da zona "${zone.name}" (${Math.round(distance)}m do centro)${locationName ? ` - ${locationName}` : ""}`,
              latitude: lat,
              longitude: lon,
              location_name: locationName,
              event_timestamp: dt || new Date().toISOString(),
            });
          }

          if (isInside && zone.alert_on_enter && zone.zone_type === "restricted") {
            behaviorEvents.push({
              vehicle_id: vehicle.id,
              vehicle_plate: vehicle.plate,
              driver_id: driverId,
              driver_name: driverName,
              event_type: "geofence_enter_restricted",
              severity: "critical",
              latitude: lat,
              longitude: lon,
              location_name: locationName,
              speed: vel,
              details: { zone_name: zone.name, distance_m: Math.round(distance) },
              event_timestamp: dt || new Date().toISOString(),
            });

            alerts.push({
              vehicle_id: vehicle.id,
              vehicle_plate: vehicle.plate,
              driver_id: driverId,
              driver_name: driverName,
              alert_type: "geofence_violation",
              severity: "critical",
              title: `Zona restrita: ${zone.name}`,
              message: `Veículo ${vehicle.plate} entrou na área restrita "${zone.name}"${locationName ? ` - ${locationName}` : ""}`,
              latitude: lat,
              longitude: lon,
              location_name: locationName,
              event_timestamp: dt || new Date().toISOString(),
            });
          }
        }
      }
    }

    // ============ Persistência no Banco ============
    // 1. Atualiza vehicle_telemetry (última posição por veículo)
    for (const [vId, telRow] of latestByVehicle) {
      const { error: upsertErr } = await supabase.from("vehicle_telemetry").upsert(telRow, {
        onConflict: "vehicle_id",
      });
      if (!upsertErr) {
        telemetryUpdated++;
      } else {
        console.warn(`[truckscontrol-telemetry] erro upsert telemetry ${telRow.vehicle_plate}:`, upsertErr.message);
      }
    }

    // 2. Histórico de Telemetria em lote
    if (historyRows.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < historyRows.length; i += BATCH_SIZE) {
        const batch = historyRows.slice(i, i + BATCH_SIZE);
        await supabase.from("telemetry_history").insert(batch);
      }
    }

    // 3. Alertas
    if (alerts.length > 0) {
      const { error: alertErr } = await supabase.from("telemetry_alerts").insert(alerts);
      if (!alertErr) alertsCreated = alerts.length;
    }

    // 4. Comportamento
    if (behaviorEvents.length > 0) {
      const { error: behErr } = await supabase.from("driving_behavior_events").insert(behaviorEvents);
      if (!behErr) behaviorEventsCreated = behaviorEvents.length;
    }

    // 5. Jornada
    if (journeyEvents.length > 0) {
      const { error: jorErr } = await supabase.from("driver_journey_entries").insert(journeyEvents);
      if (!jorErr) journeyEventsCreated = journeyEvents.length;
    }

    console.log(
      `[truckscontrol-telemetry] Concluído: ${telemetryUpdated} veículos atualizados, ${alertsCreated} alertas, ${behaviorEventsCreated} comportamento, ${maxMldReceived} maxMld.`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        messagesReceived: messageNodes.length,
        telemetryUpdated,
        alertsCreated,
        journeyEventsCreated,
        behaviorEventsCreated,
        driversLinked,
        complianceUpdated,
        maxMld: maxMldReceived,
        message: `OK: ${messageNodes.length} mensagens. ${telemetryUpdated} veículos, ${journeyEventsCreated} jornada, ${alertsCreated} alertas, ${behaviorEventsCreated} comportamento, ${driversLinked} motoristas vinculados, ${complianceUpdated} compliance.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[truckscontrol-telemetry] unhandled error:", String(e));
    return new Response(
      JSON.stringify({
        success: false,
        error: String(e),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método inválido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    source?: string;
    veiID?: string;
    debug?: boolean;
  };

  if (body?.source === "cron") {
    const failure = authenticateCronRequest(req);
    if (failure) return failure;

    // Responde ao agendador em < 50ms (limite dele é 5 segundos)
    // e continua a busca na TrucksControl em segundo plano passando o body já em memória
    const task = handler(body)
      .then((res) => res.text())
      .then((t) => console.log("[truckscontrol-telemetry cron concluído]", t.slice(0, 200)))
      .catch((e) => console.error("[truckscontrol-telemetry cron erro]", String(e)));

    // @ts-ignore EdgeRuntime existe no ambiente da Cloud
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(task);
    } else {
      task.catch(console.error);
    }

    return new Response(JSON.stringify({ accepted: true, mode: "background" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Botão manual "Sincronizar" continua síncrono
  const failure = await authenticateSync(req);
  if (failure) return new Response("Unauthorized", { status: failure.status, headers: corsHeaders });
  return await handler(body);
});
