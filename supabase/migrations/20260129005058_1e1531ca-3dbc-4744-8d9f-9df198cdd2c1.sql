-- ═══════════════════════════════════════════════════════════════
-- PHASE 1: HIRA PRO FEATURE ADDITIONS - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. INDUSTRY TEMPLATES
-- ═══════════════════════════════════════════════════════════════

-- Store reusable industry-specific templates
CREATE TABLE public.industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry_type TEXT NOT NULL,
  description TEXT,
  hazard_count INTEGER DEFAULT 0,
  is_system_provided BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template hazards (many-to-many linking)
CREATE TABLE public.template_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.industry_templates(id) ON DELETE CASCADE,
  hazard_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  typical_probability_range TEXT,
  typical_consequence_areas JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_hazards_template ON public.template_hazards(template_id);

-- Enable RLS
ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_hazards ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view system templates
CREATE POLICY "Anyone can view industry templates" 
ON public.industry_templates FOR SELECT 
USING (is_system_provided = true);

CREATE POLICY "Anyone can view template hazards" 
ON public.template_hazards FOR SELECT 
USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 2. HAZARD INFORMATION SHEETS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.hazard_information_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_name TEXT NOT NULL,
  hazard_category TEXT NOT NULL,
  definition TEXT NOT NULL,
  common_causes TEXT[],
  warning_signs TEXT[],
  response_actions TEXT[],
  external_resources JSONB DEFAULT '[]'::jsonb,
  industry_notes JSONB DEFAULT '{}'::jsonb,
  is_system_provided BOOLEAN DEFAULT true,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hazard_info_name ON public.hazard_information_sheets(hazard_name);
CREATE INDEX idx_hazard_info_org ON public.hazard_information_sheets(org_id);

ALTER TABLE public.hazard_information_sheets ENABLE ROW LEVEL SECURITY;

-- System sheets are visible to all, org-specific to org members
CREATE POLICY "Anyone can view system info sheets" 
ON public.hazard_information_sheets FOR SELECT 
USING (is_system_provided = true OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org info sheets" 
ON public.hazard_information_sheets FOR INSERT 
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org info sheets" 
ON public.hazard_information_sheets FOR UPDATE 
USING (user_belongs_to_org(auth.uid(), org_id));

-- ═══════════════════════════════════════════════════════════════
-- 3. MITIGATION STRATEGIES LIBRARY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.mitigation_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name TEXT NOT NULL,
  hazard_category TEXT NOT NULL,
  description TEXT,
  implementation_complexity TEXT CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  typical_timeframe_days_min INTEGER,
  typical_timeframe_days_max INTEGER,
  effectiveness_notes TEXT,
  prerequisites TEXT[],
  ongoing_maintenance_notes TEXT,
  is_system_provided BOOLEAN DEFAULT true,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mitigation_strategies_category ON public.mitigation_strategies(hazard_category);
CREATE INDEX idx_mitigation_strategies_org ON public.mitigation_strategies(org_id);

-- Organization-specific mitigation implementations
CREATE TABLE public.organization_mitigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  hazard_id UUID,
  mitigation_strategy_id UUID REFERENCES public.mitigation_strategies(id),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'rejected')),
  estimated_cost DECIMAL(12,2),
  expected_risk_reduction_percent INTEGER CHECK (expected_risk_reduction_percent >= 0 AND expected_risk_reduction_percent <= 100),
  annual_loss_estimate DECIMAL(12,2),
  implementation_start_date DATE,
  implementation_completion_date DATE,
  roi_score DECIMAL(10,2),
  priority_rank INTEGER,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_mitigations_org ON public.organization_mitigations(org_id);
CREATE INDEX idx_org_mitigations_status ON public.organization_mitigations(status);
CREATE INDEX idx_org_mitigations_assessment ON public.organization_mitigations(assessment_id);

