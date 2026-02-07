import { createClient } from "npm:@supabase/supabase-js@2";
import { gunzipSync, strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TelemetryMessage {
  veiID?: string;
  placa?: string;
  latitude?: number;
  longitude?: number;
  velocidade?: number;
  ignicao?: boolean;
  direcao?: number;
  odometro?: number;
  dataHora?: string;
  motorista?: string;
  motID?: string;
  macro?: string;
  tpMsg?: number;
  tfrID?: string;
  rpm?: number;
  lt?: number;
  evt4?: boolean;
  evt34?: boolean;
  evt35?: boolean;
  evt16?: boolean;
  evt105?: boolean;
  evt109?: boolean;
  mld?: number; // ID da mensagem para persistência
}

interface JourneyLegalSettings {
  macro_journey_start: string | null;
  macro_journey_end: string | null;
  macro_break_start: string | null;
  macro_break_end: string | null;
}

interface TelemetrySettings {
  speed_limit_highway: number;
  speed_limit_urban: number;
  hard_brake_threshold: number;
  hard_accel_threshold: number;
  idle_warning_minutes: number;
  idle_critical_minutes: number;
}

type InputBody = {
  debug?: boolean;
  veiID?: string;
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

/**
 * Constrói o XML da requisição RequestMensagemCB
 * IMPORTANTE: Inclui APENAS as tags obrigatórias:
 * - <login> e <senha> para autenticação
 * - <mId> (I maiúsculo) para sequenciamento de mensagens
 * 
 * NÃO inclui <atributos> pois causa erro "Atributos inválidos"
 * O servidor retorna o pacote completo de dados automaticamente
 */
function buildTelemetryRequestXml(
  user: string,
  password: string,
  opts?: { veiID?: string; mId?: number },
): string {
  // VALIDAÇÃO CRÍTICA: mId NUNCA pode ser null/undefined/NaN/0
  // Default obrigatório: 1 (inteiro)
  let mIdValue: number = 1;
  
  if (opts?.mId !== null && opts?.mId !== undefined) {
    const parsed = Number(opts.mId);
    if (!isNaN(parsed) && parsed > 0 && Number.isInteger(parsed)) {
      mIdValue = parsed;
    }
  }
  
  // Garantia final
  if (!mIdValue || isNaN(mIdValue) || mIdValue <= 0) {
    mIdValue = 1;
  }
  
  // XML SIMPLES: login + senha + mId (sem atributos para evitar erro de validação)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>
  <mId>${mIdValue}</mId>${opts?.veiID ? `\n  <veiID>${escapeXml(opts.veiID)}</veiID>` : ""}
</RequestMensagemCB>`;

  return xml;
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function looksLikeGzip(bytes: Uint8Array): boolean {
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

function unzipFirstFileFromZip(
  zipBytes: Uint8Array,
  opts?: { maxUnzippedBytes?: number },
): Uint8Array {
  const maxOut = opts?.maxUnzippedBytes ?? 5_000_000;

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
      console.error("[truckscontrol-telemetry] unzip failed", String(e));
      return { text: "", wasZip: true };
    }
  }

  if (looksLikeGzip(bytes)) {
    try {
      const out = gunzipSync(bytes);
      return { text: strFromU8(out), wasZip: true };
    } catch (e) {
      console.error("[truckscontrol-telemetry] gunzipSync failed", String(e));
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

// Mapeamento de tfrID (macros) para tipos de evento de jornada
const JOURNEY_MACRO_MAP: Record<string, string> = {
  "1": "journey_start",
  "2": "meal",
  "3": "rest",
  "4": "overnight",
  "5": "journey_end",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await safeJson(req);
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

    // ==========================================
    // PASSO 1: Buscar o maior mld já processado
    // IMPORTANTE: mld NUNCA pode ser null/undefined/NaN
    // Default obrigatório: 1 (inteiro)
    // ==========================================
    let lastMld: number = 1; // Default OBRIGATÓRIO para primeira execução
    
    const { data: mldData, error: mldError } = await supabase
      .from("vehicle_telemetry")
      .select("last_mld")
      .order("last_mld", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Validação robusta: só usa o valor do banco se for um número válido > 0
    if (!mldError && mldData?.last_mld !== null && mldData?.last_mld !== undefined) {
      const parsedMld = Number(mldData.last_mld);
      if (!isNaN(parsedMld) && parsedMld > 0 && Number.isInteger(parsedMld)) {
        lastMld = parsedMld;
      }
    }
    
    // GARANTIA FINAL: se por qualquer motivo lastMld não for válido, força 1
    if (!lastMld || isNaN(lastMld) || lastMld <= 0 || !Number.isInteger(lastMld)) {
      console.warn("[truckscontrol-telemetry] mld inválido detectado, forçando para 1");
      lastMld = 1;
    }
    
    console.log("[truckscontrol-telemetry] start", {
      ts: new Date().toISOString(),
      debugEnabled,
      veiID: input.veiID || "all",
      lastMld,
      mldSource: mldData?.last_mld ? "database" : "default",
    });

    // Buscar configurações de telemetria
    const { data: settingsData } = await supabase
      .from("telemetry_settings")
      .select("*")
      .limit(1)
      .single();

    const settings: TelemetrySettings = settingsData || {
      speed_limit_highway: 80,
      speed_limit_urban: 60,
      hard_brake_threshold: 0.4,
      hard_accel_threshold: 0.35,
      idle_warning_minutes: 30,
      idle_critical_minutes: 60,
    };

    const webserviceUrl = "https://webservice.newrastreamentoonline.com.br";

    // ==========================================
    // PASSO 1.5: Logar IP público de saída (diagnóstico de firewall)
    // ==========================================
    let publicIp: string | null = null;
    try {
      const ipController = new AbortController();
      const ipTimeout = setTimeout(() => ipController.abort(), 4000);

      const ipRes = await fetch("https://api.ipify.org?format=json", {
        method: "GET",
        headers: {
          // Mantém simples e consistente
          "User-Agent": "Mozilla/5.0",
        },
        signal: ipController.signal,
      });

      clearTimeout(ipTimeout);

      if (ipRes.ok) {
        const json = (await ipRes.json()) as { ip?: string };
        publicIp = json?.ip ?? null;
        if (publicIp) console.log("IP de Saída:", publicIp);
      } else {
        console.warn("[truckscontrol-telemetry] ipify non-200", ipRes.status);
      }
    } catch (e) {
      console.warn("[truckscontrol-telemetry] ipify failed", String(e));
    }

    // ==========================================
    // PASSO 2: Construir XML com a tag <mld>
    // ==========================================
    // XML SIMPLES: SEM tag <atributos> para evitar erro "Atributos inválidos"
    // O servidor TrucksControl retorna o pacote completo automaticamente
    const xmlRequest = buildTelemetryRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, {
      veiID: input.veiID,
      mId: lastMld,
    });
    const xmlRequestMasked = maskPasswordInXml(xmlRequest);

    let responseText = "";
    let responseStatus = 0;
    let responseContentType: string | null = null;

    // Log completo do XML (senha mascarada)
    console.log("[truckscontrol-telemetry] XML REQUEST:");
    console.log(xmlRequestMasked);
    console.log("[truckscontrol-telemetry] endpoint:", webserviceUrl);

    const timeoutMs = 28_000; // limite efetivo observado no ambiente (~30s). Mantemos abaixo disso.

    const headers = {
      "Content-Type": "text/xml",
      "User-Agent": "Mozilla/5.0",
      // evita negociação de compressão que às vezes aumenta latência/handshake
      "Accept": "text/xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity",
      "Connection": "close",
    };

    async function postXmlOnce(): Promise<Response> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(webserviceUrl, {
          method: "POST",
          headers,
          body: xmlRequest,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    let response: Response;
    try {
      response = await postXmlOnce();
    } catch (fetchError) {
      // Retry 1x em abort/timeout: a API do fornecedor oscila.
      const msg = String(fetchError);
      const isAbortRetry = /abort/i.test(msg);
      if (isAbortRetry) {
        console.warn("[truckscontrol-telemetry] first attempt timed out; retrying once...");
        try {
          response = await postXmlOnce();
        } catch (retryError) {
          const errMsg = String(retryError);
          const isFailedToFetch = retryError instanceof TypeError && /failed to fetch/i.test(errMsg);
          const isConnectionError = /connection refused|ECONNREFUSED/i.test(errMsg);
          const isTlsError = /tls|handshake|ssl|certificate/i.test(errMsg);
          const isAbort = /abort/i.test(errMsg);
          const type = isFailedToFetch ? "FAILED_TO_FETCH" : isConnectionError ? "CONNECTION_REFUSED" : isTlsError ? "TLS_HANDSHAKE_FAILED" : isAbort ? "TIMEOUT_ABORTED" : "UNKNOWN";
          const isFirewallLike = isFailedToFetch || isConnectionError || isTlsError;
          const friendly = isFirewallLike ? "Erro de Firewall (Conexão Recusada)" : isAbort ? "Timeout ao conectar na TrucksControl" : "Erro de rede ao conectar na TrucksControl";
          return new Response(JSON.stringify({ success: false, error: friendly, publicIp, timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const errMsg = String(fetchError);
        const isFailedToFetch = fetchError instanceof TypeError && /failed to fetch/i.test(errMsg);
        const isConnectionError = /connection refused|ECONNREFUSED/i.test(errMsg);
        const isTlsError = /tls|handshake|ssl|certificate/i.test(errMsg);
        const isAbort = /abort/i.test(errMsg);
        const type = isFailedToFetch ? "FAILED_TO_FETCH" : isConnectionError ? "CONNECTION_REFUSED" : isTlsError ? "TLS_HANDSHAKE_FAILED" : isAbort ? "TIMEOUT_ABORTED" : "UNKNOWN";

        console.error("[truckscontrol-telemetry] NETWORK ERROR", { type, message: errMsg, endpoint: webserviceUrl, publicIp, timestamp: new Date().toISOString() });

        const isFirewallLike = isFailedToFetch || isConnectionError || isTlsError;
        const friendly = isFirewallLike ? "Erro de Firewall (Conexão Recusada)" : isAbort ? "Timeout ao conectar na TrucksControl" : "Erro de rede ao conectar na TrucksControl";

        try {
          await supabase.from("telemetry_settings").update({ last_error_debug: { publicIp, error: friendly, networkType: type, rawError: errMsg, endpoint: webserviceUrl, timestamp: new Date().toISOString() } }).eq("id", settingsData?.id);
        } catch (saveErr) {
          console.warn("[truckscontrol-telemetry] Failed to save error debug:", String(saveErr));
        }

        return new Response(
          JSON.stringify({
            success: false, error: friendly, publicIp, timestamp: new Date().toISOString(), endpoint: webserviceUrl,
            debug: debugEnabled ? { publicIp, requestXmlMasked: xmlRequestMasked, rawError: errMsg, networkType: type } : undefined,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    // timeout is handled inside postXmlOnce

    responseStatus = response.status;
    responseContentType = response.headers.get("content-type");

    const limited = await readBodyLimited(response, 5_000_000);
    const decoded = decodeTrucksControlBody(limited.bytes);
    responseText = decoded.text || "";

    console.log("[truckscontrol-telemetry] response", {
      status: responseStatus,
      contentType: responseContentType,
      bytes: limited.bytes.length,
      mIdUsed: lastMld,
    });

    const apiErr =
      (responseText.includes("<erro>") || responseText.includes("<ErrorRequest"))
        ? (parseXmlValue(responseText, "erro") ||
            parseXmlValue(responseText, "Erro") ||
            "Erro retornado pela TrucksControl")
        : null;

    if (apiErr) {
      const codigo = parseXmlValue(responseText, "codigo");
      const lastApiError = codigo ? `${apiErr} (código ${codigo})` : apiErr;

      return new Response(
        JSON.stringify({
          success: false,
          error: lastApiError,
          timestamp: new Date().toISOString(),
          mIdUsed: lastMld,
          debug: debugEnabled
            ? {
                requestXmlMasked: xmlRequestMasked,
                status: responseStatus,
                contentType: responseContentType,
                xmlResponse: responseText.slice(0, 5000),
              }
            : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // HELPER: Converter string numérica com vírgula para float
    // ==========================================
    function parseCoordinate(value: string | null): number {
      if (!value) return 0;
      // CRÍTICO: TrucksControl pode retornar vírgula como separador decimal.
      // Força normalização ANTES de qualquer conversão numérica.
      const normalized = value.trim().replace(/,/g, ".");
      const parsed = parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    // Parsear mensagens de telemetria
    // IMPORTANTE: Priorizar <MensagemCB> que é a tag correta do retorno
    const telemetryMessages: TelemetryMessage[] = [];
    let messageNodes = parseXmlArray(responseText, "MensagemCB");
    
    // Fallback para outras tags caso MensagemCB não exista
    if (!messageNodes.length) {
      messageNodes = parseXmlArray(responseText, "Mensagem");
    }
    if (!messageNodes.length) {
      messageNodes = parseXmlArray(responseText, "Veiculo");
    }
    
    console.log("[truckscontrol-telemetry] tag utilizada:", 
      messageNodes.length ? "MensagemCB/Mensagem/Veiculo" : "nenhuma encontrada",
      "total nodes:", messageNodes.length);

    // ==========================================
    // PASSO 3: Processar mensagens e extrair mld
    // ==========================================
    let maxMldReceived = lastMld;

    for (const msgXml of messageNodes) {
      // MAPEAMENTO CORRETO DAS TAGS:
      // <lat> = latitude (com tratamento de vírgula)
      // <lon> = longitude (com tratamento de vírgula)  
      // <dt> = data/hora (timestamp)
      // <odm> = hodômetro
      const latStr = parseXmlValue(msgXml, "lat") || parseXmlValue(msgXml, "latitude") || "0";
      const lonStr = parseXmlValue(msgXml, "lon") || parseXmlValue(msgXml, "longitude") || parseXmlValue(msgXml, "lng") || "0";
      
      const lat = parseCoordinate(latStr);
      const lng = parseCoordinate(lonStr);
      
      const vel = parseInt(parseXmlValue(msgXml, "velocidade") || parseXmlValue(msgXml, "vel") || "0", 10);
      // Ignição: prioriza <evt4> (padrão TrucksControl), depois <ignicao>/<ign>
      const evt4Raw = parseXmlValue(msgXml, "evt4");
      const ign = evt4Raw || parseXmlValue(msgXml, "ignicao") || parseXmlValue(msgXml, "ign");
      const dir = parseInt(parseXmlValue(msgXml, "direcao") || parseXmlValue(msgXml, "dir") || "0", 10);
      
      // MAPEAMENTO: <odm> para hodômetro (prioridade)
      const odo = parseInt(parseXmlValue(msgXml, "odm") || parseXmlValue(msgXml, "odometro") || parseXmlValue(msgXml, "odo") || "0", 10);
      
      // MAPEAMENTO: <dt> para timestamp (prioridade)
      const dataHoraRaw = parseXmlValue(msgXml, "dt") || parseXmlValue(msgXml, "dataHora") || parseXmlValue(msgXml, "data");
      
      // Extrair mId da mensagem para persistência (tag correta: mId ou mID)
      const mIdStr = parseXmlValue(msgXml, "mId") || parseXmlValue(msgXml, "mID") || parseXmlValue(msgXml, "mid") || "0";
      const mId = parseInt(mIdStr, 10);
      
      // Atualizar o maior mId recebido
      if (mId > maxMldReceived) {
        maxMldReceived = mId;
      }
      
      const tpMsg = parseInt(parseXmlValue(msgXml, "tpMsg") || "0", 10);
      const tfrID = parseXmlValue(msgXml, "tfrID") || parseXmlValue(msgXml, "tfrid");
      const motID = parseXmlValue(msgXml, "motID") || parseXmlValue(msgXml, "motid");
      
      // Dados CAN
      const rpm = parseInt(parseXmlValue(msgXml, "rpm") || "0", 10);
      const lt = parseFloat(parseXmlValue(msgXml, "lt") || "0");
      const evt34Raw = parseXmlValue(msgXml, "evt34");
      const evt35Raw = parseXmlValue(msgXml, "evt35");
      const evt16Raw = parseXmlValue(msgXml, "evt16");
      const evt105Raw = parseXmlValue(msgXml, "evt105");
      const evt109Raw = parseXmlValue(msgXml, "evt109");
      
      const macro = parseXmlValue(msgXml, "macro") || 
                    parseXmlValue(msgXml, "MACRO") || 
                    parseXmlValue(msgXml, "codigoMacro") ||
                    parseXmlValue(msgXml, "codMacro") ||
                    parseXmlValue(msgXml, "evento") ||
                    parseXmlValue(msgXml, "tipoEvento") ||
                    undefined;

      const msg: TelemetryMessage = {
        veiID: parseXmlValue(msgXml, "veiID") || undefined,
        placa: parseXmlValue(msgXml, "placa") || undefined,
        latitude: lat,
        longitude: lng,
        velocidade: vel,
        // Se vel > 0, forçar ignição ligada (safety net)
        ignicao: vel > 0 || ign === "1" || ign === "true" || ign === "on",
        direcao: dir,
        odometro: odo,
        dataHora: dataHoraRaw || undefined,
        motorista: parseXmlValue(msgXml, "mot") || parseXmlValue(msgXml, "motorista") || undefined,
        motID: motID || undefined,
        macro: macro || undefined,
        tpMsg: tpMsg,
        tfrID: tfrID || undefined,
        rpm: rpm || undefined,
        lt: lt || undefined,
        evt4: evt4Raw === "1" || evt4Raw === "true",
        evt34: evt34Raw === "1" || evt34Raw === "true",
        evt35: evt35Raw === "1" || evt35Raw === "true",
        evt16: evt16Raw === "1" || evt16Raw === "true",
        evt105: evt105Raw === "1" || evt105Raw === "true",
        evt109: evt109Raw === "1" || evt109Raw === "true",
        mld: mId || undefined,
      };

      if (msg.placa || msg.veiID) {
        telemetryMessages.push(msg);
      }
    }

    console.log("[truckscontrol-telemetry] parsed messages:", telemetryMessages.length, "maxMld:", maxMldReceived);
    
    // Buscar configurações de jornada para macros
    const { data: journeySettings } = await supabase
      .from("journey_legal_settings")
      .select("macro_journey_start, macro_journey_end, macro_break_start, macro_break_end")
      .limit(1)
      .single();

    // Atualizar telemetria no banco
    let telemetryUpdated = 0;
    let alertsCreated = 0;
    let journeyEventsCreated = 0;
    let vehicleMileageUpdated = 0;
    let canDataInserted = 0;

    for (const msg of telemetryMessages) {
      // IMPORTANTE: O XML da TrucksControl retorna veiID (ID interno), não a placa
      // Precisamos buscar o veículo pelo truckscontrol_id OU pela placa
      if (!msg.placa && !msg.veiID) continue;

      // Buscar veículo - prioriza busca por truckscontrol_id, depois por placa
      let vehicle: { id: string; plate: string; mileage: number | null } | null = null;
      
      // Primeira tentativa: buscar pelo truckscontrol_id (veiID)
      if (msg.veiID) {
        const { data: vehicleByTcId } = await supabase
          .from("vehicles")
          .select("id, plate, mileage")
          .eq("truckscontrol_id", msg.veiID)
          .maybeSingle();
        
        if (vehicleByTcId) {
          vehicle = vehicleByTcId;
        }
      }
      
      // Segunda tentativa: buscar pela placa (se ainda não encontrou)
      if (!vehicle && msg.placa) {
        const { data: vehicleByPlate } = await supabase
          .from("vehicles")
          .select("id, plate, mileage")
          .eq("plate", msg.placa)
          .maybeSingle();
        
        if (vehicleByPlate) {
          vehicle = vehicleByPlate;
        }
      }
      
      // Se não encontrou o veículo, log e pula
      if (!vehicle) {
        console.log(`[truckscontrol-telemetry] Veículo não encontrado: veiID=${msg.veiID}, placa=${msg.placa}`);
        continue;
      }
      
      // Usa a placa do veículo encontrado no banco (mais confiável)
      const vehiclePlate = vehicle.plate;

      // Buscar vinculação ativa de motorista
      const { data: assignment } = await supabase
        .from("driver_vehicle_assignments")
        .select("driver_id, driver_name")
        .eq("vehicle_id", vehicle.id)
        .eq("is_active", true)
        .maybeSingle();

      // ==========================================
      // PASSO 4: Salvar telemetria COM o last_mld
      // ==========================================
      // Construir lista de eventos ativos a partir dos dados já parseados no msg
      const activeEvents: string[] = [];
      if (msg.evt4) activeEvents.push("evt4");
      if (msg.evt34) activeEvents.push("evt34");
      if (msg.evt35) activeEvents.push("evt35");
      if (msg.evt16) activeEvents.push("evt16");
      if (msg.evt105) activeEvents.push("evt105");
      if (msg.evt109) activeEvents.push("evt109");

      const telemetryUpsertPayload = {
        vehicle_id: vehicle.id,
        vehicle_plate: vehiclePlate,
        truckscontrol_id: msg.veiID,
        latitude: msg.latitude,
        longitude: msg.longitude,
        speed: msg.velocidade,
        heading: msg.direcao,
        ignition_on: msg.ignicao,
        odometer: msg.odometro,
        fuel_level: msg.lt || null,
        rpm: msg.rpm || null,
        events: activeEvents,
        gps_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
        received_at: new Date(),
        // Salva o mId individual (quando existir) ou o maior mId do lote
        last_mld: msg.mld || maxMldReceived,
      };

      const { error: telemetryError } = await supabase
        .from("vehicle_telemetry")
        .upsert(telemetryUpsertPayload, {
          onConflict: "vehicle_id",
        });

      if (telemetryError) {
        // LOG DETALHADO para identificar campo que falhou no banco
        console.error("[truckscontrol-telemetry] DB upsert failed: vehicle_telemetry", {
          error: telemetryError,
          payload: telemetryUpsertPayload,
          source: {
            veiID: msg.veiID,
            placa: msg.placa,
            dt: msg.dataHora,
            odm: msg.odometro,
            lat: msg.latitude,
            lon: msg.longitude,
            tpMsg: msg.tpMsg,
            tfrID: msg.tfrID,
            mId: msg.mld,
          },
        });
        continue;
      }

      if (!telemetryError) {
        telemetryUpdated++;

        // AUTOMAÇÃO: Atualizar hodômetro do veículo
        if (msg.odometro && msg.odometro > 0 && msg.odometro > (vehicle.mileage || 0)) {
          const { error: updateMileageError } = await supabase
            .from("vehicles")
            .update({ mileage: msg.odometro })
            .eq("id", vehicle.id);
          
          if (!updateMileageError) {
            vehicleMileageUpdated++;
            console.log(`[truckscontrol-telemetry] Hodômetro atualizado: ${vehiclePlate} = ${msg.odometro} km`);
          }
        }

        // Inserir no histórico
        await supabase.from("telemetry_history").insert({
          vehicle_id: vehicle.id,
          vehicle_plate: vehiclePlate,
          driver_id: assignment?.driver_id,
          driver_name: assignment?.driver_name || msg.motorista,
          latitude: msg.latitude,
          longitude: msg.longitude,
          speed: msg.velocidade,
          heading: msg.direcao,
          ignition_on: msg.ignicao,
          gps_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
        });

        // AUTOMAÇÃO: Armazenar dados CAN se disponíveis
        if (msg.rpm || msg.lt || msg.evt34 || msg.evt35) {
          const { error: canError } = await supabase.from("vehicle_can_data").insert({
            vehicle_id: vehicle.id,
            vehicle_plate: vehiclePlate,
            driver_id: assignment?.driver_id,
            driver_name: assignment?.driver_name || msg.motorista,
            data_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
            rpm: msg.rpm || null,
            speed: msg.velocidade || null,
            fuel_level: msg.lt || null,
            odometer: msg.odometro || null,
            speed_violation: msg.evt34 || false,
            rpm_violation: msg.evt35 || false,
            raw_data: { rpm: msg.rpm, lt: msg.lt, evt34: msg.evt34, evt35: msg.evt35, tpMsg: msg.tpMsg, mld: msg.mld },
          });
          
          if (!canError) canDataInserted++;
        }

        // Verificar alertas de velocidade
        if (msg.velocidade && msg.velocidade > settings.speed_limit_highway) {
          const { error: alertError } = await supabase.from("telemetry_alerts").insert({
            vehicle_id: vehicle.id,
            vehicle_plate: vehiclePlate,
            driver_id: assignment?.driver_id,
            driver_name: assignment?.driver_name || msg.motorista,
            alert_type: "speeding",
            severity: msg.velocidade > settings.speed_limit_highway + 20 ? "critical" : "warning",
            title: "Velocidade excessiva",
            message: `Veículo ${vehiclePlate} a ${msg.velocidade} km/h (limite: ${settings.speed_limit_highway} km/h)`,
            latitude: msg.latitude,
            longitude: msg.longitude,
            speed: msg.velocidade,
            speed_limit: settings.speed_limit_highway,
            event_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
          });

          if (!alertError) alertsCreated++;
        }

        // AUTOMAÇÃO: Processar mensagens de Macro (tpMsg = 3)
        if (msg.tpMsg === 3 && msg.tfrID) {
          const eventType = JOURNEY_MACRO_MAP[msg.tfrID];
          
          if (eventType && assignment?.driver_id) {
            console.log(`[truckscontrol-telemetry] Macro tfrID=${msg.tfrID} -> ${eventType} para motorista ${assignment.driver_name}`);
            
            // Inserir na tabela driver_journey
            const { error: journeyError } = await supabase.from("driver_journey").insert({
              driver_id: assignment.driver_id,
              driver_name: assignment.driver_name,
              vehicle_id: vehicle.id,
              vehicle_plate: vehiclePlate,
              event_type: eventType,
              tfr_id: msg.tfrID,
              event_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
              latitude: msg.latitude,
              longitude: msg.longitude,
              mileage: msg.odometro,
              source: 'telemetry',
              raw_data: { tpMsg: msg.tpMsg, tfrID: msg.tfrID, motID: msg.motID, mld: msg.mld },
            });
            
            if (!journeyError) journeyEventsCreated++;
          }
        }

        // Processar macro de jornada configurado nas settings
        if (msg.macro && assignment?.driver_id && journeySettings) {
          let journeyEventType: string | null = null;
          
          const macroNormalized = msg.macro.toUpperCase().trim();
          
          if (journeySettings.macro_journey_start && 
              macroNormalized === journeySettings.macro_journey_start.toUpperCase().trim()) {
            journeyEventType = 'journey_start';
          } else if (journeySettings.macro_journey_end && 
              macroNormalized === journeySettings.macro_journey_end.toUpperCase().trim()) {
            journeyEventType = 'journey_end';
          } else if (journeySettings.macro_break_start && 
              macroNormalized === journeySettings.macro_break_start.toUpperCase().trim()) {
            journeyEventType = 'break_start';
          } else if (journeySettings.macro_break_end && 
              macroNormalized === journeySettings.macro_break_end.toUpperCase().trim()) {
            journeyEventType = 'break_end';
          }
          
          if (journeyEventType) {
            console.log(`[truckscontrol-telemetry] Macro ${msg.macro} -> ${journeyEventType} para motorista ${assignment.driver_name}`);
            
            const { error: journeyError } = await supabase.from("driver_journey_events").insert({
              driver_id: assignment.driver_id,
              driver_name: assignment.driver_name,
              vehicle_id: vehicle.id,
              vehicle_plate: vehiclePlate,
              event_type: journeyEventType,
              event_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
              macro_code: msg.macro,
              latitude: msg.latitude,
              longitude: msg.longitude,
              mileage: msg.odometro,
              source: 'telemetry_macro',
              raw_data: { macro: msg.macro, velocidade: msg.velocidade, ignicao: msg.ignicao, mld: msg.mld },
            });
            
            if (!journeyError) {
              journeyEventsCreated++;
              
              // Atualizar status do motorista
              const statusMap: Record<string, string> = {
                journey_start: 'driving',
                journey_end: 'available',
                break_start: 'resting',
                break_end: 'driving',
              };
              
              if (statusMap[journeyEventType]) {
                await supabase
                  .from("drivers")
                  .update({ 
                    status: statusMap[journeyEventType],
                    journey_start: journeyEventType === 'journey_start' 
                      ? (msg.dataHora ? new Date(msg.dataHora).toISOString() : new Date().toISOString()) 
                      : undefined,
                  })
                  .eq("id", assignment.driver_id);
              }
              
              // Criar/atualizar conformidade de jornada
              const today = new Date().toISOString().split('T')[0];
              const eventTime = msg.dataHora ? new Date(msg.dataHora).toISOString() : new Date().toISOString();
              
              const { data: existingCompliance } = await supabase
                .from("driver_journey_compliance")
                .select("*")
                .eq("driver_id", assignment.driver_id)
                .eq("journey_date", today)
                .single();
              
              if (existingCompliance) {
                const updates: Record<string, unknown> = {};
                
                if (journeyEventType === 'journey_start' && !existingCompliance.journey_start) {
                  updates.journey_start = eventTime;
                } else if (journeyEventType === 'journey_end') {
                  updates.journey_end = eventTime;
                  if (existingCompliance.journey_start) {
                    const workedMinutes = Math.floor(
                      (new Date(eventTime).getTime() - new Date(existingCompliance.journey_start).getTime()) / 60000
                    ) - (existingCompliance.total_break_minutes || 0);
                    updates.total_worked_minutes = workedMinutes;
                    updates.overtime_minutes = Math.max(0, workedMinutes - 480);
                    updates.is_overtime_compliant = (updates.overtime_minutes as number) <= 120;
                  }
                } else if (journeyEventType === 'break_start') {
                  updates.break_start = eventTime;
                } else if (journeyEventType === 'break_end' && existingCompliance.break_start) {
                  updates.break_end = eventTime;
                  const breakMinutes = Math.floor(
                    (new Date(eventTime).getTime() - new Date(existingCompliance.break_start).getTime()) / 60000
                  );
                  updates.total_break_minutes = (existingCompliance.total_break_minutes || 0) + breakMinutes;
                }
                
                if (Object.keys(updates).length > 0) {
                  updates.source = 'telemetry_macro';
                  await supabase
                    .from("driver_journey_compliance")
                    .update(updates)
                    .eq("id", existingCompliance.id);
                }
              } else if (journeyEventType === 'journey_start') {
                await supabase.from("driver_journey_compliance").insert({
                  driver_id: assignment.driver_id,
                  driver_name: assignment.driver_name,
                  journey_date: today,
                  journey_start: eventTime,
                  source: 'telemetry_macro',
                });
              }
            }
          }
        }
      }
    }

    console.log("[truckscontrol-telemetry] finished", {
      messagesReceived: telemetryMessages.length,
      telemetryUpdated,
      alertsCreated,
      journeyEventsCreated,
      vehicleMileageUpdated,
      canDataInserted,
      previousMld: lastMld,
      newMaxMld: maxMldReceived,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messagesReceived: telemetryMessages.length,
        telemetryUpdated,
        alertsCreated,
        journeyEventsCreated,
        vehicleMileageUpdated,
        canDataInserted,
        mld: {
          previousMld: lastMld,
          newMaxMld: maxMldReceived,
          info: "O próximo request usará mld=" + maxMldReceived,
        },
        debug: debugEnabled ? {
          xmlRequest: xmlRequestMasked,
          xmlResponsePreview: responseText.slice(0, 5000),
          messages: telemetryMessages.slice(0, 10),
          journeySettings,
        } : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("[truckscontrol-telemetry] unhandled error:", error);
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
