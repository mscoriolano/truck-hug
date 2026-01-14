import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { strFromU8, unzipSync } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrucksControlVehicle {
  veiID?: string;
  placa?: string;
  mot?: string; // motorista
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
  }>;
};

type InputBody = {
  alterados?: boolean;
  debug?: boolean;
  includeSensitive?: boolean;
};

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
  // Evita String.prototype.replaceAll para compatibilidade
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildVehicleRequestXml(user: string, password: string, alterados?: boolean): string {
  // Conforme documentação TrucksControl
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestVeiculo>\n  <login>${escapeXml(user)}</login>\n  <senha>${escapeXml(password)}</senha>${alterados ? "\\n  <alterados>1</alterados>" : ""}\n</RequestVeiculo>`;
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
}

function bytesPreview(bytes: Uint8Array, max = 24): string {
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

function decodeTrucksControlBody(bytes: Uint8Array): { text: string; wasZip: boolean } {
  if (!bytes.length) return { text: "", wasZip: false };

  if (looksLikeZip(bytes)) {
    const unzipped = unzipSync(bytes);
    const firstKey = Object.keys(unzipped)[0];
    if (!firstKey) return { text: "", wasZip: true };
    const fileBytes = unzipped[firstKey];
    return { text: strFromU8(fileBytes), wasZip: true };
  }

  // Fallback: decode as UTF-8 string
  return { text: strFromU8(bytes), wasZip: false };
}

async function readBodyLimited(response: Response, maxBytes = 2_000_000): Promise<{ bytes: Uint8Array; truncated: boolean }> {
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

    const webserviceUrls = [
      "https://webservice.newrastreamentoonline.com.br",
      "http://webservice.newrastreamentoonline.com.br",
      "http://webservice1.newrastreamentoonline.com.br",
    ];

    const xmlRequest = buildVehicleRequestXml(
      TRUCKSCONTROL_USER,
      TRUCKSCONTROL_PASSWORD,
      input.alterados,
    );

    let selectedUrl: string | null = null;
    let rawXml: string | null = null;
    const attempts: AttemptLog[] = [];
    let lastApiError: string | null = null;

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
    });

    const fetchWithTimeout = async (url: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=UTF-8",
            Accept: "text/xml, application/xml, */*",
          },
          body: xmlRequest,
          signal: controller.signal,
        });
        return response;
      } finally {
        clearTimeout(timeout);
      }
    };

    // Execução em paralelo para evitar timeouts acumulados.
    // Se uma URL estiver fora do ar, as outras ainda podem responder rápido.
    const timeoutPerUrlMs = 4_000;

    const results = await Promise.all(
      webserviceUrls.map(async (url) => {
        try {
          const response = await fetchWithTimeout(url, timeoutPerUrlMs);
          const contentType = response.headers.get("content-type");

          // NÃO usar response.arrayBuffer() para evitar estouro de memória.
          const limited = await readBodyLimited(response, 2_000_000);
          const decoded = decodeTrucksControlBody(limited.bytes);
          const responseText = decoded.text;

          const preview = responseText
            ? responseText.slice(0, 500)
            : `<<empty body>> bytes=${limited.bytes.length} hex=${bytesPreview(limited.bytes)}`;

          const attempt: AttemptLog = {
            url,
            status: response.status,
            ok: response.ok,
            contentType,
            wasZip: decoded.wasZip,
            preview,
            truncated: limited.truncated,
          };

          if (debug?.responses) {
            debug.responses.push({
              url,
              status: response.status,
              ok: response.ok,
              contentType,
              wasZip: decoded.wasZip,
              truncated: limited.truncated,
              bodyPreview: responseText ? responseText.slice(0, 50_000) : preview,
            });
          }

          return { attempt, responseText };
        } catch (e) {
          const attempt: AttemptLog = {
            url,
            status: 0,
            ok: false,
            contentType: null,
            wasZip: false,
            preview: "",
            truncated: false,
            error: String(e),
          };

          return { attempt, responseText: "" };
        }
      }),
    );

    for (const r of results) {
      attempts.push(r.attempt);

      const responseText = r.responseText;
      if (!responseText) continue;

      // Captura erro retornado
      if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
        const msg =
          parseXmlValue(responseText, "erro") ||
          parseXmlValue(responseText, "Erro") ||
          "Erro retornado pela TrucksControl";
        const codigo = parseXmlValue(responseText, "codigo");
        lastApiError = codigo ? `${msg} (código ${codigo})` : msg;
      }

      // Primeiro XML válido vence
      if (!rawXml && (responseText.includes("<ResponseVeiculo>") || responseText.includes("<Veiculo>"))) {
        selectedUrl = r.attempt.url;
        rawXml = responseText;
      }
    }

    console.log("[truckscontrol-sync] finished", {
      selectedUrl,
      vehiclesXmlFound: Boolean(rawXml),
      attempts: attempts.map((a) => ({ url: a.url, status: a.status, ok: a.ok, error: a.error })),
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

    // Mantém comportamento atual: apenas “match” por placa para confirmar integração
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

    const result = {
      success,
      timestamp: new Date().toISOString(),

      // Campos esperados no front (mantém compatibilidade)
      vehiclesReceived: vehiclesData.length,
      vehiclesUpdated: vehiclesMatched,
      journeyEventsReceived: 0,
      journeyEntriesCreated: 0,

      message: success
        ? `OK: ${vehiclesData.length} veículo(s) recebidos. ${vehiclesMatched} correspondem ao seu cadastro.`
        : `Falha ao obter veículos. ${lastApiError ? `Detalhe: ${lastApiError}` : ""}`.trim(),

      error: success ? undefined : lastApiError || "Não foi possível obter dados",

      debug: {
        urlUsed: selectedUrl || "none",
        attempts,
        ...(debugEnabled ? { xml: debug } : {}),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
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

