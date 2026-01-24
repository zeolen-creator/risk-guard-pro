import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useEffect } from "react";

export interface ConsequenceWeight {
  id: string;
  org_id: string;
  consequence_id: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export function useConsequenceWeights() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Subscribe to realtime changes
  useEffect(() => {
    if (!profile?.org_id) return;

    const channel = supabase
      .channel("consequence-weights-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consequence_weights",
          filter: `org_id=eq.${profile.org_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["consequence-weights", profile.org_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.org_id, queryClient]);

  return useQuery({
    queryKey: ["consequence-weights", profile?.org_id],
    queryFn: async (): Promise<ConsequenceWeight[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("consequence_weights")
        .select("*")
        .eq("org_id", profile.org_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.org_id,
  });
}

export function useConsequenceWeightsMap() {
  const { data: weights = [], ...rest } = useConsequenceWeights();
  
  const weightsMap = weights.reduce<Record<string, number>>((acc, w) => {
    acc[w.consequence_id] = w.weight;
    return acc;
  }, {});

  return { data: weightsMap, weights, ...rest };
}

interface SaveWeightsParams {
  weights: Record<string, number>;
}

export function useSaveConsequenceWeights() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ weights }: SaveWeightsParams) => {
      if (!profile?.org_id) throw new Error("No organization found");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete existing weights for this org
      await supabase
        .from("consequence_weights")
        .delete()
        .eq("org_id", profile.org_id);

      // Insert new weights
      const weightEntries = Object.entries(weights).map(([consequence_id, weight]) => ({
        org_id: profile.org_id,
        consequence_id,
        weight,
      }));

      const { error } = await supabase
        .from("consequence_weights")
        .insert(weightEntries);

      if (error) throw error;

      // Mark organization as having weights configured
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ weights_configured: true })
        .eq("id", profile.org_id);

      if (orgError) throw orgError;

      return weights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consequence-weights"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
