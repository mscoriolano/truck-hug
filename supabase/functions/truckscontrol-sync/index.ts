import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrucksControlVehicle {
  veiID?: string;
  placa?: string;
  mot?: string;  // motorista
  ident?: string;
}

// Parse XML response to extract data
function parseXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'gi');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function parseXmlArray(xml: string, itemTagName: string): string[] {
  const items: string[] = [];
  const regex = new RegExp(`<${itemTagName}[^>]*>([\\s\\S]*?)</${itemTagName}>`, 'gi');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[0]);
  }
  return items;
}

// Build XML request for vehicles - FORMATO CORRETO DA TRUCKSCONTROL
function buildVehicleRequestXml(user: string, password: string): string {
  return `<RequestVeiculo>
<login>${user}</login>
<senha>${password}</senha>
</RequestVeiculo>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TRUCKSCONTROL_USER = Deno.env.get('TRUCKSCONTROL_USER');
    const TRUCKSCONTROL_PASSWORD = Deno.env.get('TRUCKSCONTROL_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TRUCKSCONTROL_USER || !TRUCKSCONTROL_PASSWORD) {
      console.error('Missing TrucksControl credentials');
      return new Response(
        JSON.stringify({ error: 'TrucksControl credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('========================================');
    console.log('Starting TrucksControl sync...');
    console.log('User:', TRUCKSCONTROL_USER);
    console.log('========================================');

    // WebService URLs provided by TrucksControl support
    const webserviceUrls = [
      'https://webservice.newrastreamentoonline.com.br',
      'http://webservice.newrastreamentoonline.com.br',
      'http://webservice1.newrastreamentoonline.com.br',
    ];

    const xmlRequest = buildVehicleRequestXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD);
    console.log('XML Request:', xmlRequest);

    let vehicleResponse: { success: boolean; data: string; url: string } | null = null;
    const attemptLog: { url: string; status: number; success: boolean; response: string }[] = [];

    // Try each URL
    for (const url of webserviceUrls) {
      try {
        console.log(`\n>>> Trying URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml, text/xml, */*',
          },
          body: xmlRequest,
        });

        const responseText = await response.text();
        console.log(`Response status: ${response.status}`);
        console.log(`Response: ${responseText.substring(0, 1000)}`);

        attemptLog.push({
          url,
          status: response.status,
          success: false,
          response: responseText.substring(0, 300),
        });

        // Check for successful response (contains ResponseVeiculo)
        if (responseText.includes('<ResponseVeiculo>') || responseText.includes('<Veiculo>')) {
          vehicleResponse = { success: true, data: responseText, url };
          console.log(`\n*** SUCCESS with ${url} ***`);
          attemptLog[attemptLog.length - 1].success = true;
          break;
        }

        // Check for error
        if (responseText.includes('<erro>')) {
          const errorMsg = parseXmlValue(responseText, 'erro');
          console.log(`Error from API: ${errorMsg}`);
        }
      } catch (error) {
        console.log(`Error for ${url}:`, error);
        attemptLog.push({
          url,
          status: 0,
          success: false,
          response: String(error),
        });
      }
    }

    // Parse vehicle data from XML response
    let vehiclesData: TrucksControlVehicle[] = [];
    if (vehicleResponse?.success) {
      const xml = vehicleResponse.data;
      console.log('\n--- Parsing vehicle data ---');
      
      // Extract all <Veiculo> nodes
      const vehicleNodes = parseXmlArray(xml, 'Veiculo');
      console.log(`Found ${vehicleNodes.length} vehicle nodes`);
      
      for (const vehicleXml of vehicleNodes) {
        const vehicle: TrucksControlVehicle = {
          veiID: parseXmlValue(vehicleXml, 'veiID') || undefined,
          placa: parseXmlValue(vehicleXml, 'placa') || undefined,
          mot: parseXmlValue(vehicleXml, 'mot') || undefined,
          ident: parseXmlValue(vehicleXml, 'ident') || undefined,
        };
        if (vehicle.placa) {
          vehiclesData.push(vehicle);
          console.log(`Parsed vehicle: ${vehicle.placa} (ID: ${vehicle.veiID}, Driver: ${vehicle.mot}, Ident: ${vehicle.ident})`);
        }
      }
      console.log(`Total parsed: ${vehiclesData.length} vehicles`);
    }

    // Update vehicles in database - just log them for now since we don't have mileage data
    let vehiclesFound = 0;
    let vehiclesMatched = 0;
    for (const vehicle of vehiclesData) {
      const plate = vehicle.placa;
      if (!plate) continue;
      vehiclesFound++;

      // Check if vehicle exists in our database
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id, plate, mileage')
        .eq('plate', plate)
        .single();

      if (existingVehicle) {
        vehiclesMatched++;
        console.log(`Vehicle ${plate} found in database`);
        
        // Update vehicle with TrucksControl ID info if we have ident
        if (vehicle.ident) {
          await supabase
            .from('vehicles')
            .update({ updated_at: new Date().toISOString() })
            .eq('plate', plate);
        }
      } else {
        console.log(`Vehicle ${plate} not in database`);
      }
    }

    // Prepare result
    const result = {
      success: vehicleResponse?.success || false,
      timestamp: new Date().toISOString(),
      vehiclesReceived: vehiclesData.length,
      vehiclesMatched: vehiclesMatched,
      message: vehicleResponse?.success 
        ? `Sincronização realizada! ${vehiclesData.length} veículos recebidos, ${vehiclesMatched} correspondem ao sistema.`
        : 'Não foi possível obter dados da TrucksControl',
      vehicles: vehiclesData.map(v => ({
        placa: v.placa,
        id: v.veiID,
        motorista: v.mot,
        identificacao: v.ident,
      })),
      debug: {
        urlUsed: vehicleResponse?.url || 'none',
        attempts: attemptLog,
      }
    };

    console.log('\n========================================');
    console.log('Sync completed:', JSON.stringify(result, null, 2));
    console.log('========================================');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
