import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, X, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';
import { testSupabaseConnection, SupabaseHealthCheckResult, SUPABASE_URL } from '../lib/supabaseClient';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<SupabaseHealthCheckResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await testSupabaseConnection();
      setStatus(result);
    } catch (err: any) {
      setStatus({
        isConfigured: false,
        connected: false,
        url: SUPABASE_URL,
        hasKey: false,
        error: err?.message || 'Check failed',
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyUrl = () => {
    if (status?.url) {
      navigator.clipboard.writeText(status.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="surface-card w-full max-w-lg overflow-hidden rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Database className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Supabase Database Integration</h3>
              <p className="text-xs text-muted-foreground">PostgreSQL &amp; Row Level Security Status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          {status && (
            <div
              className={`rounded-xl border p-4 flex items-start gap-3.5 ${
                status.connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
              }`}
            >
              {status.connected ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {status.connected
                    ? 'Connected to Supabase Database'
                    : 'Supabase Host Unreachable or Unconfigured'}
                </p>
                <p className="text-xs opacity-90 leading-relaxed">
                  {status.connected
                    ? `Live PostgreSQL connection active. RLS-enforced queries and Supabase Auth are working (${status.latencyMs}ms).`
                    : status.error || 'The configured Supabase instance could not be resolved or contacted. The application is operating safely with local persistent state.'}
                </p>
              </div>
            </div>
          )}

          {/* Config Details */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Configured URL:</span>
              <div className="flex items-center gap-1.5 font-mono text-foreground">
                <span className="max-w-[220px] truncate" title={status?.url || 'Not set'}>
                  {status?.url || '(None)'}
                </span>
                {status?.url && (
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Public Anon Key:</span>
              <span className="font-mono text-foreground">
                {status?.hasKey ? '•••••••• (Present)' : '(Missing)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground font-medium">Auth &amp; Customer Isolation:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="size-3.5" /> Enforced by Supabase Auth (UID)
              </span>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="space-y-2 rounded-xl bg-accent/40 p-4 border border-border/60">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Required Environment Variables
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="rounded-lg bg-background p-2 border border-border text-foreground">
                <span className="text-emerald-500 font-semibold">VITE_SUPABASE_URL</span>=https://&lt;project-ref&gt;.supabase.co
              </div>
              <div className="rounded-lg bg-background p-2 border border-border text-foreground">
                <span className="text-emerald-500 font-semibold">VITE_SUPABASE_ANON_KEY</span>=eyJhbGciOi...
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
              If your Supabase project was recently paused or recreated, copy the updated Project URL and anon key from your Supabase Dashboard under <strong>Project Settings &gt; API</strong> and add them to your environment variables or Secrets.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="size-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
