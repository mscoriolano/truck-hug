import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrucksControlVehicle {
  placa?: string;
  velocidade?: number;
  hodometro?: number;
  latitude?: number;
  longitude?: number;
  ignicao?: boolean;
  ultimaAtualizacao?: string;
}

interface TrucksControlJourney {
  placa?: string;
  motorista?: string;
  tipo?: string;
  timestamp?: string;
  localizacao?: string;
  km?: number;
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

// Build XML request for authentication
function buildAuthXml(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <auth>
    <usuario>${user}</usuario>
    <senha>${password}</senha>
  </auth>
</request>`;
}

// Build XML request for vehicles/positions
function buildVehiclesXml(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <auth>
    <usuario>${user}</usuario>
    <senha>${password}</senha>
  </auth>
  <command>
    <action>getVeiculos</action>
  </command>
</request>`;
}

// Alternative XML formats to try
function buildVehiclesXmlAlt1(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<requisicao>
  <usuario>${user}</usuario>
  <senha>${password}</senha>
  <metodo>veiculos</metodo>
</requisicao>`;
}

function buildVehiclesXmlAlt2(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <login>${user}</login>
  <password>${password}</password>
  <action>vehicles</action>
</root>`;
}

function buildPositionsXml(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <auth>
    <usuario>${user}</usuario>
    <senha>${password}</senha>
  </auth>
  <command>
    <action>getPosicoes</action>
  </command>
</request>`;
}

function buildPositionsXmlAlt(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<requisicao>
  <usuario>${user}</usuario>
  <senha>${password}</senha>
  <metodo>posicoes</metodo>
</requisicao>`;
}

function buildJourneyXml(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <auth>
    <usuario>${user}</usuario>
    <senha>${password}</senha>
  </auth>
  <command>
    <action>getJornada</action>
  </command>
</request>`;
}

function buildJourneyXmlAlt(user: string, password: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<requisicao>
  <usuario>${user}</usuario>
  <senha>${password}</senha>
  <metodo>jornada</metodo>
</requisicao>`;
}

// Generic XML request builder
function buildGenericXml(user: string, password: string, method: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <usuario>${user}</usuario>
  <senha>${password}</senha>
  <metodo>${method}</metodo>
</request>`;
}

interface XmlRequestConfig {
  url: string;
  xml: string;
  name: string;
}

async function tryXmlRequest(config: XmlRequestConfig): Promise<{ success: boolean; data: string; status: number; config: XmlRequestConfig }> {
  try {
    console.log(`\n>>> Trying ${config.name} at ${config.url}`);
    console.log(`XML Request:\n${config.xml.substring(0, 300)}...`);
    
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml, text/xml, */*',
      },
      body: config.xml,
    });

    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    // Check if response indicates success (not an error page)
    const isError = responseText.toLowerCase().includes('erro') || 
                    responseText.toLowerCase().includes('error') ||
                    responseText.toLowerCase().includes('invalid') ||
                    responseText.toLowerCase().includes('unauthorized') ||
                    responseText.includes('404') ||
                    responseText.includes('<!DOCTYPE');
    
    if (response.ok && !isError && responseText.length > 50) {
      return { success: true, data: responseText, status: response.status, config };
    }
    
    return { success: false, data: responseText, status: response.status, config };
  } catch (error) {
    console.log(`Error for ${config.name}:`, error);
    return { success: false, data: String(error), status: 0, config };
  }
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
    console.log('Starting TrucksControl XML sync...');
    console.log('User:', TRUCKSCONTROL_USER);
    console.log('========================================');

    // WebService URLs provided by TrucksControl support
    const webserviceUrls = [
      'https://webservice.newrastreamentoonline.com.br',
      'http://webservice.newrastreamentoonline.com.br',
      'http://webservice1.newrastreamentoonline.com.br',
    ];

    // Common endpoints to try
    const endpoints = [
      '',  // Root
      '/ws',
      '/webservice',
      '/api',
      '/service',
      '/veiculos',
      '/posicoes',
      '/request',
    ];

    // Build all XML request configurations to try
    const vehicleRequests: XmlRequestConfig[] = [];
    const journeyRequests: XmlRequestConfig[] = [];

    for (const baseUrl of webserviceUrls) {
      for (const endpoint of endpoints) {
        const url = `${baseUrl}${endpoint}`;
        
        // Vehicle/Position requests
        vehicleRequests.push({ url, xml: buildVehiclesXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `vehicles-std-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildVehiclesXmlAlt1(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `vehicles-alt1-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildVehiclesXmlAlt2(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `vehicles-alt2-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildPositionsXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `positions-std-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildPositionsXmlAlt(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `positions-alt-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildGenericXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, 'veiculos'), name: `generic-veiculos-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildGenericXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, 'posicoes'), name: `generic-posicoes-${endpoint || 'root'}` });
        vehicleRequests.push({ url, xml: buildGenericXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, 'getVeiculos'), name: `generic-getVeiculos-${endpoint || 'root'}` });
        
        // Journey requests
        journeyRequests.push({ url, xml: buildJourneyXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `journey-std-${endpoint || 'root'}` });
        journeyRequests.push({ url, xml: buildJourneyXmlAlt(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD), name: `journey-alt-${endpoint || 'root'}` });
        journeyRequests.push({ url, xml: buildGenericXml(TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD, 'jornada'), name: `generic-jornada-${endpoint || 'root'}` });
      }
    }

    console.log(`\n--- Testing ${vehicleRequests.length} vehicle request configurations ---`);
    
    let vehicleResponse: { success: boolean; data: string; status: number; config: XmlRequestConfig } | null = null;
    let journeyResponse: { success: boolean; data: string; status: number; config: XmlRequestConfig } | null = null;
    
    // Store all attempts for debugging
    const attemptLog: { name: string; url: string; status: number; success: boolean; response: string }[] = [];

    // Try vehicle requests (limit to first 24 to avoid timeout)
    for (const config of vehicleRequests.slice(0, 24)) {
      const result = await tryXmlRequest(config);
      attemptLog.push({
        name: config.name,
        url: config.url,
        status: result.status,
        success: result.success,
        response: result.data.substring(0, 200),
      });
      
      if (result.success) {
        vehicleResponse = result;
        console.log(`\n*** SUCCESS with ${config.name} ***`);
        break;
      }
    }

    console.log(`\n--- Testing journey request configurations ---`);
    
    // Try journey requests (limit to first 12)
    for (const config of journeyRequests.slice(0, 12)) {
      const result = await tryXmlRequest(config);
      attemptLog.push({
        name: config.name,
        url: config.url,
        status: result.status,
        success: result.success,
        response: result.data.substring(0, 200),
      });
      
      if (result.success) {
        journeyResponse = result;
        console.log(`\n*** SUCCESS with ${config.name} ***`);
        break;
      }
    }

    // Parse vehicle data from XML response
    let vehiclesData: TrucksControlVehicle[] = [];
    if (vehicleResponse?.success) {
      const xml = vehicleResponse.data;
      
      // Try to extract vehicle data from XML
      const vehicleNodes = parseXmlArray(xml, 'veiculo') || parseXmlArray(xml, 'vehicle') || parseXmlArray(xml, 'posicao') || parseXmlArray(xml, 'item');
      
      for (const vehicleXml of vehicleNodes) {
        const vehicle: TrucksControlVehicle = {
          placa: parseXmlValue(vehicleXml, 'placa') || parseXmlValue(vehicleXml, 'plate') || undefined,
          hodometro: parseFloat(parseXmlValue(vehicleXml, 'hodometro') || parseXmlValue(vehicleXml, 'odometro') || parseXmlValue(vehicleXml, 'km') || '0'),
          velocidade: parseFloat(parseXmlValue(vehicleXml, 'velocidade') || parseXmlValue(vehicleXml, 'speed') || '0'),
          latitude: parseFloat(parseXmlValue(vehicleXml, 'latitude') || parseXmlValue(vehicleXml, 'lat') || '0'),
          longitude: parseFloat(parseXmlValue(vehicleXml, 'longitude') || parseXmlValue(vehicleXml, 'lng') || parseXmlValue(vehicleXml, 'lon') || '0'),
        };
        if (vehicle.placa) {
          vehiclesData.push(vehicle);
        }
      }
      console.log(`Parsed ${vehiclesData.length} vehicles from XML response`);
    }

    // Parse journey data from XML response
    let journeyData: TrucksControlJourney[] = [];
    if (journeyResponse?.success) {
      const xml = journeyResponse.data;
      
      const journeyNodes = parseXmlArray(xml, 'evento') || parseXmlArray(xml, 'event') || parseXmlArray(xml, 'jornada') || parseXmlArray(xml, 'item');
      
      for (const journeyXml of journeyNodes) {
        const journey: TrucksControlJourney = {
          placa: parseXmlValue(journeyXml, 'placa') || parseXmlValue(journeyXml, 'plate') || undefined,
          motorista: parseXmlValue(journeyXml, 'motorista') || parseXmlValue(journeyXml, 'driver') || undefined,
          tipo: parseXmlValue(journeyXml, 'tipo') || parseXmlValue(journeyXml, 'type') || parseXmlValue(journeyXml, 'evento') || undefined,
          timestamp: parseXmlValue(journeyXml, 'timestamp') || parseXmlValue(journeyXml, 'data') || parseXmlValue(journeyXml, 'date') || undefined,
          localizacao: parseXmlValue(journeyXml, 'localizacao') || parseXmlValue(journeyXml, 'location') || undefined,
          km: parseFloat(parseXmlValue(journeyXml, 'km') || parseXmlValue(journeyXml, 'hodometro') || '0'),
        };
        if (journey.placa) {
          journeyData.push(journey);
        }
      }
      console.log(`Parsed ${journeyData.length} journey events from XML response`);
    }

    // Update vehicles in database
    let vehiclesUpdated = 0;
    for (const vehicle of vehiclesData) {
      const plate = vehicle.placa;
      if (!plate) continue;

      const mileage = vehicle.hodometro || 0;
      
      const { error } = await supabase
        .from('vehicles')
        .update({
          mileage: mileage,
          updated_at: new Date().toISOString(),
        })
        .eq('plate', plate);

      if (!error) {
        vehiclesUpdated++;
      } else {
        console.error(`Error updating vehicle ${plate}:`, error);
      }
    }
    console.log(`Updated ${vehiclesUpdated} vehicles in database`);

    // Create journey entries
    let journeyEntriesCreated = 0;
    for (const event of journeyData) {
      const plate = event.placa;
      if (!plate) continue;

      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, plate')
        .eq('plate', plate)
        .single();

      if (!vehicleData) {
        console.log(`Vehicle not found in DB: ${plate}`);
        continue;
      }

      const eventType = event.tipo || 'start';
      let entryType = 'start';
      switch (eventType.toLowerCase()) {
        case 'inicio_viagem':
        case 'inicio':
        case 'start':
          entryType = 'start';
          break;
        case 'fim_viagem':
        case 'fim':
        case 'end':
          entryType = 'end';
          break;
        case 'parada':
        case 'break_start':
        case 'break':
          entryType = 'break_start';
          break;
        case 'descanso':
        case 'break_end':
        case 'rest':
          entryType = 'break_end';
          break;
      }

      const driverName = event.motorista || 'Motorista não identificado';
      const timestamp = event.timestamp || new Date().toISOString();
      const location = event.localizacao;
      const mileage = event.km;

      // Find driver
      let driverId = null;
      if (driverName !== 'Motorista não identificado') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id, name')
          .ilike('name', `%${driverName}%`)
          .limit(1)
          .single();

        if (driverData) {
          driverId = driverData.id;
        }
      }

      if (!driverId) {
        const { data: anyDriver } = await supabase
          .from('drivers')
          .select('id, name')
          .limit(1)
          .single();

        if (anyDriver) {
          driverId = anyDriver.id;
        } else {
          continue;
        }
      }

      // Check for duplicates
      const { data: existingEntry } = await supabase
        .from('journey_entries')
        .select('id')
        .eq('vehicle_id', vehicleData.id)
        .eq('timestamp', timestamp)
        .single();

      if (existingEntry) continue;

      const { error } = await supabase
        .from('journey_entries')
        .insert({
          driver_id: driverId,
          driver_name: driverName,
          vehicle_id: vehicleData.id,
          vehicle_plate: vehicleData.plate,
          type: entryType,
          timestamp: timestamp,
          location: location,
          mileage: mileage,
        });

      if (!error) {
        journeyEntriesCreated++;
      }
    }
    console.log(`Created ${journeyEntriesCreated} journey entries`);

    // Prepare detailed debug info
    const debugInfo = {
      attemptsSummary: attemptLog.slice(0, 10).map(a => ({
        name: a.name,
        status: a.status,
        success: a.success,
        responsePreview: a.response,
      })),
      vehicleEndpointFound: vehicleResponse?.config.name || 'none',
      vehicleUrl: vehicleResponse?.config.url || 'none',
      journeyEndpointFound: journeyResponse?.config.name || 'none',
      journeyUrl: journeyResponse?.config.url || 'none',
      totalAttempts: attemptLog.length,
    };

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      vehiclesReceived: vehiclesData.length,
      vehiclesUpdated,
      journeyEventsReceived: journeyData.length,
      journeyEntriesCreated,
      message: vehiclesData.length === 0 && journeyData.length === 0 
        ? 'Conexão realizada, mas nenhum dado retornado. Precisamos da documentação XML da TrucksControl para definir o formato correto das requisições.'
        : 'Sincronização concluída com sucesso',
      xmlRequestExample: buildVehiclesXml(TRUCKSCONTROL_USER, '***'),
      debug: debugInfo,
    };

    console.log('========================================');
    console.log('Sync completed:', JSON.stringify(result, null, 2));
    console.log('========================================');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in TrucksControl sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more details'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
