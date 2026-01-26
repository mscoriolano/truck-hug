import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  action: "pending" | "accept" | "reject" | "cancel";
  veiID?: string;
  desc?: string;
  usuario?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: InputBody = { action: "pending" };
    try { input = await req.json(); } catch { /* default */ }

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let xmlRequest: string;
    const actionId = Date.now();

    switch (input.action) {
      case "accept":
        xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestAREspelhamentoVeiculo login="${escapeXml(TRUCKSCONTROL_USER)}" senha="${escapeXml(TRUCKSCONTROL_PASSWORD)}">
  <espelhamento tipo="1">
    <id>${actionId}</id>
    <veiID>${escapeXml(input.veiID || "")}</veiID>
    <desc>${escapeXml(input.desc || "")}</desc>
    <usuario>${escapeXml(input.usuario || "Sistema")}</usuario>
  </espelhamento>
</RequestAREspelhamentoVeiculo>`;
        break;
      case "reject":
        xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestAREspelhamentoVeiculo login="${escapeXml(TRUCKSCONTROL_USER)}" senha="${escapeXml(TRUCKSCONTROL_PASSWORD)}">
  <espelhamento tipo="2">
    <id>${actionId}</id>
    <veiID>${escapeXml(input.veiID || "")}</veiID>
    <usuario>${escapeXml(input.usuario || "Sistema")}</usuario>
  </espelhamento>
</RequestAREspelhamentoVeiculo>`;
        break;
      case "cancel":
        xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestCancelarEspelhamentoVeiculo login="${escapeXml(TRUCKSCONTROL_USER)}" senha="${escapeXml(TRUCKSCONTROL_PASSWORD)}">
  <espelhamento tipo="2">
    <id>${actionId}</id>
    <veiID>${escapeXml(input.veiID || "")}</veiID>
  </espelhamento>
</RequestCancelarEspelhamentoVeiculo>`;
        break;
      default:
        // RequestEspelhamentoPendenteVeiculo - Listar pendentes
        xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestEspelhamentoPendenteVeiculo>
  <login>${escapeXml(TRUCKSCONTROL_USER)}</login>
  <senha>${escapeXml(TRUCKSCONTROL_PASSWORD)}</senha>
</RequestEspelhamentoPendenteVeiculo>`;
    }

    console.log("[truckscontrol-espelhamento]", { action: input.action, ts: new Date().toISOString() });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

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

    if (responseText.includes("<erro>") && !responseText.includes("<erro>0</erro>")) {
      const erro = parseXmlValue(responseText, "erro") || "Erro desconhecido";
      return new Response(JSON.stringify({ success: false, error: erro }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input.action === "pending") {
      const pendingNodes = parseXmlArray(responseText, "EspelhamentoPendenteVeiculo");
      const pendentes = pendingNodes.map(xml => ({
        veiID: parseXmlValue(xml, "veiID"),
        placa: parseXmlValue(xml, "placa"),
        desc: parseXmlValue(xml, "desc"),
        cmd: parseXmlValue(xml, "cmd"),
        ie: parseXmlValue(xml, "ie"),
        prop: parseXmlValue(xml, "prop"),
      }));
      
      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        pendentes,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const status = parseXmlValue(responseText, "status");
    return new Response(JSON.stringify({
      success: status === "2",
      timestamp: new Date().toISOString(),
      action: input.action,
      status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-espelhamento] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