ALTER TABLE public.mitigation_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_mitigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system strategies" 
ON public.mitigation_strategies FOR SELECT 
USING (is_system_provided = true OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org strategies" 
ON public.mitigation_strategies FOR INSERT 
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can view org mitigations" 
ON public.organization_mitigations FOR SELECT 
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org mitigations" 
ON public.organization_mitigations FOR INSERT 
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org mitigations" 
ON public.organization_mitigations FOR UPDATE 
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete org mitigations" 
ON public.organization_mitigations FOR DELETE 
USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 4. HISTORICAL EVENTS DATABASE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.historical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  hazard_name TEXT NOT NULL,
  hazard_category TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  financial_impact DECIMAL(12,2),
  downtime_hours INTEGER,
  people_affected INTEGER,
  injuries INTEGER DEFAULT 0,
  fatalities INTEGER DEFAULT 0,
  response_effectiveness TEXT CHECK (response_effectiveness IN ('poor', 'fair', 'good', 'excellent')),
  lessons_learned TEXT,
  improvements_implemented TEXT[],
  incident_report_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historical_events_org ON public.historical_events(org_id);
CREATE INDEX idx_historical_events_hazard ON public.historical_events(hazard_name);
CREATE INDEX idx_historical_events_date ON public.historical_events(event_date DESC);

ALTER TABLE public.historical_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org historical events" 
ON public.historical_events FOR SELECT 
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org historical events" 
ON public.historical_events FOR INSERT 
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update org historical events" 
ON public.historical_events FOR UPDATE 
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete org historical events" 
ON public.historical_events FOR DELETE 
USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 5. SEED INDUSTRY TEMPLATES
-- ═══════════════════════════════════════════════════════════════

-- Healthcare Template
INSERT INTO public.industry_templates (name, industry_type, description, hazard_count) VALUES
('Healthcare & Medical', 'healthcare', 'Pre-configured hazards for hospitals, clinics, and medical facilities focusing on patient safety, infectious disease, and medical equipment', 25);

-- Government Template
INSERT INTO public.industry_templates (name, industry_type, description, hazard_count) VALUES
('Government & Public Sector', 'government', 'Hazards for government agencies focusing on public services, infrastructure, and emergency response', 22);

-- Manufacturing Template
INSERT INTO public.industry_templates (name, industry_type, description, hazard_count) VALUES
('Manufacturing & Industrial', 'manufacturing', 'Industrial hazards focusing on production, supply chain, and workplace safety', 24);

-- Education Template
INSERT INTO public.industry_templates (name, industry_type, description, hazard_count) VALUES
('Education & Academia', 'education', 'School and university hazards focusing on student safety, facility operations, and academic continuity', 20);

-- Retail/Hospitality Template
INSERT INTO public.industry_templates (name, industry_type, description, hazard_count) VALUES
('Retail, Hospitality & Services', 'retail', 'Customer-facing business hazards focusing on customer safety, operations, and reputation', 18);

-- ═══════════════════════════════════════════════════════════════
-- 6. SEED HAZARD INFORMATION SHEETS (Sample)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.hazard_information_sheets (hazard_name, hazard_category, definition, common_causes, warning_signs, response_actions, external_resources) VALUES
('Power Outage', 'Infrastructure Failure', 'Loss of electrical power supply affecting operations, safety systems, and essential services.', 
  ARRAY['Severe weather events', 'Equipment failure', 'Grid overload', 'Planned maintenance', 'Cyber attacks on grid infrastructure'],
  ARRAY['Voltage fluctuations', 'Utility weather alerts', 'Scheduled maintenance notices', 'Flickering lights', 'Equipment malfunctions'],
  ARRAY['Activate backup power systems', 'Assess critical systems status', 'Notify stakeholders and authorities', 'Document incident timeline', 'Implement emergency lighting'],
  '[{"name": "Ready.gov Power Outages", "url": "https://www.ready.gov/power-outages"}, {"name": "Red Cross Power Outage Safety", "url": "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/power-outage.html"}]'::jsonb),

('Flood', 'Natural Hazards', 'Overflow of water onto normally dry land, potentially causing property damage, service disruption, and safety hazards.',
  ARRAY['Heavy rainfall', 'Storm surge', 'Dam failure', 'Rapid snowmelt', 'Poor drainage systems', 'Climate change impacts'],
  ARRAY['Weather alerts and warnings', 'Rising water levels', 'Saturated ground', 'Drainage backing up', 'Nearby river level changes'],
  ARRAY['Evacuate affected areas', 'Shut off utilities if safe', 'Move critical assets to higher ground', 'Document damage for insurance', 'Contact emergency services'],
  '[{"name": "FEMA Flood Resources", "url": "https://www.fema.gov/flood-insurance"}, {"name": "FloodSmart", "url": "https://www.floodsmart.gov/"}]'::jsonb),

('Cyber Attack', 'Technology Hazards', 'Malicious attempt to damage, disrupt, or gain unauthorized access to computer systems, networks, or data.',
  ARRAY['Phishing attacks', 'Ransomware', 'Insider threats', 'Unpatched vulnerabilities', 'Social engineering', 'Supply chain compromise'],
  ARRAY['Unusual network activity', 'Failed login attempts', 'System performance degradation', 'Unexpected pop-ups', 'Missing or encrypted files'],
  ARRAY['Isolate affected systems', 'Activate incident response team', 'Preserve evidence', 'Notify authorities if required', 'Communicate with stakeholders'],
  '[{"name": "CISA Cybersecurity Resources", "url": "https://www.cisa.gov/cybersecurity"}, {"name": "NIST Cybersecurity Framework", "url": "https://www.nist.gov/cyberframework"}]'::jsonb),

('Pandemic/Epidemic', 'Public Health', 'Widespread outbreak of infectious disease affecting workforce, operations, and community.',
  ARRAY['Novel pathogen emergence', 'International travel', 'Animal-to-human transmission', 'Inadequate public health response', 'Vaccine hesitancy'],
  ARRAY['WHO/CDC alerts', 'Local outbreak reports', 'Increased absenteeism', 'Healthcare system strain', 'Travel advisories'],
  ARRAY['Activate pandemic response plan', 'Implement remote work where possible', 'Enhance sanitation protocols', 'Monitor employee health', 'Coordinate with public health authorities'],
  '[{"name": "WHO Pandemic Information", "url": "https://www.who.int/emergencies"}, {"name": "CDC Pandemic Preparedness", "url": "https://www.cdc.gov/flu/pandemic-resources/index.htm"}]'::jsonb),

('Earthquake', 'Natural Hazards', 'Sudden ground shaking caused by movement of tectonic plates, potentially causing structural damage and casualties.',
  ARRAY['Tectonic plate movement', 'Fault line activity', 'Induced seismicity from human activities'],
  ARRAY['Seismic monitoring alerts', 'Foreshocks', 'Animal behavior changes', 'Ground water level changes'],
  ARRAY['Drop, cover, and hold on', 'Evacuate damaged buildings', 'Check for injuries', 'Shut off utilities if damaged', 'Prepare for aftershocks'],
  '[{"name": "USGS Earthquake Hazards", "url": "https://earthquake.usgs.gov/"}, {"name": "Earthquake Country Alliance", "url": "https://www.earthquakecountry.org/"}]'::jsonb);

-- ═══════════════════════════════════════════════════════════════
-- 7. SEED MITIGATION STRATEGIES (Generic frameworks)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.mitigation_strategies (strategy_name, hazard_category, description, implementation_complexity, typical_timeframe_days_min, typical_timeframe_days_max, effectiveness_notes, prerequisites) VALUES
('Implement Backup Power Systems', 'Infrastructure Failure', 'Install and maintain backup generators or UPS systems to ensure continuity during power outages.', 'high', 30, 180, 'Highly effective for critical operations; requires regular testing and fuel management.', ARRAY['Assess power requirements', 'Budget approval', 'Electrical infrastructure evaluation']),
('Develop Business Continuity Plan', 'All Hazards', 'Create comprehensive plan documenting critical functions, recovery procedures, and communication protocols.', 'medium', 30, 90, 'Foundation for all hazard response; effectiveness depends on regular updates and training.', ARRAY['Stakeholder buy-in', 'Business impact analysis', 'Resource inventory']),
('Conduct Regular Training Drills', 'All Hazards', 'Schedule and execute periodic emergency response exercises for staff at all levels.', 'low', 7, 30, 'Significantly improves response time and reduces panic; must be realistic and debriefed.', ARRAY['Written procedures', 'Trained drill coordinators', 'Evaluation criteria']),
('Enhance Physical Security', 'Security Hazards', 'Upgrade access controls, surveillance, and perimeter security measures.', 'high', 60, 180, 'Deters and detects threats; requires ongoing monitoring and maintenance.', ARRAY['Security assessment', 'Budget allocation', 'Vendor selection']),
('Implement Cybersecurity Controls', 'Technology Hazards', 'Deploy multi-layered security including firewalls, encryption, MFA, and endpoint protection.', 'high', 30, 120, 'Essential baseline protection; requires continuous monitoring and updates.', ARRAY['IT security assessment', 'Policy development', 'Staff training']),
('Establish Redundant Systems', 'Infrastructure Failure', 'Create backup systems for critical operations including data, communications, and facilities.', 'high', 60, 180, 'Provides continuity during failures; requires regular synchronization and testing.', ARRAY['Identify critical systems', 'Budget approval', 'Technical architecture']),
('Purchase Insurance Coverage', 'All Hazards', 'Obtain appropriate insurance policies to transfer financial risk from potential hazards.', 'low', 14, 60, 'Provides financial recovery but not operational continuity; review coverage annually.', ARRAY['Risk assessment', 'Coverage gap analysis', 'Broker consultation']),
('Develop Emergency Communication Plan', 'All Hazards', 'Establish protocols and systems for internal and external communication during emergencies.', 'medium', 14, 45, 'Critical for coordination and public trust; requires multiple communication channels.', ARRAY['Contact lists', 'Communication templates', 'Backup systems']);