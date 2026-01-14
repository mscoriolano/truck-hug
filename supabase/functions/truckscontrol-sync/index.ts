import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { strFromU8, unzipSync } from "https://esm.sh/fflate@0.8.2?deno";

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
  error?: string;
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

function buildVehicleRequestXml(user: string, password: string): string {
  // Conforme documentação TrucksControl
  return `<?xml version="1.0" encoding="UTF-8"?>\n<RequestVeiculo>\n  <login>${user}</login>\n  <senha>${password}</senha>\n</RequestVeiculo>`;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    );

    let selectedUrl: string | null = null;
    let rawXml: string | null = null;
    const attempts: AttemptLog[] = [];
    let lastApiError: string | null = null;

    for (const url of webserviceUrls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            // Docs indicam text/xml
            "Content-Type": "text/xml; charset=UTF-8",
            Accept: "text/xml, application/xml, */*",
          },
          body: xmlRequest,
        });

        const contentType = response.headers.get("content-type");
        const buf = new Uint8Array(await response.arrayBuffer());
        const decoded = decodeTrucksControlBody(buf);
        const responseText = decoded.text;

        const preview = responseText
          ? responseText.slice(0, 500)
          : `<<empty body>> bytes=${buf.length} hex=${bytesPreview(buf)}`;

        attempts.push({
          url,
          status: response.status,
          ok: response.ok,
          contentType,
          wasZip: decoded.wasZip,
          preview,
        });

        if (responseText.includes("<erro>") || responseText.includes("<ErrorRequest")) {
          const msg =
            parseXmlValue(responseText, "erro") ||
            parseXmlValue(responseText, "Erro") ||
            "Erro retornado pela TrucksControl";
          const codigo = parseXmlValue(responseText, "codigo");
          lastApiError = codigo ? `${msg} (código ${codigo})` : msg;
        }

        if (
          responseText.includes("<ResponseVeiculo>") ||
          responseText.includes("<Veiculo>")
        ) {
          selectedUrl = url;
          rawXml = responseText;
          break;
        }
      } catch (e) {
        attempts.push({
          url,
          status: 0,
          ok: false,
          contentType: null,
          wasZip: false,
          preview: "",
          error: String(e),
        });
      }
    }

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

