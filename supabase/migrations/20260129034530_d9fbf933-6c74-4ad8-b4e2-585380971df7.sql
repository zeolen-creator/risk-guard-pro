-- =============================================
-- CONSEQUENCE WEIGHTING METHODOLOGY SYSTEM
-- Complete Database Schema - 18 Tables
-- =============================================

-- =============================================
-- TABLE 1: weighting_sessions
-- Tracks each weighting methodology session
-- =============================================
CREATE TABLE public.weighting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'approved', 'archived')) DEFAULT 'in_progress',
  
  -- Who started this session
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Completion tracking
  layer1_completed BOOLEAN DEFAULT false,
  layer2_completed BOOLEAN DEFAULT false,
  layer3_completed BOOLEAN DEFAULT false,
  layer4_completed BOOLEAN DEFAULT false,
  layer5_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- AI processing
  ai_processing_started_at TIMESTAMPTZ,
  ai_processing_completed_at TIMESTAMPTZ,
  ai_processing_duration_seconds INT,
  ai_processing_tokens_used INT,
  ai_processing_cost_usd NUMERIC(10,4),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  
  -- Notes
  session_notes TEXT,
  
  UNIQUE(org_id, version)
);

-- RLS Policies for weighting_sessions
ALTER TABLE public.weighting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sessions"
  ON public.weighting_sessions FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org sessions"
  ON public.weighting_sessions FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update own org sessions"
  ON public.weighting_sessions FOR UPDATE
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete org sessions"
  ON public.weighting_sessions FOR DELETE
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- Indexes
CREATE INDEX idx_weighting_sessions_org ON public.weighting_sessions(org_id);
CREATE INDEX idx_weighting_sessions_status ON public.weighting_sessions(status);

-- =============================================
-- TABLE 2: weighting_questionnaire_responses
-- Layer 1 organizational context responses
-- =============================================
CREATE TABLE public.weighting_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Section A: Organization Identity
  primary_mandate TEXT[] NOT NULL,
  primary_stakeholders JSONB NOT NULL,
  regulatory_environment TEXT[] NOT NULL,
  mission_statement TEXT NOT NULL,
  
  -- Section B: Historical Incident Reflection
  past_major_incident TEXT,
  past_incident_consequence_type TEXT,
  hardest_to_recover_consequence TEXT NOT NULL,
  
  -- Section C: Risk Tolerance
  risk_tolerance TEXT CHECK (risk_tolerance IN ('extremely_conservative', 'conservative', 'balanced', 'pragmatic')) NOT NULL,
  budget_allocation_priority TEXT NOT NULL,
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INT,
  
  UNIQUE(session_id)
);

-- RLS
ALTER TABLE public.weighting_questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org questionnaire responses"
  ON public.weighting_questionnaire_responses FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org questionnaire responses"
  ON public.weighting_questionnaire_responses FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 3: weighting_ahp_comparisons
-- Layer 2 AHP pairwise comparison responses
-- =============================================
CREATE TABLE public.weighting_ahp_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Comparison details
  comparison_type TEXT CHECK (comparison_type IN ('tier_grouping', 'within_tier', 'financial_vs_reputation')) NOT NULL,
  consequence_a TEXT NOT NULL,
  consequence_b TEXT NOT NULL,
  
  -- Saaty 1-9 scale rating
  rating INT CHECK (rating BETWEEN 1 AND 9) NOT NULL,
  direction TEXT CHECK (direction IN ('a_more_important', 'b_more_important', 'equal')) NOT NULL,
  
  -- Derived intensity
  a_intensity NUMERIC(10,4) NOT NULL,
  b_intensity NUMERIC(10,4) NOT NULL,
  
  -- Metadata
  comparison_order INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INT,
  
  UNIQUE(session_id, consequence_a, consequence_b)
);

-- RLS
ALTER TABLE public.weighting_ahp_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org AHP comparisons"
  ON public.weighting_ahp_comparisons FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org AHP comparisons"
  ON public.weighting_ahp_comparisons FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 4: weighting_ahp_matrix
-- Complete AHP pairwise comparison matrix
-- =============================================
CREATE TABLE public.weighting_ahp_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Complete matrix as JSONB (10x10 for 10 consequences)
  matrix JSONB NOT NULL,
  
  -- AHP calculations
  eigenvalues JSONB NOT NULL,
  consistency_ratio NUMERIC(10,4) NOT NULL,
  is_consistent BOOLEAN NOT NULL,
  
  -- Raw weights before normalization
  raw_weights JSONB NOT NULL,
  
  -- Normalized weights (sum = 100%)
  normalized_weights JSONB NOT NULL,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id)
);

