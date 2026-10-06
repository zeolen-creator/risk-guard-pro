-- Keep AI decimal percentages intact in the table read by assessment scoring.
ALTER TABLE public.consequence_weights ALTER COLUMN weight TYPE numeric(5,2);

CREATE FUNCTION public.consequence_weight_key(label text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path = public AS $$
  SELECT CASE regexp_replace(lower(label), '[^a-z0-9]', '', 'g')
    WHEN 'fatalities' THEN 'Fatalities'
    WHEN 'injuries' THEN 'Injuries' WHEN 'injuriesillness' THEN 'Injuries' WHEN 'injuriesandillness' THEN 'Injuries'
    WHEN 'displacement' THEN 'Displacement'
    WHEN 'psychosocial' THEN 'Psychosocial_Impact' WHEN 'psychosocialimpact' THEN 'Psychosocial_Impact' WHEN 'psychosocialimpacts' THEN 'Psychosocial_Impact'
    WHEN 'supportsystems' THEN 'Support_System_Impact' WHEN 'supportsystem' THEN 'Support_System_Impact'
    WHEN 'supportsystemimpact' THEN 'Support_System_Impact' WHEN 'supportsystemsimpact' THEN 'Support_System_Impact'
    WHEN 'propertydamage' THEN 'Property_Damage'
    WHEN 'infrastructure' THEN 'Infrastructure_Impact' WHEN 'infrastructureimpact' THEN 'Infrastructure_Impact'
    WHEN 'environmental' THEN 'Environmental_Damage' WHEN 'environmentaldamage' THEN 'Environmental_Damage' WHEN 'environmentalimpact' THEN 'Environmental_Damage'
    WHEN 'economic' THEN 'Economic_Impact' WHEN 'economicimpact' THEN 'Economic_Impact'
    WHEN 'reputational' THEN 'Reputational_Impact' WHEN 'reputationalimpact' THEN 'Reputational_Impact'
  END
$$;

CREATE FUNCTION public.validate_named_weights(input jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE item record; k text; w numeric; result jsonb := '{}'; total numeric := 0;
BEGIN
  IF input IS NULL OR jsonb_typeof(input) <> 'object' THEN RAISE EXCEPTION 'Weights must be an object'; END IF;
  FOR item IN SELECT * FROM jsonb_each(input) LOOP
    k := public.consequence_weight_key(item.key);
    IF k IS NULL OR result ? k OR jsonb_typeof(item.value) <> 'number' THEN
      RAISE EXCEPTION 'Unknown, duplicate or nonnumeric consequence weight';
    END IF;
    w := item.value::text::numeric;
    IF w < 0 OR w > 100 OR w <> round(w, 2) THEN RAISE EXCEPTION 'Weights must be percentages with at most two decimals'; END IF;
    result := result || jsonb_build_object(k, w); total := total + w;
  END LOOP;
  IF (SELECT count(*) FROM jsonb_object_keys(result)) <> 10 OR total <> 100 THEN
    RAISE EXCEPTION 'All ten weights must sum to exactly 100';
  END IF;
  RETURN result;
END $$;

-- Called only inside the authorized transaction below (or the manual save RPC).
CREATE FUNCTION public.archive_active_weights(p_org_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.weighting_weight_versions (
    org_id, session_id, version, weights_json, fatalities_weight, injuries_weight,
    displacement_weight, psychosocial_weight, support_system_weight, property_damage_weight,
    infrastructure_weight, environmental_weight, economic_impact_weight, reputational_weight,
    was_active_from, was_active_until, set_by, approved_by, archive_reason)
  SELECT org_id, session_id, version, weights_json, fatalities_weight, injuries_weight,
    displacement_weight, psychosocial_weight, support_system_weight, property_damage_weight,
    infrastructure_weight, environmental_weight, economic_impact_weight, reputational_weight,
    set_at, now(), set_by, approved_by, 'replaced'
  FROM public.weighting_final_weights WHERE org_id = p_org_id AND is_active
  ON CONFLICT (org_id, version) DO NOTHING;
  UPDATE public.weighting_final_weights SET is_active = false, status = 'archived'
    WHERE org_id = p_org_id AND is_active;
END $$;
REVOKE ALL ON FUNCTION public.archive_active_weights(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_weighting_weights(p_org_id uuid, p_new_version int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.weighting_final_weights; weights jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_belongs_to_org(auth.uid(), p_org_id)
    OR NOT public.has_org_role(auth.uid(), p_org_id, 'admin') THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id = p_org_id FOR UPDATE;
  SELECT * INTO target FROM public.weighting_final_weights WHERE org_id = p_org_id AND version = p_new_version;
  IF NOT FOUND OR target.approved_by IS NULL OR target.status NOT IN ('approved', 'archived') THEN
    RAISE EXCEPTION 'Approved weight version not found';
  END IF;
  weights := public.validate_named_weights(target.weights_json);
  -- Resolve by explicit names, never by row order or guessed category numbers.
  IF (SELECT count(*) FROM public.consequences) <> 10
    OR (SELECT count(DISTINCT public.consequence_weight_key(category)) FROM public.consequences) <> 10 THEN
    RAISE EXCEPTION 'Consequence catalog must contain each of the ten supported categories exactly once';
  END IF;
  IF NOT target.is_active THEN PERFORM public.archive_active_weights(p_org_id); END IF;
  DELETE FROM public.consequence_weights WHERE org_id = p_org_id;
  INSERT INTO public.consequence_weights (org_id, consequence_id, weight)
    SELECT p_org_id, id, (weights ->> public.consequence_weight_key(category))::numeric FROM public.consequences;
  UPDATE public.weighting_final_weights SET is_active = true, status = 'approved'
    WHERE id = target.id;
  UPDATE public.organizations SET weights_configured = true WHERE id = p_org_id;
END $$;

CREATE FUNCTION public.approve_weighting_session(
  p_session_id uuid, p_expected_weights jsonb, p_notes text DEFAULT NULL
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.weighting_sessions; w jsonb; approver uuid; next_version int; prior_version int;
BEGIN
  SELECT * INTO s FROM public.weighting_sessions WHERE id = p_session_id;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.user_belongs_to_org(auth.uid(), s.org_id)
    OR NOT public.has_org_role(auth.uid(), s.org_id, 'admin') THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id = s.org_id FOR UPDATE;
  SELECT * INTO s FROM public.weighting_sessions WHERE id = p_session_id FOR UPDATE;
  SELECT id INTO approver FROM public.profiles WHERE user_id = auth.uid() AND org_id = s.org_id;
  -- Retry after a lost response is a no-op, not an extra version or reactivation.
  SELECT version INTO prior_version FROM public.weighting_final_weights
    WHERE session_id = p_session_id AND org_id = s.org_id AND approved_by IS NOT NULL ORDER BY version DESC LIMIT 1;
  IF prior_version IS NOT NULL THEN RETURN prior_version; END IF;
  IF NOT s.layer5_completed OR s.status <> 'completed' THEN RAISE EXCEPTION 'Accept the saved synthesis before approval'; END IF;
  SELECT recommended_weights INTO w FROM public.weighting_ai_synthesis WHERE session_id = p_session_id FOR UPDATE;
  w := public.validate_named_weights(w);
  IF w IS DISTINCT FROM public.validate_named_weights(p_expected_weights) THEN
    RAISE EXCEPTION 'Recommendations changed. Reload and review before approving';
  END IF;
  SELECT coalesce(max(version), 0) + 1 INTO next_version FROM public.weighting_final_weights WHERE org_id = s.org_id;
  INSERT INTO public.weighting_final_weights (
    org_id, session_id, version, weights_json, fatalities_weight, injuries_weight,
    displacement_weight, psychosocial_weight, support_system_weight, property_damage_weight,
    infrastructure_weight, environmental_weight, economic_impact_weight, reputational_weight,
    set_by, approved_by, approved_at, approval_notes, status)
  VALUES (s.org_id, s.id, next_version, w,
    (w->>'Fatalities')::numeric, (w->>'Injuries')::numeric, (w->>'Displacement')::numeric,
    (w->>'Psychosocial_Impact')::numeric, (w->>'Support_System_Impact')::numeric,
    (w->>'Property_Damage')::numeric, (w->>'Infrastructure_Impact')::numeric,
    (w->>'Environmental_Damage')::numeric, (w->>'Economic_Impact')::numeric,
    (w->>'Reputational_Impact')::numeric, approver, approver, now(), p_notes, 'approved');
  PERFORM public.activate_weighting_weights(s.org_id, next_version);
  UPDATE public.weighting_sessions SET status = 'approved', approved_by = approver, approved_at = now()
    WHERE id = s.id;
  RETURN next_version;
END $$;
REVOKE ALL ON FUNCTION public.approve_weighting_session(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_weighting_session(uuid, jsonb, text) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.weighting_final_weights FROM anon, authenticated;

-- Manual setup must also be atomic and must not leave an AI version marked active.
CREATE FUNCTION public.save_consequence_weights(p_weights jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := public.get_user_org_id(auth.uid()); total numeric; item record;
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT public.has_org_role(auth.uid(), org, 'admin') THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id = org FOR UPDATE;
  IF p_weights IS NULL OR jsonb_typeof(p_weights) <> 'object' THEN RAISE EXCEPTION 'Weights must be an object'; END IF;
  total := 0;
  FOR item IN SELECT * FROM jsonb_each(p_weights) LOOP
    IF jsonb_typeof(item.value) <> 'number' OR item.value::text::numeric NOT BETWEEN 0 AND 100
      OR item.value::text::numeric <> round(item.value::text::numeric, 2)
      OR NOT EXISTS (SELECT 1 FROM public.consequences WHERE id::text = item.key) THEN
      RAISE EXCEPTION 'Invalid consequence weight';
    END IF;
    total := total + item.value::text::numeric;
  END LOOP;
  IF total <> 100 OR (SELECT count(*) FROM jsonb_object_keys(p_weights)) <> (SELECT count(*) FROM public.consequences) THEN
    RAISE EXCEPTION 'Every consequence must be included and weights must sum to 100';
  END IF;
  PERFORM public.archive_active_weights(org);
  DELETE FROM public.consequence_weights WHERE org_id = org;
  INSERT INTO public.consequence_weights (org_id, consequence_id, weight)
    SELECT org, key::uuid, value::text::numeric FROM jsonb_each(p_weights);
  UPDATE public.organizations SET weights_configured = true WHERE id = org;
END $$;
REVOKE ALL ON FUNCTION public.save_consequence_weights(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_consequence_weights(jsonb) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.consequence_weights FROM anon, authenticated;

-- Each assessment keeps the weights in force when it is first created.
CREATE FUNCTION public.snapshot_assessment_weights() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.weights IS NULL OR NEW.weights = '{}'::jsonb) THEN
    SELECT coalesce(jsonb_object_agg(consequence_id::text, weight), '{}'::jsonb)
      INTO NEW.weights FROM public.consequence_weights WHERE org_id = NEW.org_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.weights IS NOT NULL AND OLD.weights <> '{}'::jsonb
    AND NEW.weights IS DISTINCT FROM OLD.weights THEN
    RAISE EXCEPTION 'Assessment weights are a saved snapshot and cannot be replaced';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER snapshot_assessment_weights BEFORE INSERT OR UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_assessment_weights();

-- Synthesis recommendations for an approved session are part of its audit trail.
CREATE FUNCTION public.guard_approved_synthesis() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE session_status text;
BEGIN
  SELECT status INTO session_status FROM public.weighting_sessions WHERE id = NEW.session_id FOR UPDATE;
  IF session_status IN ('approved', 'archived') THEN RAISE EXCEPTION 'Start a new session to change approved recommendations'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_approved_synthesis BEFORE INSERT OR UPDATE ON public.weighting_ai_synthesis
  FOR EACH ROW EXECUTE FUNCTION public.guard_approved_synthesis();

CREATE FUNCTION public.create_weighting_session() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := public.get_user_org_id(auth.uid()); profile_id uuid; result uuid;
BEGIN
  IF auth.uid() IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organization membership required' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organizations WHERE id = org FOR UPDATE;
  SELECT id INTO profile_id FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.weighting_sessions (org_id, created_by, version)
    SELECT org, profile_id, coalesce(max(version), 0) + 1 FROM public.weighting_sessions WHERE org_id = org
    RETURNING id INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_weighting_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_weighting_session() TO authenticated;
