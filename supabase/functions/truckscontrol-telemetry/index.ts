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
  macro?: string; // Código de macro M1, M2, M3, M4, etc.
  evento?: string; // Tipo de evento
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
  opts?: { veiID?: string; atributos?: string },
): string {
  // RequestMensagemCB para obter telemetria
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>`;

  if (opts?.veiID) {
    xml += `\n  <veiID>${escapeXml(opts.veiID)}</veiID>`;
  }

  // Alguns ambientes do TrucksControl exigem explicitamente os atributos retornados.
  // Mantemos como opcional e tentamos algumas variações.
  if (opts?.atributos) {
    xml += `\n  <atributos>${escapeXml(opts.atributos)}</atributos>`;
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

    // A TrucksControl às vezes retorna erro de "atributos inválidos" quando o RequestMensagemCB
    // não informa explicitamente quais campos deseja retornar. Por isso fazemos tentativas com fallback.
    const requestVariants: Array<{ label: string; atributos?: string }> = [
      { label: "no_atributos" },
      { label: "atributos_all", atributos: "all" },
      // fallback mais comum (se 'all' não for aceito)
      { label: "atributos_common", atributos: "veiID,placa,latitude,longitude,velocidade,ignicao,odometro,dataHora" },
    ];

    console.log("[truckscontrol-telemetry] start", {
      ts: new Date().toISOString(),
      debugEnabled,
      veiID: input.veiID || "all",
    });

    let responseText = "";
    let responseStatus = 0;
    let responseContentType: string | null = null;
    let lastXmlRequestMasked = "";

    for (const variant of requestVariants) {
      const xmlRequest = buildTelemetryRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, {
        veiID: input.veiID,
        atributos: variant.atributos,
      });
      lastXmlRequestMasked = maskPasswordInXml(xmlRequest);

      const controller = new AbortController();
      const timeoutMs = 45_000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
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

      responseStatus = response.status;
      responseContentType = response.headers.get("content-type");

      const limited = await readBodyLimited(response, 5_000_000);
      const decoded = decodeTrucksControlBody(limited.bytes);
      responseText = decoded.text || "";

      const apiErr =
        (responseText.includes("<erro>") || responseText.includes("<ErrorRequest"))
          ? (parseXmlValue(responseText, "erro") ||
              parseXmlValue(responseText, "Erro") ||
              "Erro retornado pela TrucksControl")
          : null;

      console.log("[truckscontrol-telemetry] attempt", {
        label: variant.label,
        status: responseStatus,
        contentType: responseContentType,
        bytes: limited.bytes.length,
        hasError: Boolean(apiErr),
      });

      // Se não teve erro, seguimos.
      if (!apiErr) break;

      // Se o erro é de atributos, tentamos a próxima variante.
      if (/atribut/i.test(apiErr)) {
        continue;
      }

      // Para outros erros, já retornamos.
      return new Response(
        JSON.stringify({
          success: false,
          error: apiErr,
          timestamp: new Date().toISOString(),
          debug: debugEnabled
            ? {
                requestXmlMasked: maskPasswordInXml(xmlRequest),
                status: responseStatus,
                contentType: responseContentType,
                xmlResponse: responseText.slice(0, 5000),
              }
            : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verificar erro após as tentativas
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
          debug: debugEnabled
            ? {
                status: responseStatus,
                contentType: responseContentType,
                xmlResponse: responseText.slice(0, 5000),
              }
            : undefined,
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
      
      // Buscar código de macro (M1, M2, M3, M4, etc.)
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
        ignicao: ign === "1" || ign === "true" || ign === "on",
        direcao: dir,
        odometro: odo,
        dataHora: parseXmlValue(msgXml, "dataHora") || parseXmlValue(msgXml, "data") || undefined,
        motorista: parseXmlValue(msgXml, "mot") || parseXmlValue(msgXml, "motorista") || undefined,
        macro: macro || undefined,
      };

      if (msg.placa || msg.veiID) {
        telemetryMessages.push(msg);
      }
    }

    console.log("[truckscontrol-telemetry] parsed messages:", telemetryMessages.length);
    
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

        // Atualizar quilometragem do veículo se odômetro disponível
        if (msg.odometro && msg.odometro > 0) {
          const { error: updateMileageError } = await supabase
            .from("vehicles")
            .update({ mileage: msg.odometro })
            .eq("id", vehicle.id);
          
          if (updateMileageError) {
            console.error(`[truckscontrol-telemetry] Erro ao atualizar km do veículo ${msg.placa}:`, updateMileageError);
          } else {
            console.log(`[truckscontrol-telemetry] Odômetro atualizado: ${msg.placa} = ${msg.odometro} km`);
          }
        }

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

        // Processar macro de jornada se configurado
        if (msg.macro && assignment?.driver_id && journeySettings) {
          let journeyEventType: string | null = null;
          
          // Normalizar macro para comparação (uppercase, sem espaços)
          const macroNormalized = msg.macro.toUpperCase().trim();
          
          // Verificar se a macro corresponde a um evento de jornada
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
            
            // Inserir evento de jornada
            const { error: journeyError } = await supabase.from("driver_journey_events").insert({
              driver_id: assignment.driver_id,
              driver_name: assignment.driver_name,
              vehicle_id: vehicle.id,
              vehicle_plate: msg.placa,
              event_type: journeyEventType,
              event_timestamp: msg.dataHora ? new Date(msg.dataHora) : new Date(),
              macro_code: msg.macro,
              latitude: msg.latitude,
              longitude: msg.longitude,
              mileage: msg.odometro,
              source: 'telemetry_macro',
              raw_data: { macro: msg.macro, velocidade: msg.velocidade, ignicao: msg.ignicao },
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
              
              // Verificar se já existe registro para hoje
              const { data: existingCompliance } = await supabase
                .from("driver_journey_compliance")
                .select("*")
                .eq("driver_id", assignment.driver_id)
                .eq("journey_date", today)
                .single();
              
              if (existingCompliance) {
                // Atualizar registro existente
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
                    updates.overtime_minutes = Math.max(0, workedMinutes - 480); // 8h = 480min
                    updates.is_overtime_compliant = (updates.overtime_minutes as number) <= 120; // 2h max
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
                // Criar novo registro
                await supabase.from("driver_journey_compliance").insert({
                  driver_id: assignment.driver_id,
                  driver_name: assignment.driver_name,
                  journey_date: today,
                  journey_start: eventTime,
                  source: 'telemetry_macro',
                });
              }
            } else {
              console.error(`[truckscontrol-telemetry] Erro ao criar evento de jornada:`, journeyError);
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
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messagesReceived: telemetryMessages.length,
        telemetryUpdated,
        alertsCreated,
        journeyEventsCreated,
        debug: debugEnabled ? {
          xmlRequest: lastXmlRequestMasked,
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
