-- ============================================================
-- PHASE 1: Database Schema Extensions for AI Research & Multi-Org Collaboration
-- ============================================================

-- 1. Add new columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS primary_location TEXT,
ADD COLUMN IF NOT EXISTS key_facilities TEXT[];

-- 2. Add new columns to profiles table for user context
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS specific_facilities TEXT[],
ADD COLUMN IF NOT EXISTS special_considerations TEXT;

-- ============================================================
-- 3. Create hazard_assignments table (Multi-User Workflow)
-- Tracks who is working on which hazard to prevent collisions
-- ============================================================
CREATE TABLE public.hazard_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'released')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  -- Prevent duplicate assignments: one user per hazard per assessment
  UNIQUE (assessment_id, hazard_id)
);

-- Enable RLS
ALTER TABLE public.hazard_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hazard_assignments
CREATE POLICY "Users can view org hazard assignments"
ON public.hazard_assignments
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert own hazard assignments"
ON public.hazard_assignments
FOR INSERT
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id) AND
  assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Users can update own or admins can update any"
ON public.hazard_assignments
FOR UPDATE
USING (
  assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) OR
  has_org_role(auth.uid(), org_id, 'admin'::app_role)
);

CREATE POLICY "Users can delete own or admins can delete any"
ON public.hazard_assignments
FOR DELETE
USING (
  assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) OR
  has_org_role(auth.uid(), org_id, 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_hazard_assignments_updated_at
BEFORE UPDATE ON public.hazard_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. Create ai_research_cache table (AI Cost Optimization)
-- Caches AI research results to avoid redundant API calls
-- ============================================================
CREATE TABLE public.ai_research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hazard_type TEXT NOT NULL,
  research_type TEXT NOT NULL CHECK (research_type IN ('probability', 'consequence')),
  location TEXT,
  industry TEXT,
  query_params JSONB NOT NULL DEFAULT '{}',
  result_data JSONB NOT NULL DEFAULT '{}',
  sources JSONB NOT NULL DEFAULT '[]',
  confidence_level NUMERIC(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  hit_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ai_research_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_research_cache
CREATE POLICY "Users can view org ai research cache"
ON public.ai_research_cache
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert org ai research cache"
ON public.ai_research_cache
FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can delete org ai research cache"
ON public.ai_research_cache
FOR DELETE
USING (has_org_role(auth.uid(), org_id, 'admin'::app_role));

-- Index for efficient cache lookups
CREATE INDEX idx_ai_research_cache_key ON public.ai_research_cache(cache_key);
CREATE INDEX idx_ai_research_cache_lookup ON public.ai_research_cache(org_id, hazard_type, research_type);

-- ============================================================
-- 5. Create ai_research_logs table (Audit Trail)
-- Logs all AI interactions for compliance and debugging
-- ============================================================
CREATE TABLE public.ai_research_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  hazard_id UUID REFERENCES public.hazards(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('probability', 'consequence', 'general')),
  request_params JSONB NOT NULL DEFAULT '{}',
  response_data JSONB,
  sources_found INTEGER DEFAULT 0,
  confidence_score NUMERIC(3,2),
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_research_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_research_logs
CREATE POLICY "Users can view org ai research logs"
ON public.ai_research_logs
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can insert own ai research logs"
ON public.ai_research_logs
FOR INSERT
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id) AND
  user_id = auth.uid()
);

-- Admins can delete logs (for data retention policies)
CREATE POLICY "Admins can delete org ai research logs"
ON public.ai_research_logs
FOR DELETE
USING (has_org_role(auth.uid(), org_id, 'admin'::app_role));

-- Index for efficient log queries
CREATE INDEX idx_ai_research_logs_org_date ON public.ai_research_logs(org_id, created_at DESC);
CREATE INDEX idx_ai_research_logs_user ON public.ai_research_logs(user_id, created_at DESC);

-- ============================================================
-- 6. Function to auto-release stale hazard assignments (7+ days)
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_stale_assignments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE public.hazard_assignments
  SET status = 'released', updated_at = now()
  WHERE status = 'in_progress'
    AND updated_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;