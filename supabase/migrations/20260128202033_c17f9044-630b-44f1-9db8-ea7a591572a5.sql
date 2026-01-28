-- Table for regulatory requirements (mandatory hazards by industry/province)
CREATE TABLE public.regulatory_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text NOT NULL, -- e.g., 'ON', 'BC', 'AB'
  industry_type text NOT NULL, -- e.g., 'Acute Care Hospital', 'Long-Term Care'
  hazard_id uuid REFERENCES public.hazards(id) ON DELETE CASCADE NOT NULL,
  regulation_name text NOT NULL, -- e.g., 'Ontario Fire Code O. Reg. 213/07'
  regulation_section text, -- e.g., 'Section 2.8.1'
  requirement_description text NOT NULL,
  non_compliance_consequences text NOT NULL,
  effective_date date,
  source_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(province, industry_type, hazard_id)
);

-- Enable RLS
ALTER TABLE public.regulatory_requirements ENABLE ROW LEVEL SECURITY;

-- Anyone can view regulatory requirements (public reference data)
CREATE POLICY "Anyone can view regulatory requirements"
ON public.regulatory_requirements FOR SELECT
USING (true);

-- Table for AI-generated hazard relevance scores (cached per org profile)
CREATE TABLE public.hazard_ai_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  hazard_id uuid REFERENCES public.hazards(id) ON DELETE CASCADE NOT NULL,
  relevance_score integer NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  tier text NOT NULL CHECK (tier IN ('high', 'medium', 'low')),
  ai_reasoning text,
  peer_adoption_rate numeric, -- percentage of similar orgs assessing this hazard
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  UNIQUE(org_id, hazard_id)
);

-- Enable RLS
ALTER TABLE public.hazard_ai_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their org's hazard scores
CREATE POLICY "Users can view org hazard scores"
ON public.hazard_ai_scores FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Users can insert/update their org's hazard scores (for caching)
CREATE POLICY "Users can insert org hazard scores"
ON public.hazard_ai_scores FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org hazard scores"
ON public.hazard_ai_scores FOR UPDATE
USING (user_belongs_to_org(auth.uid(), org_id));

-- Table for compliance override audit log
CREATE TABLE public.compliance_override_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  hazard_id uuid REFERENCES public.hazards(id) ON DELETE SET NULL NOT NULL,
  regulatory_requirement_id uuid REFERENCES public.regulatory_requirements(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('unchecked', 'acknowledged')),
  reason text,
  regulation_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_override_logs ENABLE ROW LEVEL SECURITY;

-- Users can view org audit logs
CREATE POLICY "Users can view org compliance logs"
ON public.compliance_override_logs FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Users can insert org audit logs
CREATE POLICY "Users can insert compliance logs"
ON public.compliance_override_logs FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), org_id) AND user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_regulatory_requirements_lookup 
ON public.regulatory_requirements(province, industry_type);

CREATE INDEX idx_hazard_ai_scores_org 
ON public.hazard_ai_scores(org_id);

CREATE INDEX idx_hazard_ai_scores_expires 
ON public.hazard_ai_scores(expires_at);

CREATE INDEX idx_compliance_logs_org 
ON public.compliance_override_logs(org_id, created_at DESC);