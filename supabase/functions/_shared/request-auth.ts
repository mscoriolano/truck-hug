import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHash, timingSafeEqual } from 'node:crypto';
export async function authenticateSync(request: Request): Promise<Response | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!url || !key) return new Response('Configuration missing', { status: 500 });
  if (!token) return new Response('Unauthorized', { status: 401 });
  const hash = (v: string) => createHash('sha256').update(v).digest();
  if (timingSafeEqual(hash(token), hash(key))) return null;
  const db = createClient(url, key);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return new Response('Unauthorized', { status: 401 });
  const { data: staff } = await db.rpc('is_staff', { _user_id: data.user.id });
  return staff ? null : new Response('Forbidden', { status: 403 });
}