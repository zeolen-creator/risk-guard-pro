CREATE TABLE public.ai_tool_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL,
 status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
 model text NOT NULL,
 method_version text NOT NULL,
 output jsonb,
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK (status <> 'completed' OR (output IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX ai_tool_runs_org_date ON public.ai_tool_runs(org_id, created_at DESC);
CREATE INDEX ai_tool_runs_user_date ON public.ai_tool_runs(created_by, created_at DESC);
CREATE UNIQUE INDEX ai_tool_runs_active ON public.ai_tool_runs(created_by) WHERE status = 'running';
ALTER TABLE public.ai_tool_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_tool_runs FROM anon, authenticated;
GRANT SELECT ON public.ai_tool_runs TO authenticated;
GRANT ALL ON public.ai_tool_runs TO service_role;
CREATE POLICY "Organization AI audit access" ON public.ai_tool_runs FOR SELECT TO authenticated
 USING (public.user_belongs_to_org(auth.uid(), org_id));
-- Earlier caches lack evidence/method/profile identity. New endpoints never read them.
-- Earlier shared climate outputs are retained for history but not used as new evidence.
ALTER TABLE public.weighting_sessions ADD COLUMN input_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.weighting_ai_synthesis ADD COLUMN input_revision bigint;
-- Unknown billing/usage is represented as NULL, never as an invented fixed charge.
ALTER TABLE public.weighting_ai_synthesis ALTER COLUMN ai_prompt_tokens DROP NOT NULL;
ALTER TABLE public.weighting_ai_synthesis ALTER COLUMN ai_response_tokens DROP NOT NULL;
ALTER TABLE public.weighting_ai_synthesis ALTER COLUMN ai_total_cost_usd DROP NOT NULL;
CREATE FUNCTION public.invalidate_weighting_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE sid uuid; state text;
BEGIN
 sid := CASE WHEN TG_OP='DELETE' THEN OLD.session_id ELSE NEW.session_id END;
 SELECT status INTO state FROM weighting_sessions WHERE id=sid FOR UPDATE;
 IF state IN ('approved','archived') THEN RAISE EXCEPTION 'Start a new session to change approved evidence'; END IF;
 UPDATE weighting_sessions SET input_revision=input_revision+1, layer5_completed=false WHERE id=sid;
 UPDATE weighting_ai_synthesis SET all_checks_passed=false WHERE session_id=sid;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER invalidate_questionnaire AFTER INSERT OR UPDATE OR DELETE ON public.weighting_questionnaire_responses FOR EACH ROW EXECUTE FUNCTION public.invalidate_weighting_evidence();
CREATE TRIGGER invalidate_ahp AFTER INSERT OR UPDATE OR DELETE ON public.weighting_ahp_matrix FOR EACH ROW EXECUTE FUNCTION public.invalidate_weighting_evidence();
CREATE TRIGGER invalidate_scenarios AFTER INSERT OR UPDATE OR DELETE ON public.weighting_scenario_validations FOR EACH ROW EXECUTE FUNCTION public.invalidate_weighting_evidence();
CREATE TRIGGER invalidate_regulatory AFTER INSERT OR UPDATE OR DELETE ON public.weighting_regulatory_research FOR EACH ROW EXECUTE FUNCTION public.invalidate_weighting_evidence();
CREATE TRIGGER invalidate_mission AFTER INSERT OR UPDATE OR DELETE ON public.weighting_mission_analysis FOR EACH ROW EXECUTE FUNCTION public.invalidate_weighting_evidence();
CREATE FUNCTION public.check_weighting_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE revision bigint;
BEGIN
 IF NEW.consistency_checks->>'method_version'='hira-evidence-v2' AND NEW.all_checks_passed THEN
  SELECT input_revision INTO revision FROM weighting_sessions WHERE id=NEW.session_id FOR UPDATE;
  IF NEW.input_revision IS DISTINCT FROM revision THEN RAISE EXCEPTION 'Evidence changed during synthesis; regenerate'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_weighting_revision BEFORE INSERT OR UPDATE ON public.weighting_ai_synthesis FOR EACH ROW EXECUTE FUNCTION public.check_weighting_revision();
CREATE FUNCTION public.check_weighting_acceptance() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE syn public.weighting_ai_synthesis;
BEGIN
 IF NEW.layer5_completed AND (NOT OLD.layer5_completed OR NEW.status IS DISTINCT FROM OLD.status) THEN
  SELECT * INTO syn FROM weighting_ai_synthesis WHERE session_id=NEW.id;
  IF syn.consistency_checks->>'method_version'='hira-evidence-v2' AND (NOT coalesce(syn.all_checks_passed,false) OR syn.input_revision IS DISTINCT FROM NEW.input_revision) THEN
   RAISE EXCEPTION 'Evidence changed; regenerate synthesis before acceptance';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_weighting_acceptance BEFORE UPDATE ON public.weighting_sessions FOR EACH ROW EXECUTE FUNCTION public.check_weighting_acceptance();