-- RLS
ALTER TABLE public.weighting_ahp_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org AHP matrix"
  ON public.weighting_ahp_matrix FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org AHP matrix"
  ON public.weighting_ahp_matrix FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 5: weighting_scenario_validations
-- Layer 3 scenario-based validation responses
-- =============================================
CREATE TABLE public.weighting_scenario_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Scenario details
  scenario_number INT CHECK (scenario_number BETWEEN 1 AND 4) NOT NULL,
  scenario_title TEXT NOT NULL,
  scenario_description TEXT NOT NULL,
  
  -- Consequence breakdowns
  consequence_values JSONB NOT NULL,
  
  -- User's intuitive risk rating
  user_risk_rating TEXT CHECK (user_risk_rating IN ('extreme', 'high', 'medium', 'low')) NOT NULL,
  
  -- AI-calculated risk score
  ai_calculated_score NUMERIC(10,2),
  ai_risk_category TEXT CHECK (ai_risk_category IN ('extreme', 'high', 'medium', 'low')),
  
  -- Alignment check
  rating_aligned BOOLEAN,
  misalignment_magnitude INT,
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INT,
  
  UNIQUE(session_id, scenario_number)
);

-- RLS
ALTER TABLE public.weighting_scenario_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org scenario validations"
  ON public.weighting_scenario_validations FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org scenario validations"
  ON public.weighting_scenario_validations FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 6: weighting_regulatory_research
-- Layer 4 AI-powered regulatory research results
-- =============================================
CREATE TABLE public.weighting_regulatory_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Search parameters
  industry TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  regulatory_environment_tags TEXT[] NOT NULL,
  
  -- AI research results
  search_queries_used TEXT[] NOT NULL,
  total_sources_found INT NOT NULL,
  
  -- Structured findings
  consequence_regulatory_analysis JSONB NOT NULL,
  
  -- Overall regulatory priorities
  top_regulated_consequences TEXT[] NOT NULL,
  
  -- Raw data
  web_search_results JSONB,
  ai_synthesis_prompt TEXT,
  ai_synthesis_response TEXT,
  
  -- Metadata
  researched_at TIMESTAMPTZ DEFAULT NOW(),
  processing_duration_seconds INT,
  api_cost_usd NUMERIC(10,4),
  
  UNIQUE(session_id)
);

-- RLS
ALTER TABLE public.weighting_regulatory_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org regulatory research"
  ON public.weighting_regulatory_research FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org regulatory research"
  ON public.weighting_regulatory_research FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 7: weighting_mission_analysis
-- AI analysis of organization's mission statement
-- =============================================
CREATE TABLE public.weighting_mission_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  mission_statement TEXT NOT NULL,
  
  -- AI-extracted values and keywords
  analysis_result JSONB NOT NULL,
  
  -- Relevance scores per consequence
  consequence_relevance JSONB NOT NULL,
  
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id)
);

-- RLS
ALTER TABLE public.weighting_mission_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org mission analysis"
  ON public.weighting_mission_analysis FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org mission analysis"
  ON public.weighting_mission_analysis FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 8: weighting_ai_synthesis
-- Layer 5 final AI weight recommendations
-- =============================================
CREATE TABLE public.weighting_ai_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Input sources used
  sources_used JSONB NOT NULL,
  source_weights JSONB NOT NULL,
  
  -- Recommended weights (normalized to 100%)
  recommended_weights JSONB NOT NULL,
  
  -- Comparison to current/default weights
  previous_weights JSONB,
  weight_changes JSONB NOT NULL,
  
  -- Detailed justification reports
  justification_report_executive TEXT NOT NULL,
  justification_report_detailed TEXT NOT NULL,
  justification_report_technical TEXT NOT NULL,
  
  -- Consistency checks performed
  consistency_checks JSONB NOT NULL,
  all_checks_passed BOOLEAN NOT NULL,
  
  -- Sensitivity analysis preview
  sensitivity_preview JSONB,
  
  -- AI metadata
  ai_model_used TEXT NOT NULL,
  ai_prompt_tokens INT NOT NULL,
  ai_response_tokens INT NOT NULL,
  ai_total_cost_usd NUMERIC(10,4) NOT NULL,
  
  synthesized_at TIMESTAMPTZ DEFAULT NOW(),
  processing_duration_seconds INT,
  
  UNIQUE(session_id)
);

