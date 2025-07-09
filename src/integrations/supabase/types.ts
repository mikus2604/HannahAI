export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      call_sessions: {
        Row: {
          call_id: string
          collected_data: Json | null
          context: Json | null
          created_at: string
          current_state: string
          id: string
          updated_at: string
        }
        Insert: {
          call_id: string
          collected_data?: Json | null
          context?: Json | null
          created_at?: string
          current_state?: string
          id?: string
          updated_at?: string
        }
        Update: {
          call_id?: string
          collected_data?: Json | null
          context?: Json | null
          created_at?: string
          current_state?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_duration: number | null
          call_status: string
          created_at: string
          ended_at: string | null
          from_number: string
          id: string
          recording_expires_at: string | null
          recording_url: string | null
          started_at: string
          to_number: string
          twilio_call_sid: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          call_duration?: number | null
          call_status?: string
          created_at?: string
          ended_at?: string | null
          from_number: string
          id?: string
          recording_expires_at?: string | null
          recording_url?: string | null
          started_at?: string
          to_number: string
          twilio_call_sid: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          call_duration?: number | null
          call_status?: string
          created_at?: string
          ended_at?: string | null
          from_number?: string
          id?: string
          recording_expires_at?: string | null
          recording_url?: string | null
          started_at?: string
          to_number?: string
          twilio_call_sid?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          call_ids: string[]
          email_content: string
          email_subject: string
          id: string
          notification_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          call_ids?: string[]
          email_content: string
          email_subject: string
          id?: string
          notification_type: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          call_ids?: string[]
          email_content?: string
          email_subject?: string
          id?: string
          notification_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      greeting_messages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_assignments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          phone_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assistant_name: string | null
          authenticator_app: string | null
          avatar_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          id: string
          office_address: string | null
          opening_message: string | null
          phone_number: string | null
          plan_expires_at: string | null
          plan_type: string
          totp_secret: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          assistant_name?: string | null
          authenticator_app?: string | null
          avatar_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          office_address?: string | null
          opening_message?: string | null
          phone_number?: string | null
          plan_expires_at?: string | null
          plan_type?: string
          totp_secret?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          assistant_name?: string | null
          authenticator_app?: string | null
          avatar_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          office_address?: string | null
          opening_message?: string | null
          phone_number?: string | null
          plan_expires_at?: string | null
          plan_type?: string
          totp_secret?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          prompt: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          prompt: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          prompt?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          call_id: string
          confidence: number | null
          id: string
          intent: string | null
          message: string
          speaker: string
          timestamp: string
        }
        Insert: {
          call_id: string
          confidence?: number | null
          id?: string
          intent?: string | null
          message: string
          speaker: string
          timestamp?: string
        }
        Update: {
          call_id?: string
          confidence?: number | null
          id?: string
          intent?: string | null
          message?: string
          speaker?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          notification_frequency: string
          recording_storage_duration: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          notification_frequency?: string
          recording_storage_duration?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          notification_frequency?: string
          recording_storage_duration?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          api_requests_count: number
          calls_count: number
          created_at: string
          greeting_messages_count: number
          id: string
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_requests_count?: number
          calls_count?: number
          created_at?: string
          greeting_messages_count?: number
          id?: string
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_requests_count?: number
          calls_count?: number
          created_at?: string
          greeting_messages_count?: number
          id?: string
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_profile: {
        Args: {
          target_user_id: string
          new_plan_type: string
          new_plan_expires_at: string
        }
        Returns: boolean
      }
      can_user_add_greeting: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      can_user_make_call: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      get_admin_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          free_users: number
          premium_users: number
          premium_plus_users: number
          enterprise_users: number
          subscribed_users: number
          users_with_calls: number
          total_calls: number
          total_call_duration_seconds: number
          active_users_30d: number
          active_users_7d: number
        }[]
      }
      get_user_plan_type: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_user_calls: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_user" | "admin" | "user"
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["super_user", "admin", "user"],
    },
  },
} as const
