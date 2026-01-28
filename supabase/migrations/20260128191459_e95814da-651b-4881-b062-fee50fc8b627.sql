-- Add unique constraint on org_id for org_news_feed to enable upsert
ALTER TABLE public.org_news_feed 
ADD CONSTRAINT org_news_feed_org_id_unique UNIQUE (org_id);