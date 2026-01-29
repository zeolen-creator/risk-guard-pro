import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface HistoricalEvent {
  id: string;
  org_id: string;
  hazard_name: string;
  hazard_category: string;
  event_date: string;
  event_title: string;
  description: string | null;
  location: string | null;
  financial_impact: number | null;
  downtime_hours: number | null;
  people_affected: number | null;
  injuries: number;
  fatalities: number;
  response_effectiveness: "poor" | "fair" | "good" | "excellent" | null;
  lessons_learned: string | null;
  improvements_implemented: string[] | null;
  incident_report_url: string | null;
  photos: { url: string; caption?: string }[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useHistoricalEvents(hazardName?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["historical-events", profile?.org_id, hazardName],
    queryFn: async (): Promise<HistoricalEvent[]> => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from("historical_events")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("event_date", { ascending: false });

      if (hazardName) {
        query = query.eq("hazard_name", hazardName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        response_effectiveness: event.response_effectiveness as HistoricalEvent["response_effectiveness"],
        photos: Array.isArray(event.photos) ? event.photos as { url: string; caption?: string }[] : [],
      }));
    },
    enabled: !!profile?.org_id,
  });
}

export function useHistoricalEventStats(hazardName?: string) {
  const { data: events } = useHistoricalEvents(hazardName);

  const stats = {
    totalEvents: events?.length || 0,
    totalFinancialImpact: events?.reduce((sum, e) => sum + (e.financial_impact || 0), 0) || 0,
    totalDowntime: events?.reduce((sum, e) => sum + (e.downtime_hours || 0), 0) || 0,
    avgFinancialImpact: 0,
    calculatedProbability: null as number | null,
  };

  if (stats.totalEvents > 0) {
    stats.avgFinancialImpact = stats.totalFinancialImpact / stats.totalEvents;
    // Calculate annual frequency based on date range
    const dates = events?.map(e => new Date(e.event_date)) || [];
    if (dates.length > 0) {
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
      const latest = new Date(Math.max(...dates.map(d => d.getTime())));
      const yearSpan = Math.max(1, (latest.getTime() - earliest.getTime()) / (365 * 24 * 60 * 60 * 1000));
      stats.calculatedProbability = Math.min((stats.totalEvents / yearSpan) * 100, 100);
    }
  }

  return stats;
}

export function useCreateHistoricalEvent() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<HistoricalEvent, "id" | "org_id" | "created_at" | "updated_at" | "created_by">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("historical_events")
        .insert({
          ...event,
          org_id: profile.org_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-events"] });
    },
  });
}

export function useUpdateHistoricalEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HistoricalEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("historical_events")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-events"] });
    },
  });
}

export function useDeleteHistoricalEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("historical_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-events"] });
    },
  });
}
