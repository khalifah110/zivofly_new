import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve Vite environment variables for Supabase
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

// Normalize URL: Strip accidental /rest/v1/ or trailing slash
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

export const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawAnonKey;

export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('MY_SUPABASE_URL') &&
  !SUPABASE_ANON_KEY.includes('MY_SUPABASE_ANON_KEY')
);

// Instantiate singleton Supabase client
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'zivofly_supabase_auth_token',
      },
    });
  } catch (err) {
    console.warn('[Zivofly] Failed to initialize Supabase client:', err);
    clientInstance = null;
  }
}

export const supabase = clientInstance;

export interface SupabaseHealthCheckResult {
  isConfigured: boolean;
  connected: boolean;
  url: string;
  hasKey: boolean;
  error?: string;
  latencyMs?: number;
}

/**
 * Diagnostic utility to test actual connectivity to the configured Supabase instance.
 * Does not throw, returns structured health status.
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      isConfigured: false,
      connected: false,
      url: SUPABASE_URL,
      hasKey: Boolean(SUPABASE_ANON_KEY),
      error: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or unconfigured in the environment.',
    };
  }

  const start = performance.now();
  try {
    // Query profiles table to verify connectivity and auth
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (!error) {
      return {
        isConfigured: true,
        connected: true,
        url: SUPABASE_URL,
        hasKey: true,
        latencyMs,
      };
    }

    return {
      isConfigured: true,
      connected: false,
      url: SUPABASE_URL,
      hasKey: true,
      error: error.message,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err?.message || 'Network request failed';
    return {
      isConfigured: true,
      connected: false,
      url: SUPABASE_URL,
      hasKey: true,
      error: msg.includes('Failed to fetch') || msg.includes('ENOTFOUND')
        ? `Cannot reach host (${SUPABASE_URL}). Host may be paused, offline, or DNS unresolvable.`
        : msg,
      latencyMs,
    };
  }
}
