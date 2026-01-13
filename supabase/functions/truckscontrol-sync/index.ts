import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrucksControlVehicle {
  placa?: string;
  plate?: string;
  velocidade?: number;
  speed?: number;
  rpm?: number;
  hodometro?: number;
  odometer?: number;
  latitude?: number;
  lat?: number;
  longitude?: number;
  lng?: number;
  lon?: number;
  ignicao?: boolean;
  ignition?: boolean;
  ultimaAtualizacao?: string;
  lastUpdate?: string;
  consumo?: number;
}

interface TrucksControlJourney {
  placa?: string;
  plate?: string;
  motorista?: string;
  driver?: string;
  tipo?: string;
  type?: string;
  timestamp?: string;
  date?: string;
  localizacao?: string;
  location?: string;
  km?: number;
  mileage?: number;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  endpoint?: string;
}

// Try multiple API endpoints to find the correct one
async function tryApiEndpoints(baseUrl: string, authHeaders: HeadersInit, endpoints: string[]): Promise<ApiResponse> {
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Trying endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders,
      });

      console.log(`Response status for ${endpoint}: ${response.status}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.log(`Success! Got data from ${endpoint}:`, JSON.stringify(data).substring(0, 500));
          
          // Check if data is not empty
          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            return { success: true, data, endpoint };
          }
        } else {
          const text = await response.text();
          console.log(`Non-JSON response from ${endpoint}: ${text.substring(0, 200)}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`Error from ${endpoint}: ${response.status} - ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`Exception for ${endpoint}:`, error);
    }
  }
  return { success: false, error: 'No working endpoint found' };
}

// Try different authentication methods
async function tryAuthentication(baseUrl: string, user: string, password: string): Promise<{ token: string | null; authType: string; authHeaders: HeadersInit }> {
  const authEndpoints = [
    '/api/auth/login',
    '/api/login',
    '/api/v1/auth/login',
    '/api/v1/login',
    '/auth/login',
    '/login',
    '/api/authenticate',
    '/webservice/auth',
  ];

  // Try JSON login
  for (const endpoint of authEndpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Trying auth endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: user,
          senha: password,
          user: user,
          password: password,
          username: user,
          login: user,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Auth response from ${endpoint}:`, JSON.stringify(data).substring(0, 300));
        
        const token = data.token || data.access_token || data.accessToken || data.jwt || data.session?.token;
        if (token) {
          console.log('Got token from JSON login');
          return { 
            token, 
            authType: 'bearer',
            authHeaders: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          };
        }
      }
    } catch (error) {
      console.log(`Auth error for ${endpoint}:`, error);
    }
  }

  // Try form-data login
  for (const endpoint of authEndpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const formData = new URLSearchParams();
      formData.append('usuario', user);
      formData.append('senha', password);
      formData.append('user', user);
      formData.append('password', password);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token || data.access_token || data.accessToken;
        if (token) {
          console.log('Got token from form login');
          return { 
            token, 
            authType: 'bearer',
            authHeaders: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          };
        }
      }
    } catch (error) {
      // Continue trying
    }
  }

  // Fallback to Basic Auth
  console.log('Using Basic Auth fallback');
  const credentials = btoa(`${user}:${password}`);
  return { 
    token: credentials, 
    authType: 'basic',
    authHeaders: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' }
  };
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

    // Try multiple base URLs
    const baseUrls = [
      'https://newrastreamentoonline.com.br',
      'https://api.newrastreamentoonline.com.br',
      'https://webservice.newrastreamentoonline.com.br',
      'https://ws.newrastreamentoonline.com.br',
    ];

    let authResult = { token: null as string | null, authType: 'basic', authHeaders: {} as HeadersInit };
    let workingBaseUrl = '';

    // Try to authenticate with each base URL
    for (const baseUrl of baseUrls) {
      console.log(`\n--- Trying base URL: ${baseUrl} ---`);
      authResult = await tryAuthentication(baseUrl, TRUCKSCONTROL_USER, TRUCKSCONTROL_PASSWORD);
      
      if (authResult.token) {
        workingBaseUrl = baseUrl;
        console.log(`Auth successful with ${baseUrl}, type: ${authResult.authType}`);
        break;
      }
    }

    if (!workingBaseUrl) {
      workingBaseUrl = baseUrls[0]; // Use first as fallback
    }

    // Endpoints to try for vehicles/positions
    const vehicleEndpoints = [
      '/api/veiculos',
      '/api/vehicles',
      '/api/v1/veiculos',
      '/api/v1/vehicles',
      '/api/posicoes',
      '/api/positions',
      '/api/v1/posicoes',
      '/api/v1/positions',
      '/api/telemetria',
      '/api/v1/telemetria',
      '/api/veiculos/telemetria',
      '/api/veiculos/posicao',
      '/api/fleet',
      '/api/v1/fleet',
      '/api/rastreamento',
      '/api/tracking',
      '/webservice/veiculos',
      '/webservice/posicoes',
      '/new/api/veiculos',
      '/new/api/positions',
    ];

    // Endpoints to try for journey events
    const journeyEndpoints = [
      '/api/jornada',
      '/api/journey',
      '/api/v1/jornada',
      '/api/v1/journey',
      '/api/jornada/eventos',
      '/api/journey/events',
      '/api/eventos',
      '/api/events',
      '/api/v1/eventos',
      '/api/motoristas/jornada',
      '/api/drivers/journey',
      '/webservice/jornada',
    ];

    console.log('\n--- Fetching vehicle data ---');
    const vehicleResult = await tryApiEndpoints(workingBaseUrl, authResult.authHeaders, vehicleEndpoints);
    
    console.log('\n--- Fetching journey data ---');
    const journeyResult = await tryApiEndpoints(workingBaseUrl, authResult.authHeaders, journeyEndpoints);

    // Process vehicle data
    let vehiclesData: TrucksControlVehicle[] = [];
    if (vehicleResult.success && vehicleResult.data) {
      if (Array.isArray(vehicleResult.data)) {
        vehiclesData = vehicleResult.data;
      } else if (vehicleResult.data.veiculos) {
        vehiclesData = vehicleResult.data.veiculos;
      } else if (vehicleResult.data.vehicles) {
        vehiclesData = vehicleResult.data.vehicles;
      } else if (vehicleResult.data.data) {
        vehiclesData = vehicleResult.data.data;
      }
      console.log(`Found ${vehiclesData.length} vehicles from ${vehicleResult.endpoint}`);
    }

    // Process journey data
    let journeyData: TrucksControlJourney[] = [];
    if (journeyResult.success && journeyResult.data) {
      if (Array.isArray(journeyResult.data)) {
        journeyData = journeyResult.data;
      } else if (journeyResult.data.eventos) {
        journeyData = journeyResult.data.eventos;
      } else if (journeyResult.data.events) {
        journeyData = journeyResult.data.events;
      } else if (journeyResult.data.data) {
        journeyData = journeyResult.data.data;
      }
      console.log(`Found ${journeyData.length} journey events from ${journeyResult.endpoint}`);
    }

    // Update vehicles in database
    let vehiclesUpdated = 0;
    for (const vehicle of vehiclesData) {
      const plate = vehicle.placa || vehicle.plate;
      if (!plate) continue;

      const mileage = vehicle.hodometro || vehicle.odometer || 0;
      
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
      const plate = event.placa || event.plate;
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

      const eventType = event.tipo || event.type || 'start';
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

      const driverName = event.motorista || event.driver || 'Motorista não identificado';
      const timestamp = event.timestamp || event.date || new Date().toISOString();
      const location = event.localizacao || event.location;
      const mileage = event.km || event.mileage;

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

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      vehiclesReceived: vehiclesData.length,
      vehiclesUpdated,
      journeyEventsReceived: journeyData.length,
      journeyEntriesCreated,
      message: vehiclesData.length === 0 && journeyData.length === 0 
        ? 'Conexão OK, mas nenhum dado retornado. Pode ser necessária documentação da API.'
        : 'Sincronização concluída com sucesso',
      debug: {
        baseUrlUsed: workingBaseUrl,
        authType: authResult.authType,
        vehicleEndpoint: vehicleResult.endpoint || 'none found',
        journeyEndpoint: journeyResult.endpoint || 'none found',
      }
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
