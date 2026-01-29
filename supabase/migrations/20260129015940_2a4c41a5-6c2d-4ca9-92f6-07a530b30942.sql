-- Create table to track info sheet requests from users
CREATE TABLE public.hazard_info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_name TEXT NOT NULL,
  hazard_category TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.hazard_info_requests ENABLE ROW LEVEL SECURITY;

-- Users can request info sheets for their org
CREATE POLICY "Users can insert info requests" ON public.hazard_info_requests
  FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), org_id));

-- Users can view their org's requests
CREATE POLICY "Users can view org info requests" ON public.hazard_info_requests
  FOR SELECT USING (user_belongs_to_org(auth.uid(), org_id));

-- Admins can update/delete requests
CREATE POLICY "Admins can update info requests" ON public.hazard_info_requests
  FOR UPDATE USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Admins can delete info requests" ON public.hazard_info_requests
  FOR DELETE USING (has_org_role(auth.uid(), org_id, 'admin'));