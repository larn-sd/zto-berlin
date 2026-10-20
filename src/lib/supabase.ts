import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://kdsvztjdlzqpvpruutnc.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5A59qH6fNwBqqrf08iYZGw__7VqP77l';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
