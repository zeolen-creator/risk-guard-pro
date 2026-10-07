ALTER TABLE public.simulation_templates
  ADD COLUMN IF NOT EXISTS source_quality text NOT NULL DEFAULT 'illustrative'
    CHECK (source_quality IN ('illustrative', 'organization', 'published'));
ALTER TABLE public.simulation_templates
  ADD COLUMN IF NOT EXISTS source_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.simulation_templates.source_quality IS 'Provenance label for simulation assumptions.';
COMMENT ON COLUMN public.simulation_templates.source_urls IS 'Published references used as context for starting ranges.';
UPDATE public.simulation_templates SET source_quality = 'illustrative', source_urls = '["https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf"]'::jsonb WHERE hazard_category = 'Natural Disaster' AND source_quality = 'illustrative';
UPDATE public.simulation_templates SET source_quality = 'illustrative', source_urls = '["https://www.verizon.com/business/resources/T663/reports/2025-dbir-data-breach-investigations-report.pdf", "https://www.ibm.com/downloads/documents/us-en/107a02e95dc8f85c"]'::jsonb WHERE hazard_category = 'Cybersecurity' AND source_quality = 'illustrative';

