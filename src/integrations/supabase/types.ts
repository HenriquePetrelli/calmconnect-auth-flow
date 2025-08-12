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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          patient_id: string
          psychologist_id: string
          scheduled_at: string
          session_summary: string | null
          status: string
          updated_at: string
          video_room_id: string | null
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          psychologist_id: string
          scheduled_at: string
          session_summary?: string | null
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Update: {
          appointment_type?: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          psychologist_id?: string
          scheduled_at?: string
          session_summary?: string | null
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointments_psychologist"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      brazilian_cities: {
        Row: {
          id: number
          latitude: number | null
          longitude: number | null
          name: string
          state: string
        }
        Insert: {
          id?: number
          latitude?: number | null
          longitude?: number | null
          name: string
          state: string
        }
        Update: {
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string
          state?: string
        }
        Relationships: []
      }
      brazilian_states: {
        Row: {
          abbreviation: string
          id: number
          latitude: number
          longitude: number
          name: string
          region: string
          uf_code: number
        }
        Insert: {
          abbreviation: string
          id?: number
          latitude: number
          longitude: number
          name: string
          region: string
          uf_code: number
        }
        Update: {
          abbreviation?: string
          id?: number
          latitude?: number
          longitude?: number
          name?: string
          region?: string
          uf_code?: number
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          id: string
          patient_details: Json
          patient_id: string
          status: string
          updated_at: string
          video_room_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          patient_details?: Json
          patient_id: string
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          patient_details?: Json
          patient_id?: string
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          is_active: boolean | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          fcm_response: Json | null
          id: string
          recipient_count: number | null
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          fcm_response?: Json | null
          id?: string
          recipient_count?: number | null
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          fcm_response?: Json | null
          id?: string
          recipient_count?: number | null
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_progress: {
        Row: {
          anxiety_level: number | null
          created_at: string
          id: string
          mood_rating: number | null
          notes: string | null
          patient_id: string
          session_date: string
          session_duration: number | null
          stress_level: number | null
          technique_used: string | null
        }
        Insert: {
          anxiety_level?: number | null
          created_at?: string
          id?: string
          mood_rating?: number | null
          notes?: string | null
          patient_id: string
          session_date?: string
          session_duration?: number | null
          stress_level?: number | null
          technique_used?: string | null
        }
        Update: {
          anxiety_level?: number | null
          created_at?: string
          id?: string
          mood_rating?: number | null
          notes?: string | null
          patient_id?: string
          session_date?: string
          session_duration?: number | null
          stress_level?: number | null
          technique_used?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          city: string
          cpf: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          reason: string | null
          state: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city: string
          cpf: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          reason?: string | null
          state: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string
          cpf?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          reason?: string | null
          state?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          crp: string | null
          full_name: string
          id: string
          registration_status: string | null
          specialty: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          crp?: string | null
          full_name: string
          id?: string
          registration_status?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          cpf?: string | null
          created_at?: string
          crp?: string | null
          full_name?: string
          id?: string
          registration_status?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      psychologist_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          psychologist_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          psychologist_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          psychologist_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      psychologist_presence: {
        Row: {
          created_at: string
          emergency_accepted_count: number
          emergency_rejected_count: number
          is_online: boolean
          last_online: string | null
          psychologist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_accepted_count?: number
          emergency_rejected_count?: number
          is_online?: boolean
          last_online?: string | null
          psychologist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_accepted_count?: number
          emergency_rejected_count?: number
          is_online?: boolean
          last_online?: string | null
          psychologist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psychologist_presence_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: true
            referencedRelation: "psychologists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      psychologist_registrations: {
        Row: {
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["registration_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psychologists: {
        Row: {
          address: string | null
          approval_status: string | null
          approved: boolean | null
          bio: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          crp_number: string
          document_url: string | null
          documents: string[] | null
          email: string
          full_name: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialization: string | null
          state: string | null
          submitted_at: string | null
          total_appointments: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string | null
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          crp_number: string
          document_url?: string | null
          documents?: string[] | null
          email: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: string | null
          state?: string | null
          submitted_at?: string | null
          total_appointments?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string | null
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          crp_number?: string
          document_url?: string | null
          documents?: string[] | null
          email?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialization?: string | null
          state?: string | null
          submitted_at?: string | null
          total_appointments?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          current_usage: Json | null
          email: string
          id: string
          plan_limits: Json | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_usage?: Json | null
          email: string
          id?: string
          plan_limits?: Json | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_usage?: Json | null
          email?: string
          id?: string
          plan_limits?: Json | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_document: {
        Args: { bucket_name: string; object_name: string }
        Returns: boolean
      }
      can_upload_document: {
        Args: { bucket_name: string; object_name: string }
        Returns: boolean
      }
      create_admin_account: {
        Args: {
          admin_email: string
          admin_password: string
          admin_name: string
        }
        Returns: Json
      }
      create_psychologist_profile: {
        Args:
          | {
              p_user_id: string
              p_full_name: string
              p_email: string
              p_crp_number: string
              p_specialization: string
              p_bio: string
              p_state: string
              p_city: string
              p_accepts_presential: boolean
              p_address?: string
              p_document_url?: string
              p_cpf?: string
              p_professional_email?: string
            }
          | {
              p_user_id: string
              p_full_name: string
              p_email: string
              p_crp_number: string
              p_specialization: string
              p_bio: string
              p_state: string
              p_city: string
              p_address?: string
              p_document_url?: string
              p_cpf?: string
            }
          | {
              p_user_id: string
              p_full_name: string
              p_email: string
              p_crp_number: string
              p_specialization: string
              p_bio: string
              p_state: string
              p_city: string
              p_address?: string
              p_document_url?: string
              p_cpf?: string
              p_professional_email?: string
            }
        Returns: Json
      }
      get_admin_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_patients: number
          active_psychologists: number
          pending_psychologists: number
          active_subscribers: number
          appointments_last_30_days: number
          sos_requests_last_30_days: number
        }[]
      }
      get_psychologist_document_url: {
        Args: { document_path: string }
        Returns: string
      }
      get_user_type: {
        Args: { user_id_param: string }
        Returns: string
      }
      handle_psychologist_approval: {
        Args: { psychologist_id: string; admin_id: string }
        Returns: undefined
      }
      handle_psychologist_rejection: {
        Args: {
          psychologist_id: string
          admin_id: string
          rejection_reason?: string
        }
        Returns: undefined
      }
      increment_emergency_accepted: {
        Args: { p_psychologist_id: string }
        Returns: undefined
      }
      increment_emergency_rejected: {
        Args: { p_psychologist_id: string }
        Returns: undefined
      }
      is_super_admin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      promote_to_admin: {
        Args: { target_user_email: string }
        Returns: boolean
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
      validate_crp: {
        Args: { crp_input: string }
        Returns: boolean
      }
      validate_route_access: {
        Args: { user_id_param: string; route_path: string }
        Returns: boolean
      }
      validate_unique_crp: {
        Args: { crp_input: string; exclude_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      registration_status: "pending" | "approved" | "rejected"
      user_type: "patient" | "psychologist" | "admin"
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
      registration_status: ["pending", "approved", "rejected"],
      user_type: ["patient", "psychologist", "admin"],
    },
  },
} as const