-- RLS
ALTER TABLE public.weighting_ai_synthesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org AI synthesis"
  ON public.weighting_ai_synthesis FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org AI synthesis"
  ON public.weighting_ai_synthesis FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 9: weighting_final_weights
-- Final approved consequence weights
-- =============================================
CREATE TABLE public.weighting_final_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) NOT NULL,
  session_id UUID REFERENCES public.weighting_sessions(id) NOT NULL,
  version INT NOT NULL,
  
  -- The 10 consequence weights as JSONB
  weights_json JSONB NOT NULL,
  
  -- Individual weight columns for easy querying
  fatalities_weight NUMERIC(5,2) CHECK (fatalities_weight >= 0 AND fatalities_weight <= 100) NOT NULL,
  injuries_weight NUMERIC(5,2) CHECK (injuries_weight >= 0 AND injuries_weight <= 100) NOT NULL,
  displacement_weight NUMERIC(5,2) CHECK (displacement_weight >= 0 AND displacement_weight <= 100) NOT NULL,
  psychosocial_weight NUMERIC(5,2) CHECK (psychosocial_weight >= 0 AND psychosocial_weight <= 100) NOT NULL,
  support_system_weight NUMERIC(5,2) CHECK (support_system_weight >= 0 AND support_system_weight <= 100) NOT NULL,
  property_damage_weight NUMERIC(5,2) CHECK (property_damage_weight >= 0 AND property_damage_weight <= 100) NOT NULL,
  infrastructure_weight NUMERIC(5,2) CHECK (infrastructure_weight >= 0 AND infrastructure_weight <= 100) NOT NULL,
  environmental_weight NUMERIC(5,2) CHECK (environmental_weight >= 0 AND environmental_weight <= 100) NOT NULL,
  economic_impact_weight NUMERIC(5,2) CHECK (economic_impact_weight >= 0 AND economic_impact_weight <= 100) NOT NULL,
  reputational_weight NUMERIC(5,2) CHECK (reputational_weight >= 0 AND reputational_weight <= 100) NOT NULL,
  
  -- Metadata
  is_active BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'archived')) DEFAULT 'draft',
  
  set_by UUID REFERENCES public.profiles(id) NOT NULL,
  set_at TIMESTAMPTZ DEFAULT NOW(),
  
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  manual_adjustments TEXT,
  
  UNIQUE(org_id, version)
);

-- Ensure only one active version per org
CREATE UNIQUE INDEX idx_one_active_weight_per_org ON public.weighting_final_weights(org_id) WHERE is_active = true;

-- RLS
ALTER TABLE public.weighting_final_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org weights"
  ON public.weighting_final_weights FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage own org weights"
  ON public.weighting_final_weights FOR ALL
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- Indexes
CREATE INDEX idx_weighting_final_weights_org ON public.weighting_final_weights(org_id);
CREATE INDEX idx_weighting_final_weights_active ON public.weighting_final_weights(is_active) WHERE is_active = true;

-- =============================================
-- TABLE 10: weighting_weight_versions
-- Historical versions of weights for audit trail
-- =============================================
CREATE TABLE public.weighting_weight_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) NOT NULL,
  session_id UUID REFERENCES public.weighting_sessions(id),
  version INT NOT NULL,
  
  weights_json JSONB NOT NULL,
  
  fatalities_weight NUMERIC(5,2) NOT NULL,
  injuries_weight NUMERIC(5,2) NOT NULL,
  displacement_weight NUMERIC(5,2) NOT NULL,
  psychosocial_weight NUMERIC(5,2) NOT NULL,
  support_system_weight NUMERIC(5,2) NOT NULL,
  property_damage_weight NUMERIC(5,2) NOT NULL,
  infrastructure_weight NUMERIC(5,2) NOT NULL,
  environmental_weight NUMERIC(5,2) NOT NULL,
  economic_impact_weight NUMERIC(5,2) NOT NULL,
  reputational_weight NUMERIC(5,2) NOT NULL,
  
  was_active_from TIMESTAMPTZ NOT NULL,
  was_active_until TIMESTAMPTZ,
  
  set_by UUID REFERENCES public.profiles(id) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT,
  
  UNIQUE(org_id, version)
);

