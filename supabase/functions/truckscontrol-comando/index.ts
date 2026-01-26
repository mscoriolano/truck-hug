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
  veiID: string;
  comando: string;
  usuario?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: InputBody = await req.json();
    
    if (!input.veiID || !input.comando) {
      return new Response(JSON.stringify({ success: false, error: "veiID e comando são obrigatórios" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais TrucksControl não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gerar ID único para o comando
    const comandoId = Date.now();

    // RequestEnvioComando - Enviar comando para veículo
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestEnvioComando login="${escapeXml(TRUCKSCONTROL_USER)}" senha="${escapeXml(TRUCKSCONTROL_PASSWORD)}">
  <comando>
    <id>${comandoId}</id>
    <veiID>${escapeXml(input.veiID)}</veiID>
    <mensagem>${escapeXml(input.comando)}</mensagem>
    <usuario>${escapeXml(input.usuario || "Sistema")}</usuario>
  </comando>
</RequestEnvioComando>`;

    console.log("[truckscontrol-comando] start", { 
      ts: new Date().toISOString(), 
      veiID: input.veiID, 
      comando: input.comando,
      comandoId 
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch("https://webservice.newrastreamentoonline.com.br", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          Accept: "text/xml, application/xml, */*",
          "User-Agent": "FleetApp/1.0",
        },
        body: xmlRequest,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const bytes = await response.arrayBuffer();
    const responseText = decodeTrucksControlBody(new Uint8Array(bytes));

    // Verificar resposta
    const status = parseXmlValue(responseText, "status");
    const erro = parseXmlValue(responseText, "erro");

    console.log("[truckscontrol-comando] response", { status, erro });

    // Status: 2=processado com sucesso, 3=rejeitado, 4=enviado aguardando, 5=rejeitado no servidor
    const statusMap: Record<string, string> = {
      "2": "Comando processado com sucesso",
      "3": "Comando rejeitado (erro de sintaxe ou credenciais)",
      "4": "Comando enviado, aguardando processamento",
      "5": "Comando rejeitado no servidor",
    };

    return new Response(JSON.stringify({
      success: status === "2" || status === "4",
      timestamp: new Date().toISOString(),
      comandoId,
      status,
      statusMessage: statusMap[status || ""] || "Status desconhecido",
      erro: erro !== "0" ? erro : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-comando] unhandled error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
