-- Create table for organization-level consequence weights
CREATE TABLE public.consequence_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  consequence_id uuid NOT NULL REFERENCES public.consequences(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, consequence_id)
);

-- Enable RLS
ALTER TABLE public.consequence_weights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view org consequence weights"
ON public.consequence_weights
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can insert org consequence weights"
ON public.consequence_weights
FOR INSERT
WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'::app_role));

CREATE POLICY "Admins can update org consequence weights"
ON public.consequence_weights
FOR UPDATE
USING (has_org_role(auth.uid(), org_id, 'admin'::app_role));

CREATE POLICY "Admins can delete org consequence weights"
ON public.consequence_weights
FOR DELETE
USING (has_org_role(auth.uid(), org_id, 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_consequence_weights_updated_at
  BEFORE UPDATE ON public.consequence_weights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add weights_configured flag to organizations
ALTER TABLE public.organizations 
ADD COLUMN weights_configured boolean NOT NULL DEFAULT false;