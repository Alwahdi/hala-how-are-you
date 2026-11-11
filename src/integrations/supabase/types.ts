export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_prefs: {
        Row: {
          auto_cleanup: boolean
          cards_low: boolean
          cleanup_after_days: number
          daily_report: boolean
          health: boolean
          last_cleanup_on: string | null
          last_report_on: string | null
          owner_id: string
          report_hour: number
          router_down: boolean
          router_strain: boolean
          updated_at: string
          utc_offset_min: number
        }
        Insert: {
          auto_cleanup?: boolean
          cards_low?: boolean
          cleanup_after_days?: number
          daily_report?: boolean
          health?: boolean
          last_cleanup_on?: string | null
          last_report_on?: string | null
          owner_id: string
          report_hour?: number
          router_down?: boolean
          router_strain?: boolean
          updated_at?: string
          utc_offset_min?: number
        }
        Update: {
          auto_cleanup?: boolean
          cards_low?: boolean
          cleanup_after_days?: number
          daily_report?: boolean
          health?: boolean
          last_cleanup_on?: string | null
          last_report_on?: string | null
          owner_id?: string
          report_hour?: number
          router_down?: boolean
          router_strain?: boolean
          updated_at?: string
          utc_offset_min?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          body: string
          created_at: string
          dedup_key: string
          id: string
          kind: string
          owner_id: string
          path: string
          read_at: string | null
          router_id: string | null
          severity: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          dedup_key: string
          id?: string
          kind: string
          owner_id: string
          path?: string
          read_at?: string | null
          router_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          dedup_key?: string
          id?: string
          kind?: string
          owner_id?: string
          path?: string
          read_at?: string | null
          router_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      early_access_contacts: {
        Row: {
          contact_method: string
          contact_value: string
          created_at: string
          id: string
          language: string
          source: string
        }
        Insert: {
          contact_method: string
          contact_value: string
          created_at?: string
          id?: string
          language: string
          source?: string
        }
        Update: {
          contact_method?: string
          contact_value?: string
          created_at?: string
          id?: string
          language?: string
          source?: string
        }
        Relationships: []
      }
      early_access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          language: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          language: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          language?: string
          source?: string
        }
        Relationships: []
      }
      network_settings: {
        Row: {
          charset: string
          confirmed: boolean
          length: number
          mode: string
          owner_id: string
          prefix: string
          source: string
          updated_at: string
        }
        Insert: {
          charset?: string
          confirmed?: boolean
          length?: number
          mode: string
          owner_id: string
          prefix?: string
          source: string
          updated_at?: string
        }
        Update: {
          charset?: string
          confirmed?: boolean
          length?: number
          mode?: string
          owner_id?: string
          prefix?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          city: string | null
          created_at: string
          id: string
          language: string
          network_name: string | null
          phone: string | null
          phone_verified_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          city?: string | null
          created_at?: string
          id: string
          language?: string
          network_name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          city?: string | null
          created_at?: string
          id?: string
          language?: string
          network_name?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          owner_id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          owner_id: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          owner_id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      router_cards: {
        Row: {
          bytes: number
          comment: string | null
          disabled: boolean
          expires_at: string | null
          finished_at: string | null
          first_seen_at: string
          first_used_at: string | null
          last_online_at: string | null
          limit_bytes: number | null
          limit_uptime_s: number | null
          name: string
          profile: string | null
          pw_mode: string | null
          router_id: string
          source: string
          synced_at: string
          um_state: string | null
          uptime_s: number
        }
        Insert: {
          bytes?: number
          comment?: string | null
          disabled?: boolean
          expires_at?: string | null
          finished_at?: string | null
          first_seen_at?: string
          first_used_at?: string | null
          last_online_at?: string | null
          limit_bytes?: number | null
          limit_uptime_s?: number | null
          name: string
          profile?: string | null
          pw_mode?: string | null
          router_id: string
          source: string
          synced_at?: string
          um_state?: string | null
          uptime_s?: number
        }
        Update: {
          bytes?: number
          comment?: string | null
          disabled?: boolean
          expires_at?: string | null
          finished_at?: string | null
          first_seen_at?: string
          first_used_at?: string | null
          last_online_at?: string | null
          limit_bytes?: number | null
          limit_uptime_s?: number | null
          name?: string
          profile?: string | null
          pw_mode?: string | null
          router_id?: string
          source?: string
          synced_at?: string
          um_state?: string | null
          uptime_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "router_cards_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          kind: string
          owner_id: string
          router_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          owner_id: string
          router_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          owner_id?: string
          router_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_events_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_jobs: {
        Row: {
          auto: boolean
          done_at: string | null
          id: string
          kind: string
          owner_id: string
          payload: Json
          requested_at: string
          result: string | null
          router_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          auto?: boolean
          done_at?: string | null
          id?: string
          kind: string
          owner_id: string
          payload?: Json
          requested_at?: string
          result?: string | null
          router_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          auto?: boolean
          done_at?: string | null
          id?: string
          kind?: string
          owner_id?: string
          payload?: Json
          requested_at?: string
          result?: string | null
          router_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_jobs_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_profiles: {
        Row: {
          extra: Json
          name: string
          price: string | null
          rate_limit: string | null
          router_id: string
          sell_price: string | null
          shared_users: string | null
          source: string
          synced_at: string
          validity: string | null
        }
        Insert: {
          extra?: Json
          name: string
          price?: string | null
          rate_limit?: string | null
          router_id: string
          sell_price?: string | null
          shared_users?: string | null
          source: string
          synced_at?: string
          validity?: string | null
        }
        Update: {
          extra?: Json
          name?: string
          price?: string | null
          rate_limit?: string | null
          router_id?: string
          sell_price?: string | null
          shared_users?: string | null
          source?: string
          synced_at?: string
          validity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "router_profiles_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_sessions: {
        Row: {
          address: string | null
          bytes: number
          mac: string
          router_id: string
          source: string
          synced_at: string
          uptime_s: number
          username: string
        }
        Insert: {
          address?: string | null
          bytes?: number
          mac: string
          router_id: string
          source: string
          synced_at?: string
          uptime_s?: number
          username: string
        }
        Update: {
          address?: string | null
          bytes?: number
          mac?: string
          router_id?: string
          source?: string
          synced_at?: string
          uptime_s?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_sessions_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_setups: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          fetch_count: number
          router_id: string
          sealed: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          fetch_count?: number
          router_id: string
          sealed: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          fetch_count?: number
          router_id?: string
          sealed?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_setups_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_status_log: {
        Row: {
          created_at: string
          id: number
          router_id: string
          status: Json
        }
        Insert: {
          created_at?: string
          id?: never
          router_id: string
          status: Json
        }
        Update: {
          created_at?: string
          id?: never
          router_id?: string
          status?: Json
        }
        Relationships: [
          {
            foreignKeyName: "router_status_log_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      routers: {
        Row: {
          api_secret_encrypted: string | null
          api_user: string | null
          card_runs: Json
          cards_sync_started_at: string | null
          cards_synced_at: string | null
          cloud_host: string | null
          connection_method: string
          created_at: string
          direct_checked_at: string | null
          direct_port: number | null
          direct_tls: boolean | null
          health: Json | null
          health_checked_at: string | null
          id: string
          last_check_error: string | null
          last_seen_at: string | null
          last_status: Json | null
          name: string
          owner_id: string
          role: string
          ros_version: string
          token_hash: string | null
          watch_state: Json
        }
        Insert: {
          api_secret_encrypted?: string | null
          api_user?: string | null
          card_runs?: Json
          cards_sync_started_at?: string | null
          cards_synced_at?: string | null
          cloud_host?: string | null
          connection_method?: string
          created_at?: string
          direct_checked_at?: string | null
          direct_port?: number | null
          direct_tls?: boolean | null
          health?: Json | null
          health_checked_at?: string | null
          id?: string
          last_check_error?: string | null
          last_seen_at?: string | null
          last_status?: Json | null
          name: string
          owner_id: string
          role?: string
          ros_version?: string
          token_hash?: string | null
          watch_state?: Json
        }
        Update: {
          api_secret_encrypted?: string | null
          api_user?: string | null
          card_runs?: Json
          cards_sync_started_at?: string | null
          cards_synced_at?: string | null
          cloud_host?: string | null
          connection_method?: string
          created_at?: string
          direct_checked_at?: string | null
          direct_port?: number | null
          direct_tls?: boolean | null
          health?: Json | null
          health_checked_at?: string | null
          id?: string
          last_check_error?: string | null
          last_seen_at?: string | null
          last_status?: Json | null
          name?: string
          owner_id?: string
          role?: string
          ros_version?: string
          token_hash?: string | null
          watch_state?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      card_run_step: {
        Args: {
          _done: boolean
          _page: number
          _router: string
          _source: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_finished_cards: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "engineer" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "engineer", "admin"],
    },
  },
} as const
