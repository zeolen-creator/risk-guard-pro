-- =========================================
-- FEATURES 6-15: ADVANCED HIRA CAPABILITIES
-- =========================================

-- FEATURE 6: Executive Summary - Already have executive_reports table, add assessment_id link
ALTER TABLE public.executive_reports 
ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_executive_reports_assessment ON public.executive_reports(assessment_id);

-- FEATURE 7: Risk Appetite Configuration
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS risk_appetite_config JSONB DEFAULT '{
  "low_threshold": 5,
  "medium_threshold": 12,
  "high_threshold": 15,
  "extreme_threshold": 18,
  "acceptance_policy": "Low risks accepted. Medium risks require mitigation plan. High and Extreme risks require executive approval.",
  "requires_approval": ["high", "extreme"]
}'::jsonb;

-- Risk Acceptance Records
CREATE TABLE IF NOT EXISTS public.risk_acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  hazard_id UUID NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  exceeds_appetite BOOLEAN DEFAULT false,
  accepted BOOLEAN DEFAULT false,
  acceptance_rationale TEXT,
  compensating_controls TEXT[],
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.risk_acceptance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk acceptance" ON public.risk_acceptance_records
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org risk acceptance" ON public.risk_acceptance_records
  FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org risk acceptance" ON public.risk_acceptance_records
  FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

CREATE INDEX idx_risk_acceptance_org ON public.risk_acceptance_records(org_id);
CREATE INDEX idx_risk_acceptance_assessment ON public.risk_acceptance_records(assessment_id);

-- FEATURE 8: Climate Change Risk Adjustment
CREATE TABLE IF NOT EXISTS public.climate_risk_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_category TEXT NOT NULL,
  location_region TEXT NOT NULL,
  baseline_year INTEGER DEFAULT 2026,
  projection_2030 DECIMAL(4,2) DEFAULT 1.00,
  projection_2040 DECIMAL(4,2) DEFAULT 1.00,
  projection_2050 DECIMAL(4,2) DEFAULT 1.00,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  data_sources JSONB DEFAULT '[]'::jsonb,
  summary_text TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.climate_risk_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view climate adjustments" ON public.climate_risk_adjustments
  FOR SELECT USING (true);

CREATE INDEX idx_climate_adjustments_category ON public.climate_risk_adjustments(hazard_category);
CREATE INDEX idx_climate_adjustments_location ON public.climate_risk_adjustments(location_region);

-- FEATURE 9: Quick Assessment Mode - Add mode column to assessments
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard' CHECK (mode IN ('standard', 'quick'));

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS quick_ratings JSONB DEFAULT '{}'::jsonb;

-- FEATURE 10: Multi-Location Support
CREATE TABLE IF NOT EXISTS public.organization_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'Canada',
  is_headquarters BOOLEAN DEFAULT false,
  employee_count INTEGER,
  geographic_risks JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org locations" ON public.organization_locations
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can insert org locations" ON public.organization_locations
  FOR INSERT WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Admins can update org locations" ON public.organization_locations
  FOR UPDATE USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Admins can delete org locations" ON public.organization_locations
  FOR DELETE USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE INDEX idx_org_locations_org ON public.organization_locations(org_id);

-- Link assessments to locations
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.organization_locations(id);

-- FEATURE 11: Stakeholder Engagement Tracker
CREATE TABLE IF NOT EXISTS public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org stakeholders" ON public.stakeholders
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can manage org stakeholders" ON public.stakeholders
  FOR ALL USING (user_belongs_to_org(auth.uid(), org_id));

CREATE INDEX idx_stakeholders_org ON public.stakeholders(org_id);

-- Stakeholder Reviews
CREATE TABLE IF NOT EXISTS public.stakeholder_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'changes_requested', 'declined')),
  comments TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stakeholder_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org stakeholder reviews" ON public.stakeholder_reviews
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can manage org stakeholder reviews" ON public.stakeholder_reviews
  FOR ALL USING (user_belongs_to_org(auth.uid(), org_id));

CREATE INDEX idx_stakeholder_reviews_assessment ON public.stakeholder_reviews(assessment_id);

-- FEATURE 12: Regulatory Compliance Mapping - Enhance existing regulatory_requirements
CREATE TABLE IF NOT EXISTS public.assessment_compliance (
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.regulatory_requirements(id) ON DELETE CASCADE,
  is_compliant BOOLEAN DEFAULT false,
  compliance_notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  PRIMARY KEY (assessment_id, requirement_id)
);

ALTER TABLE public.assessment_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assessment compliance" ON public.assessment_compliance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND user_belongs_to_org(auth.uid(), a.org_id)
    )
  );

CREATE POLICY "Users can manage assessment compliance" ON public.assessment_compliance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND user_belongs_to_org(auth.uid(), a.org_id)
    )
  );

-- FEATURE 13: Vulnerability Assessment Module
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS vulnerability_factors JSONB DEFAULT '{
  "elderly_population_pct": 0,
  "infrastructure_age_years": 0,
  "emergency_capacity": "medium",
  "poverty_rate_pct": 0,
  "healthcare_access": "good",
  "communication_infrastructure": "good"
}'::jsonb;

-- FEATURE 14: Critical Infrastructure Dependencies
CREATE TABLE IF NOT EXISTS public.infrastructure_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.organization_locations(id),
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  criticality TEXT CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  vendor TEXT,
  replacement_cost DECIMAL(15,2),
  recovery_time_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.infrastructure_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org infrastructure" ON public.infrastructure_assets
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage org infrastructure" ON public.infrastructure_assets
  FOR ALL USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE INDEX idx_infrastructure_assets_org ON public.infrastructure_assets(org_id);

-- Infrastructure Dependencies
CREATE TABLE IF NOT EXISTS public.infrastructure_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  upstream_asset_id UUID NOT NULL REFERENCES public.infrastructure_assets(id) ON DELETE CASCADE,
  downstream_asset_id UUID NOT NULL REFERENCES public.infrastructure_assets(id) ON DELETE CASCADE,
  dependency_type TEXT CHECK (dependency_type IN ('power', 'data', 'physical', 'logical', 'process')),
  criticality TEXT CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(upstream_asset_id, downstream_asset_id)
);

ALTER TABLE public.infrastructure_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org dependencies" ON public.infrastructure_dependencies
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage org dependencies" ON public.infrastructure_dependencies
  FOR ALL USING (has_org_role(auth.uid(), org_id, 'admin'));

-- FEATURE 15: Event-Specific Assessment Template
CREATE TABLE IF NOT EXISTS public.event_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('conference', 'festival', 'sports', 'concert', 'fair', 'parade', 'other')),
  event_date_start DATE,
  event_date_end DATE,
  expected_attendance INTEGER,
  venue_type TEXT,
  venue_address TEXT,
  is_outdoor BOOLEAN DEFAULT false,
  has_food_service BOOLEAN DEFAULT false,
  has_alcohol BOOLEAN DEFAULT false,
  special_considerations TEXT,
  pre_event_checklist JSONB DEFAULT '[]'::jsonb,
  during_event_checklist JSONB DEFAULT '[]'::jsonb,
  post_event_checklist JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'approved', 'in_progress', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org events" ON public.event_assessments
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can manage org events" ON public.event_assessments
  FOR ALL USING (user_belongs_to_org(auth.uid(), org_id));

CREATE INDEX idx_event_assessments_org ON public.event_assessments(org_id);
CREATE INDEX idx_event_assessments_dates ON public.event_assessments(event_date_start, event_date_end);