-- RLS
ALTER TABLE public.weighting_weight_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org weight history"
  ON public.weighting_weight_versions FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

-- =============================================
-- TABLE 11: weighting_approvals
-- Multi-signature approval workflow
-- =============================================
CREATE TABLE public.weighting_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Who needs to approve
  approver_id UUID REFERENCES public.profiles(id) NOT NULL,
  approver_role TEXT NOT NULL,
  approval_order INT,
  
  -- Approval status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')) DEFAULT 'pending',
  
  -- Response
  approved_at TIMESTAMPTZ,
  comments TEXT,
  requested_changes TEXT,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  UNIQUE(session_id, approver_id)
);

-- RLS
ALTER TABLE public.weighting_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals for own org sessions"
  ON public.weighting_approvals FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Approvers can update their own approval"
  ON public.weighting_approvals FOR UPDATE
  USING (approver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert approvals for own org sessions"
  ON public.weighting_approvals FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 12: weighting_sensitivity_tests
-- Layer 6 "what-if" simulation results
-- =============================================
CREATE TABLE public.weighting_sensitivity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Test parameters
  test_name TEXT,
  
  -- Modified weights being tested
  test_weights JSONB NOT NULL,
  
  -- Comparison to current/recommended weights
  base_weights JSONB NOT NULL,
  weight_differences JSONB NOT NULL,
  
  -- Impact on the 4 validation scenarios
  scenario_score_changes JSONB NOT NULL,
  
  -- AI-generated impact prediction
  ai_impact_analysis TEXT NOT NULL,
  ai_recommendations TEXT,
  
  -- Metadata
  tested_by UUID REFERENCES public.profiles(id) NOT NULL,
  tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.weighting_sensitivity_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sensitivity tests"
  ON public.weighting_sensitivity_tests FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

CREATE POLICY "Users can manage own org sensitivity tests"
  ON public.weighting_sensitivity_tests FOR ALL
  USING (session_id IN (
    SELECT id FROM public.weighting_sessions WHERE user_belongs_to_org(auth.uid(), org_id)
  ));

-- =============================================
-- TABLE 13: scenario_templates
-- Pre-built scenario templates for all industries
-- =============================================
CREATE TABLE public.scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  sub_industry TEXT,
  scenario_number INT CHECK (scenario_number BETWEEN 1 AND 4) NOT NULL,
  scenario_title TEXT NOT NULL,
  scenario_description_template TEXT NOT NULL,
  consequence_values_template JSONB NOT NULL,
  customization_prompt TEXT,
  expected_risk_level TEXT CHECK (expected_risk_level IN ('extreme', 'high', 'medium', 'low')) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(industry, scenario_number, version)
);

-- RLS (public read for all authenticated users)
ALTER TABLE public.scenario_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view scenario templates"
  ON public.scenario_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes
CREATE INDEX idx_scenario_templates_industry ON public.scenario_templates(industry);

-- =============================================
-- TABLE 14: weighting_regulatory_database
-- Curated regulatory framework database
-- =============================================
CREATE TABLE public.weighting_regulatory_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  industry TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  jurisdiction_level TEXT CHECK (jurisdiction_level IN ('international', 'national', 'provincial_state', 'municipal', 'industry_specific')) NOT NULL,
  
  -- Regulation details
  regulation_name TEXT NOT NULL,
  regulation_code TEXT,
  regulation_url TEXT,
  
  -- Consequence mappings
  consequence_emphasis JSONB NOT NULL,
  
  -- Full text analysis
  summary TEXT NOT NULL,
  key_requirements TEXT[],
  
  -- Data source
  source_type TEXT CHECK (source_type IN ('manual_curation', 'ai_research', 'user_contribution')) NOT NULL,
  ai_research_date TIMESTAMPTZ,
  ai_confidence_score NUMERIC(3,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(industry, jurisdiction, regulation_code)
);

-- RLS
ALTER TABLE public.weighting_regulatory_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view regulatory database"
  ON public.weighting_regulatory_database FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes
CREATE INDEX idx_regulatory_db_industry ON public.weighting_regulatory_database(industry);
CREATE INDEX idx_regulatory_db_jurisdiction ON public.weighting_regulatory_database(jurisdiction);
CREATE INDEX idx_regulatory_db_industry_jurisdiction ON public.weighting_regulatory_database(industry, jurisdiction);

