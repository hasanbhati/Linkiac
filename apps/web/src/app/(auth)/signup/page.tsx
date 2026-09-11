'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, Mail, AtSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { LinkiacSymbol } from '@/components/LinkiacLogo';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('next') || '/library';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabase();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsOAuthLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google authentication.');
      setIsOAuthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabase();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsAppleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Apple authentication.');
      setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms of Service & EULA and acknowledge the Privacy Policy to create an account.');
      return;
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();

      // Proactively check if username is already taken to prevent silent suffixing (BUG-02)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setErrorMsg(`Username @${cleanUsername} is already taken. Please choose another.`);
        setIsLoading(false);
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanUsername,
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // If user session is returned immediately (email confirmation disabled)
      if (data.session) {
        router.push('/library');
        router.refresh();
      } else {
        // Confirmation email sent
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-150">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center justify-center p-2 rounded-2xl hover:scale-105 transition-transform" aria-label="Linkiac Home">
          <LinkiacSymbol size={52} />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">Create your Linkiac account</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Universal personal link library and private recommendations</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-3xl border border-gray-200 dark:border-zinc-800 space-y-6 shadow-sm">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-500 dark:text-red-400 animate-fade-in" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-4 text-center py-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Confirm your email</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400">
                We sent a confirmation link to <span className="text-gray-900 dark:text-zinc-200 font-medium">{email}</span>. Please click the link to activate your account and start saving links.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#093329] dark:text-[#BCD94E] hover:underline transition-colors"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="signup-username" className="block text-xs font-semibold text-gray-700 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Public Username *
                </label>
                <div className="relative">
                  <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
                  <input
                    id="signup-username"
                    type="text"
                    required
                    minLength={3}
                    placeholder="unique_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329] dark:focus:ring-brand-lime font-mono transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1">Unique handle for your link suggestions and friend discovery.</p>
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-gray-700 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329] dark:focus:ring-brand-lime transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-gray-700 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329] dark:focus:ring-brand-lime transition-colors"
                  />
                </div>
              </div>

              {/* User Agreement Checkbox */}
              <div className="flex items-start gap-2.5 pt-1 text-left">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-zinc-700 text-[#093329] dark:text-[#BCD94E] focus:ring-[#BCD94E] accent-[#093329] dark:accent-[#BCD94E] cursor-pointer"
                  required
                />
                <label htmlFor="agree-terms" className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed cursor-pointer select-none">
                  I agree to Linkiac&apos;s{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="font-semibold text-[#093329] dark:text-[#BCD94E] underline hover:opacity-80 transition-opacity"
                  >
                    Terms of Service &amp; EULA
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-semibold text-[#093329] dark:text-[#BCD94E] underline hover:opacity-80 transition-opacity"
                  >
                    Privacy Policy
                  </Link>.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || isOAuthLoading || isAppleLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white dark:text-[#093329] dark:font-bold bg-[#093329] hover:bg-[#0c4436] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] shadow-md shadow-emerald-950/10 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {!isSuccess && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400">Or continue with</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Google OAuth entrypoint */}
                <button
                  type="button"
                  aria-label="Continue with Google"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isOAuthLoading || isAppleLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm dark:shadow-none"
                >
                  {isOAuthLoading ? (
                    <Loader2 size={16} className="animate-spin text-gray-400 dark:text-zinc-400" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* Apple OAuth entrypoint */}
                <button
                  type="button"
                  aria-label="Continue with Apple"
                  onClick={handleAppleSignIn}
                  disabled={isLoading || isOAuthLoading || isAppleLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm dark:shadow-none"
                >
                  {isAppleLoading ? (
                    <Loader2 size={16} className="animate-spin text-gray-400 dark:text-zinc-400" />
                  ) : (
                    <svg className="w-4 h-4 fill-current text-gray-900 dark:text-white" viewBox="0 0 170 170" aria-hidden="true">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.58-7.7-11.66-13.94-6.3-9.69-11.19-20.73-14.67-33.12-3.48-12.39-5.22-23.75-5.22-34.09 0-14.79 3.59-26.69 10.77-35.7 7.18-9.01 16.29-13.62 27.34-13.84 5.33 0 11.22 1.41 17.67 4.24 6.45 2.83 10.29 4.3 11.51 4.41 1.42-.22 5.56-1.8 12.42-4.74 6.86-2.94 12.74-4.24 17.65-3.92 13.06.65 23.39 5.33 30.99 14.04-11.53 6.96-17.18 16.43-16.97 28.4.22 9.36 3.76 17.14 10.61 23.34 6.86 6.2 14.96 9.79 24.31 10.77-2.39 7.4-5.33 15.23-8.82 23.5zM119.22 31.84c0-7.72 2.72-15.02 8.16-21.89 5.44-6.87 12.19-10.99 20.24-12.35.22 1.41.33 2.72.33 3.92 0 7.84-2.83 15.29-8.49 22.35-5.66 7.07-12.51 11.05-20.57 11.97-.22-1.31-.33-2.62-.33-3.92z" />
                    </svg>
                  )}
                  <span>Continue with Apple</span>
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-gray-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#093329] dark:text-[#BCD94E] hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#093329] dark:text-[#BCD94E]" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
