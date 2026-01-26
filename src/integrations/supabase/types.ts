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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_research_cache: {
        Row: {
          cache_key: string
          confidence_level: number | null
          created_at: string
          expires_at: string
          hazard_type: string
          hit_count: number
          id: string
          industry: string | null
          location: string | null
          org_id: string
          query_params: Json
          research_type: string
          result_data: Json
          sources: Json
        }
        Insert: {
          cache_key: string
          confidence_level?: number | null
          created_at?: string
          expires_at?: string
          hazard_type: string
          hit_count?: number
          id?: string
          industry?: string | null
          location?: string | null
          org_id: string
          query_params?: Json
          research_type: string
          result_data?: Json
          sources?: Json
        }
        Update: {
          cache_key?: string
          confidence_level?: number | null
          created_at?: string
          expires_at?: string
          hazard_type?: string
          hit_count?: number
          id?: string
          industry?: string | null
          location?: string | null
          org_id?: string
          query_params?: Json
          research_type?: string
          result_data?: Json
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_research_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_research_logs: {
        Row: {
          assessment_id: string | null
          cache_hit: boolean
          confidence_score: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          hazard_id: string | null
          id: string
          org_id: string
          request_params: Json
          request_type: string
          response_data: Json | null
          sources_found: number | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          cache_hit?: boolean
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          hazard_id?: string | null
          id?: string
          org_id: string
          request_params?: Json
          request_type: string
          response_data?: Json | null
          sources_found?: number | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          cache_hit?: boolean
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          hazard_id?: string | null
          id?: string
          org_id?: string
          request_params?: Json
          request_type?: string
          response_data?: Json | null
          sources_found?: number | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_research_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_research_logs_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_research_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          id: string
          impacts: Json | null
          org_id: string
          probabilities: Json | null
          results: Json | null
          selected_hazards: Json | null
          status: string
          title: string
          total_risk: number | null
          updated_at: string
          user_id: string
          weights: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          impacts?: Json | null
          org_id: string
          probabilities?: Json | null
          results?: Json | null
          selected_hazards?: Json | null
          status?: string
          title: string
          total_risk?: number | null
          updated_at?: string
          user_id: string
          weights?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          impacts?: Json | null
          org_id?: string
          probabilities?: Json | null
          results?: Json | null
          selected_hazards?: Json | null
          status?: string
          title?: string
          total_risk?: number | null
          updated_at?: string
          user_id?: string
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consequence_weights: {
        Row: {
          consequence_id: string
          created_at: string
          id: string
          org_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          consequence_id: string
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          consequence_id?: string
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "consequence_weights_consequence_id_fkey"
            columns: ["consequence_id"]
            isOneToOne: false
            referencedRelation: "consequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consequence_weights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consequences: {
        Row: {
          category: string
          category_number: number
          created_at: string
          description: string
          id: string
        }
        Insert: {
          category: string
          category_number: number
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          category?: string
          category_number?: number
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      hazard_assignments: {
        Row: {
          assessment_id: string
          assigned_at: string
          assigned_to: string
          completed_at: string | null
          hazard_id: string
          id: string
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assigned_at?: string
          assigned_to: string
          completed_at?: string | null
          hazard_id: string
          id?: string
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assigned_at?: string
          assigned_to?: string
          completed_at?: string | null
          hazard_id?: string
          id?: string
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hazard_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazard_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazard_assignments_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazard_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazards: {
        Row: {
          category: string
          category_number: number
          created_at: string
          description: string | null
          hazards_list: Json
          id: string
          tags: string[] | null
        }
        Insert: {
          category: string
          category_number: number
          created_at?: string
          description?: string | null
          hazards_list?: Json
          id?: string
          tags?: string[] | null
        }
        Update: {
          category?: string
          category_number?: number
          created_at?: string
          description?: string | null
          hazards_list?: Json
          id?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      organization_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          org_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          org_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          org_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key_facilities: string[] | null
          name: string
          owner_id: string
          primary_location: string | null
          region: string
          sector: string
          size: string | null
          updated_at: string
          weights_configured: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key_facilities?: string[] | null
          name: string
          owner_id: string
          primary_location?: string | null
          region: string
          sector: string
          size?: string | null
          updated_at?: string
          weights_configured?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key_facilities?: string[] | null
          name?: string
          owner_id?: string
          primary_location?: string | null
          region?: string
          sector?: string
          size?: string | null
          updated_at?: string
          weights_configured?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          expertise: string | null
          id: string
          org_id: string | null
          role_title: string | null
          special_considerations: string | null
          specific_facilities: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          expertise?: string | null
          id?: string
          org_id?: string | null
          role_title?: string | null
          special_considerations?: string | null
          specific_facilities?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          expertise?: string | null
          id?: string
          org_id?: string | null
          role_title?: string | null
          special_considerations?: string | null
          specific_facilities?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          assessments_limit: number | null
          assessments_used: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          assessments_limit?: number | null
          assessments_used?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          assessments_limit?: number | null
          assessments_used?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_stale_assignments: { Args: never; Returns: number }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
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
      app_role: ["admin", "member", "viewer"],
    },
  },
} as const
