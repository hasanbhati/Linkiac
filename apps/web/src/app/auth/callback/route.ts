import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getPublicOrigin(request: Request): string {
  // 1. Explicit NEXT_PUBLIC_SITE_URL environment variable if set and not 0.0.0.0
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const cleanUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
    if (!cleanUrl.includes('0.0.0.0') && !cleanUrl.includes('localhost')) {
      return cleanUrl;
    }
  }

  // 2. Reverse proxy / Railway forwarded headers
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost && !forwardedHost.includes('0.0.0.0') && !forwardedHost.startsWith('127.0.0.1')) {
    if (forwardedHost.startsWith('localhost')) {
      return `http://${forwardedHost}`;
    }
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 3. Fallback to URL origin if not 0.0.0.0 or 127.0.0.1
  try {
    const url = new URL(request.url);
    if (url.hostname !== '0.0.0.0' && url.hostname !== '127.0.0.1') {
      return url.origin;
    }
  } catch {}

  // 4. Default production fallback
  return 'https://linkiac.eu';
}

export async function GET(request: Request) {
  const publicOrigin = getPublicOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/library';
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('Supabase auth error in callback:', error, errorCode, errorDescription);
    if (
      errorCode === 'otp_expired' ||
      errorDescription?.toLowerCase().includes('expired') ||
      errorDescription?.toLowerCase().includes('invalid')
    ) {
      return NextResponse.redirect(
        `${publicOrigin}/login?error=expired_or_used&description=${encodeURIComponent(
          'This confirmation link has expired or has already been used. If your account is already confirmed, please sign in below.'
        )}`
      );
    }
    return NextResponse.redirect(
      `${publicOrigin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  const supabase = createClient();

  // 1. Verify OTP token_hash (Used by Supabase verify email template links)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${publicOrigin}${next}`);
    }
    console.error('Failed to verify OTP token_hash:', verifyError.message);
    return NextResponse.redirect(
      `${publicOrigin}/login?error=verification_failed&description=${encodeURIComponent(verifyError.message)}`
    );
  }

  // 2. Verify PKCE code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${publicOrigin}${next}`);
    }
    console.error('Failed to exchange code for session:', exchangeError.message);
    return NextResponse.redirect(
      `${publicOrigin}/login?error=auth_code_error&description=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // 3. Fallback: check if session already exists
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      return NextResponse.redirect(`${publicOrigin}${next}`);
    }
  } catch {}

  // Return the user to login with error parameter if verification fails
  return NextResponse.redirect(`${publicOrigin}/login?error=auth_callback_failed`);
}
