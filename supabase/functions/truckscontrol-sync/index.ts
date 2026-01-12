import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrucksControlVehicle {
  placa: string;
  velocidade?: number;
  rpm?: number;
  hodometro?: number;
  latitude?: number;
  longitude?: number;
  ignicao?: boolean;
  ultimaAtualizacao?: string;
  consumo?: number;
}

interface TrucksControlJourney {
  placa: string;
  motorista?: string;
  tipo: string; // inicio_viagem, fim_viagem, parada, descanso
  timestamp: string;
  localizacao?: string;
  km?: number;
}

serve(async (req) => {
  // Handle CORS preflight
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

    console.log('Starting TrucksControl sync...');
    console.log('User:', TRUCKSCONTROL_USER);

    // TrucksControl API endpoints (common patterns for OnixSat/TrucksControl)
    const baseUrl = 'https://webservice.newrastreamentoonline.com.br';
    
    // Authenticate and get token
    const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usuario: TRUCKSCONTROL_USER,
        senha: TRUCKSCONTROL_PASSWORD,
      }),
    });

    let token: string | null = null;
    let authData: any = null;

    if (authResponse.ok) {
      authData = await authResponse.json();
      token = authData.token || authData.access_token;
      console.log('Authentication successful');
    } else {
      // Try alternative authentication method (Basic Auth)
      console.log('Trying alternative authentication...');
      const credentials = btoa(`${TRUCKSCONTROL_USER}:${TRUCKSCONTROL_PASSWORD}`);
      token = credentials;
    }

    const authHeaders = token?.includes(':') 
      ? { 'Authorization': `Basic ${token}` }
      : { 'Authorization': `Bearer ${token}` };

    // Fetch vehicle telemetry data
    console.log('Fetching vehicle telemetry...');
    let vehiclesData: TrucksControlVehicle[] = [];
    
    try {
      const vehiclesResponse = await fetch(`${baseUrl}/api/veiculos/telemetria`, {
        headers: authHeaders,
      });

      if (vehiclesResponse.ok) {
        vehiclesData = await vehiclesResponse.json();
        console.log(`Received ${vehiclesData.length} vehicles from telemetry`);
      } else {
        // Try alternative endpoint
        const altResponse = await fetch(`${baseUrl}/api/posicoes`, {
          headers: authHeaders,
        });
        if (altResponse.ok) {
          vehiclesData = await altResponse.json();
          console.log(`Received ${vehiclesData.length} vehicles from positions`);
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    }

    // Fetch journey events
    console.log('Fetching journey events...');
    let journeyData: TrucksControlJourney[] = [];

    try {
      const journeyResponse = await fetch(`${baseUrl}/api/jornada/eventos`, {
        headers: authHeaders,
      });

      if (journeyResponse.ok) {
        journeyData = await journeyResponse.json();
        console.log(`Received ${journeyData.length} journey events`);
      }
    } catch (error) {
      console.error('Error fetching journey data:', error);
    }

    // Update vehicles in database
    let vehiclesUpdated = 0;
    for (const vehicle of vehiclesData) {
      if (!vehicle.placa) continue;

      const { error } = await supabase
        .from('vehicles')
        .update({
          mileage: vehicle.hodometro || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('plate', vehicle.placa);

      if (!error) {
        vehiclesUpdated++;
      } else {
        console.error(`Error updating vehicle ${vehicle.placa}:`, error);
      }
    }
    console.log(`Updated ${vehiclesUpdated} vehicles`);

    // Create journey entries
    let journeyEntriesCreated = 0;
    for (const event of journeyData) {
      if (!event.placa) continue;

      // Get vehicle and driver info
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, plate')
        .eq('plate', event.placa)
        .single();

      if (!vehicleData) {
        console.log(`Vehicle not found: ${event.placa}`);
        continue;
      }

      // Map event type
      let entryType = 'start';
      switch (event.tipo?.toLowerCase()) {
        case 'inicio_viagem':
        case 'inicio':
          entryType = 'start';
          break;
        case 'fim_viagem':
        case 'fim':
          entryType = 'end';
          break;
        case 'parada':
        case 'break_start':
          entryType = 'break_start';
          break;
        case 'descanso':
        case 'break_end':
          entryType = 'break_end';
          break;
      }

      // Find driver by name or use a default
      let driverId = null;
      let driverName = event.motorista || 'Motorista não identificado';

      if (event.motorista) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id, name')
          .ilike('name', `%${event.motorista}%`)
          .limit(1)
          .single();

        if (driverData) {
          driverId = driverData.id;
          driverName = driverData.name;
        }
      }

      if (!driverId) {
        // Get first available driver as fallback
        const { data: anyDriver } = await supabase
          .from('drivers')
          .select('id, name')
          .limit(1)
          .single();

        if (anyDriver) {
          driverId = anyDriver.id;
          driverName = anyDriver.name;
        } else {
          console.log('No drivers found in database');
          continue;
        }
      }

      // Check if entry already exists
      const { data: existingEntry } = await supabase
        .from('journey_entries')
        .select('id')
        .eq('vehicle_id', vehicleData.id)
        .eq('timestamp', event.timestamp)
        .single();

      if (existingEntry) {
        console.log(`Journey entry already exists for ${event.placa} at ${event.timestamp}`);
        continue;
      }

      const { error } = await supabase
        .from('journey_entries')
        .insert({
          driver_id: driverId,
          driver_name: driverName,
          vehicle_id: vehicleData.id,
          vehicle_plate: vehicleData.plate,
          type: entryType,
          timestamp: event.timestamp,
          location: event.localizacao,
          mileage: event.km,
        });

      if (!error) {
        journeyEntriesCreated++;
      } else {
        console.error(`Error creating journey entry:`, error);
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
      message: 'Sync completed successfully',
    };

    console.log('Sync completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in TrucksControl sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check edge function logs for more details'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
