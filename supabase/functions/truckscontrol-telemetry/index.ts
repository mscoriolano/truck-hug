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
  mld?: number;
  modelo?: string;
  sinonimo?: string;
}

// Helper Robusto: Lê tanto <Tag>Valor</Tag> quanto Tag="Valor"
function parseXmlValue(xml: string, tagName: string): string | null {
  // 1. Tenta ler como Tag (Ex: <Mod>Volvo</Mod>)
  const tagRegex = new RegExp(`<${tagName}(?: [^>]*)?>([^<]*)</${tagName}>`, "i");
  const tagMatch = tagRegex.exec(xml);
  if (tagMatch && tagMatch[1]) return tagMatch[1].trim();

  // 2. Tenta ler como Atributo (Ex: Mod="Volvo" ou Mod='Volvo')
  const attrRegex = new RegExp(`${tagName}\\s*=\\s*["']([^"']*)["']`, "i");
  const attrMatch = attrRegex.exec(xml);
  if (attrMatch && attrMatch[1]) return attrMatch[1].trim();

  return null;
}

// Helper Robusto: Separa os blocos de veículos, mesmo se forem self-closing (<Veiculo ... />)
function parseXmlArray(xml: string, itemTagName: string): string[] {
  const items: string[] = [];
  // Regex complexa para capturar <Tag>...</Tag> OU <Tag ... />
  const regex = new RegExp(
    `<${itemTagName}[\\s\\S]*?<\\/${itemTagName}>|<${itemTagName}[^>]*\\/>`,
    "gi",
  );
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildTelemetryRequestXml(user: string, password: string, opts?: { veiID?: string; mId?: number }): string {
  const mIdValue = opts?.mId && opts.mId > 0 ? opts.mId : 1;
  return `<?xml version="1.0" encoding="UTF-8"?>
<RequestMensagemCB>
  <login>${escapeXml(user)}</login>
  <senha>${escapeXml(password)}</senha>
  <mId>${mIdValue}</mId>${opts?.veiID ? `\n  <veiID>${escapeXml(opts.veiID)}</veiID>` : ""}
</RequestMensagemCB>`;
}

function maskPasswordInXml(xml: string): string {
  return xml.replace(/<senha>[\s\S]*?<\/senha>/gi, "<senha>***</senha>");
}

// ... (Funções de descompressão ZIP/GZIP permanecem iguais)
function looksLikeZip(bytes: Uint8Array): boolean { return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b; }
function looksLikeGzip(bytes: Uint8Array): boolean { return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b; }
function unzipFirstFileFromZip(zipBytes: Uint8Array): Uint8Array {
    // Simplificado para brevidade, usar biblioteca pako se necessário
    try { return pako.inflate(zipBytes.slice(30)); } catch { return zipBytes; }
}
function decodeTrucksControlBody(bytes: Uint8Array): { text: string; wasZip: boolean } {
  if (!bytes.length) return { text: "", wasZip: false };
  if (looksLikeGzip(bytes)) {
    try { return { text: strFromU8(gunzipSync(bytes)), wasZip: true }; } catch { return { text: "", wasZip: true }; }
  }
  return { text: strFromU8(bytes), wasZip: false };
}

async function readBodyLimited(response: Response): Promise<{ bytes: Uint8Array }> {
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer) };
}