-- =============================================
-- TABLE 15: weighting_industry_benchmarks
-- Anonymous aggregated benchmarking data
-- =============================================
CREATE TABLE public.weighting_industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  industry TEXT NOT NULL,
  org_size TEXT CHECK (org_size IN ('small', 'medium', 'large', 'enterprise')),
  region TEXT,
  
  -- Aggregated statistics (minimum 5 organizations)
  sample_size INT NOT NULL CHECK (sample_size >= 5),
  
  -- Average weights
  avg_fatalities_weight NUMERIC(5,2) NOT NULL,
  avg_injuries_weight NUMERIC(5,2) NOT NULL,
  avg_displacement_weight NUMERIC(5,2) NOT NULL,
  avg_psychosocial_weight NUMERIC(5,2) NOT NULL,
  avg_support_system_weight NUMERIC(5,2) NOT NULL,
  avg_property_damage_weight NUMERIC(5,2) NOT NULL,
  avg_infrastructure_weight NUMERIC(5,2) NOT NULL,
  avg_environmental_weight NUMERIC(5,2) NOT NULL,
  avg_economic_impact_weight NUMERIC(5,2) NOT NULL,
  avg_reputational_weight NUMERIC(5,2) NOT NULL,
  
  -- Percentiles
  percentile_data JSONB,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(industry, org_size, region)
);

-- RLS
ALTER TABLE public.weighting_industry_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view benchmarks"
  ON public.weighting_industry_benchmarks FOR SELECT
  TO authenticated
  USING (is_active = true AND sample_size >= 5);

-- Indexes
CREATE INDEX idx_industry_benchmarks_industry ON public.weighting_industry_benchmarks(industry);

-- =============================================
-- TABLE 16: weighting_benchmarking_opt_ins
-- Tracks which organizations opted into benchmarking
-- =============================================
CREATE TABLE public.weighting_benchmarking_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) UNIQUE NOT NULL,
  
  -- Opt-in status
  is_opted_in BOOLEAN DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  
  -- Data sharing preferences
  share_weights BOOLEAN DEFAULT true,
  share_industry BOOLEAN DEFAULT true,
  share_org_size BOOLEAN DEFAULT true,
  share_region_broad BOOLEAN DEFAULT true,
  share_hazard_ratings BOOLEAN DEFAULT false,
  
  -- Consent tracking
  consent_version TEXT NOT NULL,
  last_consent_date TIMESTAMPTZ,
  next_consent_reminder_date DATE,
  
  -- Usage stats
  times_data_used_in_benchmarks INT DEFAULT 0,
  last_data_used_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.weighting_benchmarking_opt_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org opt-in status"
  ON public.weighting_benchmarking_opt_ins FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage own org opt-in"
  ON public.weighting_benchmarking_opt_ins FOR ALL
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- =============================================
-- TABLE 17: weighting_multi_executive_sessions
-- Tracks multi-executive group decisions
-- =============================================
CREATE TABLE public.weighting_multi_executive_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) NOT NULL,
  
  -- Parent session that spawned individual executive sessions
  parent_session_id UUID REFERENCES public.weighting_sessions(id) NOT NULL,
  
  -- Individual executive sessions
  executive_sessions JSONB NOT NULL,
  
  -- Aggregation settings
  aggregation_method TEXT CHECK (aggregation_method IN ('geometric_mean', 'simple_average', 'weighted_average', 'consensus_required')) NOT NULL,
  consensus_threshold NUMERIC(3,2) DEFAULT 0.10,
  
  -- Results
  aggregated_weights JSONB,
  disagreements_flagged JSONB,
  consensus_reached BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT CHECK (status IN ('in_progress', 'awaiting_consensus', 'completed')) DEFAULT 'in_progress',
  
  completed_at TIMESTAMPTZ,
  
  UNIQUE(org_id, parent_session_id)
);

-- RLS
ALTER TABLE public.weighting_multi_executive_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org multi-executive sessions"
  ON public.weighting_multi_executive_sessions FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can manage own org multi-executive sessions"
  ON public.weighting_multi_executive_sessions FOR ALL
  USING (user_belongs_to_org(auth.uid(), org_id));

