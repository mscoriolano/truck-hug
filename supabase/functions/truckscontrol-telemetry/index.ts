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

// ============ Haversine distance (meters) ============
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  if (JOURNEY_MACRO_MAP[normalized]) return JOURNEY_MACRO_MAP[normalized];
  for (const [key, value] of Object.entries(JOURNEY_MACRO_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const FETCH_TIMEOUT_MS = 55_000;
  const MAX_RETRIES = 0;

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

    // ============ Fetch ============
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
        success: true, timestamp: new Date().toISOString(),
        messagesReceived: 0, telemetryUpdated: 0, alertsCreated: 0, journeyEventsCreated: 0, behaviorEventsCreated: 0,
        message: "Nenhuma mensagem nova",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ Pre-load caches ============
    const { data: allVehicles } = await supabase
      .from("vehicles")
      .select("id, plate, truckscontrol_id, mileage");
    
    const vehicleByTcId = new Map<string, { id: string; plate: string; truckscontrol_id: string | null; mileage: number }>();
    const vehicleByPlate = new Map<string, { id: string; plate: string; truckscontrol_id: string | null; mileage: number }>();
    for (const v of allVehicles || []) {
      if (v.truckscontrol_id) vehicleByTcId.set(v.truckscontrol_id, v);
      vehicleByPlate.set(v.plate, v);
    }

    const { data: allDrivers } = await supabase
      .from("drivers")
      .select("id, name, truckscontrol_id");
    const driverByTcId = new Map<string, { id: string; name: string }>();
    for (const d of allDrivers || []) {
      if (d.truckscontrol_id) driverByTcId.set(d.truckscontrol_id, d);
    }

    // Load geofence zones
    const { data: geofenceZones } = await supabase
      .from("geofence_zones")
      .select("*")
      .eq("is_active", true);

    // Load telemetry settings for thresholds
    const { data: telSettings } = await supabase
      .from("telemetry_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const speedLimitHighway = telSettings?.speed_limit_highway || 80;
    const speedLimitUrban = telSettings?.speed_limit_urban || 60;

    let maxMldReceived = lastMld;
    let telemetryUpdated = 0;
    let alertsCreated = 0;
    let journeyEventsCreated = 0;
    let behaviorEventsCreated = 0;
    let driversLinked = 0;
    let complianceUpdated = 0;

    // Batch collections
    const telemetryUpserts = new Map<string, any>();
    const journeyEvents: any[] = [];
    const alerts: any[] = [];
    const behaviorEvents: any[] = [];
    const vehicleMileageUpdates: { id: string; mileage: number }[] = [];
    const driverVehicleLinks: { driverId: string; driverName: string; vehicleId: string; vehiclePlate: string }[] = [];
    // Track journey starts/ends for compliance
    const complianceEvents: { driverId: string; driverName: string; eventType: string; timestamp: string; vehicleId?: string }[] = [];

    for (const msgXml of messageNodes) {
      const mIdStr = parseXmlValue(msgXml, "mId") || parseXmlValue(msgXml, "mID") || "0";
      const mId = parseInt(mIdStr) || 0;
      if (mId > maxMldReceived) maxMldReceived = mId;

      const veiID = parseXmlValue(msgXml, "veiID");
      const placa = parseXmlValue(msgXml, "placa");
      
      let vehicle = veiID ? vehicleByTcId.get(veiID) : undefined;
      if (!vehicle && placa) vehicle = vehicleByPlate.get(placa);
      
      if (!vehicle) {
        if (debugEnabled) console.log(`[truckscontrol-telemetry] veículo não encontrado: veiID=${veiID} placa=${placa}`);
        continue;
      }

      // Parse fields
      const lat = parseCoordinate(parseXmlValue(msgXml, "lat"));
      const lon = parseCoordinate(parseXmlValue(msgXml, "lon"));
      const vel = parseInt(parseXmlValue(msgXml, "vel") || "0");
      const evt4Raw = parseXmlValue(msgXml, "evt4");
      const ignition = evt4Raw === "1" || vel > 0;
      const dt = parseXmlValue(msgXml, "dt");
      const odm = parseInt(parseXmlValue(msgXml, "odm") || "0");
      const rpm = parseInt(parseXmlValue(msgXml, "rpm") || "0") || null;
      const bat = parseInt(parseXmlValue(msgXml, "bat") || "0") || null;
      const tpMsg = parseInt(parseXmlValue(msgXml, "tpMsg") || "0");
      const tfrID = parseXmlValue(msgXml, "tfrID");
      const dMac = parseXmlValue(msgXml, "dMac");
      const mun = parseXmlValue(msgXml, "mun");
      const uf = parseXmlValue(msgXml, "uf");
      const rua = parseXmlValue(msgXml, "rua");
      const motID = parseXmlValue(msgXml, "motID");
      const motName = parseXmlValue(msgXml, "mot");
      const evtG = parseXmlValue(msgXml, "evtG");

      // Event flags
      const evt3 = parseXmlValue(msgXml, "evt3"); // ignition off
      const evt13 = parseXmlValue(msgXml, "evt13"); // panic button
      const evt34 = parseXmlValue(msgXml, "evt34"); // speeding
      const evt35 = parseXmlValue(msgXml, "evt35"); // high RPM
      const evt54 = parseXmlValue(msgXml, "evt54"); // idle with ignition
      const evt59 = parseXmlValue(msgXml, "evt59"); // iButton identification
      const evt64 = parseXmlValue(msgXml, "evt64"); // driver identification
      const evt85 = parseXmlValue(msgXml, "evt85"); // escape button

      const locationParts: string[] = [];
      if (rua) locationParts.push(rua);
      if (mun) locationParts.push(mun);
      if (uf) locationParts.push(uf);
      const locationName = locationParts.join(", ") || null;

      // Resolve driver
      const driver = motID ? driverByTcId.get(motID) : undefined;
      const driverId = driver?.id || null;
      const driverName = motName || driver?.name || null;

      // ============ Telemetry upsert ============
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
          battery_level: bat,
          gps_timestamp: dt || existing?.gps_timestamp,
          location_name: locationName,
          municipality: mun || null,
          state: uf || null,
          received_at: new Date().toISOString(),
        });
      }

      // ============ Mileage ============
      if (odm > 0 && odm > (vehicle.mileage || 0)) {
        vehicleMileageUpdates.push({ id: vehicle.id, mileage: odm });
        vehicle.mileage = odm;
      }

      // ============ Driver identification (evt59/evt64/motID) ============
      if (motID && (motName || driver)) {
        driverVehicleLinks.push({
          driverId: driver?.id || motID,
          driverName: driverName || "Motorista",
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
        });
      }

      // ============ Journey macros (tpMsg === 3) ============
      if (tpMsg === 3 && dMac && tfrID) {
        const eventType = mapMacroToEventType(dMac);
        journeyEvents.push({
          driver_name: driverName || "Motorista",
          driver_id: driverId,
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

        // Track for auto-compliance
        if (driverId && (eventType === "journey_start" || eventType === "journey_end" || eventType === "meal_start" || eventType === "meal_end" || eventType === "rest_start" || eventType === "rest_end")) {
          complianceEvents.push({
            driverId,
            driverName: driverName || "Motorista",
            eventType,
            timestamp: dt || new Date().toISOString(),
            vehicleId: vehicle.id,
          });
        }
      }

      // ============ DRIVING BEHAVIOR EVENTS ============
      
      // 🔋 Battery monitoring - alert when below 24V
      if (bat !== null && bat > 0 && bat < 24) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "low_battery",
          severity: bat < 20 ? "critical" : "warning",
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          speed: vel,
          battery_level: bat,
          details: { bat, message: `Bateria do rastreador em ${bat}V` },
          event_timestamp: dt || new Date().toISOString(),
        });

        // Also create telemetry alert for low battery
        alerts.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          alert_type: "low_battery",
          severity: bat < 20 ? "critical" : "warning",
          title: `Bateria baixa: ${bat}V`,
          message: `Rastreador do veículo ${vehicle.plate} com bateria em ${bat}V${locationName ? ` em ${locationName}` : ""}`,
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      // 🚗 Speed violation
      if (vel > speedLimitHighway) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "speeding",
          severity: vel > 100 ? "critical" : "warning",
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          speed: vel,
          rpm: rpm,
          details: { speed: vel, limit: speedLimitHighway },
          event_timestamp: dt || new Date().toISOString(),
        });

        alerts.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          alert_type: "speed_violation",
          severity: vel > 100 ? "critical" : "warning",
          title: `Excesso de velocidade: ${vel} km/h`,
          message: `Veículo ${vehicle.plate} a ${vel} km/h (limite ${speedLimitHighway})${locationName ? ` em ${locationName}` : ""}`,
          speed: vel,
          speed_limit: speedLimitHighway,
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      // ⚙️ High RPM (evt35 or RPM > 2200)
      if (evt35 === "true" || (rpm && rpm > 2200)) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "high_rpm",
          severity: rpm && rpm > 2500 ? "critical" : "warning",
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          speed: vel,
          rpm: rpm,
          details: { rpm, evt35 },
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      // ⏱️ Excessive idle (evt54 = true, speed 0, ignition on)
      if (evt54 === "true" && vel === 0 && ignition) {
        behaviorEvents.push({
          vehicle_id: vehicle.id,
          vehicle_plate: vehicle.plate,
          driver_id: driverId,
          driver_name: driverName,
          event_type: "excessive_idle",
          severity: "info",
          latitude: lat || null,
          longitude: lon || null,
          location_name: locationName,
          speed: 0,
          rpm: rpm,
          details: { evt54: true, rpm },
          event_timestamp: dt || new Date().toISOString(),
        });
      }

      // 🗺️ Geofencing check
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
              message: `Veículo ${vehicle.plate} entrou na zona restrita "${zone.name}"${locationName ? ` - ${locationName}` : ""}`,
              latitude: lat,
              longitude: lon,
              location_name: locationName,
              event_timestamp: dt || new Date().toISOString(),
            });
          }
        }
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

    // 5. Insert behavior events (deduplicate similar events within 2 min)
    if (behaviorEvents.length > 0) {
      for (const evt of behaviorEvents) {
        const { data: recentBehavior } = await supabase
          .from("driving_behavior_events")
          .select("id")
          .eq("vehicle_id", evt.vehicle_id)
          .eq("event_type", evt.event_type)
          .gte("event_timestamp", new Date(Date.now() - 2 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle();
        
        if (!recentBehavior) {
          const { error: bevtErr } = await supabase.from("driving_behavior_events").insert(evt);
          if (!bevtErr) behaviorEventsCreated++;
        }
      }
    }

    // 6. Link drivers to vehicles + create assignments
    const linkedVehicles = new Set<string>();
    for (const link of driverVehicleLinks) {
      if (linkedVehicles.has(link.vehicleId)) continue;
      linkedVehicles.add(link.vehicleId);
      
      // Update driver's current_vehicle
      if (link.driverId && link.driverId.length > 10) { // ensure it's a UUID
        await supabase
          .from("drivers")
          .update({ current_vehicle: link.vehiclePlate })
          .eq("id", link.driverId);
        
        // Check if active assignment already exists
        const { data: existingAssignment } = await supabase
          .from("driver_vehicle_assignments")
          .select("id")
          .eq("driver_id", link.driverId)
          .eq("vehicle_id", link.vehicleId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!existingAssignment) {
          // Close any previous active assignment for this driver
          await supabase
            .from("driver_vehicle_assignments")
            .update({ is_active: false, end_time: new Date().toISOString() })
            .eq("driver_id", link.driverId)
            .eq("is_active", true);

          // Create new assignment
          await supabase
            .from("driver_vehicle_assignments")
            .insert({
              driver_id: link.driverId,
              driver_name: link.driverName,
              vehicle_id: link.vehicleId,
              vehicle_plate: link.vehiclePlate,
              is_active: true,
              assignment_code: "AUTO-TELEMETRY",
            });
        }
        driversLinked++;
      }
    }

    // 7. Auto-compliance from journey macros
    if (complianceEvents.length > 0) {
      // Group by driver
      const driverEvents = new Map<string, typeof complianceEvents>();
      for (const ce of complianceEvents) {
        const arr = driverEvents.get(ce.driverId) || [];
        arr.push(ce);
        driverEvents.set(ce.driverId, arr);
      }

      for (const [did, events] of driverEvents) {
        const journeyStarts = events.filter(e => e.eventType === "journey_start");
        const journeyEnds = events.filter(e => e.eventType === "journey_end");
        const mealStarts = events.filter(e => e.eventType === "meal_start");
        
        // If there's a journey_start, upsert compliance record for today
        if (journeyStarts.length > 0) {
          const journeyDate = new Date(journeyStarts[0].timestamp).toISOString().split("T")[0];
          
          const complianceData: any = {
            driver_id: did,
            driver_name: journeyStarts[0].driverName,
            journey_date: journeyDate,
            journey_start: journeyStarts[0].timestamp,
            source: "telemetry",
          };

          if (journeyEnds.length > 0) {
            complianceData.journey_end = journeyEnds[journeyEnds.length - 1].timestamp;
            // Calculate worked minutes
            const start = new Date(journeyStarts[0].timestamp).getTime();
            const end = new Date(journeyEnds[journeyEnds.length - 1].timestamp).getTime();
            const workedMinutes = Math.round((end - start) / 60000);
            complianceData.total_worked_minutes = workedMinutes;
            complianceData.overtime_minutes = Math.max(0, workedMinutes - 480); // 8h = 480min
            complianceData.is_overtime_compliant = workedMinutes <= 600; // 10h max
          }

          if (mealStarts.length > 0) {
            complianceData.break_start = mealStarts[0].timestamp;
          }

          // Check if record exists for this driver/date
          const { data: existingCompliance } = await supabase
            .from("driver_journey_compliance")
            .select("id")
            .eq("driver_id", did)
            .eq("journey_date", journeyDate)
            .limit(1)
            .maybeSingle();

          if (existingCompliance) {
            await supabase
              .from("driver_journey_compliance")
              .update(complianceData)
              .eq("id", existingCompliance.id);
          } else {
            await supabase
              .from("driver_journey_compliance")
              .insert(complianceData);
          }
          complianceUpdated++;
        }
      }
    }

    console.log(`[truckscontrol-telemetry] finished: ${messageNodes.length} msgs, ${telemetryUpdated} tel, ${journeyEventsCreated} journey, ${alertsCreated} alerts, ${behaviorEventsCreated} behavior, ${driversLinked} drivers, ${complianceUpdated} compliance, maxMld=${maxMldReceived}`);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      messagesReceived: messageNodes.length,
      telemetryUpdated,
      alertsCreated,
      journeyEventsCreated,
      behaviorEventsCreated,
      driversLinked,
      complianceUpdated,
      maxMld: maxMldReceived,
      message: `OK: ${messageNodes.length} mensagens. ${telemetryUpdated} veículos, ${journeyEventsCreated} jornada, ${alertsCreated} alertas, ${behaviorEventsCreated} comportamento, ${driversLinked} motoristas vinculados, ${complianceUpdated} compliance.`,
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
