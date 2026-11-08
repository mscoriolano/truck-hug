import { createClient } from "npm:@supabase/supabase-js@2";
import { strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, "gi");
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function parseXmlArray(xml: string, itemTagName: string): string[] {
  const items: string[] = [];
  const regex = new RegExp(`<${itemTagName}[^>]*>([\\s\\S]*?)</${itemTagName}>`, "gi");
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function unzipFirstFileFromZip(zipBytes: Uint8Array): Uint8Array {
  if (u32le(zipBytes, 0) !== 0x04034b50) throw new Error("ZIP inválido");
  const compression = u16le(zipBytes, 8);
  const nameLen = u16le(zipBytes, 26);
  const extraLen = u16le(zipBytes, 28);
  const compressedSize = u32le(zipBytes, 18);
  const dataStart = 30 + nameLen + extraLen;
  const dataEnd = dataStart + compressedSize;
  const compressed = zipBytes.slice(dataStart, dataEnd);
  if (compression === 0) return compressed;
  if (compression === 8) return pako.inflateRaw(compressed) as Uint8Array;
  throw new Error(`Compressão não suportada: ${compression}`);
}

function decodeTrucksControlBody(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  if (looksLikeZip(bytes)) {
    try {
      return strFromU8(unzipFirstFileFromZip(bytes));
    } catch { return ""; }
  }
  return strFromU8(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // RequestAlertasSoftware - Buscar alertas de software
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestAlertasSoftware>
  <login>${escapeXml(TRUCKSCONTROL_USER)}</login>
  <senha>${escapeXml(TRUCKSCONTROL_PASSWORD)}</senha>
</RequestAlertasSoftware>`;

    console.log("[truckscontrol-alertas] start", { ts: new Date().toISOString() });

    const controller = new AbortController();
    let timeout: number | undefined;
    const hardTimeout = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        const err = new Error("timeout");
        err.name = "AbortError";
        reject(err);
      }, 45_000);
    });

    let responseText = "";
    try {
      const work = (async () => {
        const response = await fetch("https://webservice.newrastreamentoonline.com.br", {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=UTF-8", Accept: "*/*", "User-Agent": "FleetApp/1.0" },
          body: xmlRequest,
          signal: controller.signal,
        });
        return new Uint8Array(await response.arrayBuffer());
      })();
      const bytes = await Promise.race([work, hardTimeout]);
      responseText = decodeTrucksControlBody(bytes);
    } catch (e) {
      const aborted = (e as Error)?.name === "AbortError";
      console.error("[truckscontrol-alertas] fetch failed", String(e));
      return new Response(JSON.stringify({
        success: false,
        error: aborted ? "TrucksControl não respondeu em 45s (timeout)" : String(e),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } finally {
      clearTimeout(timeout);
    }

    if (responseText.includes("<erro>")) {
      const erro = parseXmlValue(responseText, "erro") || "Erro desconhecido";
      return new Response(JSON.stringify({ success: false, error: erro }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificar erro de intervalo (código 7)
    const codigo = parseXmlValue(responseText, "codigo");
    if (codigo === "7") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Intervalo de 60 minutos da Trucks Control ainda não atingido",
        code: 7,
        message: "A API da TrucksControl exige um intervalo mínimo de 60 minutos entre requisições."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let alertaNodes = parseXmlArray(responseText, "AlertasSoftware");
    if (!alertaNodes.length) alertaNodes = parseXmlArray(responseText, "Acessorio");
    let alertasCreated = 0;
    let vehiclesNotFound = 0;

    // Pré-carrega veículos e telemetria uma única vez (evita N consultas por alerta)
    const [{ data: vehRows }, { data: telRows }] = await Promise.all([
      supabase.from("vehicles").select("id, plate"),
      supabase.from("vehicle_telemetry").select("vehicle_id, vehicle_plate, truckscontrol_id"),
    ]);
    const byPlate = new Map<string, { id: string; plate: string }>();
    for (const v of vehRows || []) if (v.plate) byPlate.set(String(v.plate).toUpperCase(), v as any);
    const byVeiID = new Map<string, { id: string; plate: string }>();
    for (const t of telRows || []) {
      if (t.truckscontrol_id && t.vehicle_id) byVeiID.set(String(t.truckscontrol_id), { id: t.vehicle_id, plate: t.vehicle_plate });
    }

    // Marcadores já importados (últimos 30 dias)
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: existingRows } = await supabase
      .from("telemetry_alerts")
      .select("message")
      .eq("alert_type", "tracker_alert")
      .gte("created_at", since)
      .limit(10000);
    const existingMarkers = new Set<string>();
    for (const r of existingRows || []) {
      const m = String(r.message || "").match(/\[alsID:[^\]]+\]/);
      if (m) existingMarkers.add(m[0]);
    }
    const toInsert: Record<string, unknown>[] = [];

    for (const alertaXml of alertaNodes) {
      const alsID = parseXmlValue(alertaXml, "alsID");
      const veiID = parseXmlValue(alertaXml, "veiID");
      const tdeID = parseXmlValue(alertaXml, "tdeID");
      const dtInc = parseXmlValue(alertaXml, "dtInc");
      const placa = parseXmlValue(alertaXml, "placa");
      const descricao = parseXmlValue(alertaXml, "descricao") || parseXmlValue(alertaXml, "desc");
      const tipoAlerta = parseXmlValue(alertaXml, "tipoAlerta") || parseXmlValue(alertaXml, "tipo");

      let vehicle = placa ? byPlate.get(placa.toUpperCase()) || null : null;
      if (!vehicle && veiID) vehicle = byVeiID.get(veiID) || null;

      if (!vehicle) {
        vehiclesNotFound++;
        console.log(`[truckscontrol-alertas] Veículo não encontrado: placa=${placa}, veiID=${veiID}`);
        continue;
      }

      const desc = (descricao || `Alerta rastreador #${tdeID || alsID}`).trim();
      const low = (desc + " " + (tipoAlerta || "")).toLowerCase();
      let severity = "warning";
      if (low.includes("critic") || low.includes("pânico") || low.includes("panico") || low.includes("emerg") || low.includes("viola")) severity = "critical";
      else if (low.includes("info")) severity = "info";

      let ts = new Date().toISOString();
      if (dtInc) {
        const m = dtInc.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
        if (m) ts = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || "00"}-03:00`).toISOString();
        else if (!isNaN(Date.parse(dtInc))) ts = new Date(dtInc).toISOString();
      }

      const marker = `[alsID:${alsID || `${veiID}-${tdeID}-${dtInc}`}]`;
      if (existingMarkers.has(marker)) continue;
      existingMarkers.add(marker);

      toInsert.push({
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        alert_type: "tracker_alert",
        severity,
        title: desc,
        message: `${desc} — gerado pelo rastreador ${marker}`,
        event_timestamp: ts,
      });
    }

    for (let b = 0; b < toInsert.length; b += 500) {
      const chunk = toInsert.slice(b, b + 500);
      const { error: insertError } = await supabase.from("telemetry_alerts").insert(chunk);
      if (!insertError) alertasCreated += chunk.length;
      else console.error("[truckscontrol-alertas] insert error", insertError.message);
    }

    console.log("[truckscontrol-alertas] finished", { 
      alertasFound: alertaNodes.length, 
      alertasCreated,
      vehiclesNotFound 
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      alertasFound: alertaNodes.length,
      alertasCreated,
      vehiclesNotFound,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-alertas] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
