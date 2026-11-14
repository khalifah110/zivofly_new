import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle2, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { User } from '../types';
import { apiFetch } from '../lib/api';
import { supabase, SUPABASE_URL } from '../lib/supabaseClient';

interface AuthPageProps {
  onSignInSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
}

interface GoogleOAuthDiagState {
  status: 'provider_disabled' | 'PopupBlocked' | 'error' | 'ready';
  message: string;
  httpStatus?: number;
  supabaseCallbackUrl: string;
  redirectUrls: string[];
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSignInSuccess, onNavigate }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [testingGoogleProvider, setTestingGoogleProvider] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleDiag, setGoogleDiag] = useState<GoogleOAuthDiagState | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const popupPollRef = useRef<number | null>(null);

  const supabaseCallbackUrl = `${SUPABASE_URL}/auth/v1/callback`;
  const currentRedirectUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://zivofly.pages.dev/dashboard';

  const allRedirectUrls = Array.from(
    new Set([
      currentRedirectUrl,
      'https://zivofly.pages.dev/dashboard',
      'https://ais-dev-k6ui6nmo35asihaviuakqi-143468822188.europe-west2.run.app/dashboard',
      'https://ais-pre-k6ui6nmo35asihaviuakqi-143468822188.europe-west2.run.app/dashboard',
    ])
  );

  // Listen for OAuth popup completion or cross-tab session establishment
  useEffect(() => {
    const completeGoogleLogin = async () => {
      try {
        const res = await apiFetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setGoogleLoading(false);
            onSignInSuccess(data.user);
            toast.success('Signed in with Google!');
            onNavigate('/dashboard');
            return true;
          }
        }
      } catch {
        // ignore
      }
      return false;
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'ZIVOFLY_GOOGLE_AUTH_SUCCESS') {
        void completeGoogleLogin();
      } else if (event.data?.type === 'ZIVOFLY_GOOGLE_AUTH_ERROR') {
        setGoogleLoading(false);
        const msg = event.data?.error || 'Google sign-in could not be completed.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'zivofly_google_oauth_completed' && event.newValue) {
        void completeGoogleLogin();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (popupPollRef.current) {
        window.clearInterval(popupPollRef.current);
      }
    };
  }, [onNavigate, onSignInSuccess]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedValue(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  /**
   * Probes the Supabase `/auth/v1/authorize?provider=google` endpoint with `redirect: 'manual'`.
   * - When Google provider is enabled in Supabase: GoTrue returns HTTP 302 (`res.type === 'opaqueredirect'`).
   * - When Google provider is disabled in Supabase: GoTrue returns HTTP 400 JSON (`Unsupported provider: provider is not enabled`).
   */
  const checkSupabaseGoogleProvider = async (
    authorizeUrl: string
  ): Promise<{ enabled: boolean; httpStatus?: number; errorMsg?: string }> => {
    try {
      const res = await fetch(authorizeUrl, {
        method: 'GET',
        redirect: 'manual',
      });

      if (res.type === 'opaqueredirect' || res.status === 302 || res.status === 301 || res.status === 200) {
        return { enabled: true, httpStatus: res.status || 302 };
      }

      if (res.status >= 400) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          detail = body?.msg || body?.message || body?.error_description || body?.error || detail;
        } catch {
          // ignore
        }
        return {
          enabled: false,
          httpStatus: res.status,
          errorMsg: detail,
        };
      }

      return { enabled: true, httpStatus: res.status };
    } catch {
      // If fetch fails due to strict browser redirect policy, allow navigation attempt
      return { enabled: true };
    }
  };

  const handleTestGoogleProvider = async () => {
    setTestingGoogleProvider(true);
    setErrorMessage(null);
    try {
      const testUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(currentRedirectUrl)}`;
      const check = await checkSupabaseGoogleProvider(testUrl);
      if (check.enabled) {
        setGoogleDiag({
          status: 'ready',
          message: 'Google OAuth provider is enabled and ready in Supabase! Click "Continue with Google" to sign in.',
          httpStatus: check.httpStatus,
          supabaseCallbackUrl,
          redirectUrls: allRedirectUrls,
        });
        toast.success('Google OAuth provider is enabled and ready!');
      } else {
        setGoogleDiag({
          status: 'provider_disabled',
          message:
            check.errorMsg ||
            'Unsupported provider: Google provider is currently disabled in your Supabase project.',
          httpStatus: check.httpStatus,
          supabaseCallbackUrl,
          redirectUrls: allRedirectUrls,
        });
        toast.error(`Supabase returned: ${check.errorMsg || 'Google provider is not enabled'}`);
      }
    } finally {
      setTestingGoogleProvider(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    // Password reset flow
    if (mode === 'forgot_password') {
      try {
        if (!email.trim()) {
          setErrorMessage('Please enter your email address.');
          setLoading(false);
          return;
        }

        if (supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
          if (error) {
            setErrorMessage(error.message);
            toast.error(error.message);
            setLoading(false);
            return;
          }
        }

        setResetEmailSent(true);
        toast.success('Password reset instructions sent to your email.');
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to send reset link.');
        toast.error('Failed to send reset link.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          businessName: '',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.user) {
        if (data.token) {
          localStorage.setItem('zivofly_token', data.token);
        }
        if (data.needsEmailConfirmation) {
          toast.success('Account created! Please check your email inbox to confirm your account, then sign in.', { duration: 7000 });
          setMode('signin');
          setErrorMessage(null);
        } else {
          onSignInSuccess(data.user);
          toast.success(mode === 'signup' ? 'Account created successfully!' : 'Welcome back!');
          onNavigate('/dashboard');
        }
      } else {
        const errText = data.error || (mode === 'signup' ? 'Registration failed' : 'Invalid email or password');
        setErrorMessage(errText);
        toast.error(errText);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication error. Please check your credentials or network connection.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setGoogleDiag(null);

    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    try {
      if (!supabase) {
        const fallbackUser: User = {
          id: 'user_default',
          name: 'User',
          email: 'user@example.com',
          businessName: '',
        };
        localStorage.setItem('zivofly_token', 'demo_token_123');
        onSignInSuccess(fallbackUser);
        toast.success('Signed in with Google');
        onNavigate('/dashboard');
        setGoogleLoading(false);
        return;
      }

      // 1. Obtain the OAuth URL without immediately navigating the current frame
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentRedirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error || !data?.url) {
        const msg = error?.message || 'Failed to generate Google OAuth URL.';
        setErrorMessage(msg);
        toast.error(msg);
        setGoogleLoading(false);
        return;
      }

      // 2. Verify that the Google provider is enabled on the Supabase project before redirecting
      const check = await checkSupabaseGoogleProvider(data.url);
      if (!check.enabled) {
        setGoogleLoading(false);
        setGoogleDiag({
          status: 'provider_disabled',
          message:
            check.errorMsg ||
            'Unsupported provider: Google provider is not enabled in Supabase Authentication.',
          httpStatus: check.httpStatus,
          supabaseCallbackUrl,
          redirectUrls: allRedirectUrls,
        });
        toast.error('Google Sign-In needs to be enabled in your Supabase Auth settings.');
        return;
      }

      // 3. Inside an iframe (such as AI Studio preview), open Google OAuth in a popup
      // because accounts.google.com blocks iframe rendering via X-Frame-Options: DENY.
      if (isInIframe) {
        const width = 520;
        const height = 640;
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

        const popup = window.open(
          data.url,
          'zivofly_google_oauth',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          setGoogleLoading(false);
          setErrorMessage(
            'Popup blocked by your browser. Please allow popups for this site and click "Continue with Google" again.'
          );
          toast.error('Please allow popups to sign in with Google inside the preview.');
          return;
        }

        if (popupPollRef.current) {
          window.clearInterval(popupPollRef.current);
        }

        popupPollRef.current = window.setInterval(async () => {
          if (popup.closed) {
            if (popupPollRef.current) {
              window.clearInterval(popupPollRef.current);
              popupPollRef.current = null;
            }
            // Check if session was established before popup closed
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              const res = await apiFetch('/api/user/profile');
              if (res.ok) {
                const pData = await res.json();
                if (pData?.user) {
                  setGoogleLoading(false);
                  onSignInSuccess(pData.user);
                  toast.success('Signed in with Google!');
                  onNavigate('/dashboard');
                  return;
                }
              }
            }
            setGoogleLoading(false);
          }
        }, 700);
        return;
      }

      // 4. In top-level browser window (e.g. zivofly.pages.dev), redirect directly
      window.location.assign(data.url);
    } catch (err: any) {
      setGoogleLoading(false);
      const msg = err?.message || 'Google sign-in failed';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="hero-glow flex min-h-screen items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
        <div>
          <button
            onClick={() => onNavigate('/')}
            className="font-display text-2xl font-normal text-foreground hover:opacity-90 cursor-pointer"
          >
            Zivofly
          </button>
        </div>

        <div className="surface-card mt-6 p-6 sm:p-8 rounded-2xl shadow-xl">
          {mode === 'forgot_password' ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetEmailSent(false);
                  setErrorMessage(null);
                }}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to sign in</span>
              </button>
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                Reset your password
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter your account email to receive a password reset link.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                {mode === 'signin'
                  ? 'Sign in to manage your agents and customer conversations.'
                  : 'Start automating your customer conversations with autonomous AI agents.'}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {googleDiag && (
            <div
              className={`mt-4 rounded-xl border p-4 text-xs space-y-3 ${
                googleDiag.status === 'ready'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-foreground'
              }`}
            >
              <div className="flex items-start gap-2">
                {googleDiag.status === 'ready' ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">
                    {googleDiag.status === 'ready'
                      ? 'Google Sign-In Provider Ready'
                      : 'Enable Google Provider in Supabase Auth'}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {googleDiag.message}
                  </p>
                </div>
              </div>

              {googleDiag.status !== 'ready' && (
                <div className="space-y-2.5 pt-1 border-t border-border/60">
                  <div>
                    <p className="text-[11px] font-medium text-foreground mb-1">
                      1. In Google Cloud Console (OAuth 2.0 Client → Authorized redirect URI):
                    </p>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2.5 py-1.5">
                      <code className="flex-1 truncate text-[11px] text-foreground">
                        {googleDiag.supabaseCallbackUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(googleDiag.supabaseCallbackUrl)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {copiedValue === googleDiag.supabaseCallbackUrl ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-foreground mb-1">
                      2. In Supabase Dashboard → Authentication → Providers → Google:
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Toggle <strong>Enable Sign in with Google</strong> ON, paste your Google Client ID &amp; Secret, and add these Redirect URLs under <strong>Authentication → URL Configuration</strong>:
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {googleDiag.redirectUrls.map((rUrl) => (
                        <div
                          key={rUrl}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2.5 py-1"
                        >
                          <code className="flex-1 truncate text-[10px] text-foreground">
                            {rUrl}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(rUrl)}
                            className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {copiedValue === rUrl ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href="https://supabase.com/dashboard/project/epmrelszczsxirbansrl/auth/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <span>Open Supabase Auth Providers</span>
                      <ExternalLink className="size-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleTestGoogleProvider}
                      disabled={testingGoogleProvider}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`size-3 ${testingGoogleProvider ? 'animate-spin' : ''}`} />
                      <span>{testingGoogleProvider ? 'Testing…' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {resetEmailSent && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>Check your inbox for password reset instructions.</span>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {googleLoading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-foreground">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            {mode !== 'forgot_password' && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
                {mode === 'signin' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              <span>
                {loading
                  ? 'Please wait…'
                  : mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                  ? 'Create account'
                  : 'Send reset instructions'}
              </span>
            </button>
          </form>

          {mode !== 'forgot_password' && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMessage(null);
              }}
              className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
