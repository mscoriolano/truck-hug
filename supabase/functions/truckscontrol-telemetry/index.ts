import { createClient } from "npm:@supabase/supabase-js@2";
import { gunzipSync, strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============ XML helpers ============
function parseXmlValue(xml: string, tagName: string): string | null {
  const tagRegex = new RegExp(`<${tagName}(?: [^>]*)?>([^<]*)</${tagName}>`, "i");
  const tagMatch = tagRegex.exec(xml);
  if (tagMatch && tagMatch[1]) return tagMatch[1].trim();
  return null;
}

function parseXmlArray(xml: string, itemTagName: string): string[] {
  const items: string[] = [];
  const regex = new RegExp(
    `<${itemTagName}[\\s\\S]*?<\\/${itemTagName}>|<${itemTagName}[^>]*\\/>`,
    "gi",
  );
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseCoordinate(val: string | null): number {
  if (!val) return 0;
  return parseFloat(val.replace(",", ".")) || 0;
}

function buildTelemetryRequestXml(user: string, password: string, opts?: { veiID?: string; mId?: number }): string {
  // IMPORTANTE: <mId> com I maiúsculo. Nunca null/undefined, default 1.
  let mIdValue = 1;
  if (opts?.mId) {
    const parsed = Number(opts.mId);
    if (Number.isInteger(parsed) && parsed > 0) mIdValue = parsed;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>
  <mId>${mIdValue}</mId>${opts?.veiID ? `\n  <veiID>${escapeXml(opts.veiID)}</veiID>` : ""}
</RequestMensagemCB>`;
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
}

// ============ Decompression ============
function looksLikeZip(bytes: Uint8Array): boolean { return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04; }
function looksLikeGzip(bytes: Uint8Array): boolean { return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b; }

function decodeTrucksControlBody(bytes: Uint8Array): { text: string; wasZip: boolean } {
  if (!bytes.length) return { text: "", wasZip: false };
  if (looksLikeZip(bytes)) {
    try {
      // ZIP: skip local file header, inflate raw
      const nameLen = bytes[26] | (bytes[27] << 8);
      const extraLen = bytes[28] | (bytes[29] << 8);
      const dataStart = 30 + nameLen + extraLen;
      const compression = bytes[8] | (bytes[9] << 8);
      if (compression === 8) {
        const out = pako.inflateRaw(bytes.slice(dataStart)) as Uint8Array;
        return { text: strFromU8(out), wasZip: true };
      }
      if (compression === 0) {
        return { text: strFromU8(bytes.slice(dataStart)), wasZip: true };
      }
    } catch (e) {
      console.error("[truckscontrol-telemetry] unzip failed", String(e));
    }
    return { text: "", wasZip: true };
  }
  if (looksLikeGzip(bytes)) {
    try { return { text: strFromU8(gunzipSync(bytes)), wasZip: true }; } catch { return { text: "", wasZip: true }; }
  }
  return { text: strFromU8(bytes), wasZip: false };
}

// ============ Journey macro mapping ============
const JOURNEY_MACRO_MAP: Record<string, string> = {
  "INICIO DE VIAGEM": "journey_start",
  "REINICIO DE VIAGEM": "journey_start",
  "FIM DE VIAGEM": "journey_end",
  "PARADA PARA DESCANSO": "rest_start",
  "FIM DE DESCANSO": "rest_end",
  "PARADA PARA REFEICAO": "meal_start",
  "PARADA PARA ALIMENTACAO": "meal_start",
  "FIM DE REFEICAO": "meal_end",
  "FIM DE ALIMENTACAO": "meal_end",
  "PARADA PARA ESPERA": "wait_start",
  "FIM DE ESPERA": "wait_end",
  "PARADA PARA PERNOITE": "overnight_start",
  "FIM DE PERNOITE": "overnight_end",
};

function mapMacroToEventType(dMac: string): string {
  const normalized = dMac.toUpperCase().trim().replace(/\s+/g, " ");
  // Try exact match first
  if (JOURNEY_MACRO_MAP[normalized]) return JOURNEY_MACRO_MAP[normalized];
  // Try partial match
  for (const [key, value] of Object.entries(JOURNEY_MACRO_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const FETCH_TIMEOUT_MS = 55_000;
  const MAX_RETRIES = 0; // sem retry - API lenta, timeout de 55s usa quase todo o tempo do edge function

  try {
    const input = await req.json().catch(() => ({}));
    const debugEnabled = Boolean(input.debug);

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Configuração ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // ============ Fetch com retry ============
    let responseText = "";
    let fetchSuccess = false;

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
        fetchSuccess = response.ok && responseText.length > 0;
        if (fetchSuccess) break;
      } catch (e) {
        console.error(`[truckscontrol-telemetry] attempt ${attempt + 1} error:`, String(e));
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    if (!fetchSuccess || !responseText) {
      return new Response(JSON.stringify({
        success: false,
        error: "Não foi possível obter dados da API TrucksControl",
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check API error
    if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
      const errMsg = parseXmlValue(responseText, "erro") || "Erro da API TrucksControl";
      const codigo = parseXmlValue(responseText, "codigo");
      console.log(`[truckscontrol-telemetry] API error: ${errMsg} codigo=${codigo}`);
      return new Response(JSON.stringify({
        success: false,
        error: codigo ? `${errMsg} (código ${codigo})` : errMsg,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ Parse MensagemCB nodes ============
    const messageNodes = parseXmlArray(responseText, "MensagemCB");
    console.log(`[truckscontrol-telemetry] mensagens recebidas: ${messageNodes.length}`);

    if (!messageNodes.length) {
      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messagesReceived: 0,
        telemetryUpdated: 0,
        alertsCreated: 0,
        journeyEventsCreated: 0,
        message: "Nenhuma mensagem nova",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ Pre-load vehicle cache by truckscontrol_id ============
    const { data: allVehicles } = await supabase
      .from("vehicles")
      .select("id, plate, truckscontrol_id, mileage");
    
    const vehicleByTcId = new Map<string, { id: string; plate: string; truckscontrol_id: string | null; mileage: number }>();
    const vehicleByPlate = new Map<string, { id: string; plate: string; truckscontrol_id: string | null; mileage: number }>();
    for (const v of allVehicles || []) {
      if (v.truckscontrol_id) vehicleByTcId.set(v.truckscontrol_id, v);
      vehicleByPlate.set(v.plate, v);
    }

    // Pre-load drivers for motID lookup
    const { data: allDrivers } = await supabase
      .from("drivers")
      .select("id, name, truckscontrol_id");
    const driverByTcId = new Map<string, { id: string; name: string }>();
    for (const d of allDrivers || []) {
      if (d.truckscontrol_id) driverByTcId.set(d.truckscontrol_id, d);
    }

    let maxMldReceived = lastMld;
    let telemetryUpdated = 0;
    let alertsCreated = 0;
    let journeyEventsCreated = 0;
    let driversLinked = 0;

    // Batch telemetry upserts
    const telemetryUpserts = new Map<string, any>();
    const journeyEvents: any[] = [];
    const alerts: any[] = [];
    const vehicleMileageUpdates: { id: string; mileage: number }[] = [];
    const driverVehicleLinks: { driverId: string; driverName: string; vehicleId: string; vehiclePlate: string }[] = [];

    for (const msgXml of messageNodes) {
      const mIdStr = parseXmlValue(msgXml, "mId") || parseXmlValue(msgXml, "mID") || "0";
      const mId = parseInt(mIdStr) || 0;
      if (mId > maxMldReceived) maxMldReceived = mId;

      const veiID = parseXmlValue(msgXml, "veiID");
      const placa = parseXmlValue(msgXml, "placa");
      
      // Find vehicle: priority truckscontrol_id, fallback plate
      let vehicle = veiID ? vehicleByTcId.get(veiID) : undefined;
      if (!vehicle && placa) vehicle = vehicleByPlate.get(placa);
      
      if (!vehicle) {
        if (debugEnabled) console.log(`[truckscontrol-telemetry] veículo não encontrado: veiID=${veiID} placa=${placa}`);
        continue;
      }

      // Parse all fields
      const lat = parseCoordinate(parseXmlValue(msgXml, "lat"));
      const lon = parseCoordinate(parseXmlValue(msgXml, "lon"));
      const vel = parseInt(parseXmlValue(msgXml, "vel") || "0");
      const evt4Raw = parseXmlValue(msgXml, "evt4");
      const ignition = evt4Raw === "1" || vel > 0; // vel > 0 forces ignition on
      const dt = parseXmlValue(msgXml, "dt"); // GPS timestamp
      const odm = parseInt(parseXmlValue(msgXml, "odm") || "0");
      const rpm = parseInt(parseXmlValue(msgXml, "rpm") || "0") || null;
      const bat = parseInt(parseXmlValue(msgXml, "bat") || "0") || null;
      const tpMsg = parseInt(parseXmlValue(msgXml, "tpMsg") || "0");
      const tfrID = parseXmlValue(msgXml, "tfrID");
      const dMac = parseXmlValue(msgXml, "dMac");
      const mun = parseXmlValue(msgXml, "mun");
      const uf = parseXmlValue(msgXml, "uf");
      const rua = parseXmlValue(msgXml, "rua");
      const ori = parseXmlValue(msgXml, "ori");
      const motID = parseXmlValue(msgXml, "motID");
      const motName = parseXmlValue(msgXml, "mot");
      const evtG = parseXmlValue(msgXml, "evtG");

      // Build location string
      const locationParts: string[] = [];
      if (rua) locationParts.push(rua);
      if (mun) locationParts.push(mun);
      if (uf) locationParts.push(uf);
      const locationName = locationParts.join(", ") || null;

      // ============ Telemetry upsert (keep latest per vehicle) ============
      const existing = telemetryUpserts.get(vehicle.id);
      const currentMId = existing?.last_mld || 0;
      
      if (!existing || mId > currentMId) {
        telemetryUpserts.set(vehicle.id, {
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          truckscontrol_id: veiID,
          latitude: lat || existing?.latitude,
          longitude: lon || existing?.longitude,
          speed: vel,
          ignition_on: ignition,
          odometer: odm > 0 ? odm : existing?.odometer,
          last_mld: mId > 0 ? mId : existing?.last_mld,
          rpm: rpm || existing?.rpm,
          gps_timestamp: dt || existing?.gps_timestamp,
          received_at: new Date().toISOString(),
        });
      }

      // ============ Update vehicle mileage ============
      if (odm > 0 && odm > (vehicle.mileage || 0)) {
        vehicleMileageUpdates.push({ id: vehicle.id, mileage: odm });
        vehicle.mileage = odm; // Update cache
      }

      // ============ Driver identification (evt59 or motID present) ============
      if (motID && motName) {
        const driver = driverByTcId.get(motID);
        if (driver) {
          driverVehicleLinks.push({
            driverId: driver.id,
            driverName: driver.name,
            vehicleId: vehicle.id,
            vehiclePlate: vehicle.plate,
          });
        }
      }

      // ============ Journey macros (tpMsg === 3) ============
      if (tpMsg === 3 && dMac && tfrID) {
        const eventType = mapMacroToEventType(dMac);
        journeyEvents.push({
          driver_name: motName || "Motorista",
          driver_id: motID ? driverByTcId.get(motID)?.id : null,
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          event_type: eventType,
          event_timestamp: dt || new Date().toISOString(),
          latitude: lat || null,
          longitude: lon || null,
          mileage: odm > 0 ? odm : null,
          macro_code: dMac.trim(),
          location_name: locationName,
          source: "telemetry",
          raw_data: { tfrID, tpMsg, veiID, mId, dMac },
        });
      }

      // ============ Telemetry history (save every message) ============
      // Only save if we have valid coordinates
      if (lat !== 0 && lon !== 0) {
        // Determine event type from evtG or events
        let eventType: string | null = null;
        let eventSeverity: string | null = null;

        const evt34 = parseXmlValue(msgXml, "evt34");
        const evt35 = parseXmlValue(msgXml, "evt35");
        
        if (evt34 === "true") {
          eventType = "speed_violation";
          eventSeverity = "warning";
        }
        if (evt35 === "true") {
          eventType = "harsh_braking";
          eventSeverity = "warning";
        }

        // We'll batch insert history later to avoid N+1
      }

      // ============ Speed alerts ============
      if (vel > 80) {
        alerts.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: motID ? driverByTcId.get(motID)?.id : null,
          driver_name: motName || null,
          alert_type: "speed_violation",
          severity: vel > 100 ? "critical" : "warning",
          title: `Excesso de velocidade: ${vel} km/h`,
          message: `Veículo ${vehicle.plate} a ${vel} km/h${locationName ? ` em ${locationName}` : ""}`,
          speed: vel,
          speed_limit: 80,
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          event_timestamp: dt || new Date().toISOString(),
        });
      }
    }

    // ============ Execute batch operations ============
    
    // 1. Upsert telemetry
    for (const [_vid, telData] of telemetryUpserts) {
      const { error: upsertErr } = await supabase
        .from("vehicle_telemetry")
        .upsert(telData, { onConflict: "vehicle_id" });
      if (upsertErr) {
        console.error(`[truckscontrol-telemetry] upsert error ${telData.vehicle_plate}:`, upsertErr.message);
      } else {
        telemetryUpdated++;
      }
    }

    // 2. Update vehicle mileage
    const mileageProcessed = new Set<string>();
    for (const upd of vehicleMileageUpdates) {
      if (mileageProcessed.has(upd.id)) continue;
      mileageProcessed.add(upd.id);
      // Get the max mileage for this vehicle
      const maxMileage = vehicleMileageUpdates
        .filter(u => u.id === upd.id)
        .reduce((max, u) => Math.max(max, u.mileage), 0);
      await supabase.from("vehicles").update({ mileage: maxMileage }).eq("id", upd.id);
    }

    // 3. Insert journey events
    if (journeyEvents.length > 0) {
      const { error: journeyErr, data: journeyData } = await supabase
        .from("driver_journey_events")
        .insert(journeyEvents)
        .select("id");
      if (journeyErr) {
        console.error("[truckscontrol-telemetry] journey events error:", journeyErr.message);
      } else {
        journeyEventsCreated = journeyData?.length || 0;
        console.log(`[truckscontrol-telemetry] ${journeyEventsCreated} eventos de jornada criados`);
      }
    }

    // 4. Insert alerts (deduplicate by checking recent)
    if (alerts.length > 0) {
      for (const alert of alerts) {
        const { data: recent } = await supabase
          .from("telemetry_alerts")
          .select("id")
          .eq("vehicle_id", alert.vehicle_id)
          .eq("alert_type", alert.alert_type)
          .gte("event_timestamp", new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle();
        
        if (!recent) {
          const { error: alertErr } = await supabase.from("telemetry_alerts").insert(alert);
          if (!alertErr) alertsCreated++;
        }
      }
    }

    // 5. Link drivers to vehicles
    const linkedVehicles = new Set<string>();
    for (const link of driverVehicleLinks) {
      if (linkedVehicles.has(link.vehicleId)) continue;
      linkedVehicles.add(link.vehicleId);
      await supabase
        .from("drivers")
        .update({ current_vehicle: link.vehiclePlate })
        .eq("id", link.driverId);
      driversLinked++;
    }

    console.log(`[truckscontrol-telemetry] finished: ${messageNodes.length} msgs, ${telemetryUpdated} telemetry, ${journeyEventsCreated} journey, ${alertsCreated} alerts, maxMld=${maxMldReceived}`);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      messagesReceived: messageNodes.length,
      telemetryUpdated,
      alertsCreated,
      journeyEventsCreated,
      driversLinked,
      maxMld: maxMldReceived,
      message: `OK: ${messageNodes.length} mensagens processadas. ${telemetryUpdated} veículos atualizados, ${journeyEventsCreated} eventos de jornada, ${alertsCreated} alertas.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[truckscontrol-telemetry] unhandled error:", String(e));
    return new Response(JSON.stringify({
      success: false,
      error: String(e),
      timestamp: new Date().toISOString(),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
