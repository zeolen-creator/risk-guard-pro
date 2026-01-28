-- Fix overly permissive RLS policies for org_news_feed
-- The edge function will use service role key which bypasses RLS anyway
-- So we can make these policies more restrictive

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can insert org news feed" ON org_news_feed;
DROP POLICY IF EXISTS "Service role can update org news feed" ON org_news_feed;

-- Create more restrictive policies (edge function uses service role which bypasses RLS)
-- These policies are for normal users - they should not be able to insert/update
-- Only the edge function (service role) can manage this data

-- Add a policy for delete (cleanup)
CREATE POLICY "Admins can delete org news feed"
  ON org_news_feed FOR DELETE
  USING (has_org_role(auth.uid(), org_id, 'admin'::app_role));