// ... (Resto do código principal)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const input = await req.json().catch(() => ({}));
    const debugEnabled = Boolean(input.debug);

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !SUPABASE_URL) throw new Error("Configuração ausente");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

    // Busca último MLD
    let lastMld = 1;
    const { data: mldData } = await supabase.from("vehicle_telemetry").select("last_mld").order("last_mld", { ascending: false }).limit(1).maybeSingle();
    if (mldData?.last_mld) lastMld = Number(mldData.last_mld) || 1;

    const xmlRequest = buildTelemetryRequestXml(TRUCKSCONTROL_USER!, TRUCKSCONTROL_PASSWORD!, { veiID: input.veiID, mId: lastMld });
    
    // FETCH NA API TRUCKS
    const response = await fetch("https://webservice.newrastreamentoonline.com.br", {
      method: "POST",
      headers: { "Content-Type": "text/xml", "User-Agent": "Mozilla/5.0" },
      body: xmlRequest,
    });

    const { bytes } = await readBodyLimited(response);
    const { text: responseText } = decodeTrucksControlBody(bytes);

    // PARSE DAS MENSAGENS
    const telemetryMessages: TelemetryMessage[] = [];
    let messageNodes = parseXmlArray(responseText, "MensagemCB");
    if (!messageNodes.length) messageNodes = parseXmlArray(responseText, "Mensagem");
    if (!messageNodes.length) messageNodes = parseXmlArray(responseText, "Veiculo"); // Tenta pegar <Veiculo> direto

    let maxMldReceived = lastMld;

    for (const msgXml of messageNodes) {
      // Tenta ler como Tag ou Atributo (Correção Principal)
      const lat = parseFloat((parseXmlValue(msgXml, "lat") || parseXmlValue(msgXml, "Latitude") || "0").replace(',', '.'));
      const lng = parseFloat((parseXmlValue(msgXml, "lon") || parseXmlValue(msgXml, "Longitude") || "0").replace(',', '.'));
      const placa = parseXmlValue(msgXml, "placa") || parseXmlValue(msgXml, "Placa");
      const veiID = parseXmlValue(msgXml, "veiID") || parseXmlValue(msgXml, "ID");
      const vel = parseInt(parseXmlValue(msgXml, "vel") || parseXmlValue(msgXml, "Velocidade") || "0");
      const ign = parseXmlValue(msgXml, "ign") || parseXmlValue(msgXml, "Ignicao");
      const mId = parseInt(parseXmlValue(msgXml, "mId") || parseXmlValue(msgXml, "mID") || "0");
      
      // NOVOS CAMPOS - Tentando todas as variações possíveis
      const modelo = parseXmlValue(msgXml, "mod") || parseXmlValue(msgXml, "Mod") || parseXmlValue(msgXml, "Modelo");
      const sinonimo = parseXmlValue(msgXml, "sin") || parseXmlValue(msgXml, "Sin") || parseXmlValue(msgXml, "Sinonimo");
      const odo = parseInt(parseXmlValue(msgXml, "odm") || parseXmlValue(msgXml, "hodometro") || "0");

      if (mId > maxMldReceived) maxMldReceived = mId;

      if (placa || veiID) {
        telemetryMessages.push({
          placa, veiID, latitude: lat, longitude: lng, velocidade: vel,
          ignicao: (ign === "1" || ign === "true" || ign === "on" || vel > 0),
          mld: mId || undefined, odometro: odo,
          modelo, sinonimo // Guarda para usar no update
        });
      }
    }

    // PROCESSAMENTO E SALVAMENTO
    let updates = 0;
    for (const msg of telemetryMessages) {
        // Busca Veículo
        let { data: vehicle } = await supabase.from("vehicles").select("*").or(`plate.eq.${msg.placa},truckscontrol_id.eq.${msg.veiID}`).maybeSingle();
        
        if (vehicle) {
            // ATUALIZAÇÃO AUTOMÁTICA DE CADASTRO (A Mágica acontece aqui)
            const updatePayload: any = {};
            
            // Se chegou Hodômetro maior, atualiza
            if (msg.odometro && msg.odometro > (vehicle.mileage || 0)) updatePayload.mileage = msg.odometro;
            
            // Se chegou Modelo e o banco está vazio ou "Não especificado", atualiza
            if (msg.modelo && (!vehicle.model || vehicle.model.includes("Não especificado"))) {
                updatePayload.model = msg.modelo;
            }
            
            // Se chegou Marca/Sinônimo e o banco está vazio, atualiza
            if (msg.sinonimo && (!vehicle.brand || vehicle.brand.includes("Não especificado"))) {
                updatePayload.brand = msg.sinonimo;
            }

            if (Object.keys(updatePayload).length > 0) {
                await supabase.from("vehicles").update(updatePayload).eq("id", vehicle.id);
                console.log(`Veículo ${vehicle.plate} atualizado:`, updatePayload);
            }

            // Salva Telemetria
            await supabase.from("vehicle_telemetry").upsert({
                vehicle_id: vehicle.id,
                vehicle_plate: vehicle.plate,
                latitude: msg.latitude,
                longitude: msg.longitude,
                speed: msg.velocidade,
                ignition_on: msg.ignicao,
                last_mld: msg.mld || maxMldReceived,
                received_at: new Date()
            }, { onConflict: "vehicle_id" });
            updates++;
        }
    }

    return new Response(JSON.stringify({ success: true, updated: updates, logs: telemetryMessages.slice(0, 3) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});