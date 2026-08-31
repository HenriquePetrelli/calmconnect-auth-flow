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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          patient_id: string
          proposal_notes: string | null
          proposed_scheduled_at: string | null
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
          proposal_notes?: string | null
          proposed_scheduled_at?: string | null
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
          proposal_notes?: string | null
          proposed_scheduled_at?: string | null
          psychologist_id?: string
          scheduled_at?: string
          session_summary?: string | null
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_psychologist_fk"
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
      conversas: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          paciente_id: string
          psicologo_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          paciente_id: string
          psicologo_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          paciente_id?: string
          psicologo_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      default_weekly_goals: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          target: number
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          target?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          target?: number
          title?: string
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          crisis_resolved: boolean | null
          duration: number | null
          end_notes: string | null
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          ended_by_type: string | null
          expires_at: string | null
          id: string
          patient_details: Json
          patient_id: string
          room_url: string | null
          started_at: string | null
          status: string
          updated_at: string
          video_room_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          crisis_resolved?: boolean | null
          duration?: number | null
          end_notes?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ended_by_type?: string | null
          expires_at?: string | null
          id?: string
          patient_details?: Json
          patient_id: string
          room_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          video_room_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          crisis_resolved?: boolean | null
          duration?: number | null
          end_notes?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ended_by_type?: string | null
          expires_at?: string | null
          id?: string
          patient_details?: Json
          patient_id?: string
          room_url?: string | null
          started_at?: string | null
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
      group_favorites: {
        Row: {
          favoritado_em: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          favoritado_em?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          favoritado_em?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_favorites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "support_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_testimonial_likes: {
        Row: {
          criado_em: string
          id: string
          testimonial_id: string
          tipo: Database["public"]["Enums"]["like_type"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          testimonial_id: string
          tipo: Database["public"]["Enums"]["like_type"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          testimonial_id?: string
          tipo?: Database["public"]["Enums"]["like_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_testimonial_likes_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: false
            referencedRelation: "group_testimonials"
            referencedColumns: ["id"]
          },
        ]
      }
      group_testimonials: {
        Row: {
          anonimo: boolean
          criado_em: string
          group_id: string
          humor: number
          id: string
          likes_negativos: number
          likes_positivos: number
          sintoma_id: string | null
          texto: string
          user_id: string
        }
        Insert: {
          anonimo?: boolean
          criado_em?: string
          group_id: string
          humor: number
          id?: string
          likes_negativos?: number
          likes_positivos?: number
          sintoma_id?: string | null
          texto: string
          user_id: string
        }
        Update: {
          anonimo?: boolean
          criado_em?: string
          group_id?: string
          humor?: number
          id?: string
          likes_negativos?: number
          likes_positivos?: number
          sintoma_id?: string | null
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_testimonials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "support_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_testimonials_sintoma_id_fkey"
            columns: ["sintoma_id"]
            isOneToOne: false
            referencedRelation: "transtornos_sintomas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          autor_id: string
          conteudo: string | null
          conversa_id: string
          created_at: string
          id: string
          imagem_url: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          conteudo?: string | null
          conversa_id: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          conteudo?: string | null
          conversa_id?: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          message: string
          patient_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          patient_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          patient_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_presence: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          session_id: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          session_id: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          session_id?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      patient_achievements: {
        Row: {
          achieved: boolean
          achieved_at: string | null
          created_at: string
          description: string
          icon: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          description: string
          icon: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          title?: string
          updated_at?: string
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
      patient_statistics: {
        Row: {
          created_at: string
          id: string
          last_active_date: string | null
          patient_id: string
          quarterly_activities: Json[] | null
          recent_activities: Json[] | null
          streak_days: number
          total_emergency_consultations: number
          total_guided_breathing_time: number
          total_scheduled_consultations: number
          total_therapeutic_sound_time: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_date?: string | null
          patient_id: string
          quarterly_activities?: Json[] | null
          recent_activities?: Json[] | null
          streak_days?: number
          total_emergency_consultations?: number
          total_guided_breathing_time?: number
          total_scheduled_consultations?: number
          total_therapeutic_sound_time?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_date?: string | null
          patient_id?: string
          quarterly_activities?: Json[] | null
          recent_activities?: Json[] | null
          streak_days?: number
          total_emergency_consultations?: number
          total_guided_breathing_time?: number
          total_scheduled_consultations?: number
          total_therapeutic_sound_time?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_weekly_goals: {
        Row: {
          completed: boolean | null
          created_at: string | null
          goal_id: string
          id: string
          progress: number | null
          target: number
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          goal_id: string
          id?: string
          progress?: number | null
          target: number
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          goal_id?: string
          id?: string
          progress?: number | null
          target?: number
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_weekly_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "weekly_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          blocked_until: string | null
          city: string
          cpf: string
          created_at: string | null
          daily_mood_count: number | null
          daily_mood_enabled: boolean
          daily_mood_sum: number | null
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          last_mood_date: string | null
          last_mood_value: number | null
          phone: string | null
          show_goal_modal: boolean | null
          show_weekly_goal_modal: boolean | null
          sintomas_selecionados: string[] | null
          state: string
          updated_at: string | null
          user_id: string | null
          weekly_goals: string[] | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_until?: string | null
          city: string
          cpf: string
          created_at?: string | null
          daily_mood_count?: number | null
          daily_mood_enabled?: boolean
          daily_mood_sum?: number | null
          email: string
          full_name: string
          id?: string
          is_blocked?: boolean
          last_mood_date?: string | null
          last_mood_value?: number | null
          phone?: string | null
          show_goal_modal?: boolean | null
          show_weekly_goal_modal?: boolean | null
          sintomas_selecionados?: string[] | null
          state: string
          updated_at?: string | null
          user_id?: string | null
          weekly_goals?: string[] | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_until?: string | null
          city?: string
          cpf?: string
          created_at?: string | null
          daily_mood_count?: number | null
          daily_mood_enabled?: boolean
          daily_mood_sum?: number | null
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          last_mood_date?: string | null
          last_mood_value?: number | null
          phone?: string | null
          show_goal_modal?: boolean | null
          show_weekly_goal_modal?: boolean | null
          sintomas_selecionados?: string[] | null
          state?: string
          updated_at?: string | null
          user_id?: string | null
          weekly_goals?: string[] | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          action: string
          admin_id: string
          amount_paid: number | null
          created_at: string | null
          details: Json | null
          emergency_count: number | null
          id: string
          psychologist_id: string
          scheduled_count: number | null
        }
        Insert: {
          action: string
          admin_id: string
          amount_paid?: number | null
          created_at?: string | null
          details?: Json | null
          emergency_count?: number | null
          id?: string
          psychologist_id: string
          scheduled_count?: number | null
        }
        Update: {
          action?: string
          admin_id?: string
          amount_paid?: number | null
          created_at?: string | null
          details?: Json | null
          emergency_count?: number | null
          id?: string
          psychologist_id?: string
          scheduled_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      private_journals: {
        Row: {
          atualizado_em: string
          criado_em: string
          humor: number
          id: string
          texto: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          humor: number
          id?: string
          texto: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          humor?: number
          id?: string
          texto?: string
          user_id?: string
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
      psychologist_payments: {
        Row: {
          cpf: string | null
          created_at: string | null
          crp: string | null
          email: string
          emergency_paid_count: number | null
          emergency_pending_count: number | null
          id: string
          name: string
          pix_key: string | null
          pix_type: string | null
          psychologist_id: string
          scheduled_paid_count: number | null
          scheduled_pending_count: number | null
          total_paid_amount: number | null
          total_pending_amount: number | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          crp?: string | null
          email: string
          emergency_paid_count?: number | null
          emergency_pending_count?: number | null
          id?: string
          name: string
          pix_key?: string | null
          pix_type?: string | null
          psychologist_id: string
          scheduled_paid_count?: number | null
          scheduled_pending_count?: number | null
          total_paid_amount?: number | null
          total_pending_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          crp?: string | null
          email?: string
          emergency_paid_count?: number | null
          emergency_pending_count?: number | null
          id?: string
          name?: string
          pix_key?: string | null
          pix_type?: string | null
          psychologist_id?: string
          scheduled_paid_count?: number | null
          scheduled_pending_count?: number | null
          total_paid_amount?: number | null
          total_pending_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psychologist_payments_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: true
            referencedRelation: "psychologists"
            referencedColumns: ["id"]
          },
        ]
      }
      psychologist_presence: {
        Row: {
          created_at: string
          current_emergency_id: string | null
          emergency_accepted_count: number
          emergency_rejected_count: number
          last_online: string | null
          psychologist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_emergency_id?: string | null
          emergency_accepted_count?: number
          emergency_rejected_count?: number
          last_online?: string | null
          psychologist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_emergency_id?: string | null
          emergency_accepted_count?: number
          emergency_rejected_count?: number
          last_online?: string | null
          psychologist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psychologist_presence_current_emergency_id_fkey"
            columns: ["current_emergency_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
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
          rejected_at: string | null
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
          rejected_at?: string | null
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
          rejected_at?: string | null
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
          area_atendimento: string | null
          average_rating: number | null
          bio: string | null
          blocked_at: string | null
          blocked_reason: string | null
          blocked_until: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          crp_number: string
          document_url: string | null
          documents: string[] | null
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          pix_key: string | null
          pix_type: string | null
          ratings_count: number | null
          rejected_at: string | null
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
          area_atendimento?: string | null
          average_rating?: number | null
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_until?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          crp_number: string
          document_url?: string | null
          documents?: string[] | null
          email: string
          full_name: string
          id?: string
          is_blocked?: boolean
          pix_key?: string | null
          pix_type?: string | null
          ratings_count?: number | null
          rejected_at?: string | null
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
          area_atendimento?: string | null
          average_rating?: number | null
          bio?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_until?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          crp_number?: string
          document_url?: string | null
          documents?: string[] | null
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          pix_key?: string | null
          pix_type?: string | null
          ratings_count?: number | null
          rejected_at?: string | null
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_feedback: {
        Row: {
          clinical_notes: string | null
          comment: string | null
          complaint_categories: string[]
          complaint_description: string | null
          created_at: string | null
          emergency_request_id: string | null
          felt_heard: string | null
          has_complaint: boolean
          id: string
          problem_resolved: string | null
          psychologist_id: string | null
          rating: number
          requires_admin_review: boolean
          resolution_status: string | null
          session_id: string
          symptoms: string[]
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          clinical_notes?: string | null
          comment?: string | null
          complaint_categories?: string[]
          complaint_description?: string | null
          created_at?: string | null
          emergency_request_id?: string | null
          felt_heard?: string | null
          has_complaint?: boolean
          id?: string
          problem_resolved?: string | null
          psychologist_id?: string | null
          rating: number
          requires_admin_review?: boolean
          resolution_status?: string | null
          session_id: string
          symptoms?: string[]
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          clinical_notes?: string | null
          comment?: string | null
          complaint_categories?: string[]
          complaint_description?: string | null
          created_at?: string | null
          emergency_request_id?: string | null
          felt_heard?: string | null
          has_complaint?: boolean
          id?: string
          problem_resolved?: string | null
          psychologist_id?: string | null
          rating?: number
          requires_admin_review?: boolean
          resolution_status?: string | null
          session_id?: string
          symptoms?: string[]
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      sos_trace_events: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          emergency_request_id: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json
          session_id: string | null
          trace_id: string
        }
        Insert: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          session_id?: string | null
          trace_id: string
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          session_id?: string | null
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_trace_events_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_trace_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "webrtc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          current_usage: Json | null
          email: string
          id: string
          plan_limits: Json | null
          sos_last_used: string | null
          sos_used_this_month: boolean
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
          sos_last_used?: string | null
          sos_used_this_month?: boolean
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
          sos_last_used?: string | null
          sos_used_this_month?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suporte_psicologo: {
        Row: {
          created_at: string | null
          descricao: string
          email_retorno: string
          id: string
          psicologo_id: string | null
          telefone_retorno: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          email_retorno: string
          id?: string
          psicologo_id?: string | null
          telefone_retorno?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          email_retorno?: string
          id?: string
          psicologo_id?: string | null
          telefone_retorno?: string | null
        }
        Relationships: []
      }
      support_groups: {
        Row: {
          criado_em: string
          descricao: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          descricao: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          descricao?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          description: string
          email: string
          id: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          email: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transtornos_sintomas: {
        Row: {
          created_at: string
          id: string
          sintomas: string[]
          transtorno: string
        }
        Insert: {
          created_at?: string
          id?: string
          sintomas: string[]
          transtorno: string
        }
        Update: {
          created_at?: string
          id?: string
          sintomas?: string[]
          transtorno?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          background_blur: boolean | null
          camera_device_id: string | null
          id: string
          mic_device_id: string | null
          speaker_device_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_blur?: boolean | null
          camera_device_id?: string | null
          id?: string
          mic_device_id?: string | null
          speaker_device_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_blur?: boolean | null
          camera_device_id?: string | null
          id?: string
          mic_device_id?: string | null
          speaker_device_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webrtc_sessions: {
        Row: {
          answer: Json | null
          created_at: string
          emergency_request_id: string | null
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          ended_by_type: string | null
          expires_at: string | null
          ice_candidates: Json[] | null
          id: string
          offer: Json | null
          patient_camera_off: boolean | null
          patient_id: string | null
          patient_muted: boolean | null
          psychologist_camera_off: boolean | null
          psychologist_id: string | null
          psychologist_muted: boolean | null
          status: string | null
          time_left_seconds: number | null
          timer_paused: boolean
          timer_updated_at: string | null
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          created_at?: string
          emergency_request_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ended_by_type?: string | null
          expires_at?: string | null
          ice_candidates?: Json[] | null
          id?: string
          offer?: Json | null
          patient_camera_off?: boolean | null
          patient_id?: string | null
          patient_muted?: boolean | null
          psychologist_camera_off?: boolean | null
          psychologist_id?: string | null
          psychologist_muted?: boolean | null
          status?: string | null
          time_left_seconds?: number | null
          timer_paused?: boolean
          timer_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          created_at?: string
          emergency_request_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          ended_by_type?: string | null
          expires_at?: string | null
          ice_candidates?: Json[] | null
          id?: string
          offer?: Json | null
          patient_camera_off?: boolean | null
          patient_id?: string | null
          patient_muted?: boolean | null
          psychologist_camera_off?: boolean | null
          psychologist_id?: string | null
          psychologist_muted?: boolean | null
          status?: string | null
          time_left_seconds?: number | null
          timer_paused?: boolean
          timer_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_sessions_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string
          id: string
          target: number
          title: string
          type: string
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          target?: number
          title: string
          type: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          target?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_patient_activity: {
        Args: {
          p_activity_date?: string
          p_activity_name: string
          p_patient_id: string
        }
        Returns: undefined
      }
      add_quarterly_activity: {
        Args: {
          p_activity_date?: string
          p_activity_name: string
          p_patient_id: string
        }
        Returns: undefined
      }
      calculate_psychologist_average_rating: {
        Args: { psychologist_user_id: string }
        Returns: number
      }
      can_access_document: {
        Args: { bucket_name: string; object_name: string }
        Returns: boolean
      }
      can_upload_document: {
        Args: { bucket_name: string; object_name: string }
        Returns: boolean
      }
      can_use_sos: {
        Args: { p_user_id: string }
        Returns: {
          can_use: boolean
          plan_type: string
          reason: string
        }[]
      }
      cleanup_quarterly_activities: { Args: never; Returns: undefined }
      cleanup_rejected_psychologist: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      count_available_psychologists: { Args: never; Returns: number }
      create_admin_account: {
        Args: {
          admin_email: string
          admin_name: string
          admin_password: string
        }
        Returns: Json
      }
      create_psychologist_profile:
        | {
            Args: {
              p_accepts_presential: boolean
              p_address?: string
              p_bio: string
              p_city: string
              p_cpf?: string
              p_crp_number: string
              p_document_url?: string
              p_email: string
              p_full_name: string
              p_professional_email?: string
              p_specialization: string
              p_state: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_address?: string
              p_bio: string
              p_city: string
              p_cpf?: string
              p_crp_number: string
              p_document_url?: string
              p_email: string
              p_full_name: string
              p_specialization: string
              p_state: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_address?: string
              p_area_atendimento?: string
              p_bio: string
              p_city: string
              p_cpf?: string
              p_crp_number: string
              p_document_url?: string
              p_email: string
              p_full_name: string
              p_specialization: string
              p_state: string
              p_user_id: string
            }
            Returns: Json
          }
      finalize_stale_emergency_sessions: {
        Args: never
        Returns: {
          abandoned_count: number
          expired_count: number
          timed_out_count: number
        }[]
      }
      gerenciar_expiracao_conversas: { Args: never; Returns: undefined }
      get_admin_metrics: {
        Args: never
        Returns: {
          active_psychologists: number
          active_subscribers: number
          appointments_last_30_days: number
          pending_psychologists: number
          sos_requests_last_30_days: number
          total_patients: number
        }[]
      }
      get_patient_statistics: {
        Args: { patient_user_id: string }
        Returns: {
          average_rating: number
          consultation_count: number
          sos_count: number
        }[]
      }
      get_psychologist_document_url: {
        Args: { document_path: string }
        Returns: string
      }
      get_psychologist_rejection_status: {
        Args: { p_user_id: string }
        Returns: {
          is_rejected: boolean
          rejected_at: string
          rejection_reason: string
          should_cleanup: boolean
          should_show_rejection_message: boolean
        }[]
      }
      get_sos_metrics: { Args: { p_days?: number }; Returns: Json }
      get_sos_patient_context: { Args: { p_request_id: string }; Returns: Json }
      get_user_type: { Args: { user_id_param: string }; Returns: string }
      handle_psychologist_approval: {
        Args: { admin_id: string; psychologist_id: string }
        Returns: undefined
      }
      handle_psychologist_rejection: {
        Args: {
          admin_id: string
          psychologist_id: string
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
      initialize_patient_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: { user_id_param?: string }; Returns: boolean }
      pode_criar_conversa: {
        Args: { p_paciente_id: string; p_psicologo_id: string }
        Returns: boolean
      }
      promote_to_admin: {
        Args: { target_user_email: string }
        Returns: boolean
      }
      prune_stale_psychologist_presence: { Args: never; Returns: number }
      psychologist_can_attend: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      reset_patient_weekly_goals_array: { Args: never; Returns: undefined }
      reset_weekly_goals: { Args: never; Returns: undefined }
      sync_consultation_counts: { Args: never; Returns: undefined }
      sync_psychologist_payments: { Args: never; Returns: undefined }
      update_patient_activity_time: {
        Args: {
          p_activity_type: string
          p_duration_minutes: number
          p_patient_id: string
        }
        Returns: undefined
      }
      update_patient_streak: { Args: { p_patient_id: string }; Returns: Json }
      validate_cpf: { Args: { cpf_input: string }; Returns: boolean }
      validate_crp: { Args: { crp_input: string }; Returns: boolean }
      validate_route_access: {
        Args: { route_path: string; user_id_param: string }
        Returns: boolean
      }
      validate_unique_crp: {
        Args: { crp_input: string; exclude_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      like_type: "positivo" | "negativo"
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
      like_type: ["positivo", "negativo"],
      registration_status: ["pending", "approved", "rejected"],
      user_type: ["patient", "psychologist", "admin"],
    },
  },
} as const
