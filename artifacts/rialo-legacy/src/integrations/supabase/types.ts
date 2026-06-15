export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          message: string
          severity: string
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          message: string
          severity?: string
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          message?: string
          severity?: string
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          amount: number
          beneficiary_id: string | null
          created_at: string
          id: string
          name: string
          symbol: string
          token_address: string | null
          user_id: string
          value_usd: number | null
        }
        Insert: {
          amount: number
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          name: string
          symbol: string
          token_address?: string | null
          user_id: string
          value_usd?: number | null
        }
        Update: {
          amount?: number
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          token_address?: string | null
          user_id?: string
          value_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          allocation_percent: number
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          allocation_percent?: number
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          allocation_percent?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      guardians: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      inactivity_settings: {
        Row: {
          auto_check_in_enabled: boolean
          check_interval_days: number
          created_at: string
          current_status: string
          final_warning_enabled: boolean
          id: string
          inactivity_days: number
          last_check_in: string | null
          multi_signal_enabled: boolean
          required_approvals: number
          time_delay_days: number
          time_delay_enabled: boolean
          total_guardians: number
          user_id: string
        }
        Insert: {
          auto_check_in_enabled?: boolean
          check_interval_days?: number
          created_at?: string
          current_status?: string
          final_warning_enabled?: boolean
          id?: string
          inactivity_days?: number
          last_check_in?: string | null
          multi_signal_enabled?: boolean
          required_approvals?: number
          time_delay_days?: number
          time_delay_enabled?: boolean
          total_guardians?: number
          user_id: string
        }
        Update: {
          auto_check_in_enabled?: boolean
          check_interval_days?: number
          created_at?: string
          current_status?: string
          final_warning_enabled?: boolean
          id?: string
          inactivity_days?: number
          last_check_in?: string | null
          multi_signal_enabled?: boolean
          required_approvals?: number
          time_delay_days?: number
          time_delay_enabled?: boolean
          total_guardians?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      tracked_wallets: {
        Row: {
          address: string
          chain: string
          created_at: string
          id: string
          label: string | null
          last_updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          chain?: string
          created_at?: string
          id?: string
          label?: string | null
          last_updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          id?: string
          label?: string | null
          last_updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_deposits: {
        Row: {
          amount: number
          chain_id: number
          created_at: string
          from_address: string
          id: string
          status: string
          token: string
          tx_hash: string
          user_id: string
        }
        Insert: {
          amount: number
          chain_id: number
          created_at?: string
          from_address: string
          id?: string
          status?: string
          token?: string
          tx_hash: string
          user_id: string
        }
        Update: {
          amount?: number
          chain_id?: number
          created_at?: string
          from_address?: string
          id?: string
          status?: string
          token?: string
          tx_hash?: string
          user_id?: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
