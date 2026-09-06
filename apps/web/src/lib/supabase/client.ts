import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bwyeteqyxvosazuuyiiy.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aSb1L0R29HS97vIS2KNS8w_HvdX9Fq9';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (typeof window === 'undefined') {
    return createClient();
  }
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