-- =============================================
-- TABLE 18: weighting_notifications
-- Tracks all notifications sent during weighting process
-- =============================================
CREATE TABLE public.weighting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.weighting_sessions(id) ON DELETE CASCADE,
  
  -- Who to notify
  recipient_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  notification_type TEXT CHECK (notification_type IN (
    'session_started',
    'layer_completed',
    'ai_processing_complete',
    'approval_requested',
    'approval_reminder',
    'consensus_needed',
    'weights_approved',
    'annual_review_due'
  )) NOT NULL,
  
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'sent', 'read', 'acted_upon')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acted_upon_at TIMESTAMPTZ,
  
  -- Delivery
  delivery_method TEXT[] DEFAULT ARRAY['in_app'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.weighting_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.weighting_notifications FOR SELECT
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON public.weighting_notifications FOR UPDATE
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_weighting_notifications_recipient ON public.weighting_notifications(recipient_id, status);
CREATE INDEX idx_weighting_notifications_session ON public.weighting_notifications(session_id);

-- =============================================
-- TABLE: consequence_types (Reference table)
-- The 10 universal consequence types
-- =============================================
CREATE TABLE public.consequence_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_number INT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT NOT NULL,
  examples TEXT[],
  typical_weight_ranges JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.consequence_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view consequence types"
  ON public.consequence_types FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- TABLE: industry_taxonomy (Reference table)
-- The 12 primary industry sectors
-- =============================================
CREATE TABLE public.industry_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  sub_sectors TEXT[],
  expected_weight_patterns JSONB,
  questionnaire_adaptations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.industry_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view industry taxonomy"
  ON public.industry_taxonomy FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- DATABASE FUNCTION: Calculate AHP Consistency Ratio
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_ahp_consistency_ratio(
  matrix_data JSONB
)
RETURNS NUMERIC
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n INT;
  random_index NUMERIC;
  lambda_max NUMERIC;
  consistency_index NUMERIC;
  consistency_ratio NUMERIC;
BEGIN
  -- Get matrix size
  n := jsonb_array_length(matrix_data);
  
  -- Random Index (RI) values for different matrix sizes
  random_index := CASE n
    WHEN 1 THEN 0
    WHEN 2 THEN 0
    WHEN 3 THEN 0.58
    WHEN 4 THEN 0.90
    WHEN 5 THEN 1.12
    WHEN 6 THEN 1.24
    WHEN 7 THEN 1.32
    WHEN 8 THEN 1.41
    WHEN 9 THEN 1.45
    WHEN 10 THEN 1.49
    ELSE 1.51
  END;
  
  -- Placeholder calculation - full implementation in Edge Function
  lambda_max := n;
  
  IF n <= 1 THEN
    RETURN 0;
  END IF;
  
  consistency_index := (lambda_max - n) / (n - 1);
  
  IF random_index = 0 THEN
    RETURN 0;
  END IF;
  
  consistency_ratio := consistency_index / random_index;
  
  RETURN consistency_ratio;
END;
$$;

-- =============================================
-- DATABASE FUNCTION: Activate New Weight Version
-- =============================================
CREATE OR REPLACE FUNCTION public.activate_weighting_weights(
  p_org_id UUID,
  p_new_version INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_version RECORD;
BEGIN
  -- Archive current active weights
  FOR v_old_version IN
    SELECT * FROM weighting_final_weights
    WHERE org_id = p_org_id AND is_active = true
  LOOP
    INSERT INTO weighting_weight_versions (
      org_id, session_id, version,
      fatalities_weight, injuries_weight, displacement_weight,
      psychosocial_weight, support_system_weight, property_damage_weight,
      infrastructure_weight, environmental_weight, economic_impact_weight,
      reputational_weight, weights_json,
      was_active_from, was_active_until,
      set_by, approved_by,
      archive_reason
    ) VALUES (
      v_old_version.org_id, v_old_version.session_id, v_old_version.version,
      v_old_version.fatalities_weight, v_old_version.injuries_weight,
      v_old_version.displacement_weight,
      v_old_version.psychosocial_weight, v_old_version.support_system_weight,
      v_old_version.property_damage_weight,
      v_old_version.infrastructure_weight, v_old_version.environmental_weight,
      v_old_version.economic_impact_weight,
      v_old_version.reputational_weight, v_old_version.weights_json,
      v_old_version.set_at, NOW(),
      v_old_version.set_by, v_old_version.approved_by,
      'replaced_by_v' || p_new_version
    );
    
    -- Deactivate old version
    UPDATE weighting_final_weights
    SET is_active = false
    WHERE id = v_old_version.id;
  END LOOP;
  
  -- Activate new version
  UPDATE weighting_final_weights
  SET is_active = true
  WHERE org_id = p_org_id AND version = p_new_version;
END;
$$;