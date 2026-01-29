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
      assessment_compliance: {
        Row: {
          assessment_id: string
          compliance_notes: string | null
          is_compliant: boolean | null
          requirement_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assessment_id: string
          compliance_notes?: string | null
          is_compliant?: boolean | null
          requirement_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assessment_id?: string
          compliance_notes?: string | null
          is_compliant?: boolean | null
          requirement_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_compliance_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_compliance_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "regulatory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          id: string
          impacts: Json | null
          location_id: string | null
          mode: string | null
          org_id: string
          probabilities: Json | null
          quick_ratings: Json | null
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
          location_id?: string | null
          mode?: string | null
          org_id: string
          probabilities?: Json | null
          quick_ratings?: Json | null
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
          location_id?: string | null
          mode?: string | null
          org_id?: string
          probabilities?: Json | null
          quick_ratings?: Json | null
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
            foreignKeyName: "assessments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_data: {
        Row: {
          assessed_at: string
          controls_implemented: number | null
          created_at: string | null
          hazard_category: string
          hazard_name: string | null
          id: string
          industry: string
          likelihood: number | null
          org_size: string
          region: string
          risk_score: number
          severity: number | null
        }
        Insert: {
          assessed_at: string
          controls_implemented?: number | null
          created_at?: string | null
          hazard_category: string
          hazard_name?: string | null
          id?: string
          industry: string
          likelihood?: number | null
          org_size: string
          region: string
          risk_score: number
          severity?: number | null
        }
        Update: {
          assessed_at?: string
          controls_implemented?: number | null
          created_at?: string | null
          hazard_category?: string
          hazard_name?: string | null
          id?: string
          industry?: string
          likelihood?: number | null
          org_size?: string
          region?: string
          risk_score?: number
          severity?: number | null
        }
        Relationships: []
      }
      benchmark_participation: {
        Row: {
          created_at: string | null
          data_sharing_consent_version: string | null
          opted_in: boolean | null
          opted_in_at: string | null
          opted_out_at: string | null
          org_id: string
        }
        Insert: {
          created_at?: string | null
          data_sharing_consent_version?: string | null
          opted_in?: boolean | null
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id: string
        }
        Update: {
          created_at?: string | null
          data_sharing_consent_version?: string | null
          opted_in?: boolean | null
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_participation_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_statistics: {
        Row: {
          avg_controls_per_assessment: number | null
          avg_risk_score: number | null
          calculated_at: string | null
          hazard_category: string | null
          id: string
          industry: string
          median_risk_score: number | null
          org_size: string | null
          percentile_25: number | null
          percentile_75: number | null
          percentile_90: number | null
          region: string | null
          sample_size: number
          top_3_hazards: Json | null
        }
        Insert: {
          avg_controls_per_assessment?: number | null
          avg_risk_score?: number | null
          calculated_at?: string | null
          hazard_category?: string | null
          id?: string
          industry: string
          median_risk_score?: number | null
          org_size?: string | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          region?: string | null
          sample_size: number
          top_3_hazards?: Json | null
        }
        Update: {
          avg_controls_per_assessment?: number | null
          avg_risk_score?: number | null
          calculated_at?: string | null
          hazard_category?: string | null
          id?: string
          industry?: string
          median_risk_score?: number | null
          org_size?: string | null
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          region?: string | null
          sample_size?: number
          top_3_hazards?: Json | null
        }
        Relationships: []
      }
      climate_risk_adjustments: {
        Row: {
          baseline_year: number | null
          confidence_level: string | null
          created_at: string | null
          data_sources: Json | null
          hazard_category: string
          id: string
          last_updated: string | null
          location_region: string
          projection_2030: number | null
          projection_2040: number | null
          projection_2050: number | null
          summary_text: string | null
        }
        Insert: {
          baseline_year?: number | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: Json | null
          hazard_category: string
          id?: string
          last_updated?: string | null
          location_region: string
          projection_2030?: number | null
          projection_2040?: number | null
          projection_2050?: number | null
          summary_text?: string | null
        }
        Update: {
          baseline_year?: number | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: Json | null
          hazard_category?: string
          id?: string
          last_updated?: string | null
          location_region?: string
          projection_2030?: number | null
          projection_2040?: number | null
          projection_2050?: number | null
          summary_text?: string | null
        }
        Relationships: []
      }
      compliance_override_logs: {
        Row: {
          action: string
          assessment_id: string | null
          created_at: string | null
          hazard_id: string
          id: string
          org_id: string
          reason: string | null
          regulation_name: string
          regulatory_requirement_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          assessment_id?: string | null
          created_at?: string | null
          hazard_id: string
          id?: string
          org_id: string
          reason?: string | null
          regulation_name: string
          regulatory_requirement_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          assessment_id?: string | null
          created_at?: string | null
          hazard_id?: string
          id?: string
          org_id?: string
          reason?: string | null
          regulation_name?: string
          regulatory_requirement_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_override_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_override_logs_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_override_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_override_logs_regulatory_requirement_id_fkey"
            columns: ["regulatory_requirement_id"]
            isOneToOne: false
            referencedRelation: "regulatory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      consequence_types: {
        Row: {
          category_number: number
          created_at: string | null
          description: string
          examples: string[] | null
          id: string
          name: string
          short_name: string
          typical_weight_ranges: Json | null
        }
        Insert: {
          category_number: number
          created_at?: string | null
          description: string
          examples?: string[] | null
          id?: string
          name: string
          short_name: string
          typical_weight_ranges?: Json | null
        }
        Update: {
          category_number?: number
          created_at?: string | null
          description?: string
          examples?: string[] | null
          id?: string
          name?: string
          short_name?: string
          typical_weight_ranges?: Json | null
        }
        Relationships: []
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
      control_tests: {
        Row: {
          control_id: string
          created_at: string | null
          findings: string | null
          id: string
          org_id: string
          recommendations: string | null
          result: string
          test_date: string
          test_type: string
          tested_by: string | null
        }
        Insert: {
          control_id: string
          created_at?: string | null
          findings?: string | null
          id?: string
          org_id: string
          recommendations?: string | null
          result: string
          test_date: string
          test_type: string
          tested_by?: string | null
        }
        Update: {
          control_id?: string
          created_at?: string | null
          findings?: string | null
          id?: string
          org_id?: string
          recommendations?: string | null
          result?: string
          test_date?: string
          test_type?: string
          tested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          control_type: string
          cost_to_implement: number | null
          created_at: string | null
          description: string | null
          effectiveness_rating: number | null
          hazard_id: string | null
          id: string
          implementation_status: string | null
          last_tested_at: string | null
          name: string
          next_review_date: string | null
          org_id: string
          responsible_party: string | null
          updated_at: string | null
        }
        Insert: {
          control_type: string
          cost_to_implement?: number | null
          created_at?: string | null
          description?: string | null
          effectiveness_rating?: number | null
          hazard_id?: string | null
          id?: string
          implementation_status?: string | null
          last_tested_at?: string | null
          name: string
          next_review_date?: string | null
          org_id: string
          responsible_party?: string | null
          updated_at?: string | null
        }
        Update: {
          control_type?: string
          cost_to_implement?: number | null
          created_at?: string | null
          description?: string | null
          effectiveness_rating?: number | null
          hazard_id?: string | null
          id?: string
          implementation_status?: string | null
          last_tested_at?: string | null
          name?: string
          next_review_date?: string | null
          org_id?: string
          responsible_party?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controls_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assessments: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          created_by: string | null
          during_event_checklist: Json | null
          event_date_end: string | null
          event_date_start: string | null
          event_name: string
          event_type: string | null
          expected_attendance: number | null
          has_alcohol: boolean | null
          has_food_service: boolean | null
          id: string
          is_outdoor: boolean | null
          org_id: string
          post_event_checklist: Json | null
          pre_event_checklist: Json | null
          special_considerations: string | null
          status: string | null
          updated_at: string | null
          venue_address: string | null
          venue_type: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          during_event_checklist?: Json | null
          event_date_end?: string | null
          event_date_start?: string | null
          event_name: string
          event_type?: string | null
          expected_attendance?: number | null
          has_alcohol?: boolean | null
          has_food_service?: boolean | null
          id?: string
          is_outdoor?: boolean | null
          org_id: string
          post_event_checklist?: Json | null
          pre_event_checklist?: Json | null
          special_considerations?: string | null
          status?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_type?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          during_event_checklist?: Json | null
          event_date_end?: string | null
          event_date_start?: string | null
          event_name?: string
          event_type?: string | null
          expected_attendance?: number | null
          has_alcohol?: boolean | null
          has_food_service?: boolean | null
          id?: string
          is_outdoor?: boolean | null
          org_id?: string
          post_event_checklist?: Json | null
          pre_event_checklist?: Json | null
          special_considerations?: string | null
          status?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_id: string | null
          created_at: string | null
          generated_by: string | null
          id: string
          key_findings: Json | null
          org_id: string
          period_end: string
          period_start: string
          recommendations: Json | null
          report_type: string
          risk_overview: Json | null
          summary: Json
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          key_findings?: Json | null
          org_id: string
          period_end: string
          period_start: string
          recommendations?: Json | null
          report_type: string
          risk_overview?: Json | null
          summary: Json
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          key_findings?: Json | null
          org_id?: string
          period_end?: string
          period_start?: string
          recommendations?: Json | null
          report_type?: string
          risk_overview?: Json | null
          summary?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_reports_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazard_ai_scores: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          expires_at: string | null
          hazard_id: string
          id: string
          org_id: string
          peer_adoption_rate: number | null
          relevance_score: number
          tier: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          expires_at?: string | null
          hazard_id: string
          id?: string
          org_id: string
          peer_adoption_rate?: number | null
          relevance_score: number
          tier: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          expires_at?: string | null
          hazard_id?: string
          id?: string
          org_id?: string
          peer_adoption_rate?: number | null
          relevance_score?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "hazard_ai_scores_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazard_ai_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      hazard_info_requests: {
        Row: {
          created_at: string | null
          hazard_category: string | null
          hazard_name: string
          id: string
          notes: string | null
          org_id: string
          requested_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          hazard_category?: string | null
          hazard_name: string
          id?: string
          notes?: string | null
          org_id: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          hazard_category?: string | null
          hazard_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hazard_info_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazard_information_sheets: {
        Row: {
          common_causes: string[] | null
          created_at: string | null
          definition: string
          external_resources: Json | null
          hazard_category: string
          hazard_name: string
          id: string
          industry_notes: Json | null
          is_system_provided: boolean | null
          org_id: string | null
          response_actions: string[] | null
          updated_at: string | null
          warning_signs: string[] | null
        }
        Insert: {
          common_causes?: string[] | null
          created_at?: string | null
          definition: string
          external_resources?: Json | null
          hazard_category: string
          hazard_name: string
          id?: string
          industry_notes?: Json | null
          is_system_provided?: boolean | null
          org_id?: string | null
          response_actions?: string[] | null
          updated_at?: string | null
          warning_signs?: string[] | null
        }
        Update: {
          common_causes?: string[] | null
          created_at?: string | null
          definition?: string
          external_resources?: Json | null
          hazard_category?: string
          hazard_name?: string
          id?: string
          industry_notes?: Json | null
          is_system_provided?: boolean | null
          org_id?: string | null
          response_actions?: string[] | null
          updated_at?: string | null
          warning_signs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "hazard_information_sheets_org_id_fkey"
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
      historical_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          downtime_hours: number | null
          event_date: string
          event_title: string
          fatalities: number | null
          financial_impact: number | null
          hazard_category: string
          hazard_name: string
          id: string
          improvements_implemented: string[] | null
          incident_report_url: string | null
          injuries: number | null
          lessons_learned: string | null
          location: string | null
          org_id: string
          people_affected: number | null
          photos: Json | null
          response_effectiveness: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          event_date: string
          event_title: string
          fatalities?: number | null
          financial_impact?: number | null
          hazard_category: string
          hazard_name: string
          id?: string
          improvements_implemented?: string[] | null
          incident_report_url?: string | null
          injuries?: number | null
          lessons_learned?: string | null
          location?: string | null
          org_id: string
          people_affected?: number | null
          photos?: Json | null
          response_effectiveness?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          downtime_hours?: number | null
          event_date?: string
          event_title?: string
          fatalities?: number | null
          financial_impact?: number | null
          hazard_category?: string
          hazard_name?: string
          id?: string
          improvements_implemented?: string[] | null
          incident_report_url?: string | null
          injuries?: number | null
          lessons_learned?: string | null
          location?: string | null
          org_id?: string
          people_affected?: number | null
          photos?: Json | null
          response_effectiveness?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actual_cost: number | null
          affected_employees: number | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          downtime_hours: number | null
          estimated_cost: number | null
          hazard_id: string | null
          id: string
          incident_date: string
          lessons_learned: string | null
          location: string | null
          org_id: string
          reported_by: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          affected_employees?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          downtime_hours?: number | null
          estimated_cost?: number | null
          hazard_id?: string | null
          id?: string
          incident_date: string
          lessons_learned?: string | null
          location?: string | null
          org_id: string
          reported_by?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          affected_employees?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          downtime_hours?: number | null
          estimated_cost?: number | null
          hazard_id?: string | null
          id?: string
          incident_date?: string
          lessons_learned?: string | null
          location?: string | null
          org_id?: string
          reported_by?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_taxonomy: {
        Row: {
          created_at: string | null
          description: string
          expected_weight_patterns: Json | null
          id: string
          industry_id: string
          name: string
          questionnaire_adaptations: Json | null
          sub_sectors: string[] | null
        }
        Insert: {
          created_at?: string | null
          description: string
          expected_weight_patterns?: Json | null
          id?: string
          industry_id: string
          name: string
          questionnaire_adaptations?: Json | null
          sub_sectors?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string
          expected_weight_patterns?: Json | null
          id?: string
          industry_id?: string
          name?: string
          questionnaire_adaptations?: Json | null
          sub_sectors?: string[] | null
        }
        Relationships: []
      }
      industry_templates: {
        Row: {
          created_at: string | null
          description: string | null
          hazard_count: number | null
          id: string
          industry_type: string
          is_system_provided: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hazard_count?: number | null
          id?: string
          industry_type: string
          is_system_provided?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hazard_count?: number | null
          id?: string
          industry_type?: string
          is_system_provided?: boolean | null
          name?: string
        }
        Relationships: []
      }
      infrastructure_assets: {
        Row: {
          asset_name: string
          asset_type: string
          created_at: string | null
          criticality: string | null
          description: string | null
          id: string
          location_id: string | null
          org_id: string
          recovery_time_hours: number | null
          replacement_cost: number | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          asset_name: string
          asset_type: string
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          org_id: string
          recovery_time_hours?: number | null
          replacement_cost?: number | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          asset_name?: string
          asset_type?: string
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          org_id?: string
          recovery_time_hours?: number | null
          replacement_cost?: number | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      infrastructure_dependencies: {
        Row: {
          created_at: string | null
          criticality: string | null
          dependency_type: string | null
          downstream_asset_id: string
          id: string
          notes: string | null
          org_id: string
          upstream_asset_id: string
        }
        Insert: {
          created_at?: string | null
          criticality?: string | null
          dependency_type?: string | null
          downstream_asset_id: string
          id?: string
          notes?: string | null
          org_id: string
          upstream_asset_id: string
        }
        Update: {
          created_at?: string | null
          criticality?: string | null
          dependency_type?: string | null
          downstream_asset_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          upstream_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_dependencies_downstream_asset_id_fkey"
            columns: ["downstream_asset_id"]
            isOneToOne: false
            referencedRelation: "infrastructure_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_dependencies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_dependencies_upstream_asset_id_fkey"
            columns: ["upstream_asset_id"]
            isOneToOne: false
            referencedRelation: "infrastructure_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      mitigation_strategies: {
        Row: {
          created_at: string | null
          description: string | null
          effectiveness_notes: string | null
          hazard_category: string
          id: string
          implementation_complexity: string | null
          is_system_provided: boolean | null
          ongoing_maintenance_notes: string | null
          org_id: string | null
          prerequisites: string[] | null
          strategy_name: string
          typical_timeframe_days_max: number | null
          typical_timeframe_days_min: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effectiveness_notes?: string | null
          hazard_category: string
          id?: string
          implementation_complexity?: string | null
          is_system_provided?: boolean | null
          ongoing_maintenance_notes?: string | null
          org_id?: string | null
          prerequisites?: string[] | null
          strategy_name: string
          typical_timeframe_days_max?: number | null
          typical_timeframe_days_min?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effectiveness_notes?: string | null
          hazard_category?: string
          id?: string
          implementation_complexity?: string | null
          is_system_provided?: boolean | null
          ongoing_maintenance_notes?: string | null
          org_id?: string | null
          prerequisites?: string[] | null
          strategy_name?: string
          typical_timeframe_days_max?: number | null
          typical_timeframe_days_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mitigation_strategies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_simulations: {
        Row: {
          ai_confidence: string | null
          ai_sources: Json | null
          assessment_id: string | null
          combination_method: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          data_source: string | null
          direct_cost_distribution: Json
          downtime_distribution: Json | null
          eal_amount: number | null
          eal_percentage: number | null
          execution_time_ms: number | null
          frequency_distribution: Json
          hazard_id: string | null
          id: string
          indirect_cost_distribution: Json
          iterations: number | null
          org_id: string
          percentile_10: number | null
          percentile_50: number | null
          percentile_90: number | null
          probability_exceeds_threshold: Json | null
          results: Json | null
          scenario_count: number | null
          severity_distribution: Json | null
          status: string | null
          template_id: string | null
          template_ids: string[] | null
          time_horizon_years: number | null
          var_95: number | null
        }
        Insert: {
          ai_confidence?: string | null
          ai_sources?: Json | null
          assessment_id?: string | null
          combination_method?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          direct_cost_distribution: Json
          downtime_distribution?: Json | null
          eal_amount?: number | null
          eal_percentage?: number | null
          execution_time_ms?: number | null
          frequency_distribution: Json
          hazard_id?: string | null
          id?: string
          indirect_cost_distribution: Json
          iterations?: number | null
          org_id: string
          percentile_10?: number | null
          percentile_50?: number | null
          percentile_90?: number | null
          probability_exceeds_threshold?: Json | null
          results?: Json | null
          scenario_count?: number | null
          severity_distribution?: Json | null
          status?: string | null
          template_id?: string | null
          template_ids?: string[] | null
          time_horizon_years?: number | null
          var_95?: number | null
        }
        Update: {
          ai_confidence?: string | null
          ai_sources?: Json | null
          assessment_id?: string | null
          combination_method?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          direct_cost_distribution?: Json
          downtime_distribution?: Json | null
          eal_amount?: number | null
          eal_percentage?: number | null
          execution_time_ms?: number | null
          frequency_distribution?: Json
          hazard_id?: string | null
          id?: string
          indirect_cost_distribution?: Json
          iterations?: number | null
          org_id?: string
          percentile_10?: number | null
          percentile_50?: number | null
          percentile_90?: number | null
          probability_exceeds_threshold?: Json | null
          results?: Json | null
          scenario_count?: number | null
          severity_distribution?: Json | null
          status?: string | null
          template_id?: string | null
          template_ids?: string[] | null
          time_horizon_years?: number | null
          var_95?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_simulations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_simulations_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_simulations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_simulations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "simulation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      news_dismissals: {
        Row: {
          dismissed_at: string | null
          id: string
          news_item_hash: string
          org_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          news_item_hash: string
          org_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          news_item_hash?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_dismissals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_news_feed: {
        Row: {
          created_at: string | null
          expires_at: string | null
          feed_data: Json
          fetched_at: string | null
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          feed_data?: Json
          fetched_at?: string | null
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          feed_data?: Json
          fetched_at?: string | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_news_feed_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      organization_locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          employee_count: number | null
          geographic_risks: Json | null
          id: string
          is_headquarters: boolean | null
          location_name: string
          org_id: string
          province: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          employee_count?: number | null
          geographic_risks?: Json | null
          id?: string
          is_headquarters?: boolean | null
          location_name: string
          org_id: string
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          employee_count?: number | null
          geographic_risks?: Json | null
          id?: string
          is_headquarters?: boolean | null
          location_name?: string
          org_id?: string
          province?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_mitigations: {
        Row: {
          annual_loss_estimate: number | null
          approved_at: string | null
          approved_by: string | null
          assessment_id: string | null
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          expected_risk_reduction_percent: number | null
          hazard_id: string | null
          id: string
          implementation_completion_date: string | null
          implementation_start_date: string | null
          mitigation_strategy_id: string | null
          notes: string | null
          org_id: string
          priority_rank: number | null
          roi_score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          annual_loss_estimate?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          expected_risk_reduction_percent?: number | null
          hazard_id?: string | null
          id?: string
          implementation_completion_date?: string | null
          implementation_start_date?: string | null
          mitigation_strategy_id?: string | null
          notes?: string | null
          org_id: string
          priority_rank?: number | null
          roi_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_loss_estimate?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          expected_risk_reduction_percent?: number | null
          hazard_id?: string | null
          id?: string
          implementation_completion_date?: string | null
          implementation_start_date?: string | null
          mitigation_strategy_id?: string | null
          notes?: string | null
          org_id?: string
          priority_rank?: number | null
          roi_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_mitigations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_mitigations_mitigation_strategy_id_fkey"
            columns: ["mitigation_strategy_id"]
            isOneToOne: false
            referencedRelation: "mitigation_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_mitigations_org_id_fkey"
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
          industry_sub_sectors: string[] | null
          industry_type: string | null
          key_facilities: string[] | null
          name: string
          news_settings: Json | null
          owner_id: string
          primary_location: string | null
          region: string
          risk_appetite_config: Json | null
          sector: string
          size: string | null
          updated_at: string
          vulnerability_factors: Json | null
          weights_configured: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry_sub_sectors?: string[] | null
          industry_type?: string | null
          key_facilities?: string[] | null
          name: string
          news_settings?: Json | null
          owner_id: string
          primary_location?: string | null
          region: string
          risk_appetite_config?: Json | null
          sector: string
          size?: string | null
          updated_at?: string
          vulnerability_factors?: Json | null
          weights_configured?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry_sub_sectors?: string[] | null
          industry_type?: string | null
          key_facilities?: string[] | null
          name?: string
          news_settings?: Json | null
          owner_id?: string
          primary_location?: string | null
          region?: string
          risk_appetite_config?: Json | null
          sector?: string
          size?: string | null
          updated_at?: string
          vulnerability_factors?: Json | null
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
          first_name: string | null
          id: string
          last_name: string | null
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
          first_name?: string | null
          id?: string
          last_name?: string | null
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
          first_name?: string | null
          id?: string
          last_name?: string | null
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
      regulatory_requirements: {
        Row: {
          created_at: string | null
          effective_date: string | null
          hazard_id: string
          id: string
          industry_type: string
          non_compliance_consequences: string
          province: string
          regulation_name: string
          regulation_section: string | null
          requirement_description: string
          source_url: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date?: string | null
          hazard_id: string
          id?: string
          industry_type: string
          non_compliance_consequences: string
          province: string
          regulation_name: string
          regulation_section?: string | null
          requirement_description: string
          source_url?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string | null
          hazard_id?: string
          id?: string
          industry_type?: string
          non_compliance_consequences?: string
          province?: string
          regulation_name?: string
          regulation_section?: string | null
          requirement_description?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_requirements_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_acceptance_records: {
        Row: {
          acceptance_rationale: string | null
          accepted: boolean | null
          accepted_at: string | null
          accepted_by: string | null
          assessment_id: string | null
          compensating_controls: string[] | null
          created_at: string | null
          exceeds_appetite: boolean | null
          hazard_id: string
          id: string
          org_id: string
          review_date: string | null
          risk_level: string
          risk_score: number
        }
        Insert: {
          acceptance_rationale?: string | null
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          assessment_id?: string | null
          compensating_controls?: string[] | null
          created_at?: string | null
          exceeds_appetite?: boolean | null
          hazard_id: string
          id?: string
          org_id: string
          review_date?: string | null
          risk_level: string
          risk_score: number
        }
        Update: {
          acceptance_rationale?: string | null
          accepted?: boolean | null
          accepted_at?: string | null
          accepted_by?: string | null
          assessment_id?: string | null
          compensating_controls?: string[] | null
          created_at?: string | null
          exceeds_appetite?: boolean | null
          hazard_id?: string
          id?: string
          org_id?: string
          review_date?: string | null
          risk_level?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_acceptance_records_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_acceptance_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          action_required: string | null
          alert_type: string
          created_at: string | null
          description: string
          dismissed_at: string | null
          hazard_ids: string[] | null
          id: string
          is_read: boolean | null
          org_id: string
          severity: string
          source_data: Json | null
          title: string
        }
        Insert: {
          action_required?: string | null
          alert_type: string
          created_at?: string | null
          description: string
          dismissed_at?: string | null
          hazard_ids?: string[] | null
          id?: string
          is_read?: boolean | null
          org_id: string
          severity: string
          source_data?: Json | null
          title: string
        }
        Update: {
          action_required?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string
          dismissed_at?: string | null
          hazard_ids?: string[] | null
          id?: string
          is_read?: boolean | null
          org_id?: string
          severity?: string
          source_data?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_predictions: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          current_risk_score: number
          hazard_id: string | null
          id: string
          org_id: string
          predicted_risk_score: number
          prediction_basis: string
          prediction_confidence: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_data: Json | null
          source_urls: string[] | null
          time_horizon: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          current_risk_score: number
          hazard_id?: string | null
          id?: string
          org_id: string
          predicted_risk_score: number
          prediction_basis: string
          prediction_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_data?: Json | null
          source_urls?: string[] | null
          time_horizon: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          current_risk_score?: number
          hazard_id?: string | null
          id?: string
          org_id?: string
          predicted_risk_score?: number
          prediction_basis?: string
          prediction_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_data?: Json | null
          source_urls?: string[] | null
          time_horizon?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_predictions_hazard_id_fkey"
            columns: ["hazard_id"]
            isOneToOne: false
            referencedRelation: "hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_predictions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_templates: {
        Row: {
          consequence_values_template: Json
          created_at: string | null
          customization_prompt: string | null
          expected_risk_level: string
          id: string
          industry: string
          is_active: boolean | null
          scenario_description_template: string
          scenario_number: number
          scenario_title: string
          sub_industry: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          consequence_values_template: Json
          created_at?: string | null
          customization_prompt?: string | null
          expected_risk_level: string
          id?: string
          industry: string
          is_active?: boolean | null
          scenario_description_template: string
          scenario_number: number
          scenario_title: string
          sub_industry?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          consequence_values_template?: Json
          created_at?: string | null
          customization_prompt?: string | null
          expected_risk_level?: string
          id?: string
          industry?: string
          is_active?: boolean | null
          scenario_description_template?: string
          scenario_number?: number
          scenario_title?: string
          sub_industry?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      seasonal_patterns: {
        Row: {
          created_at: string | null
          description: string
          hazard_type: string
          id: string
          peak_months: number[]
          region: string
          risk_multiplier: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          hazard_type: string
          id?: string
          peak_months: number[]
          region: string
          risk_multiplier?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          hazard_type?: string
          id?: string
          peak_months?: number[]
          region?: string
          risk_multiplier?: number | null
        }
        Relationships: []
      }
      simulation_templates: {
        Row: {
          created_at: string | null
          default_parameters: Json
          description: string | null
          hazard_category: string
          hazard_name: string | null
          id: string
          region: string | null
          source_notes: string | null
          template_name: string
        }
        Insert: {
          created_at?: string | null
          default_parameters: Json
          description?: string | null
          hazard_category: string
          hazard_name?: string | null
          id?: string
          region?: string | null
          source_notes?: string | null
          template_name: string
        }
        Update: {
          created_at?: string | null
          default_parameters?: Json
          description?: string | null
          hazard_category?: string
          hazard_name?: string | null
          id?: string
          region?: string | null
          source_notes?: string | null
          template_name?: string
        }
        Relationships: []
      }
      stakeholder_reviews: {
        Row: {
          assessment_id: string
          comments: string | null
          created_at: string | null
          id: string
          org_id: string
          reviewed_at: string | null
          sent_at: string | null
          stakeholder_id: string
          status: string | null
        }
        Insert: {
          assessment_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          reviewed_at?: string | null
          sent_at?: string | null
          stakeholder_id: string
          status?: string | null
        }
        Update: {
          assessment_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          reviewed_at?: string | null
          sent_at?: string | null
          stakeholder_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_reviews_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_org_id_fkey"
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
      template_hazards: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          hazard_name: string
          id: string
          sort_order: number | null
          template_id: string | null
          typical_consequence_areas: Json | null
          typical_probability_range: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          hazard_name: string
          id?: string
          sort_order?: number | null
          template_id?: string | null
          typical_consequence_areas?: Json | null
          typical_probability_range?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          hazard_name?: string
          id?: string
          sort_order?: number | null
          template_id?: string | null
          typical_consequence_areas?: Json | null
          typical_probability_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_hazards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "industry_templates"
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
      weighting_ahp_comparisons: {
        Row: {
          a_intensity: number
          b_intensity: number
          comparison_order: number
          comparison_type: string
          completed_at: string | null
          consequence_a: string
          consequence_b: string
          direction: string
          id: string
          rating: number
          session_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          a_intensity: number
          b_intensity: number
          comparison_order: number
          comparison_type: string
          completed_at?: string | null
          consequence_a: string
          consequence_b: string
          direction: string
          id?: string
          rating: number
          session_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          a_intensity?: number
          b_intensity?: number
          comparison_order?: number
          comparison_type?: string
          completed_at?: string | null
          consequence_a?: string
          consequence_b?: string
          direction?: string
          id?: string
          rating?: number
          session_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_ahp_comparisons_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_ahp_matrix: {
        Row: {
          calculated_at: string | null
          consistency_ratio: number
          eigenvalues: Json
          id: string
          is_consistent: boolean
          matrix: Json
          normalized_weights: Json
          raw_weights: Json
          session_id: string
        }
        Insert: {
          calculated_at?: string | null
          consistency_ratio: number
          eigenvalues: Json
          id?: string
          is_consistent: boolean
          matrix: Json
          normalized_weights: Json
          raw_weights: Json
          session_id: string
        }
        Update: {
          calculated_at?: string | null
          consistency_ratio?: number
          eigenvalues?: Json
          id?: string
          is_consistent?: boolean
          matrix?: Json
          normalized_weights?: Json
          raw_weights?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighting_ahp_matrix_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_ai_synthesis: {
        Row: {
          ai_model_used: string
          ai_prompt_tokens: number
          ai_response_tokens: number
          ai_total_cost_usd: number
          all_checks_passed: boolean
          consistency_checks: Json
          id: string
          justification_report_detailed: string
          justification_report_executive: string
          justification_report_technical: string
          previous_weights: Json | null
          processing_duration_seconds: number | null
          recommended_weights: Json
          sensitivity_preview: Json | null
          session_id: string
          source_weights: Json
          sources_used: Json
          synthesized_at: string | null
          weight_changes: Json
        }
        Insert: {
          ai_model_used: string
          ai_prompt_tokens: number
          ai_response_tokens: number
          ai_total_cost_usd: number
          all_checks_passed: boolean
          consistency_checks: Json
          id?: string
          justification_report_detailed: string
          justification_report_executive: string
          justification_report_technical: string
          previous_weights?: Json | null
          processing_duration_seconds?: number | null
          recommended_weights: Json
          sensitivity_preview?: Json | null
          session_id: string
          source_weights: Json
          sources_used: Json
          synthesized_at?: string | null
          weight_changes: Json
        }
        Update: {
          ai_model_used?: string
          ai_prompt_tokens?: number
          ai_response_tokens?: number
          ai_total_cost_usd?: number
          all_checks_passed?: boolean
          consistency_checks?: Json
          id?: string
          justification_report_detailed?: string
          justification_report_executive?: string
          justification_report_technical?: string
          previous_weights?: Json | null
          processing_duration_seconds?: number | null
          recommended_weights?: Json
          sensitivity_preview?: Json | null
          session_id?: string
          source_weights?: Json
          sources_used?: Json
          synthesized_at?: string | null
          weight_changes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "weighting_ai_synthesis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_approvals: {
        Row: {
          approval_order: number | null
          approved_at: string | null
          approver_id: string
          approver_role: string
          comments: string | null
          id: string
          notified_at: string | null
          reminder_sent_at: string | null
          requested_changes: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          approval_order?: number | null
          approved_at?: string | null
          approver_id: string
          approver_role: string
          comments?: string | null
          id?: string
          notified_at?: string | null
          reminder_sent_at?: string | null
          requested_changes?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          approval_order?: number | null
          approved_at?: string | null
          approver_id?: string
          approver_role?: string
          comments?: string | null
          id?: string
          notified_at?: string | null
          reminder_sent_at?: string | null
          requested_changes?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_approvals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_benchmarking_opt_ins: {
        Row: {
          consent_version: string
          id: string
          is_opted_in: boolean | null
          last_consent_date: string | null
          last_data_used_at: string | null
          next_consent_reminder_date: string | null
          opted_in_at: string | null
          opted_out_at: string | null
          org_id: string
          share_hazard_ratings: boolean | null
          share_industry: boolean | null
          share_org_size: boolean | null
          share_region_broad: boolean | null
          share_weights: boolean | null
          times_data_used_in_benchmarks: number | null
        }
        Insert: {
          consent_version: string
          id?: string
          is_opted_in?: boolean | null
          last_consent_date?: string | null
          last_data_used_at?: string | null
          next_consent_reminder_date?: string | null
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id: string
          share_hazard_ratings?: boolean | null
          share_industry?: boolean | null
          share_org_size?: boolean | null
          share_region_broad?: boolean | null
          share_weights?: boolean | null
          times_data_used_in_benchmarks?: number | null
        }
        Update: {
          consent_version?: string
          id?: string
          is_opted_in?: boolean | null
          last_consent_date?: string | null
          last_data_used_at?: string | null
          next_consent_reminder_date?: string | null
          opted_in_at?: string | null
          opted_out_at?: string | null
          org_id?: string
          share_hazard_ratings?: boolean | null
          share_industry?: boolean | null
          share_org_size?: boolean | null
          share_region_broad?: boolean | null
          share_weights?: boolean | null
          times_data_used_in_benchmarks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_benchmarking_opt_ins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_final_weights: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          displacement_weight: number
          economic_impact_weight: number
          environmental_weight: number
          fatalities_weight: number
          id: string
          infrastructure_weight: number
          injuries_weight: number
          is_active: boolean | null
          last_reviewed_at: string | null
          manual_adjustments: string | null
          next_review_date: string | null
          org_id: string
          property_damage_weight: number
          psychosocial_weight: number
          reputational_weight: number
          session_id: string
          set_at: string | null
          set_by: string
          status: string | null
          support_system_weight: number
          version: number
          weights_json: Json
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          displacement_weight: number
          economic_impact_weight: number
          environmental_weight: number
          fatalities_weight: number
          id?: string
          infrastructure_weight: number
          injuries_weight: number
          is_active?: boolean | null
          last_reviewed_at?: string | null
          manual_adjustments?: string | null
          next_review_date?: string | null
          org_id: string
          property_damage_weight: number
          psychosocial_weight: number
          reputational_weight: number
          session_id: string
          set_at?: string | null
          set_by: string
          status?: string | null
          support_system_weight: number
          version: number
          weights_json: Json
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          displacement_weight?: number
          economic_impact_weight?: number
          environmental_weight?: number
          fatalities_weight?: number
          id?: string
          infrastructure_weight?: number
          injuries_weight?: number
          is_active?: boolean | null
          last_reviewed_at?: string | null
          manual_adjustments?: string | null
          next_review_date?: string | null
          org_id?: string
          property_damage_weight?: number
          psychosocial_weight?: number
          reputational_weight?: number
          session_id?: string
          set_at?: string | null
          set_by?: string
          status?: string | null
          support_system_weight?: number
          version?: number
          weights_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "weighting_final_weights_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_final_weights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_final_weights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_final_weights_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_industry_benchmarks: {
        Row: {
          avg_displacement_weight: number
          avg_economic_impact_weight: number
          avg_environmental_weight: number
          avg_fatalities_weight: number
          avg_infrastructure_weight: number
          avg_injuries_weight: number
          avg_property_damage_weight: number
          avg_psychosocial_weight: number
          avg_reputational_weight: number
          avg_support_system_weight: number
          calculated_at: string | null
          id: string
          industry: string
          is_active: boolean | null
          org_size: string | null
          percentile_data: Json | null
          region: string | null
          sample_size: number
        }
        Insert: {
          avg_displacement_weight: number
          avg_economic_impact_weight: number
          avg_environmental_weight: number
          avg_fatalities_weight: number
          avg_infrastructure_weight: number
          avg_injuries_weight: number
          avg_property_damage_weight: number
          avg_psychosocial_weight: number
          avg_reputational_weight: number
          avg_support_system_weight: number
          calculated_at?: string | null
          id?: string
          industry: string
          is_active?: boolean | null
          org_size?: string | null
          percentile_data?: Json | null
          region?: string | null
          sample_size: number
        }
        Update: {
          avg_displacement_weight?: number
          avg_economic_impact_weight?: number
          avg_environmental_weight?: number
          avg_fatalities_weight?: number
          avg_infrastructure_weight?: number
          avg_injuries_weight?: number
          avg_property_damage_weight?: number
          avg_psychosocial_weight?: number
          avg_reputational_weight?: number
          avg_support_system_weight?: number
          calculated_at?: string | null
          id?: string
          industry?: string
          is_active?: boolean | null
          org_size?: string | null
          percentile_data?: Json | null
          region?: string | null
          sample_size?: number
        }
        Relationships: []
      }
      weighting_mission_analysis: {
        Row: {
          analysis_result: Json
          analyzed_at: string | null
          consequence_relevance: Json
          id: string
          mission_statement: string
          session_id: string
        }
        Insert: {
          analysis_result: Json
          analyzed_at?: string | null
          consequence_relevance: Json
          id?: string
          mission_statement: string
          session_id: string
        }
        Update: {
          analysis_result?: Json
          analyzed_at?: string | null
          consequence_relevance?: Json
          id?: string
          mission_statement?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighting_mission_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_multi_executive_sessions: {
        Row: {
          aggregated_weights: Json | null
          aggregation_method: string
          completed_at: string | null
          consensus_reached: boolean | null
          consensus_threshold: number | null
          disagreements_flagged: Json | null
          executive_sessions: Json
          id: string
          org_id: string
          parent_session_id: string
          status: string | null
        }
        Insert: {
          aggregated_weights?: Json | null
          aggregation_method: string
          completed_at?: string | null
          consensus_reached?: boolean | null
          consensus_threshold?: number | null
          disagreements_flagged?: Json | null
          executive_sessions: Json
          id?: string
          org_id: string
          parent_session_id: string
          status?: string | null
        }
        Update: {
          aggregated_weights?: Json | null
          aggregation_method?: string
          completed_at?: string | null
          consensus_reached?: boolean | null
          consensus_threshold?: number | null
          disagreements_flagged?: Json | null
          executive_sessions?: Json
          id?: string
          org_id?: string
          parent_session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_multi_executive_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_multi_executive_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_notifications: {
        Row: {
          acted_upon_at: string | null
          action_url: string | null
          created_at: string | null
          delivery_method: string[] | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          sent_at: string | null
          session_id: string | null
          status: string | null
          subject: string
        }
        Insert: {
          acted_upon_at?: string | null
          action_url?: string | null
          created_at?: string | null
          delivery_method?: string[] | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          recipient_id: string
          sent_at?: string | null
          session_id?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          acted_upon_at?: string | null
          action_url?: string | null
          created_at?: string | null
          delivery_method?: string[] | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          session_id?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighting_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_questionnaire_responses: {
        Row: {
          budget_allocation_priority: string
          completed_at: string | null
          hardest_to_recover_consequence: string
          id: string
          mission_statement: string
          past_incident_consequence_type: string | null
          past_major_incident: string | null
          primary_mandate: string[]
          primary_stakeholders: Json
          regulatory_environment: string[]
          risk_tolerance: string
          session_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          budget_allocation_priority: string
          completed_at?: string | null
          hardest_to_recover_consequence: string
          id?: string
          mission_statement: string
          past_incident_consequence_type?: string | null
          past_major_incident?: string | null
          primary_mandate: string[]
          primary_stakeholders: Json
          regulatory_environment: string[]
          risk_tolerance: string
          session_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          budget_allocation_priority?: string
          completed_at?: string | null
          hardest_to_recover_consequence?: string
          id?: string
          mission_statement?: string
          past_incident_consequence_type?: string | null
          past_major_incident?: string | null
          primary_mandate?: string[]
          primary_stakeholders?: Json
          regulatory_environment?: string[]
          risk_tolerance?: string
          session_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_questionnaire_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_regulatory_database: {
        Row: {
          ai_confidence_score: number | null
          ai_research_date: string | null
          consequence_emphasis: Json
          created_at: string | null
          id: string
          industry: string
          is_active: boolean | null
          jurisdiction: string
          jurisdiction_level: string
          key_requirements: string[] | null
          regulation_code: string | null
          regulation_name: string
          regulation_url: string | null
          source_type: string
          summary: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_research_date?: string | null
          consequence_emphasis: Json
          created_at?: string | null
          id?: string
          industry: string
          is_active?: boolean | null
          jurisdiction: string
          jurisdiction_level: string
          key_requirements?: string[] | null
          regulation_code?: string | null
          regulation_name: string
          regulation_url?: string | null
          source_type: string
          summary: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_research_date?: string | null
          consequence_emphasis?: Json
          created_at?: string | null
          id?: string
          industry?: string
          is_active?: boolean | null
          jurisdiction?: string
          jurisdiction_level?: string
          key_requirements?: string[] | null
          regulation_code?: string | null
          regulation_name?: string
          regulation_url?: string | null
          source_type?: string
          summary?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      weighting_regulatory_research: {
        Row: {
          ai_synthesis_prompt: string | null
          ai_synthesis_response: string | null
          api_cost_usd: number | null
          consequence_regulatory_analysis: Json
          id: string
          industry: string
          jurisdiction: string
          processing_duration_seconds: number | null
          regulatory_environment_tags: string[]
          researched_at: string | null
          search_queries_used: string[]
          session_id: string
          top_regulated_consequences: string[]
          total_sources_found: number
          web_search_results: Json | null
        }
        Insert: {
          ai_synthesis_prompt?: string | null
          ai_synthesis_response?: string | null
          api_cost_usd?: number | null
          consequence_regulatory_analysis: Json
          id?: string
          industry: string
          jurisdiction: string
          processing_duration_seconds?: number | null
          regulatory_environment_tags: string[]
          researched_at?: string | null
          search_queries_used: string[]
          session_id: string
          top_regulated_consequences: string[]
          total_sources_found: number
          web_search_results?: Json | null
        }
        Update: {
          ai_synthesis_prompt?: string | null
          ai_synthesis_response?: string | null
          api_cost_usd?: number | null
          consequence_regulatory_analysis?: Json
          id?: string
          industry?: string
          jurisdiction?: string
          processing_duration_seconds?: number | null
          regulatory_environment_tags?: string[]
          researched_at?: string | null
          search_queries_used?: string[]
          session_id?: string
          top_regulated_consequences?: string[]
          total_sources_found?: number
          web_search_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "weighting_regulatory_research_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_scenario_validations: {
        Row: {
          ai_calculated_score: number | null
          ai_risk_category: string | null
          completed_at: string | null
          consequence_values: Json
          id: string
          misalignment_magnitude: number | null
          rating_aligned: boolean | null
          scenario_description: string
          scenario_number: number
          scenario_title: string
          session_id: string
          time_spent_seconds: number | null
          user_risk_rating: string
        }
        Insert: {
          ai_calculated_score?: number | null
          ai_risk_category?: string | null
          completed_at?: string | null
          consequence_values: Json
          id?: string
          misalignment_magnitude?: number | null
          rating_aligned?: boolean | null
          scenario_description: string
          scenario_number: number
          scenario_title: string
          session_id: string
          time_spent_seconds?: number | null
          user_risk_rating: string
        }
        Update: {
          ai_calculated_score?: number | null
          ai_risk_category?: string | null
          completed_at?: string | null
          consequence_values?: Json
          id?: string
          misalignment_magnitude?: number | null
          rating_aligned?: boolean | null
          scenario_description?: string
          scenario_number?: number
          scenario_title?: string
          session_id?: string
          time_spent_seconds?: number | null
          user_risk_rating?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighting_scenario_validations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_sensitivity_tests: {
        Row: {
          ai_impact_analysis: string
          ai_recommendations: string | null
          base_weights: Json
          id: string
          scenario_score_changes: Json
          session_id: string
          test_name: string | null
          test_weights: Json
          tested_at: string | null
          tested_by: string
          weight_differences: Json
        }
        Insert: {
          ai_impact_analysis: string
          ai_recommendations?: string | null
          base_weights: Json
          id?: string
          scenario_score_changes: Json
          session_id: string
          test_name?: string | null
          test_weights: Json
          tested_at?: string | null
          tested_by: string
          weight_differences: Json
        }
        Update: {
          ai_impact_analysis?: string
          ai_recommendations?: string | null
          base_weights?: Json
          id?: string
          scenario_score_changes?: Json
          session_id?: string
          test_name?: string | null
          test_weights?: Json
          tested_at?: string | null
          tested_by?: string
          weight_differences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "weighting_sensitivity_tests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_sensitivity_tests_tested_by_fkey"
            columns: ["tested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_sessions: {
        Row: {
          ai_processing_completed_at: string | null
          ai_processing_cost_usd: number | null
          ai_processing_duration_seconds: number | null
          ai_processing_started_at: string | null
          ai_processing_tokens_used: number | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          id: string
          layer1_completed: boolean | null
          layer2_completed: boolean | null
          layer3_completed: boolean | null
          layer4_completed: boolean | null
          layer5_completed: boolean | null
          org_id: string
          requires_approval: boolean | null
          session_notes: string | null
          status: string | null
          version: number
        }
        Insert: {
          ai_processing_completed_at?: string | null
          ai_processing_cost_usd?: number | null
          ai_processing_duration_seconds?: number | null
          ai_processing_started_at?: string | null
          ai_processing_tokens_used?: number | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          layer1_completed?: boolean | null
          layer2_completed?: boolean | null
          layer3_completed?: boolean | null
          layer4_completed?: boolean | null
          layer5_completed?: boolean | null
          org_id: string
          requires_approval?: boolean | null
          session_notes?: string | null
          status?: string | null
          version?: number
        }
        Update: {
          ai_processing_completed_at?: string | null
          ai_processing_cost_usd?: number | null
          ai_processing_duration_seconds?: number | null
          ai_processing_started_at?: string | null
          ai_processing_tokens_used?: number | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          layer1_completed?: boolean | null
          layer2_completed?: boolean | null
          layer3_completed?: boolean | null
          layer4_completed?: boolean | null
          layer5_completed?: boolean | null
          org_id?: string
          requires_approval?: boolean | null
          session_notes?: string | null
          status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "weighting_sessions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_weight_versions: {
        Row: {
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          displacement_weight: number
          economic_impact_weight: number
          environmental_weight: number
          fatalities_weight: number
          id: string
          infrastructure_weight: number
          injuries_weight: number
          org_id: string
          property_damage_weight: number
          psychosocial_weight: number
          reputational_weight: number
          session_id: string | null
          set_by: string
          support_system_weight: number
          version: number
          was_active_from: string
          was_active_until: string | null
          weights_json: Json
        }
        Insert: {
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          displacement_weight: number
          economic_impact_weight: number
          environmental_weight: number
          fatalities_weight: number
          id?: string
          infrastructure_weight: number
          injuries_weight: number
          org_id: string
          property_damage_weight: number
          psychosocial_weight: number
          reputational_weight: number
          session_id?: string | null
          set_by: string
          support_system_weight: number
          version: number
          was_active_from: string
          was_active_until?: string | null
          weights_json: Json
        }
        Update: {
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          displacement_weight?: number
          economic_impact_weight?: number
          environmental_weight?: number
          fatalities_weight?: number
          id?: string
          infrastructure_weight?: number
          injuries_weight?: number
          org_id?: string
          property_damage_weight?: number
          psychosocial_weight?: number
          reputational_weight?: number
          session_id?: string | null
          set_by?: string
          support_system_weight?: number
          version?: number
          was_active_from?: string
          was_active_until?: string | null
          weights_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "weighting_weight_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_weight_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_weight_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "weighting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighting_weight_versions_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_weighting_weights: {
        Args: { p_new_version: number; p_org_id: string }
        Returns: undefined
      }
      calculate_ahp_consistency_ratio: {
        Args: { matrix_data: Json }
        Returns: number
      }
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
