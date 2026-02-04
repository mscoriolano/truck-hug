import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { strFromU8 } from "https://esm.sh/fflate@0.8.2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ XML helpers ============
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
  const flags = u16le(zipBytes, 6);
  const compression = u16le(zipBytes, 8);
  const nameLen = u16le(zipBytes, 26);
  const extraLen = u16le(zipBytes, 28);
  const compressedSize = u32le(zipBytes, 18);
  const dataStart = 30 + nameLen + extraLen;
  
  let dataEnd = 0;
  const hasDataDescriptor = (flags & 0x0008) === 0x0008;
  const hasUnknownSizes = compressedSize === 0xffffffff;

  if (!hasDataDescriptor && !hasUnknownSizes && compressedSize > 0) {
    dataEnd = dataStart + compressedSize;
  } else {
    const sig0 = 0x50, sig1 = 0x4b, sig2 = 0x07, sig3 = 0x08;
    let found = -1;
    for (let i = dataStart; i + 16 <= zipBytes.length; i++) {
      if (zipBytes[i] === sig0 && zipBytes[i + 1] === sig1 && zipBytes[i + 2] === sig2 && zipBytes[i + 3] === sig3) {
        found = i;
        break;
      }
    }
    dataEnd = found === -1 ? zipBytes.length : found;
  }

  const compressed = zipBytes.slice(dataStart, dataEnd);
  if (compression === 0) return compressed;
  if (compression === 8) return pako.inflateRaw(compressed) as Uint8Array;
  throw new Error(`Compressão não suportada: ${compression}`);
}

function decodeTrucksControlBody(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  if (looksLikeZip(bytes)) {
    try {
      const unzipped = unzipFirstFileFromZip(bytes);
      return strFromU8(unzipped);
    } catch (e) {
      console.error("[truckscontrol-motoristas] unzip failed", String(e));
      return "";
    }
  }
  return strFromU8(bytes);
}

async function readBodyLimited(response: Response, maxBytes = 5_000_000): Promise<Uint8Array> {
  const body = response.body;
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (total + value.length > maxBytes) {
      chunks.push(value.slice(0, maxBytes - total));
      break;
    }
    chunks.push(value);
    total += value.length;
  }

  const out = new Uint8Array(total > maxBytes ? maxBytes : total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: { debug?: boolean; includeSensitive?: boolean } = {};
    try {
      input = await req.json();
    } catch {
      // ignore
    }
    const debugEnabled = Boolean(input.debug);
    const includeSensitive = Boolean(input.includeSensitive);

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais TrucksControl não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // RequestMotorista - Buscar motoristas do TrucksControl
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestMotorista>
  <login>${escapeXml(TRUCKSCONTROL_USER)}</login>
  <senha>${escapeXml(TRUCKSCONTROL_PASSWORD)}</senha>
</RequestMotorista>`;

    const xmlMasked = xmlRequest.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
    if (debugEnabled) {
      console.log("[truckscontrol-motoristas] XML REQUEST:");
      console.log(includeSensitive ? xmlRequest : xmlMasked);
    }

    console.log("[truckscontrol-motoristas] start", { ts: new Date().toISOString() });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch("https://webservice.newrastreamentoonline.com.br", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          "User-Agent": "Mozilla/5.0",
        },
        body: xmlRequest,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const bytes = await readBodyLimited(response);
    const responseText = decodeTrucksControlBody(bytes);

    if (debugEnabled) {
      console.log("[truckscontrol-motoristas] RESPONSE TEXT (preview):");
      console.log((responseText || "<<empty body>>").slice(0, 50_000));
    }

    if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
      const erro = parseXmlValue(responseText, "erro") || "Erro retornado pela TrucksControl";
      console.log("[truckscontrol-motoristas] API error", { erro });
      return new Response(JSON.stringify({ success: false, error: erro }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parsear motoristas
    const driverNodes = parseXmlArray(responseText, "Motorista");
    console.log(`[truckscontrol-motoristas] Motoristas encontrados: ${driverNodes.length}`);

    let driversCreated = 0;
    let driversUpdated = 0;

    for (const driverXml of driverNodes) {
      const motID = parseXmlValue(driverXml, "motID");
      const nome = parseXmlValue(driverXml, "nome") || parseXmlValue(driverXml, "nomeMotorista");
      const cnh = parseXmlValue(driverXml, "cnh") || parseXmlValue(driverXml, "licenca");
      const telefone = parseXmlValue(driverXml, "telefone") || parseXmlValue(driverXml, "tel");
      const cpf = parseXmlValue(driverXml, "cpf");
      
      if (!nome) continue;

      // Verificar se motorista já existe pela CNH ou nome
      const { data: existing } = await supabase
        .from("drivers")
        .select("id, phone")
        .or(`license.eq.${cnh || 'none'},name.eq.${nome}`)
        .maybeSingle();

      if (existing) {
        // Atualizar motorista
        await supabase.from("drivers").update({
          phone: telefone || (existing as any).phone || "N/A",
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        driversUpdated++;
      } else {
        // Criar novo motorista
        await supabase.from("drivers").insert({
          name: nome,
          license: cnh || `TC-${motID}`,
          phone: telefone || "N/A",
          status: "available",
        });
        driversCreated++;
      }
    }

    console.log("[truckscontrol-motoristas] finished", { driversCreated, driversUpdated });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      driversFound: driverNodes.length,
      driversCreated,
      driversUpdated,
      ...(debugEnabled
        ? {
            debug: {
              requestXmlMasked: xmlMasked,
              responsePreview: (responseText || "").slice(0, 50_000),
            },
          }
        : {}),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-motoristas] unhandled error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
