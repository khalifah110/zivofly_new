import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://epmrelszczsxirbansrl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbXJlbHN6Y3pzeGlyYmFuc3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Njg1NTAsImV4cCI6MjEwNzI0NDU1MH0.bdX8BNClNXK-62aArOaYa9m7UIDIzjuVtuIDfr0zSWY';

// Retrieve Vite environment variables for Supabase with real project fallback
const rawUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL;
const rawAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

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

/**
 * Custom fetch wrapper for the Supabase client.
 * The deployed `google_workspace` Edge Function returns:
 *   `Access-Control-Allow-Headers: authorization, apikey, content-type`
 * Meanwhile, `@supabase/supabase-js` injects `X-Client-Info` by default on `supabase.functions.invoke()`,
 * which causes browser OPTIONS preflight requests to fail with a CORS header error
 * ("Failed to send a request to the Edge Function").
 * Removing `x-client-info` (and W3C trace headers) on `/functions/v1/google_workspace` requests ensures
 * only the permitted `authorization`, `apikey`, and `content-type` headers are sent.
 */
const supabaseCustomFetch: typeof fetch = async (input, init) => {
  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input?.url || '';

  if (requestUrl.includes('/functions/v1/google_workspace')) {
    const cleanedHeaders = new Headers(init?.headers);
    cleanedHeaders.delete('x-client-info');
    cleanedHeaders.delete('X-Client-Info');
    cleanedHeaders.delete('traceparent');
    cleanedHeaders.delete('tracestate');
    cleanedHeaders.delete('baggage');

    return fetch(input, {
      ...init,
      headers: cleanedHeaders,
    });
  }

  return fetch(input, init);
};

if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'zivofly_supabase_auth_token',
      },
      global: {
        fetch: supabaseCustomFetch,
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
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY || !supabase) {
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
    // Query profiles table to verify connectivity and RLS
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
      error:
        msg.includes('Failed to fetch') || msg.includes('ENOTFOUND')
          ? `Cannot reach host (${SUPABASE_URL}). Host may be paused, offline, or DNS unresolvable.`
          : msg,
      latencyMs,
    };
  }
}
