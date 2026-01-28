import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  relevance_score: number;
  category: string;
  severity: string;
}

export interface WeatherAlert {
  hash: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  severity: string;
  category: string;
}

export interface NewsFeedData {
  weather_alerts: WeatherAlert[];
  news_items: NewsItem[];
  fetched_at: string;
}

export interface NewsFeed {
  id: string;
  org_id: string;
  feed_data: NewsFeedData;
  fetched_at: string;
  expires_at: string;
}

export function useNewsFeed() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["org-news-feed", profile?.org_id],
    queryFn: async (): Promise<NewsFeed | null> => {
      if (!profile?.org_id) return null;

      const { data, error } = await supabase
        .from("org_news_feed")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching news feed:", error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        feed_data: data.feed_data as unknown as NewsFeedData,
      } as NewsFeed;
    },
    enabled: !!profile?.org_id,
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000, // Consider stale after 1 minute
  });
}

export function useNewsDismissals() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["news-dismissals", profile?.org_id, user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!profile?.org_id || !user?.id) return new Set();

      const { data, error } = await supabase
        .from("news_dismissals")
        .select("news_item_hash")
        .eq("org_id", profile.org_id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching dismissals:", error);
        return new Set();
      }

      return new Set(data?.map((d) => d.news_item_hash) || []);
    },
    enabled: !!profile?.org_id && !!user?.id,
  });
}

export function useDismissNewsItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (itemHash: string) => {
      if (!profile?.org_id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("news_dismissals").insert({
        org_id: profile.org_id,
        user_id: user.id,
        news_item_hash: itemHash,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-dismissals"] });
    },
  });
}

export function useRefreshNewsFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-regional-news");

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-news-feed"] });
    },
  });
}
