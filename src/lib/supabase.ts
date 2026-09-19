/** Supabase client singleton + configuration detection.
 *
 * The browser only ever receives the publishable (anon) key — RLS protects data.
 * Values come from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY),
 * supplied via .env.local (dev), .env.production (committed, publishable values only)
 * or GitHub Actions secrets at build time. When unset, the app runs in 100% local mode.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const SUPABASE_URL = url ?? '';
export const isCloudConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isCloudConfigured) throw new Error('Supabase is not configured');
  if (!client) {
    client = createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'mup.auth',
      },
    });
  }
  return client;
}
