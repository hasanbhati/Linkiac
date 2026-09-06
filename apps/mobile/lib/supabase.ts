import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://bwyeteqyxvosazuuyiiy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_aSb1L0R29HS97vIS2KNS8w_HvdX9Fq9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
