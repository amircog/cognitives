import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured');
    return null;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// For backwards compatibility - lazy getter
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      return {
        insert: () => Promise.resolve({ error: new Error('Supabase not configured') }),
        select: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
      };
    }
    return client.from(table);
  },
};
