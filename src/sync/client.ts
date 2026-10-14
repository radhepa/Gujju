import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

// Sync goes to the Supabase project shared with FitPip and Pastime, in
// Gujju's own table (gujju_rows). Every row can only be read or written by
// the account that owns it (row-level security, see supabase/migrations).
// The publishable key is meant to ship in the app; those policies are what
// protect the data.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jvescwzjijbjcfuxdqxo.supabase.co';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_0m38u1OjuLxTmF9O_gVNng_SDx2Y2eJ';

export const SUPABASE_ORIGIN = new URL(SUPABASE_URL).origin;

export const supabase = createClient(SUPABASE_URL, KEY, {
  auth: {
    storage: authStorage,
    storageKey: 'gujju.auth',
    persistSession: true,
    autoRefreshToken: true,
    // Password sign-in only, so never read tokens from the address bar.
    detectSessionInUrl: false,
  },
});
