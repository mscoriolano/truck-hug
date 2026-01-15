import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gunzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";
import pako from "https://esm.sh/pako@2.1.0";

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
  veiID?: string; // Para buscar apenas um veículo específico
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

function buildTelemetryRequestXml(
  user: string,
  password: string,
  veiID?: string,
): string {
  // RequestMensagemCB para obter telemetria
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>`;
  
  if (veiID) {
    xml += `\n  <veiID>${escapeXml(veiID)}</veiID>`;
  }
  
  xml += `\n</RequestMensagemCB>`;
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

serve(async (req) => {
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

    const xmlRequest = buildTelemetryRequestXml(
      TRUCKSCONTROL_USER,
      TRUCKSCONTROL_PASSWORD,
      input.veiID,
    );

    console.log("[truckscontrol-telemetry] start", {
      ts: new Date().toISOString(),
      debugEnabled,
      veiID: input.veiID || "all",
    });

    const controller = new AbortController();
    // Aumentado para 90s - webservice TrucksControl pode ser lento
    const timeout = setTimeout(() => controller.abort(), 90_000);

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

    const limited = await readBodyLimited(response, 5_000_000);
    const decoded = decodeTrucksControlBody(limited.bytes);
    const responseText = decoded.text || "";

    // Verificar erros
    if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
      const msg =
        parseXmlValue(responseText, "erro") ||
        parseXmlValue(responseText, "Erro") ||
        "Erro retornado pela TrucksControl";
      const codigo = parseXmlValue(responseText, "codigo");
      const lastApiError = codigo ? `${msg} (código ${codigo})` : msg;

      return new Response(
        JSON.stringify({
          success: false,
          error: lastApiError,
          timestamp: new Date().toISOString(),
          debug: debugEnabled ? { xmlResponse: responseText.slice(0, 5000) } : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parsear mensagens de telemetria
    const telemetryMessages: TelemetryMessage[] = [];
    const messageNodes = parseXmlArray(responseText, "Mensagem") || 
                         parseXmlArray(responseText, "MensagemCB") ||
                         parseXmlArray(responseText, "Veiculo");

    for (const msgXml of messageNodes) {
      const lat = parseFloat(parseXmlValue(msgXml, "latitude") || parseXmlValue(msgXml, "lat") || "0");
      const lng = parseFloat(parseXmlValue(msgXml, "longitude") || parseXmlValue(msgXml, "lng") || parseXmlValue(msgXml, "lon") || "0");
      const vel = parseInt(parseXmlValue(msgXml, "velocidade") || parseXmlValue(msgXml, "vel") || "0", 10);
      const ign = parseXmlValue(msgXml, "ignicao") || parseXmlValue(msgXml, "ign");
      const dir = parseInt(parseXmlValue(msgXml, "direcao") || parseXmlValue(msgXml, "dir") || "0", 10);
      const odo = parseInt(parseXmlValue(msgXml, "odometro") || parseXmlValue(msgXml, "odo") || "0", 10);

      const msg: TelemetryMessage = {
        veiID: parseXmlValue(msgXml, "veiID") || undefined,
        placa: parseXmlValue(msgXml, "placa") || undefined,
        latitude: lat,
        longitude: lng,
        velocidade: vel,
        ignicao: ign === "1" || ign === "true" || ign === "on",
        direcao: dir,
        odometro: odo,
        dataHora: parseXmlValue(msgXml, "dataHora") || parseXmlValue(msgXml, "data") || undefined,
        motorista: parseXmlValue(msgXml, "mot") || parseXmlValue(msgXml, "motorista") || undefined,
      };

      if (msg.placa || msg.veiID) {
        telemetryMessages.push(msg);
      }
    }

    console.log("[truckscontrol-telemetry] parsed messages:", telemetryMessages.length);

    // Atualizar telemetria no banco
    let telemetryUpdated = 0;
    let alertsCreated = 0;

    for (const msg of telemetryMessages) {
      if (!msg.placa) continue;

      // Buscar veículo
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, plate")
        .eq("plate", msg.placa)
        .maybeSingle();

      if (!vehicle) continue;

      // Buscar vinculação ativa de motorista
      const { data: assignment } = await supabase
        .from("driver_vehicle_assignments")
        .select("driver_id, driver_name")
        .eq("vehicle_id", vehicle.id)
        .eq("is_active", true)
        .maybeSingle();

      // Inserir telemetria atual
      const { error: telemetryError } = await supabase
        .from("vehicle_telemetry")
        .upsert({
          vehicle_id: vehicle.id,
          vehicle_plate: msg.placa,
          truckscontrol_id: msg.veiID,
          latitude: msg.latitude,
          longitude: msg.longitude,
          speed: msg.velocidade,
          heading: msg.direcao,
          ignition_on: msg.ignicao,
          odometer: msg.odometro,
          gps_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
          received_at: new Date(),
        }, {
          onConflict: "vehicle_id",
        });

      if (!telemetryError) {
        telemetryUpdated++;

        // Inserir no histórico
        await supabase.from("telemetry_history").insert({
          vehicle_id: vehicle.id,
          vehicle_plate: msg.placa,
          driver_id: assignment?.driver_id,
          driver_name: assignment?.driver_name || msg.motorista,
          latitude: msg.latitude,
          longitude: msg.longitude,
          speed: msg.velocidade,
          heading: msg.direcao,
          ignition_on: msg.ignicao,
          gps_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
        });

        // Verificar alertas de velocidade
        if (msg.velocidade && msg.velocidade > settings.speed_limit_highway) {
          const { error: alertError } = await supabase.from("telemetry_alerts").insert({
            vehicle_id: vehicle.id,
            vehicle_plate: msg.placa,
            driver_id: assignment?.driver_id,
            driver_name: assignment?.driver_name || msg.motorista,
            alert_type: "speeding",
            severity: msg.velocidade > settings.speed_limit_highway + 20 ? "critical" : "warning",
            title: "Velocidade excessiva",
            message: `Veículo ${msg.placa} a ${msg.velocidade} km/h (limite: ${settings.speed_limit_highway} km/h)`,
            latitude: msg.latitude,
            longitude: msg.longitude,
            speed: msg.velocidade,
            speed_limit: settings.speed_limit_highway,
            event_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
          });

          if (!alertError) alertsCreated++;
        }
      }
    }

    console.log("[truckscontrol-telemetry] finished", {
      messagesReceived: telemetryMessages.length,
      telemetryUpdated,
      alertsCreated,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messagesReceived: telemetryMessages.length,
        telemetryUpdated,
        alertsCreated,
        debug: debugEnabled ? {
          xmlRequest: maskPasswordInXml(xmlRequest),
          xmlResponsePreview: responseText.slice(0, 5000),
          messages: telemetryMessages.slice(0, 10),
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
