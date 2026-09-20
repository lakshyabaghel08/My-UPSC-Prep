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

function createAppClient(persistSession: boolean): SupabaseClient {
  return createClient(url!, publishableKey!, {
    auth: {
      persistSession,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'mup.auth',
    },
  });
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isCloudConfigured) throw new Error('Supabase is not configured');
  if (!client) client = createAppClient(true);
  return client;
}

/** Client whose sessions live in memory only.
 *
 * Used for sign-ins where "Remember me" is off: the session survives the
 * current page session (navigation, component re-renders) but is never
 * written to localStorage, so it is gone after a reload. Storage here is an
 * SDK-managed in-memory adapter — nothing is shared with `getSupabase()`.
 */
let sessionOnlyClient: SupabaseClient | null = null;

export function getSessionOnlySupabase(): SupabaseClient {
  if (!isCloudConfigured) throw new Error('Supabase is not configured');
  if (!sessionOnlyClient) sessionOnlyClient = createAppClient(false);
  return sessionOnlyClient;
}
