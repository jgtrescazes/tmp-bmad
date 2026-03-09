/**
 * Supabase client for Edge Functions
 * Uses service role key for write access to database
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseClient
}

// Reset client (useful for testing)
export function resetSupabaseClient(): void {
  supabaseClient = null
}
