-- Membership is assigned by trusted server operations, never profile updates.
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (first_name, last_name, role_title, department, expertise)
  ON public.profiles TO authenticated;
REVOKE INSERT ON public.organizations FROM PUBLIC, anon, authenticated;
-- Keep the owner's organization settings editable but not its identity/owner.
REVOKE UPDATE ON public.organizations FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, sector, region, size, description, weights_configured,
  primary_location, key_facilities, industry_type, industry_sub_sectors,
  news_settings, risk_appetite_config, vulnerability_factors)
  ON public.organizations TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization(
  p_name TEXT, p_sector TEXT, p_region TEXT,
  p_size TEXT DEFAULT NULL, p_description TEXT DEFAULT NULL,
  p_primary_location TEXT DEFAULT NULL, p_key_facilities TEXT[] DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_profile public.profiles;
  v_org public.organizations;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(p_name)), 0) < 2
    OR coalesce(length(trim(p_sector)), 0) = 0
    OR coalesce(length(trim(p_region)), 0) = 0 THEN
    RAISE EXCEPTION 'Name, sector and region are required' USING ERRCODE = '22023';
  END IF;

  -- Serialize retries/double-clicks even for accounts missing a profile.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  INSERT INTO public.profiles (user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user FOR UPDATE;

  IF v_profile.org_id IS NOT NULL THEN
    SELECT * INTO v_org FROM public.organizations WHERE id = v_profile.org_id;
    IF v_org.owner_id IS DISTINCT FROM v_user THEN
      RAISE EXCEPTION 'Already a member of an organization' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Recover organizations left behind by the previous multi-request flow.
    SELECT * INTO v_org FROM public.organizations WHERE owner_id = v_user
      ORDER BY created_at, id LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.organizations
        (name, sector, region, size, description, owner_id, primary_location, key_facilities)
      VALUES (trim(p_name), trim(p_sector), trim(p_region), p_size, p_description,
        v_user, p_primary_location, p_key_facilities)
      RETURNING * INTO v_org;
    END IF;
  END IF;

  UPDATE public.profiles SET org_id = v_org.id WHERE user_id = v_user;
  INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (v_user, v_org.id, 'admin')
    ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'admin';
  INSERT INTO public.subscriptions (org_id, plan_type, assessments_limit)
    SELECT v_org.id, 'free', 1
    WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE org_id = v_org.id);
  RETURN v_org;
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[])
  TO authenticated;

-- Defense in depth: organization-scoped rows must stay in the caller's org,
-- including policies that otherwise allow a record creator to update/delete.
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
    JOIN pg_tables p ON p.schemaname = c.table_schema AND p.tablename = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'org_id'
      AND p.rowsecurity AND c.table_name <> 'profiles'
  LOOP
    EXECUTE format(
      'CREATE POLICY organization_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      || 'USING (org_id IS NULL OR public.user_belongs_to_org(auth.uid(), org_id)) '
      || 'WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id))', t.table_name);
  END LOOP;
END;
$$;

-- Maintenance is not a user-facing RPC.
REVOKE ALL ON FUNCTION public.release_stale_assignments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_assignments() TO service_role;

-- Authorize the existing SECURITY DEFINER activation RPC.
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
  IF auth.uid() IS NULL OR NOT public.user_belongs_to_org(auth.uid(), p_org_id)
    OR NOT public.has_org_role(auth.uid(), p_org_id, 'admin') THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id = p_org_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.weighting_final_weights
    WHERE org_id = p_org_id AND version = p_new_version) THEN
    RAISE EXCEPTION 'Weight version not found' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.weighting_final_weights
    WHERE org_id = p_org_id AND version = p_new_version AND is_active) THEN
    RETURN;
  END IF;
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
REVOKE ALL ON FUNCTION public.activate_weighting_weights(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_weighting_weights(UUID, INT) TO authenticated;
