import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface RiskPrediction {
  id: string;
  org_id: string;
  hazard_id: string | null;
  current_risk_score: number;
  predicted_risk_score: number;
  prediction_confidence: number | null;
  prediction_basis: string;
  time_horizon: string;
  source_data: Record<string, unknown>;
  source_urls: string[];
  ai_reasoning: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  hazards?: {
    id: string;
    category: string;
  };
}

export function useRiskPredictions(timeHorizon = "1_year") {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["risk-predictions", profile?.org_id, timeHorizon],
    queryFn: async (): Promise<RiskPrediction[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("risk_predictions")
        .select(`
          *,
          hazards (
            id,
            category
          )
        `)
        .eq("org_id", profile.org_id)
        .eq("time_horizon", timeHorizon)
        .order("prediction_confidence", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RiskPrediction[];
    },
    enabled: !!profile?.org_id,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

export function useMarkPredictionReviewed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase
        .from("risk_predictions")
        .update({
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", predictionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-predictions"] });
    },
  });
}
