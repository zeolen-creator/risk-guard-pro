-- Create storage bucket for organization documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org-documents', 'org-documents', false, 52428800);

-- Create RLS policies for org-documents bucket
CREATE POLICY "Users can view their org documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-documents' AND public.user_belongs_to_org(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Users can upload to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'org-documents' AND public.user_belongs_to_org(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Admins can delete their org documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'org-documents' AND public.has_org_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin'));