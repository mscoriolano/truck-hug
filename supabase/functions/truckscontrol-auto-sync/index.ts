import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { reportDue } from '../_shared/syncPolicy.ts';
Deno.serve(async (request) => {
  const failure = authenticateCronRequest(request);
  if (failure) return failure;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const input = await request.json().catch(() => null);
  if (input?.source !== 'cron') return new Response('Invalid input', { status: 400, headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Configuration missing', { status: 500, headers: corsHeaders });
  const db = createClient(url, key);
  const run = async (name: string) => {
    const { data, error } = await db.functions.invoke(name, { body: { source: 'automatic' } });
    console.log('[auto-sync]', name, JSON.stringify(error ? { error: error.message } : data));
  };
  // Independent requests: a position timeout must not prevent the daily report retry.
  // @ts-ignore EdgeRuntime is provided by the hosted runtime.
  EdgeRuntime.waitUntil(Promise.all([run('truckscontrol-telemetry'), ...(reportDue(new Date()) ? [run('truckscontrol-telemetria-relatorio')] : [])]));
  return Response.json({ accepted: true }, { status: 202, headers: corsHeaders });
});