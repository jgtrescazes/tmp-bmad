/**
 * Backfill API Endpoint
 * Triggers historical data collection for specified sources and date range
 *
 * POST /api/backfill
 * Body: {
 *   source?: string        // Optional: specific source (sentry, github, etc.) - all if omitted
 *   from: string           // Required: ISO 8601 date (YYYY-MM-DD)
 *   to: string             // Required: ISO 8601 date (YYYY-MM-DD)
 *   repositoryId?: number  // Optional: specific repository - default if omitted
 * }
 */

import {
  serverSupabaseServiceRole,
  isValidISODate,
  isValidSource,
  COLLECTOR_SOURCES
} from '../utils/supabase'
import type { CollectorSource } from '../utils/supabase'

interface BackfillRequest {
  source?: string
  from: string
  to: string
  repositoryId?: number
}

interface BackfillResult {
  source: string
  status: 'success' | 'failed' | 'partial' | 'skipped'
  rowsCollected?: number
  errorMessage?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<BackfillRequest>(event)

  // Validate required parameters
  if (!body.from || !body.to) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters: from and to (ISO 8601 date format YYYY-MM-DD)'
    })
  }

  // Validate date format
  if (!isValidISODate(body.from)) {
    throw createError({
      statusCode: 400,
      message: `Invalid 'from' date format: ${body.from}. Expected YYYY-MM-DD`
    })
  }

  if (!isValidISODate(body.to)) {
    throw createError({
      statusCode: 400,
      message: `Invalid 'to' date format: ${body.to}. Expected YYYY-MM-DD`
    })
  }

  // Validate date range
  const fromDate = new Date(body.from)
  const toDate = new Date(body.to)

  if (fromDate > toDate) {
    throw createError({
      statusCode: 400,
      message: `Invalid date range: 'from' (${body.from}) must be before 'to' (${body.to})`
    })
  }

  // Check if range is within allowed limits (max 90 days for most APIs)
  const maxRangeDays = 90
  const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)

  if (rangeDays > maxRangeDays) {
    throw createError({
      statusCode: 400,
      message: `Date range too large: ${rangeDays} days. Maximum allowed is ${maxRangeDays} days.`
    })
  }

  // Validate source if provided
  if (body.source && !isValidSource(body.source)) {
    throw createError({
      statusCode: 400,
      message: `Invalid source: ${body.source}. Valid sources: ${COLLECTOR_SOURCES.join(', ')}`
    })
  }

  // Validate repositoryId if provided (must be positive integer)
  if (body.repositoryId !== undefined) {
    if (typeof body.repositoryId !== 'number' || !Number.isInteger(body.repositoryId) || body.repositoryId < 1) {
      throw createError({
        statusCode: 400,
        message: 'Invalid repositoryId: must be a positive integer'
      })
    }
  }

  // Determine which sources to backfill
  const sources: CollectorSource[] = body.source
    ? [body.source as CollectorSource]
    : [...COLLECTOR_SOURCES]

  // Get Supabase client with service role
  const supabase = serverSupabaseServiceRole(event)

  // Invoke collectors with backfill parameters
  const results: BackfillResult[] = await Promise.all(
    sources.map(async (source): Promise<BackfillResult> => {
      try {
        const { data, error } = await supabase.functions.invoke(`collect-${source}`, {
          body: {
            backfill: {
              from: body.from,
              to: body.to
            },
            repositoryId: body.repositoryId
          }
        })

        if (error) {
          return {
            source,
            status: 'failed',
            errorMessage: error.message || 'Unknown error invoking collector'
          }
        }

        // Parse collector response
        const collectorResult = data?.data
        if (collectorResult) {
          return {
            source,
            status: collectorResult.status || 'success',
            rowsCollected: collectorResult.rowsCollected,
            errorMessage: collectorResult.errorMessage
          }
        }

        return {
          source,
          status: 'success',
          rowsCollected: 0
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return {
          source,
          status: 'failed',
          errorMessage
        }
      }
    })
  )

  // Calculate summary
  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const partialCount = results.filter(r => r.status === 'partial').length
  const totalRows = results.reduce((sum, r) => sum + (r.rowsCollected || 0), 0)

  return {
    data: {
      results,
      summary: {
        sources: sources.length,
        success: successCount,
        failed: failedCount,
        partial: partialCount,
        totalRowsCollected: totalRows
      },
      parameters: {
        from: body.from,
        to: body.to,
        source: body.source || 'all',
        repositoryId: body.repositoryId || 'default'
      }
    },
    error: null
  }
})
