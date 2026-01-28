-- Phase 1: Database Schema for Regional Risk Intelligence

-- 1. Add location and news settings columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS primary_location JSONB,
ADD COLUMN IF NOT EXISTS news_settings JSONB DEFAULT '{
  "enabled": false,
  "monitoring_radius_km": 100,
  "alert_severity": ["critical", "high", "medium"],
  "categories": {
    "weather": true,
    "cybersecurity": true,
    "health": true,
    "infrastructure": true,
    "financial": false,
    "regulatory": false,
    "security": false
  },
  "custom_keywords": [],
  "notify_high_priority": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS industry_type TEXT,
ADD COLUMN IF NOT EXISTS industry_sub_sectors TEXT[];

-- 2. Create table for cached news/alerts per organization
CREATE TABLE IF NOT EXISTS org_news_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  feed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_org_news_feed_org_fetched 
  ON org_news_feed (org_id, fetched_at DESC);

-- 3. Create table to track dismissed news items per user
CREATE TABLE IF NOT EXISTS news_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  news_item_hash TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id, news_item_hash)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_news_dismissals_lookup 
  ON news_dismissals (org_id, user_id);

-- 4. Enable Row Level Security
ALTER TABLE org_news_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_dismissals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for org_news_feed
CREATE POLICY "Users can view own org news feed"
  ON org_news_feed FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Service role can insert org news feed"
  ON org_news_feed FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update org news feed"
  ON org_news_feed FOR UPDATE
  USING (true);

-- 6. RLS Policies for news_dismissals
CREATE POLICY "Users can view own dismissals"
  ON news_dismissals FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id) AND user_id = auth.uid());

CREATE POLICY "Users can dismiss news items"
  ON news_dismissals FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), org_id) AND user_id = auth.uid());

CREATE POLICY "Users can delete own dismissals"
  ON news_dismissals FOR DELETE
  USING (user_id = auth.uid());