import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  gunzipSync,
  inflateSync,
  strFromU8,
} from "https://esm.sh/fflate@0.8.2";

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

// ============ XML helpers ============
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

function buildVehicleRequestXml(
  user: string,
  password: string,
  alterados?: boolean,
): string {
  // Conforme documentação TrucksControl
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestVeiculo>\n  <login>${escapeXml(user)}</login>\n  <senha>${escapeXml(password)}</senha>${alterados ? "\\n  <alterados>1</alterados>" : ""}\n</RequestVeiculo>`;
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

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>> 0
  );
}

/**
 * Implementação enxuta e segura para extrair o 1º arquivo de um ZIP (caso típico do TrucksControl).
 * Motivo: alguns ZIPs vêm com tamanhos 0xFFFFFFFF (data descriptor) e `unzipSync` tenta alocar um buffer gigantesco,
 * causando: RangeError: Array buffer allocation failed.
 */
function unzipFirstFileFromZip(
  zipBytes: Uint8Array,
  opts?: { maxUnzippedBytes?: number },
): Uint8Array {
  const maxOut = opts?.maxUnzippedBytes ?? 5_000_000;

  // Local file header signature: 0x04034b50
  if (u32le(zipBytes, 0) !== 0x04034b50) {
    throw new Error("ZIP inválido: assinatura do header não encontrada");
  }

  const flags = u16le(zipBytes, 6);
  const compression = u16le(zipBytes, 8);
  const nameLen = u16le(zipBytes, 26);
  const extraLen = u16le(zipBytes, 28);

  const compressedSize = u32le(zipBytes, 18);
  const dataStart = 30 + nameLen + extraLen;
  if (dataStart > zipBytes.length) {
    throw new Error("ZIP inválido: offset de dados fora do buffer");
  }

  let dataEnd = 0;
  const hasDataDescriptor = (flags & 0x0008) === 0x0008;

  if (!hasDataDescriptor && compressedSize > 0) {
    dataEnd = dataStart + compressedSize;
    if (dataEnd > zipBytes.length) {
      throw new Error("ZIP inválido: tamanho compactado excede o buffer");
    }
  } else {
    // procurar data descriptor: [0x08074b50][crc32][csize][usize]
    const sig0 = 0x50, sig1 = 0x4b, sig2 = 0x07, sig3 = 0x08;
    let found = -1;
    for (let i = dataStart; i + 16 <= zipBytes.length; i++) {
      if (
        zipBytes[i] === sig0 &&
        zipBytes[i + 1] === sig1 &&
        zipBytes[i + 2] === sig2 &&
        zipBytes[i + 3] === sig3
      ) {
        found = i;
        break;
      }
    }
    dataEnd = found === -1 ? zipBytes.length : found;
  }

  const compressed = zipBytes.slice(dataStart, dataEnd);

  if (compression === 0) {
    if (compressed.length > maxOut) throw new Error("ZIP excedeu limite de bytes");
    return compressed;
  }

  if (compression === 8) {
    const out = inflateRawSync(compressed);
    if (out.length > maxOut) throw new Error("ZIP excedeu limite de bytes");
    return out;
  }

  throw new Error(`Método de compressão ZIP não suportado: ${compression}`);
}

function decodeTrucksControlBody(bytes: Uint8Array): { text: string; wasZip: boolean } {
  if (!bytes.length) return { text: "", wasZip: false };

  if (looksLikeZip(bytes)) {
    try {
      const unzipped = unzipFirstFileFromZip(bytes, { maxUnzippedBytes: 5_000_000 });
      return { text: strFromU8(unzipped), wasZip: true };
    } catch (e) {
      console.error("[truckscontrol-sync] unzip failed", String(e));
      return { text: "", wasZip: true };
    }
  }

  if (looksLikeGzip(bytes)) {
    try {
      const out = gunzipSync(bytes);
      return { text: strFromU8(out), wasZip: true };
    } catch (e) {
      console.error("[truckscontrol-sync] gunzipSync failed", String(e));
      return { text: "", wasZip: true };
    }
  }

  return { text: strFromU8(bytes), wasZip: false };
}

async function readBodyLimited(
  response: Response,
  maxBytes = 5_000_000,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const body = response.body;
  if (!body) return { bytes: new Uint8Array(), truncated: false };

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
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      break;
    }

    chunks.push(value);
    total += value.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }

  return { bytes: out, truncated };
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

    // Documentação: HTTP não é aceito; usar apenas HTTPS
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response | null = null;
    try {
      response = await fetch(webserviceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          Accept: "text/xml, application/xml, application/zip, application/gzip, */*",
          "Accept-Encoding": "gzip, deflate",
          "User-Agent": "FleetApp/1.0",
        },
        body: xmlRequest,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentType = response.headers.get("content-type");

    const limited = await readBodyLimited(response, 5_000_000);
    console.log("[truckscontrol-sync] response bytes preview:", bytesPreview(limited.bytes));

    const decoded = decodeTrucksControlBody(limited.bytes);

    const attempt: AttemptLog = {
      url: webserviceUrl,
      status: response.status,
      ok: response.ok,
      contentType,
      wasZip: decoded.wasZip,
      preview: decoded.text ? decoded.text.slice(0, 500) : "<<empty body>>",
      truncated: limited.truncated,
      bodyLengthBytes: limited.bytes.length,
    };

    if (debug?.responses) {
      debug.responses.push({
        url: webserviceUrl,
        status: response.status,
        ok: response.ok,
        contentType,
        wasZip: decoded.wasZip,
        truncated: limited.truncated,
        bodyPreview: decoded.text ? decoded.text.slice(0, 50_000) : attempt.preview,
        bodyLengthBytes: limited.bytes.length,
      });
    }

    let rawXml: string | null = null;
    let lastApiError: string | null = null;

    const responseText = decoded.text || "";

    if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
      const msg =
        parseXmlValue(responseText, "erro") ||
        parseXmlValue(responseText, "Erro") ||
        "Erro retornado pela TrucksControl";
      const codigo = parseXmlValue(responseText, "codigo");
      lastApiError = codigo ? `${msg} (código ${codigo})` : msg;
    }

    if (responseText.includes("<ResponseVeiculo>") || responseText.includes("<Veiculo>")) {
      rawXml = responseText;
    }

    console.log("[truckscontrol-sync] finished", {
      status: response.status,
      ok: response.ok,
      bytesReceived: limited.bytes.length,
      wasZip: decoded.wasZip,
      vehiclesXmlFound: Boolean(rawXml),
      error: lastApiError ?? null,
    });

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

    return new Response(
      JSON.stringify({
        success,
        timestamp: new Date().toISOString(),

        vehiclesReceived: vehiclesData.length,
        vehiclesUpdated: vehiclesMatched,
        journeyEventsReceived: 0,
        journeyEntriesCreated: 0,

        message: success
          ? `OK: ${vehiclesData.length} veículo(s) recebidos. ${vehiclesMatched} correspondem ao seu cadastro.`
          : `Falha ao obter veículos. ${lastApiError ? `Detalhe: ${lastApiError}` : ""}`.trim(),

        error: success ? undefined : lastApiError || "Não foi possível obter dados",

        debug: {
          urlUsed: webserviceUrl,
          attempts: [attempt],
          ...(debugEnabled ? { xml: debug } : {}),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
