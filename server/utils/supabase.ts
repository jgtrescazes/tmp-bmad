/**
 * Server-side Supabase client utilities
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { Database } from '~/types/database.types'

/**
 * Create a Supabase client with service role key
 * Use this for server-side operations that bypass RLS
 */
export function serverSupabaseServiceRole(event: H3Event): SupabaseClient<Database> {
  const config = useRuntimeConfig(event)

  const supabaseUrl = config.public.supabase?.url || process.env.SUPABASE_URL
  const supabaseServiceKey = config.supabase?.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Missing Supabase configuration (URL or service role key)'
    })
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Validate ISO 8601 date format (YYYY-MM-DD)
 * Validates both format and actual date validity (rejects Feb 30, etc.)
 */
export function isValidISODate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return false

  // Verify the parsed date matches the input (catches Feb 30 → Mar 2 issues)
  const [year, month, day] = dateString.split('-').map(Number)
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
  )
}

/**
 * Available collector sources
 */
export const COLLECTOR_SOURCES = [
  'sentry',
  'github',
  'debugbear',
  'dependabot',
  'coverage'
] as const

export type CollectorSource = (typeof COLLECTOR_SOURCES)[number]

/**
 * Check if a string is a valid collector source
 */
export function isValidSource(source: string): source is CollectorSource {
  return COLLECTOR_SOURCES.includes(source as CollectorSource)
}
