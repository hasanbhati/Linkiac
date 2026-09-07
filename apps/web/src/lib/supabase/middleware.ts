import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bwyeteqyxvosazuuyiiy.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aSb1L0R29HS97vIS2KNS8w_HvdX9Fq9';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Fetch the authenticated user securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected app routes
  const isAppRoute =
    pathname.startsWith('/library') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/friends') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/settings');

  // Protected admin routes
  const isAdminRoute = pathname.startsWith('/admin');

  // Auth routes
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (!user && (isAppRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/library';
    return NextResponse.redirect(url);
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/library';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
