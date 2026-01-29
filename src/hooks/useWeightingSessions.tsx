import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WeightingSessionRow = Database["public"]["Tables"]["weighting_sessions"]["Row"];

export interface WeightingSession extends WeightingSessionRow {}

export function useWeightingSessions() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["weighting-sessions", profile?.org_id],
    queryFn: async (): Promise<WeightingSession[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("weighting_sessions")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.org_id,
  });
}

export function useWeightingSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["weighting-session", sessionId],
    queryFn: async (): Promise<WeightingSession | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("weighting_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useCreateWeightingSession() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.org_id || !profile?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("weighting_sessions")
        .insert({
          org_id: profile.org_id,
          created_by: profile.id,
          status: "draft",
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weighting-sessions"] });
      toast.success("Weighting session created");
    },
    onError: (error) => {
      toast.error("Failed to create session: " + error.message);
    },
  });
}

export function useUpdateWeightingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      updates 
    }: { 
      sessionId: string; 
      updates: Database["public"]["Tables"]["weighting_sessions"]["Update"]
    }) => {
      const { data, error } = await supabase
        .from("weighting_sessions")
        .update(updates)
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["weighting-session", data.id] });
      queryClient.invalidateQueries({ queryKey: ["weighting-sessions"] });
    },
  });
}
