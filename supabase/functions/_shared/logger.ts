/**
 * Collection logger - writes to collection_logs table
 * All collector executions (success or failure) must be logged
 */

import { getSupabaseClient } from './supabaseClient.ts'
import type { CollectionLogInsert, CollectResult } from './types.ts'

export async function logCollection(
  sourceId: number,
  repositoryId: number,
  status: 'success' | 'failed' | 'partial',
  rowsCollected: number,
  startedAt: Date,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient()
  const durationMs = Date.now() - startedAt.getTime()

  const logEntry: CollectionLogInsert = {
    source_id: sourceId,
    repository_id: repositoryId,
    status,
    rows_collected: rowsCollected,
    error_message: errorMessage,
    duration_ms: durationMs,
    started_at: startedAt.toISOString()
  }

  const { error } = await supabase
    .from('collection_logs')
    .insert(logEntry)

  if (error) {
    // Log to console as fallback - collection_logs insert failed
    console.error('[logger] Failed to insert collection_log:', error.message)
  }
}

export function createCollectResult(
  source: string,
  repositoryId: number,
  status: 'success' | 'failed' | 'partial',
  rowsCollected: number,
  startedAt: Date,
  errorMessage?: string
): CollectResult {
  return {
    source,
    repositoryId,
    status,
    rowsCollected,
    durationMs: Date.now() - startedAt.getTime(),
    errorMessage
  }
}
