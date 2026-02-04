import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gunzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";
import pako from "https://esm.sh/pako@2.1.0";

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
  odometro?: number;
  latitude?: number;
  longitude?: number;
  velocidade?: number;
  ignicao?: boolean;
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

type DebugBundleEntry = {
  name: "veiculo" | "motoristas" | "acessorios" | "mensagemcb";
  requestXml?: string;
  requestXmlMasked: string;
  response: {
    url: string;
    status: number;
    ok: boolean;
    contentType: string | null;
    wasZip: boolean;
    truncated: boolean;
    bodyPreview: string;
    bodyLengthBytes: number;
  };
  apiError?: string | null;
};

type InputBody = {
  alterados?: boolean;
  debug?: boolean;
  includeSensitive?: boolean;
  /**
   * Quando true, executa chamadas adicionais (além de RequestVeiculo)
   * apenas para diagnóstico: Motoristas, Acessórios e MensagemCB.
   */
  debugAllRequests?: boolean;
  /**
   * Permite escolher quais requisições executar em debugAllRequests.
   * Defaults: ["veiculo","motoristas","acessorios","mensagemcb"].
   */
  debugRequests?: Array<"veiculo" | "motoristas" | "acessorios" | "mensagemcb">;
  /**
   * Quando true, NÃO executa o fluxo normal de veículos.
   * Executa apenas as requisições selecionadas em debugRequests.
   */
  onlyDebugRequests?: boolean;
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

function maskCredentialsInXml(xml: string): string {
  // login não é segredo no mesmo nível, mas para debug público é melhor mascarar também
  return maskPasswordInXml(xml).replace(/<login>[\s\S]*?<\/login>/gi, "<login>***</login>");
}

function buildMotoristasRequestXml(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestMotorista>\n  <login>${escapeXml(user)}</login>\n  <senha>${escapeXml(password)}</senha>\n</RequestMotorista>`;
}

function buildAcessoriosRequestXml(user: string, password: string): string {
  // Observação: em outros arquivos existe RequestAcessorio; aqui seguimos o que já está no projeto
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestAcessorio>\n  <login>${escapeXml(user)}</login>\n  <senha>${escapeXml(password)}</senha>\n</RequestAcessorio>`;
}

function buildMensagemCbRequestXml(user: string, password: string, mldValue: number): string {
  const safeMld = Number.isInteger(mldValue) && mldValue > 0 ? mldValue : 1;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestMensagemCB>\n  <login>${escapeXml(user)}</login>\n  <senha>${escapeXml(password)}</senha>\n  <mld>${safeMld}</mld>\n</RequestMensagemCB>`;
}

async function fetchOutboundIp(): Promise<string | null> {
  try {
    const ipController = new AbortController();
    const ipTimeout = setTimeout(() => ipController.abort(), 4000);
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: ipController.signal,
    });
    clearTimeout(ipTimeout);
    if (!ipRes.ok) return null;
    const json = (await ipRes.json()) as { ip?: string };
    return json?.ip ?? null;
  } catch {
    return null;
  }
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
  const uncompressedSize = u32le(zipBytes, 22);
  const dataStart = 30 + nameLen + extraLen;
  if (dataStart > zipBytes.length) {
    throw new Error("ZIP inválido: offset de dados fora do buffer");
  }

  let dataEnd = 0;
  const hasDataDescriptor = (flags & 0x0008) === 0x0008;
  const hasUnknownSizes =
    compressedSize === 0xffffffff || uncompressedSize === 0xffffffff;

  if (!hasDataDescriptor && !hasUnknownSizes && compressedSize > 0) {
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
    // ZIP usa raw deflate
    const out = pako.inflateRaw(compressed) as Uint8Array;
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
    const debugAllRequests = Boolean(input.debugAllRequests);
    const onlyDebugRequests = Boolean(input.onlyDebugRequests);
    const debugRequests = input.debugRequests;

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

    // ==========================================
    // Diagnóstico de IP de Saída (sempre loga no console)
    // ==========================================
    const publicIp = await fetchOutboundIp();
    if (publicIp) console.log("IP de Saída:", publicIp);

    // ==========================================
    // Modo: somente debug (não altera base / não chama veículos)
    // ==========================================
    if (debugEnabled && debugAllRequests && onlyDebugRequests) {
      const wanted = debugRequests?.length
        ? debugRequests
        : (["motoristas", "acessorios", "mensagemcb"] as const);

      // Busca last_mld para RequestMensagemCB
      let lastMld = 1;
      try {
        const { data: mldData } = await supabase
          .from("vehicle_telemetry")
          .select("last_mld")
          .order("last_mld", { ascending: false })
          .limit(1)
          .maybeSingle();
        const parsed = Number(mldData?.last_mld);
        if (Number.isInteger(parsed) && parsed > 0) lastMld = parsed;
      } catch {
        // ignore
      }

      for (const reqName of wanted) {
        if (reqName === "motoristas") {
          await doXmlRequest(
            "motoristas",
            buildMotoristasRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD),
          );
        }
        if (reqName === "acessorios") {
          await doXmlRequest(
            "acessorios",
            buildAcessoriosRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD),
          );
        }
        if (reqName === "mensagemcb") {
          await doXmlRequest(
            "mensagemcb",
            buildMensagemCbRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, lastMld),
            { timeoutMs: 60_000 },
          );
        }
        if (reqName === "veiculo") {
          await doXmlRequest("veiculo", buildVehicleRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, input.alterados), {
            timeoutMs: 60_000,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          message: "Debug-only executado. Veja os logs da função para XML request/response.",
          debug: {
            urlUsed: webserviceUrl,
            publicIp,
            executed: wanted,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    async function doXmlRequest(
      label: string,
      requestXml: string,
      opts?: { timeoutMs?: number },
    ): Promise<{
      attempt: AttemptLog;
      responseText: string;
      responseMeta: {
        url: string;
        status: number;
        ok: boolean;
        contentType: string | null;
        wasZip: boolean;
        truncated: boolean;
        bodyPreview: string;
        bodyLengthBytes: number;
      };
    }> {
      const timeoutMs = opts?.timeoutMs ?? 30_000; // debug não pode travar tudo
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        let response: Response;
        try {
          response = await fetch(webserviceUrl, {
            method: "POST",
            headers: {
              // Headers simplificados para evitar negociação de compressão/handshake
              "Content-Type": "text/xml",
              "User-Agent": "Mozilla/5.0",
            },
            body: requestXml,
            signal: controller.signal,
          });
        } catch (e) {
          const errMsg = String(e);
          console.error(`[truckscontrol-sync][${label}] NETWORK ERROR:`, errMsg);

          const attempt: AttemptLog = {
            url: webserviceUrl,
            status: 0,
            ok: false,
            contentType: null,
            wasZip: false,
            preview: errMsg,
            error: errMsg,
            truncated: false,
            bodyLengthBytes: 0,
          };

          console.log(`[truckscontrol-sync][${label}] XML REQUEST:`);
          console.log(maskCredentialsInXml(requestXml));
          console.log(`[truckscontrol-sync][${label}] endpoint:`, webserviceUrl);

          return {
            attempt,
            responseText: "",
            responseMeta: {
              url: webserviceUrl,
              status: 0,
              ok: false,
              contentType: null,
              wasZip: false,
              truncated: false,
              bodyPreview: errMsg,
              bodyLengthBytes: 0,
            },
          };
        }

        const contentType = response.headers.get("content-type");
        const limited = await readBodyLimited(response, 5_000_000);
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

        // Console logs: request e response (masked)
        console.log(`[truckscontrol-sync][${label}] XML REQUEST:`);
        console.log(maskCredentialsInXml(requestXml));
        console.log(`[truckscontrol-sync][${label}] endpoint:`, webserviceUrl);
        console.log(`[truckscontrol-sync][${label}] HTTP ${response.status} ok=${response.ok} ct=${contentType} bytes=${limited.bytes.length} zip=${decoded.wasZip}`);
        if (decoded.text) {
          console.log(`[truckscontrol-sync][${label}] RESPONSE TEXT (preview):`);
          console.log(decoded.text.slice(0, 50_000));
        } else {
          console.log(`[truckscontrol-sync][${label}] RESPONSE TEXT: <<empty body>>`);
        }

        if (debug?.responses) {
          debug.responses.push({
            url: webserviceUrl,
            status: response.status,
            ok: response.ok,
            contentType,
            wasZip: decoded.wasZip,
            truncated: limited.truncated,
            bodyPreview: decoded.text ? decoded.text.slice(0, 50_000) : "<<empty body>>",
            bodyLengthBytes: limited.bytes.length,
          });
        }

        return {
          attempt,
          responseText: decoded.text || "",
          responseMeta: {
            url: webserviceUrl,
            status: response.status,
            ok: response.ok,
            contentType,
            wasZip: decoded.wasZip,
            truncated: limited.truncated,
            bodyPreview: decoded.text ? decoded.text.slice(0, 50_000) : "<<empty body>>",
            bodyLengthBytes: limited.bytes.length,
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    // ==========================================
    // RequestVeiculo (principal) - 1 única chamada usada p/ debug + parsing
    // ==========================================
    const { attempt, responseText, responseMeta: vehicleMeta } = await doXmlRequest("veiculo", xmlRequest, {
      timeoutMs: 60_000,
    });

    console.log("[truckscontrol-sync] response bytes preview:", "(ver acima no log do request veiculo)");

    let rawXml: string | null = null;
    let lastApiError: string | null = null;

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
      status: attempt.status,
      ok: attempt.ok,
      bytesReceived: attempt.bodyLengthBytes ?? 0,
      wasZip: attempt.wasZip,
      vehiclesXmlFound: Boolean(rawXml),
      error: lastApiError ?? null,
    });

    const vehiclesData: TrucksControlVehicle[] = [];

    if (rawXml) {
      const vehicleNodes = parseXmlArray(rawXml, "Veiculo");
      console.log(`[truckscontrol-sync] Veículos encontrados no XML: ${vehicleNodes.length}`);
      
      for (const vehicleXml of vehicleNodes) {
        const placa = parseXmlValue(vehicleXml, "placa");
        
        // Log completo do XML do primeiro veículo para debug
        if (vehicleNodes.indexOf(vehicleXml) === 0) {
          console.log(`[truckscontrol-sync] XML completo do primeiro veículo:`, vehicleXml);
        }
        
        // Tentar extrair odômetro de várias tags possíveis (case-insensitive search)
        const xmlLower = vehicleXml.toLowerCase();
        let odoStr = "0";
        const odoTags = ['odometro', 'odo', 'km', 'quilometragem', 'hodometro', 'hodo', 'mileage', 'totalkm'];
        
        for (const tag of odoTags) {
          const val = parseXmlValue(vehicleXml, tag) || parseXmlValue(vehicleXml, tag.charAt(0).toUpperCase() + tag.slice(1));
          if (val && val !== "0") {
            odoStr = val;
            console.log(`[truckscontrol-sync] ${placa}: encontrado ${tag}=${val}`);
            break;
          }
        }
        
        const odo = parseInt(odoStr.replace(/[^\d]/g, ''), 10) || 0;
        
        // Tentar latitude/longitude
        const latStr = parseXmlValue(vehicleXml, "latitude") || parseXmlValue(vehicleXml, "lat") || parseXmlValue(vehicleXml, "Latitude") || "0";
        const lngStr = parseXmlValue(vehicleXml, "longitude") || parseXmlValue(vehicleXml, "lng") || parseXmlValue(vehicleXml, "lon") || parseXmlValue(vehicleXml, "Longitude") || "0";
        const velStr = parseXmlValue(vehicleXml, "velocidade") || parseXmlValue(vehicleXml, "vel") || parseXmlValue(vehicleXml, "Velocidade") || "0";
        const ignStr = parseXmlValue(vehicleXml, "ignicao") || parseXmlValue(vehicleXml, "ign") || parseXmlValue(vehicleXml, "Ignicao");
        
        // Log detalhado para cada veículo
        console.log(`[truckscontrol-sync] Veículo ${placa}: odo=${odo}, lat=${latStr}, lng=${lngStr}`);
        
        const vehicle: TrucksControlVehicle = {
          veiID: parseXmlValue(vehicleXml, "veiID") || parseXmlValue(vehicleXml, "id") || undefined,
          placa: placa || undefined,
          mot: parseXmlValue(vehicleXml, "mot") || parseXmlValue(vehicleXml, "modelo") || undefined,
          ident: parseXmlValue(vehicleXml, "ident") || parseXmlValue(vehicleXml, "identificador") || undefined,
          odometro: odo > 0 ? odo : undefined,
          latitude: parseFloat(latStr) || undefined,
          longitude: parseFloat(lngStr) || undefined,
          velocidade: parseInt(velStr, 10) || undefined,
          ignicao: ignStr === "1" || ignStr === "true" || ignStr === "on" || ignStr === "Ligado",
        };
        if (vehicle.placa) vehiclesData.push(vehicle);
      }
    }

    // ==========================================
    // Debug: executar outras requisições (sem alterar dados do banco)
    // ==========================================
    if (debugEnabled && debugAllRequests) {
      const wanted = debugRequests?.length
        ? debugRequests
        : (["veiculo", "motoristas", "acessorios", "mensagemcb"] as const);

      const bundle: DebugBundleEntry[] = [];
      // sempre inclui o veículo já executado
      bundle.push({
        name: "veiculo",
        requestXml: includeSensitive ? xmlRequest : undefined,
        requestXmlMasked: includeSensitive ? xmlRequest : maskCredentialsInXml(xmlRequest),
        response: vehicleMeta,
        apiError: lastApiError,
      });

      // Busca last_mld para RequestMensagemCB
      let lastMld = 1;
      try {
        const { data: mldData } = await supabase
          .from("vehicle_telemetry")
          .select("last_mld")
          .order("last_mld", { ascending: false })
          .limit(1)
          .maybeSingle();
        const parsed = Number(mldData?.last_mld);
        if (Number.isInteger(parsed) && parsed > 0) lastMld = parsed;
      } catch {
        // ignore
      }

      for (const reqName of wanted) {
        if (reqName === "veiculo") continue; // já executado
        if (reqName === "motoristas") {
          const reqXml = buildMotoristasRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD);
          const { responseText: txt, responseMeta } = await doXmlRequest(
            "motoristas",
            reqXml,
          );

          const apiError =
            txt.includes("<erro>") || txt.includes("<ErrorRequest")
              ? parseXmlValue(txt, "erro") || "Erro retornado pela TrucksControl"
              : null;

          bundle.push({
            name: "motoristas",
            requestXml: includeSensitive ? reqXml : undefined,
            requestXmlMasked: includeSensitive ? reqXml : maskCredentialsInXml(reqXml),
            response: responseMeta,
            apiError,
          });
        }
        if (reqName === "acessorios") {
          const reqXml = buildAcessoriosRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD);
          const { responseText: txt, responseMeta } = await doXmlRequest(
            "acessorios",
            reqXml,
          );

          const apiError =
            txt.includes("<erro>") || txt.includes("<ErrorRequest")
              ? parseXmlValue(txt, "erro") || "Erro retornado pela TrucksControl"
              : null;

          bundle.push({
            name: "acessorios",
            requestXml: includeSensitive ? reqXml : undefined,
            requestXmlMasked: includeSensitive ? reqXml : maskCredentialsInXml(reqXml),
            response: responseMeta,
            apiError,
          });
        }
        if (reqName === "mensagemcb") {
          const reqXml = buildMensagemCbRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, lastMld);
          const { responseText: txt, responseMeta } = await doXmlRequest(
            "mensagemcb",
            reqXml,
          );

          const apiError =
            txt.includes("<erro>") || txt.includes("<ErrorRequest")
              ? parseXmlValue(txt, "erro") || "Erro retornado pela TrucksControl"
              : null;

          bundle.push({
            name: "mensagemcb",
            requestXml: includeSensitive ? reqXml : undefined,
            requestXmlMasked: includeSensitive ? reqXml : maskCredentialsInXml(reqXml),
            response: responseMeta,
            apiError,
          });
        }
      }

      console.log("[truckscontrol-sync] debugAllRequests finished", {
        publicIp,
        executed: wanted,
        lastMld,
      });

      // Se o modo for apenas diagnóstico, responde com o bundle completo e não altera dados do banco.
      if (onlyDebugRequests) {
        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            message: "Debug Bundle gerado",
            debugBundle: {
              urlUsed: webserviceUrl,
              publicIp,
              requests: bundle,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    let vehiclesMatched = 0;
    let vehiclesCreated = 0;
    let vehiclesMileageUpdated = 0;
    
    for (const vehicle of vehiclesData) {
      if (!vehicle.placa) continue;
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id, plate, mileage")
        .eq("plate", vehicle.placa)
        .maybeSingle();

      if (existingVehicle) {
        vehiclesMatched++;
        
        // Atualizar odômetro se disponível e maior que o atual
        if (vehicle.odometro && vehicle.odometro > (existingVehicle.mileage || 0)) {
          const { error: updateError } = await supabase
            .from("vehicles")
            .update({ mileage: vehicle.odometro })
            .eq("id", existingVehicle.id);
          
          if (!updateError) {
            vehiclesMileageUpdated++;
            console.log(`[truckscontrol-sync] Odômetro atualizado: ${vehicle.placa} = ${vehicle.odometro} km`);
          }
        }
        
        // Atualizar telemetria se tiver coordenadas
        if (vehicle.latitude && vehicle.longitude) {
          await supabase
            .from("vehicle_telemetry")
            .upsert({
              vehicle_id: existingVehicle.id,
              vehicle_plate: vehicle.placa,
              truckscontrol_id: vehicle.veiID,
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
              speed: vehicle.velocidade,
              ignition_on: vehicle.ignicao,
              odometer: vehicle.odometro,
              received_at: new Date(),
            }, {
              onConflict: "vehicle_id",
            });
        }
      } else {
        // Criar veículo novo automaticamente
        const { error: insertError } = await supabase
          .from("vehicles")
          .insert({
            plate: vehicle.placa,
            model: vehicle.mot || "Não especificado",
            brand: "Não especificado",
            year: new Date().getFullYear(),
            mileage: vehicle.odometro || 0,
            fuel_type: "diesel",
            status: "active",
            next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
        
        if (!insertError) {
          vehiclesCreated++;
          console.log(`[truckscontrol-sync] Veículo criado: ${vehicle.placa} com ${vehicle.odometro || 0} km`);
        } else {
          console.error(`[truckscontrol-sync] Erro ao criar veículo ${vehicle.placa}:`, insertError);
        }
      }
    }

    const success = Boolean(rawXml) && vehiclesData.length >= 0;

    return new Response(
      JSON.stringify({
        success,
        timestamp: new Date().toISOString(),

        vehiclesReceived: vehiclesData.length,
        vehiclesUpdated: vehiclesMatched,
        vehiclesCreated: vehiclesCreated,
        vehiclesMileageUpdated: vehiclesMileageUpdated,
        journeyEventsReceived: 0,
        journeyEntriesCreated: 0,

        message: success
          ? `OK: ${vehiclesData.length} veículo(s) recebidos. ${vehiclesMatched} já cadastrados, ${vehiclesCreated} novos criados, ${vehiclesMileageUpdated} km atualizados.`
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
