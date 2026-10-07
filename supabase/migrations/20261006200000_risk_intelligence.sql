-- Evidence snapshots stay separate from approved assessments and legacy forecasts.
CREATE TABLE public.risk_intelligence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN ('scenarios', 'outlook', 'report')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  request jsonb NOT NULL,
  context_snapshot jsonb NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]',
  output jsonb,
  research_text text,
  error_message text,
  model text NOT NULL,
  method_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (status <> 'completed' OR (output IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX risk_intelligence_org_created ON public.risk_intelligence_runs (org_id, created_at DESC);
CREATE UNIQUE INDEX risk_intelligence_one_active_user ON public.risk_intelligence_runs (created_by) WHERE status = 'running';
ALTER TABLE public.risk_intelligence_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.risk_intelligence_runs FROM anon, authenticated;
GRANT SELECT ON public.risk_intelligence_runs TO authenticated;
GRANT ALL ON public.risk_intelligence_runs TO service_role;
CREATE POLICY "Members can read their organization's evidence runs"
  ON public.risk_intelligence_runs FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
-- Only the authenticated server workflow can create or change provenance/results.
