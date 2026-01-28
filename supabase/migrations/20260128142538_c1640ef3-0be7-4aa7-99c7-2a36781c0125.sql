-- Feature 1: AI-Powered Risk Predictions & Alerts
CREATE TABLE IF NOT EXISTS public.risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  hazard_id UUID REFERENCES public.hazards(id) ON DELETE CASCADE,
  current_risk_score NUMERIC NOT NULL CHECK (current_risk_score >= 0 AND current_risk_score <= 100),
  predicted_risk_score NUMERIC NOT NULL CHECK (predicted_risk_score >= 0 AND predicted_risk_score <= 100),
  prediction_confidence NUMERIC CHECK (prediction_confidence >= 0 AND prediction_confidence <= 100),
  prediction_basis TEXT NOT NULL CHECK (prediction_basis IN ('climate_trends', 'regulatory_change', 'seasonal', 'industry_incident', 'historical_pattern')),
  time_horizon TEXT NOT NULL CHECK (time_horizon IN ('3_months', '6_months', '1_year', '5_years')),
  source_data JSONB DEFAULT '{}',
  source_urls TEXT[] DEFAULT '{}',
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_predictions_org ON public.risk_predictions(org_id, hazard_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_time ON public.risk_predictions(time_horizon, created_at DESC);

-- Risk Alerts Table
CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('prediction', 'seasonal', 'regulatory', 'industry_incident', 'threshold_exceeded')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hazard_ids UUID[] DEFAULT '{}',
  action_required TEXT,
  source_data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_org_unread ON public.risk_alerts(org_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created ON public.risk_alerts(created_at DESC);

-- Seasonal Patterns Table
CREATE TABLE IF NOT EXISTS public.seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_type TEXT NOT NULL,
  region TEXT NOT NULL,
  peak_months INT[] NOT NULL,
  description TEXT NOT NULL,
  risk_multiplier NUMERIC DEFAULT 1.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hazard_type, region)
);

-- Feature 2: Benchmarking Tables
CREATE TABLE IF NOT EXISTS public.benchmark_participation (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  opted_in BOOLEAN DEFAULT FALSE,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  data_sharing_consent_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.benchmark_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL CHECK (industry != ''),
  org_size TEXT NOT NULL CHECK (org_size IN ('small', 'medium', 'large')),
  region TEXT NOT NULL CHECK (region != ''),
  hazard_category TEXT NOT NULL,
  hazard_name TEXT,
  risk_score NUMERIC NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  likelihood NUMERIC CHECK (likelihood >= 0 AND likelihood <= 100),
  severity NUMERIC CHECK (severity >= 0 AND severity <= 100),
  controls_implemented INT DEFAULT 0 CHECK (controls_implemented >= 0),
  assessed_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.benchmark_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  org_size TEXT,
  region TEXT,
  hazard_category TEXT,
  sample_size INT NOT NULL CHECK (sample_size >= 5),
  avg_risk_score NUMERIC,
  median_risk_score NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  top_3_hazards JSONB DEFAULT '[]',
  avg_controls_per_assessment NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(industry, org_size, region, hazard_category)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_data_agg ON public.benchmark_data(industry, org_size, region, hazard_category);
CREATE INDEX IF NOT EXISTS idx_benchmark_stats_lookup ON public.benchmark_statistics(industry, org_size, region);
CREATE INDEX IF NOT EXISTS idx_benchmark_data_assessed ON public.benchmark_data(assessed_at DESC);

-- Feature 3: Monte Carlo Simulation Tables
CREATE TABLE IF NOT EXISTS public.simulation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_category TEXT NOT NULL,
  hazard_name TEXT,
  region TEXT,
  template_name TEXT NOT NULL,
  description TEXT,
  default_parameters JSONB NOT NULL,
  source_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hazard_category, hazard_name, region, template_name)
);

