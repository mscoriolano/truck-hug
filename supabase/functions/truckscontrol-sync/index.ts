import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrucksControlVehicle {
  veiID?: string;
  placa?: string;
  mot?: string;
  ident?: string;
}

type AttemptLog = {
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  wasZip: boolean;
  preview: string;
  truncated?: boolean;
  error?: string;
  bodyLengthBytes?: number;
};

type DebugPayload = {
  requestXml?: string;
  requestXmlMasked?: string;
  responses?: Array<{
    url: string;
    status: number;
    ok: boolean;
    contentType: string | null;
    wasZip: boolean;
    truncated: boolean;
    bodyPreview: string;
    bodyLengthBytes: number;
  }>;
};

type InputBody = {
  alterados?: boolean;
  debug?: boolean;
  includeSensitive?: boolean;
};

// ============ XML Parsing Helpers ============
function parseXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, "gi");
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function parseXmlArray(xml: string, itemTagName: string): string[] {
  const items: string[] = [];
  const regex = new RegExp(
    `<${itemTagName}[^>]*>([\\s\\S]*?)</${itemTagName}>`,
    "gi",
  );
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============ ZIP Decompression (pako via esm.sh) ============
// TrucksControl returns ZIP files. We use pako for inflate.
async function loadPako() {
  const pako = await import("https://esm.sh/pako@2.1.0");
  return pako;
}

function looksLikeZip(bytes: Uint8Array): boolean {
  // ZIP magic: 50 4B 03 04
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function looksLikeGzip(bytes: Uint8Array): boolean {
  // GZIP magic: 1F 8B
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

// Simple ZIP extraction: finds the first file in a ZIP and extracts it
// ZIP format: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
async function extractFirstFileFromZip(zipBytes: Uint8Array, pako: any): Promise<string> {
  // Local file header starts at offset 0
  // Bytes 0-3: signature (50 4B 03 04)
  // Bytes 8-9: compression method (0=store, 8=deflate)
  // Bytes 18-21: compressed size (little endian)
  // Bytes 22-25: uncompressed size (little endian)
  // Bytes 26-27: filename length
  // Bytes 28-29: extra field length
  // Then: filename, extra field, file data
  
  if (zipBytes.length < 30) {
    throw new Error("ZIP file too small");
  }

  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  
  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const filenameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  
  const dataOffset = 30 + filenameLength + extraFieldLength;
  
  if (dataOffset + compressedSize > zipBytes.length) {
    throw new Error("ZIP file is truncated or corrupted");
  }
  
  const compressedData = zipBytes.slice(dataOffset, dataOffset + compressedSize);
  
  let decompressedBytes: Uint8Array;
  
  if (compressionMethod === 0) {
    // Stored (no compression)
    decompressedBytes = compressedData;
  } else if (compressionMethod === 8) {
    // Deflate
    decompressedBytes = pako.inflateRaw(compressedData);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
  }
  
  return new TextDecoder("utf-8").decode(decompressedBytes);
}

async function decodeTrucksControlBody(bytes: Uint8Array): Promise<{ text: string; wasZip: boolean }> {
  if (!bytes.length) return { text: "", wasZip: false };

  const pako = await loadPako();

  if (looksLikeZip(bytes)) {
    try {
      const text = await extractFirstFileFromZip(bytes, pako);
      return { text, wasZip: true };
    } catch (e) {
      console.error("[truckscontrol-sync] ZIP extraction failed:", e);
      return { text: "", wasZip: true };
    }
  }

  if (looksLikeGzip(bytes)) {
    try {
      const decompressed = pako.ungzip(bytes);
      return { text: new TextDecoder("utf-8").decode(decompressed), wasZip: true };
    } catch (e) {
      console.error("[truckscontrol-sync] GZIP decompression failed:", e);
      return { text: "", wasZip: true };
    }
  }

  // Plain text
  return { text: new TextDecoder("utf-8").decode(bytes), wasZip: false };
}

// ============ Request XML Builder ============
function buildVehicleRequestXml(user: string, password: string, alterados?: boolean): string {
  // Conforme documentação TrucksControl - RequestVeiculo
  const alteradosTag = alterados ? "\n  <alterados>1</alterados>" : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<RequestVeiculo>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>${alteradosTag}
</RequestVeiculo>`;
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
}

function bytesPreview(bytes: Uint8Array, max = 32): string {
  const slice = bytes.slice(0, max);
  return Array.from(slice)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

// ============ HTTP Request with streaming body read ============
async function fetchWithStreamingRead(
  url: string, 
  xmlRequest: string, 
  timeoutMs: number,
  maxBytes: number
): Promise<{
  status: number;
  ok: boolean;
  contentType: string | null;
  bytes: Uint8Array;
  truncated: boolean;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        "Accept": "text/xml, application/xml, application/zip, application/gzip, */*",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "FleetApp/1.0",
      },
      body: xmlRequest,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    const contentType = response.headers.get("content-type");
    
    // Read body as stream to avoid memory issues
    const body = response.body;
    if (!body) {
      return {
        status: response.status,
        ok: response.ok,
        contentType,
        bytes: new Uint8Array(),
        truncated: false,
      };
    }
    
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let truncated = false;
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      
      if (total + value.length > maxBytes) {
        const remaining = Math.max(0, maxBytes - total);
        if (remaining > 0) chunks.push(value.slice(0, remaining));
        total = maxBytes;
        truncated = true;
        try { await reader.cancel(); } catch { /* ignore */ }
        break;
      }
      
      chunks.push(value);
      total += value.length;
    }
    
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      contentType,
      bytes,
      truncated,
    };
  } catch (e) {
    clearTimeout(timeout);
    return {
      status: 0,
      ok: false,
      contentType: null,
      bytes: new Uint8Array(),
      truncated: false,
      error: String(e),
    };
  }
}

async function safeJson(req: Request): Promise<InputBody> {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return {};
    return (await req.json()) as InputBody;
  } catch {
    return {};
  }
}

// ============ Main Handler ============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await safeJson(req);
    const includeSensitive = Boolean(input.includeSensitive);
    const debugEnabled = Boolean(input.debug);

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "TrucksControl credentials not configured",
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Backend credentials not configured",
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Conforme documentação: apenas HTTPS é aceito desde 04/09/2023
    const webserviceUrl = "https://webservice.newrastreamentoonline.com.br";

    const xmlRequest = buildVehicleRequestXml(
      TRUCKSCONTROL_USER,
      TRUCKSCONTROL_PASSWORD,
      input.alterados,
    );

    const debug: DebugPayload | undefined = debugEnabled
      ? {
          requestXml: includeSensitive ? xmlRequest : undefined,
          requestXmlMasked: maskPasswordInXml(xmlRequest),
          responses: [],
        }
      : undefined;

    console.log("[truckscontrol-sync] start", {
      ts: new Date().toISOString(),
      debugEnabled,
      alterados: Boolean(input.alterados),
      url: webserviceUrl,
    });

    // Single request to the official HTTPS endpoint
    const timeoutMs = 30_000; // 30 seconds
    const maxBytes = 5_000_000; // 5MB max

    const result = await fetchWithStreamingRead(webserviceUrl, xmlRequest, timeoutMs, maxBytes);
    
    const attempt: AttemptLog = {
      url: webserviceUrl,
      status: result.status,
      ok: result.ok,
      contentType: result.contentType,
      wasZip: false,
      preview: "",
      truncated: result.truncated,
      bodyLengthBytes: result.bytes.length,
      error: result.error,
    };

    let rawXml: string | null = null;
    let lastApiError: string | null = null;

    if (result.error) {
      attempt.error = result.error;
      console.log("[truckscontrol-sync] fetch error:", result.error);
    } else if (result.bytes.length > 0) {
      // Check if it's compressed
      const hexPreview = bytesPreview(result.bytes);
      console.log("[truckscontrol-sync] response bytes preview:", hexPreview);
      
      const decoded = await decodeTrucksControlBody(result.bytes);
      attempt.wasZip = decoded.wasZip;
      attempt.preview = decoded.text.slice(0, 500);
      
      if (debug?.responses) {
        debug.responses.push({
          url: webserviceUrl,
          status: result.status,
          ok: result.ok,
          contentType: result.contentType,
          wasZip: decoded.wasZip,
          truncated: result.truncated,
          bodyPreview: decoded.text.slice(0, 50_000),
          bodyLengthBytes: result.bytes.length,
        });
      }
      
      const responseText = decoded.text;
      
      // Check for API errors
      if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
        const msg =
          parseXmlValue(responseText, "erro") ||
          parseXmlValue(responseText, "Erro") ||
          "Erro retornado pela TrucksControl";
        const codigo = parseXmlValue(responseText, "codigo");
        lastApiError = codigo ? `${msg} (código ${codigo})` : msg;
      }
      
      // Check for valid response
      if (responseText.includes("<ResponseVeiculo>") || responseText.includes("<Veiculo>")) {
        rawXml = responseText;
      }
    } else {
      attempt.preview = "<<empty response body>>";
    }

    console.log("[truckscontrol-sync] finished", {
      status: result.status,
      ok: result.ok,
      bytesReceived: result.bytes.length,
      wasZip: attempt.wasZip,
      vehiclesXmlFound: Boolean(rawXml),
      error: attempt.error || lastApiError,
    });

    // Parse vehicles from XML
    const vehiclesData: TrucksControlVehicle[] = [];

    if (rawXml) {
      const vehicleNodes = parseXmlArray(rawXml, "Veiculo");
      for (const vehicleXml of vehicleNodes) {
        const vehicle: TrucksControlVehicle = {
          veiID: parseXmlValue(vehicleXml, "veiID") || undefined,
          placa: parseXmlValue(vehicleXml, "placa") || undefined,
          mot: parseXmlValue(vehicleXml, "mot") || undefined,
          ident: parseXmlValue(vehicleXml, "ident") || undefined,
        };
        if (vehicle.placa) vehiclesData.push(vehicle);
      }
    }

    // Match with database
    let vehiclesMatched = 0;
    for (const vehicle of vehiclesData) {
      if (!vehicle.placa) continue;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id, plate")
        .eq("plate", vehicle.placa)
        .maybeSingle();

      if (existingVehicle) vehiclesMatched++;
    }

    const success = Boolean(rawXml) && vehiclesData.length >= 0;

    const responsePayload = {
      success,
      timestamp: new Date().toISOString(),

      vehiclesReceived: vehiclesData.length,
      vehiclesUpdated: vehiclesMatched,
      journeyEventsReceived: 0,
      journeyEntriesCreated: 0,

      message: success
        ? `OK: ${vehiclesData.length} veículo(s) recebidos. ${vehiclesMatched} correspondem ao seu cadastro.`
        : `Falha ao obter veículos. ${lastApiError ? `Detalhe: ${lastApiError}` : ""}`.trim(),

      error: success ? undefined : lastApiError || attempt.error || "Não foi possível obter dados",

      debug: {
        urlUsed: webserviceUrl,
        attempt,
        ...(debugEnabled ? { xml: debug } : {}),
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[truckscontrol-sync] unhandled error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
