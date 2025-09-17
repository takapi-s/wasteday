// Supabase自動生成型定義のプレースホルダー
// 実際の型は `npm run generate-types` で生成されます

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      waste_categories: {
        Row: {
          id: string
          name: string
          type: 'app' | 'domain'
          identifier: string
          label: 'waste' | 'neutral' | 'study'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'app' | 'domain'
          identifier: string
          label?: 'waste' | 'neutral' | 'study'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'app' | 'domain'
          identifier?: string
          label?: 'waste' | 'neutral' | 'study'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exclusion_rules: {
        Row: {
          id: string
          category_id: string
          rule_type: 'path' | 'query' | 'channel_id' | 'regex'
          pattern: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          rule_type: 'path' | 'query' | 'channel_id' | 'regex'
          pattern: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          rule_type?: 'path' | 'query' | 'channel_id' | 'regex'
          pattern?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusion_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          category_id: string | null
          session_key: string
          start_time: string
          end_time: string
          duration_seconds: number
          is_idle: boolean
          is_media_playing: boolean
          window_title: string | null
          url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          session_key: string
          start_time: string
          end_time: string
          duration_seconds: number
          is_idle?: boolean
          is_media_playing?: boolean
          window_title?: string | null
          url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          session_key?: string
          start_time?: string
          end_time?: string
          duration_seconds?: number
          is_idle?: boolean
          is_media_playing?: boolean
          window_title?: string | null
          url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          id: string
          date: string
          total_waste_seconds: number
          total_active_seconds: number
          waste_ratio_active: number
          waste_ratio_24h: number
          goal_seconds: number
          goal_achieved: boolean
          top_categories: Json | null
          hourly_breakdown: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          total_waste_seconds?: number
          total_active_seconds?: number
          waste_ratio_active?: number
          waste_ratio_24h?: number
          goal_seconds?: number
          goal_achieved?: boolean
          top_categories?: Json | null
          hourly_breakdown?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_waste_seconds?: number
          total_active_seconds?: number
          waste_ratio_active?: number
          waste_ratio_24h?: number
          goal_seconds?: number
          goal_achieved?: boolean
          top_categories?: Json | null
          hourly_breakdown?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          id: string
          week_start_date: string
          total_waste_seconds: number
          total_active_seconds: number
          average_daily_waste_seconds: number
          waste_ratio_active: number
          waste_ratio_24h: number
          goal_achieved_days: number
          top_categories: Json | null
          daily_breakdown: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          week_start_date: string
          total_waste_seconds?: number
          total_active_seconds?: number
          average_daily_waste_seconds?: number
          waste_ratio_active?: number
          waste_ratio_24h?: number
          goal_achieved_days?: number
          top_categories?: Json | null
          daily_breakdown?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          week_start_date?: string
          total_waste_seconds?: number
          total_active_seconds?: number
          average_daily_waste_seconds?: number
          waste_ratio_active?: number
          waste_ratio_24h?: number
          goal_achieved_days?: number
          top_categories?: Json | null
          daily_breakdown?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          notification_type: string
          title: string
          message: string
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          notification_type: string
          title: string
          message: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          notification_type?: string
          title?: string
          message?: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
