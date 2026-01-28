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
      executive_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
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
            foreignKeyName: "executive_reports_org_id_fkey"
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
          sector: string
          size: string | null
          updated_at: string
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
          sector: string
          size?: string | null
          updated_at?: string
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
