import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

interface AuthPageProps {
  onSignInSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSignInSuccess, onNavigate }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

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
          businessName: name.trim() || 'My Business',
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
    setLoading(true);
    setErrorMessage(null);

    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard',
          },
        });
        if (error) {
          setErrorMessage(error.message);
          toast.error(error.message);
          setLoading(false);
          return;
        }
      } else {
        // Local preview fallback
        const fallbackUser: User = {
          id: 'user_default',
          name: 'User',
          email: 'user@example.com',
          businessName: 'My Business',
        };
        localStorage.setItem('zivofly_token', 'demo_token_123');
        onSignInSuccess(fallbackUser);
        toast.success('Signed in with Google');
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign in failed');
      toast.error('Google sign in failed');
    } finally {
      setLoading(false);
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
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
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
                <span>Continue with Google</span>
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
