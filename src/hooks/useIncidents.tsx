import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface Incident {
  id: string;
  org_id: string;
  hazard_id: string | null;
  title: string;
  description: string | null;
  incident_date: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  location: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  downtime_hours: number | null;
  affected_employees: number | null;
  root_cause: string | null;
  lessons_learned: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  incident_date: string;
  severity: "low" | "medium" | "high" | "critical";
  hazard_id?: string;
  location?: string;
  estimated_cost?: number;
}

export function useIncidents() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["incidents", profile?.org_id],
    queryFn: async (): Promise<Incident[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("incident_date", { ascending: false });

      if (error) throw error;
      return (data || []) as Incident[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("incidents")
        .insert({
          ...input,
          org_id: profile.org_id,
          reported_by: user?.id,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Incident> & { id: string }) => {
      const { error } = await supabase
        .from("incidents")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incidents").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
