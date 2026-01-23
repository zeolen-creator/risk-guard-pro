import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useEffect } from "react";
import { Json } from "@/integrations/supabase/types";

export interface Assessment {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  status: string;
  selected_hazards: string[];
  probabilities: Record<string, number>;
  weights: Record<string, Record<string, number>>;
  impacts: Record<string, Record<string, number>>;
  total_risk: number;
  results: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function parseJsonArray(json: Json | null): string[] {
  if (!json) return [];
  if (Array.isArray(json)) return json.map(item => String(item));
  return [];
}

function parseJsonRecord<T>(json: Json | null): Record<string, T> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {} as Record<string, T>;
  return json as Record<string, T>;
}

export function useAssessments() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!profile?.org_id) return;

    const channel = supabase
      .channel("assessments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assessments",
          filter: `org_id=eq.${profile.org_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["assessments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.org_id, queryClient]);

  return useQuery({
    queryKey: ["assessments", profile?.org_id],
    queryFn: async (): Promise<Assessment[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(a => ({
        id: a.id,
        org_id: a.org_id,
        user_id: a.user_id,
        title: a.title,
        status: a.status,
        total_risk: a.total_risk ?? 0,
        created_at: a.created_at,
        updated_at: a.updated_at,
        selected_hazards: parseJsonArray(a.selected_hazards),
        probabilities: parseJsonRecord<number>(a.probabilities),
        weights: parseJsonRecord<Record<string, number>>(a.weights),
        impacts: parseJsonRecord<Record<string, number>>(a.impacts),
        results: parseJsonRecord<unknown>(a.results),
      }));
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!user?.id || !profile?.org_id) throw new Error("Not authenticated or no organization");

      const { data, error } = await supabase
        .from("assessments")
        .insert({
          org_id: profile.org_id,
          user_id: user.id,
          title,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Assessment> & { id: string }) => {
      // Convert to Json compatible format
      const dbUpdates: Record<string, Json | string | number | undefined> = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.total_risk !== undefined) dbUpdates.total_risk = updates.total_risk;
      if (updates.selected_hazards !== undefined) dbUpdates.selected_hazards = updates.selected_hazards as unknown as Json;
      if (updates.probabilities !== undefined) dbUpdates.probabilities = updates.probabilities as unknown as Json;
      if (updates.weights !== undefined) dbUpdates.weights = updates.weights as unknown as Json;
      if (updates.impacts !== undefined) dbUpdates.impacts = updates.impacts as unknown as Json;
      if (updates.results !== undefined) dbUpdates.results = updates.results as unknown as Json;

      const { data, error } = await supabase
        .from("assessments")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}
