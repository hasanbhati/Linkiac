import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/library';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    console.error('Supabase auth error in callback:', error, error_description);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  const supabase = createClient();

  // 1. Verify OTP token_hash (Used by Supabase verify email template links)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Failed to verify OTP token_hash:', verifyError.message);
  }

  // 2. Verify PKCE code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
    console.error('Failed to exchange code for session:', exchangeError.message);
  }

  // Return the user to login with error parameter if verification fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
