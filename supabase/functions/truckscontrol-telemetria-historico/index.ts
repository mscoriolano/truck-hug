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

function parseXmlAttribute(xml: string, tagName: string, attrName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]*)"`, "gi");
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
  dtInicio?: string; // formato: DD/MM/YYYY HH:MM:SS
  dtFim?: string;
  veiID?: string;
  tID?: string; // ID da telemetria para carga incremental (0 para primeira carga)
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: InputBody = {};
    try { input = await req.json(); } catch { /* default */ }

    const TRUCKSCONTROL_USER = Deno.env.get("TRUCKSCONTROL_USER");
    const TRUCKSCONTROL_PASSWORD = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Datas padrão: últimas 24 horas
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    };

    const dtInicio = input.dtInicio || formatDate(yesterday);
    const dtFim = input.dtFim || formatDate(now);
    // tID = 0 para primeira carga, depois usar o último tID retornado
    const tID = input.tID || "0";

    // RequestTelemetria - Relatórios históricos de telemetria
    // Conforme manual pág 157-158, a estrutura é:
    // <Telemetria tID="123">
    //   <item tiID="456">
    //     <qt>10</qt> quantidade
    //     <tt>120</tt> tempo total em minutos
    //     <hi>08:00</hi> hora inicial
    //     <hf>10:00</hf> hora final
    //   </item>
    // </Telemetria>
    let xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RequestTelemetria>
  <login>${escapeXml(TRUCKSCONTROL_USER)}</login>
  <senha>${escapeXml(TRUCKSCONTROL_PASSWORD)}</senha>
  <dtInicio>${escapeXml(dtInicio)}</dtInicio>
  <dtFim>${escapeXml(dtFim)}</dtFim>
  <tID>${escapeXml(tID)}</tID>`;
    
    if (input.veiID) {
      xmlRequest += `\n  <veiID>${escapeXml(input.veiID)}</veiID>`;
    }
    
    xmlRequest += `\n</RequestTelemetria>`;

    console.log("[truckscontrol-telemetria-historico] start", { 
      ts: new Date().toISOString(),
      dtInicio,
      dtFim,
      tID,
      veiID: input.veiID || "all"
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 minutos para histórico

    let response: Response;
    try {
      response = await fetch("https://webservice.newrastreamentoonline.com.br", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=UTF-8", Accept: "*/*", "User-Agent": "FleetApp/1.0" },
        body: xmlRequest,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const bytes = await response.arrayBuffer();
    const responseText = decodeTrucksControlBody(new Uint8Array(bytes));

    // Verificar erro de intervalo (código 7)
    if (responseText.includes("<codigo>7</codigo>") || responseText.includes("<codigo>7<")) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Aguarde o intervalo de 60 minutos da Trucks Control",
        code: 7,
        message: "A API da TrucksControl exige um intervalo mínimo de 60 minutos entre requisições de telemetria histórica."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (responseText.includes("<erro>")) {
      const erro = parseXmlValue(responseText, "erro") || "Erro desconhecido";
      const codigo = parseXmlValue(responseText, "codigo");
      return new Response(JSON.stringify({ success: false, error: erro, code: codigo }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parsear telemetria conforme manual pág 157-158
    // A tag principal é <Telemetria tID="xxx"> e os itens são <item tiID="xxx">
    const telemetriaNodes = parseXmlArray(responseText, "Telemetria");
    
    let recordsInserted = 0;
    let vehiclesUpdated = 0;
    let lastTID = tID;

    for (const telXml of telemetriaNodes) {
      // Extrair atributo tID da tag Telemetria
      const telemetriaID = parseXmlAttribute(telXml, "Telemetria", "tID");
      if (telemetriaID) lastTID = telemetriaID;

      const placa = parseXmlValue(telXml, "placa");
      const veiID = parseXmlValue(telXml, "veiID");
      
      if (!placa) continue;

      // Buscar veículo
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", placa)
        .maybeSingle();

      if (!vehicle) continue;

      // Extrair dados de telemetria
      const lat = parseFloat(parseXmlValue(telXml, "latitude") || parseXmlValue(telXml, "lat") || "0");
      const lng = parseFloat(parseXmlValue(telXml, "longitude") || parseXmlValue(telXml, "lng") || "0");
      const vel = parseInt(parseXmlValue(telXml, "velocidade") || parseXmlValue(telXml, "vel") || "0", 10);
      const dataHora = parseXmlValue(telXml, "dataHora") || parseXmlValue(telXml, "dt");
      
      // Extrair hodômetro (odm) para atualização automática
      const odm = parseInt(parseXmlValue(telXml, "odm") || parseXmlValue(telXml, "odometro") || "0", 10);
      
      // Extrair dados CAN
      const rpm = parseInt(parseXmlValue(telXml, "rpm") || "0", 10);
      const lt = parseFloat(parseXmlValue(telXml, "lt") || "0"); // litros no tanque
      
      // Verificar eventos de condução
      const evt34 = parseXmlValue(telXml, "evt34"); // excesso de velocidade
      const evt35 = parseXmlValue(telXml, "evt35"); // excesso de RPM
      
      // Parsear itens de telemetria dentro do bloco
      const itemNodes = parseXmlArray(telXml, "item");
      for (const itemXml of itemNodes) {
        const tiID = parseXmlAttribute(itemXml, "item", "tiID");
        const qt = parseInt(parseXmlValue(itemXml, "qt") || "0", 10); // quantidade
        const tt = parseInt(parseXmlValue(itemXml, "tt") || "0", 10); // tempo total (minutos)
        const hi = parseXmlValue(itemXml, "hi"); // hora inicial
        const hf = parseXmlValue(itemXml, "hf"); // hora final
        
        // Inserir no histórico de telemetria
        await supabase.from("telemetry_history").insert({
          vehicle_id: vehicle.id,
          vehicle_plate: placa,
          latitude: lat,
          longitude: lng,
          speed: vel,
          gps_timestamp: dataHora,
        });
        recordsInserted++;
      }

      // Se não há itens, inserir o registro principal
      if (itemNodes.length === 0 && (lat !== 0 || lng !== 0 || vel !== 0)) {
        await supabase.from("telemetry_history").insert({
          vehicle_id: vehicle.id,
          vehicle_plate: placa,
          latitude: lat,
          longitude: lng,
          speed: vel,
          gps_timestamp: dataHora,
        });
        recordsInserted++;
      }

      // Atualizar hodômetro do veículo se disponível
      if (odm > 0) {
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({ mileage: odm })
          .eq("id", vehicle.id);
        
        if (!updateError) {
          vehiclesUpdated++;
          console.log(`[truckscontrol-telemetria-historico] Veículo ${placa} km atualizado: ${odm}`);
        }
      }

      // Armazenar dados CAN se disponíveis
      if (rpm > 0 || lt > 0 || evt34 || evt35) {
        await supabase.from("vehicle_can_data").insert({
          vehicle_id: vehicle.id,
          vehicle_plate: placa,
          data_timestamp: dataHora ? new Date(dataHora) : new Date(),
          rpm: rpm || null,
          speed: vel || null,
          fuel_level: lt || null,
          odometer: odm || null,
          speed_violation: evt34 === "1" || evt34 === "true",
          rpm_violation: evt35 === "1" || evt35 === "true",
          raw_data: { evt34, evt35, rpm, lt, vel },
        });
      }
    }

    console.log("[truckscontrol-telemetria-historico] finished", { 
      recordsFound: telemetriaNodes.length,
      recordsInserted,
      vehiclesUpdated,
      lastTID
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      dtInicio,
      dtFim,
      recordsFound: telemetriaNodes.length,
      recordsInserted,
      vehiclesUpdated,
      lastTID, // Usar este valor na próxima requisição para carga incremental
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[truckscontrol-telemetria-historico] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
