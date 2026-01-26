import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { strFromU8 } from "https://esm.sh/fflate@0.8.2";
import pako from "https://esm.sh/pako@2.1.0";

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

type InputBody = {
  dtInicio?: string; // formato: DD/MM/YYYY HH:MM:SS
  dtFim?: string;
  veiID?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: InputBody = {};
    try { input = await req.json(); } catch { /* default */ }

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Datas padrão: últimas 24 horas
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    };

    const dtInicio = input.dtInicio || formatDate(yesterday);
    const dtFim = input.dtFim || formatDate(now);

    // RequestTelemetria - Relatórios históricos de telemetria
    let xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestTelemetria>
  <login>${escapeXml(TRUCKSCONTROL_USER)}</login>
  <senha>${escapeXml(TRUCKSCONTROL_PASSWORD)}</senha>
  <dtInicio>${escapeXml(dtInicio)}</dtInicio>
  <dtFim>${escapeXml(dtFim)}</dtFim>`;
    
    if (input.veiID) {
      xmlRequest += `\n  <veiID>${escapeXml(input.veiID)}</veiID>`;
    }
    
    xmlRequest += `\n</RequestTelemetria>`;

    console.log("[truckscontrol-telemetria-historico] start", { 
      ts: new Date().toISOString(),
      dtInicio,
      dtFim,
      veiID: input.veiID || "all"
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 minutos para histórico

    let response: Response;
    try {
      response = await fetch("https://webservice.newrastreamentoonline.com.br", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=UTF-8", Accept: "*/*", "User-Agent": "FleetApp/1.0" },
        body: xmlRequest,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const bytes = await response.arrayBuffer();
    const responseText = decodeTrucksControlBody(new Uint8Array(bytes));

    if (responseText.includes("<erro>")) {
      const erro = parseXmlValue(responseText, "erro") || "Erro desconhecido";
      return new Response(JSON.stringify({ success: false, error: erro }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parsear telemetria
    const telemetriaNodes = parseXmlArray(responseText, "Telemetria") || 
                           parseXmlArray(responseText, "TelemetriaItem");
    
    let recordsInserted = 0;

    for (const telXml of telemetriaNodes) {
      const placa = parseXmlValue(telXml, "placa");
      const veiID = parseXmlValue(telXml, "veiID");
      
      if (!placa) continue;

      // Buscar veículo
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", placa)
        .maybeSingle();

      if (!vehicle) continue;

      const lat = parseFloat(parseXmlValue(telXml, "latitude") || "0");
      const lng = parseFloat(parseXmlValue(telXml, "longitude") || "0");
      const vel = parseInt(parseXmlValue(telXml, "velocidade") || "0", 10);
      const dataHora = parseXmlValue(telXml, "dataHora") || parseXmlValue(telXml, "dt");

      await supabase.from("telemetry_history").insert({
        vehicle_id: vehicle.id,
        vehicle_plate: placa,
        latitude: lat,
        longitude: lng,
        speed: vel,
        gps_timestamp: dataHora,
      });
      recordsInserted++;
    }

    console.log("[truckscontrol-telemetria-historico] finished", { 
      recordsFound: telemetriaNodes.length,
      recordsInserted 
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      dtInicio,
      dtFim,
      recordsFound: telemetriaNodes.length,
      recordsInserted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-telemetria-historico] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
