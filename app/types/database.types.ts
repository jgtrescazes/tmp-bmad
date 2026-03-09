/**
 * Supabase Database Types
 *
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * To regenerate: run `pnpm db:types` with Supabase running locally
 * Command: npx supabase gen types typescript --local > app/types/database.types.ts
 *
 * This placeholder provides type definitions for development.
 * Replace with generated types when Supabase is configured.
 */

export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
  public: {
    Tables: {
      dim_sources: {
        Row: {
          id: number
          name: string
          display_name: string
          frequency_minutes: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          display_name: string
          frequency_minutes: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_name?: string
          frequency_minutes?: number
          created_at?: string
        }
      }
      dim_metric_types: {
        Row: {
          id: number
          name: string
          axis: 'stability' | 'performance' | 'security' | 'quality'
          unit: string | null
          display_name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          axis: 'stability' | 'performance' | 'security' | 'quality'
          unit?: string | null
          display_name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          axis?: 'stability' | 'performance' | 'security' | 'quality'
          unit?: string | null
          display_name?: string
          created_at?: string
        }
      }
      dim_repositories: {
        Row: {
          id: number
          name: string
          display_name: string
          github_org: string
          github_repo: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          display_name: string
          github_org: string
          github_repo: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_name?: string
          github_org?: string
          github_repo?: string
          is_active?: boolean
          created_at?: string
        }
      }
      metrics_raw: {
        Row: {
          id: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value: number
          metadata: Json | null
          collected_at: string
          created_at: string
        }
        Insert: {
          id?: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value: number
          metadata?: Json | null
          collected_at: string
          created_at?: string
        }
        Update: {
          id?: number
          source_id?: number
          metric_type_id?: number
          repository_id?: number
          value?: number
          metadata?: Json | null
          collected_at?: string
          created_at?: string
        }
      }
      metrics_daily: {
        Row: {
          id: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min: number | null
          value_max: number | null
          sample_count: number
          period_start: string
          created_at: string
        }
        Insert: {
          id?: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min?: number | null
          value_max?: number | null
          sample_count: number
          period_start: string
          created_at?: string
        }
        Update: {
          id?: number
          source_id?: number
          metric_type_id?: number
          repository_id?: number
          value_avg?: number
          value_min?: number | null
          value_max?: number | null
          sample_count?: number
          period_start?: string
          created_at?: string
        }
      }
      metrics_weekly: {
        Row: {
          id: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min: number | null
          value_max: number | null
          sample_count: number
          period_start: string
          created_at: string
        }
        Insert: {
          id?: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min?: number | null
          value_max?: number | null
          sample_count: number
          period_start: string
          created_at?: string
        }
        Update: {
          id?: number
          source_id?: number
          metric_type_id?: number
          repository_id?: number
          value_avg?: number
          value_min?: number | null
          value_max?: number | null
          sample_count?: number
          period_start?: string
          created_at?: string
        }
      }
      metrics_monthly: {
        Row: {
          id: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min: number | null
          value_max: number | null
          sample_count: number
          period_start: string
          created_at: string
        }
        Insert: {
          id?: number
          source_id: number
          metric_type_id: number
          repository_id: number
          value_avg: number
          value_min?: number | null
          value_max?: number | null
          sample_count: number
          period_start: string
          created_at?: string
        }
        Update: {
          id?: number
          source_id?: number
          metric_type_id?: number
          repository_id?: number
          value_avg?: number
          value_min?: number | null
          value_max?: number | null
          sample_count?: number
          period_start?: string
          created_at?: string
        }
      }
      collection_logs: {
        Row: {
          id: number
          source_id: number
          repository_id: number
          status: 'success' | 'failed' | 'partial'
          rows_collected: number
          error_message: string | null
          duration_ms: number | null
          started_at: string
          completed_at: string
        }
        Insert: {
          id?: number
          source_id: number
          repository_id: number
          status: 'success' | 'failed' | 'partial'
          rows_collected?: number
          error_message?: string | null
          duration_ms?: number | null
          started_at: string
          completed_at?: string
        }
        Update: {
          id?: number
          source_id?: number
          repository_id?: number
          status?: 'success' | 'failed' | 'partial'
          rows_collected?: number
          error_message?: string | null
          duration_ms?: number | null
          started_at?: string
          completed_at?: string
        }
      }
      deployments: {
        Row: {
          id: number
          repository_id: number
          sha: string
          short_sha: string
          message: string
          author: string
          pr_number: number | null
          deployed_at: string
          created_at: string
        }
        Insert: {
          id?: number
          repository_id: number
          sha: string
          message: string
          author: string
          pr_number?: number | null
          deployed_at: string
          created_at?: string
        }
        Update: {
          id?: number
          repository_id?: number
          sha?: string
          message?: string
          author?: string
          pr_number?: number | null
          deployed_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_rollup_daily: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fn_rollup_weekly: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fn_rollup_monthly: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fn_cleanup_old_raw: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fn_cleanup_old_daily: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