CREATE TABLE IF NOT EXISTS public.monte_carlo_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  hazard_id UUID REFERENCES public.hazards(id),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  iterations INT DEFAULT 100000 CHECK (iterations >= 1000 AND iterations <= 1000000),
  time_horizon_years INT DEFAULT 1 CHECK (time_horizon_years > 0),
  frequency_distribution JSONB NOT NULL,
  severity_distribution JSONB,
  direct_cost_distribution JSONB NOT NULL,
  indirect_cost_distribution JSONB NOT NULL,
  downtime_distribution JSONB,
  results JSONB,
  eal_amount NUMERIC,
  eal_percentage NUMERIC,
  percentile_10 NUMERIC,
  percentile_50 NUMERIC,
  percentile_90 NUMERIC,
  var_95 NUMERIC,
  probability_exceeds_threshold JSONB,
  data_source TEXT CHECK (data_source IN ('ai_recommended', 'manual', 'template')),
  template_id UUID REFERENCES public.simulation_templates(id),
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low') OR ai_confidence IS NULL),
  ai_sources JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  execution_time_ms INT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_monte_carlo_assessment ON public.monte_carlo_simulations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_simulation_templates_hazard ON public.simulation_templates(hazard_category, hazard_name);

-- Feature 5: Incident Tracking Tables
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  hazard_id UUID REFERENCES public.hazards(id),
  title TEXT NOT NULL,
  description TEXT,
  incident_date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  location TEXT,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  downtime_hours NUMERIC,
  affected_employees INT,
  root_cause TEXT,
  lessons_learned TEXT,
  reported_by UUID,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_org ON public.incidents(org_id, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- Feature 6: Control Effectiveness Tables
CREATE TABLE IF NOT EXISTS public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  hazard_id UUID REFERENCES public.hazards(id),
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT NOT NULL CHECK (control_type IN ('preventive', 'detective', 'corrective', 'administrative')),
  implementation_status TEXT DEFAULT 'planned' CHECK (implementation_status IN ('planned', 'in_progress', 'implemented', 'verified')),
  effectiveness_rating NUMERIC CHECK (effectiveness_rating >= 0 AND effectiveness_rating <= 100),
  last_tested_at TIMESTAMPTZ,
  next_review_date DATE,
  responsible_party TEXT,
  cost_to_implement NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES public.controls(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  test_date DATE NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('walkthrough', 'observation', 'reperformance', 'inquiry')),
  result TEXT NOT NULL CHECK (result IN ('effective', 'partially_effective', 'ineffective')),
  findings TEXT,
  recommendations TEXT,
  tested_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_controls_org ON public.controls(org_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON public.control_tests(control_id, test_date DESC);

-- Feature 7: Executive Reports Tables
CREATE TABLE IF NOT EXISTS public.executive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('quarterly', 'annual', 'ad_hoc', 'board')),
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary JSONB NOT NULL,
  risk_overview JSONB,
  key_findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  generated_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executive_reports_org ON public.executive_reports(org_id, period_end DESC);

-- Enable RLS on all new tables
ALTER TABLE public.risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monte_carlo_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_predictions
CREATE POLICY "Users can view org predictions" ON public.risk_predictions
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org predictions" ON public.risk_predictions
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org predictions" ON public.risk_predictions
FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

-- RLS Policies for risk_alerts
CREATE POLICY "Users can view org alerts" ON public.risk_alerts
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org alerts" ON public.risk_alerts
FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org alerts" ON public.risk_alerts
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

-- RLS Policies for seasonal_patterns
CREATE POLICY "Anyone can view seasonal patterns" ON public.seasonal_patterns
FOR SELECT USING (true);

-- RLS Policies for benchmark_participation
CREATE POLICY "Users can view own participation" ON public.benchmark_participation
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can update participation" ON public.benchmark_participation
FOR UPDATE USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Admins can insert participation" ON public.benchmark_participation
FOR INSERT WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

-- RLS Policies for benchmark_statistics (public aggregated data)
CREATE POLICY "Anyone can view benchmark statistics" ON public.benchmark_statistics
FOR SELECT USING (sample_size >= 5);

-- RLS Policies for benchmark_data (completely private)
CREATE POLICY "No direct access to benchmark_data" ON public.benchmark_data
FOR SELECT USING (false);

-- RLS Policies for simulation_templates
CREATE POLICY "Anyone can view templates" ON public.simulation_templates
FOR SELECT USING (true);

-- RLS Policies for monte_carlo_simulations
CREATE POLICY "Users can view org simulations" ON public.monte_carlo_simulations
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org simulations" ON public.monte_carlo_simulations
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org simulations" ON public.monte_carlo_simulations
FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

-- RLS Policies for incidents
CREATE POLICY "Users can view org incidents" ON public.incidents
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org incidents" ON public.incidents
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org incidents" ON public.incidents
FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete incidents" ON public.incidents
FOR DELETE USING (has_org_role(auth.uid(), org_id, 'admin'));

-- RLS Policies for controls
CREATE POLICY "Users can view org controls" ON public.controls
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org controls" ON public.controls
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org controls" ON public.controls
FOR UPDATE USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete controls" ON public.controls
FOR DELETE USING (has_org_role(auth.uid(), org_id, 'admin'));

-- RLS Policies for control_tests
CREATE POLICY "Users can view org control tests" ON public.control_tests
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org control tests" ON public.control_tests
FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

-- RLS Policies for executive_reports
CREATE POLICY "Users can view org reports" ON public.executive_reports
FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can insert reports" ON public.executive_reports
FOR INSERT WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Admins can update reports" ON public.executive_reports
FOR UPDATE USING (has_org_role(auth.uid(), org_id, 'admin'));

-- Insert common seasonal patterns
INSERT INTO public.seasonal_patterns (hazard_type, region, peak_months, description, risk_multiplier) VALUES
('flooding', 'Ontario', ARRAY[3,4,5], 'Spring melt and heavy rainfall increase flooding risk in Ontario', 1.8),
('flooding', 'Quebec', ARRAY[3,4,5], 'Spring thaw and ice jams create elevated flood risk', 1.7),
('wildfire', 'British Columbia', ARRAY[6,7,8], 'Peak wildfire season in British Columbia', 2.0),
('wildfire', 'Alberta', ARRAY[6,7,8], 'Hot dry summer months increase wildfire danger', 2.0),
('ice_storm', 'Ontario', ARRAY[12,1,2], 'Winter ice storms common in Central Canada', 1.6),
('ice_storm', 'Quebec', ARRAY[12,1,2], 'Freezing rain and ice accumulation', 1.6),
('extreme_heat', 'all', ARRAY[7,8], 'Peak heat wave season across Canada', 1.4),
('snow_storm', 'all', ARRAY[12,1,2], 'Heavy snowfall and blizzard conditions', 1.3)
ON CONFLICT (hazard_type, region) DO NOTHING;

-- Insert common simulation templates
INSERT INTO public.simulation_templates (hazard_category, hazard_name, region, template_name, description, default_parameters, source_notes) VALUES
('Natural Disaster', 'Flooding', 'Ontario', 'Municipal Facility - Ontario', 'Standard flood risk for Ontario municipal buildings',
'{"frequency":{"type":"triangular","min":0.08,"mode":0.15,"max":0.3},"direct_cost":{"type":"triangular","min":50000,"mode":250000,"max":1200000},"indirect_cost":{"type":"triangular","min":20000,"mode":100000,"max":500000},"downtime":{"type":"triangular","min":3,"mode":14,"max":60}}',
'Based on Ontario municipal flood statistics'),
('Cybersecurity', 'Ransomware Attack', NULL, 'Canadian Public Sector', 'Ransomware risk for government/public entities',
'{"frequency":{"type":"triangular","min":0.3,"mode":0.6,"max":1.0},"direct_cost":{"type":"triangular","min":500000,"mode":2500000,"max":8000000},"indirect_cost":{"type":"triangular","min":100000,"mode":500000,"max":2000000},"downtime":{"type":"triangular","min":5,"mode":20,"max":60}}',
'IBM Cost of Data Breach 2024, Canadian Cyber Security Centre reports')
ON CONFLICT (hazard_category, hazard_name, region, template_name) DO NOTHING;

-- Function to enable realtime for risk_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_alerts;