import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClimateRiskAdjustment {
  id: string;
  hazard_category: string;
  location_region: string;
  baseline_year: number;
  projection_2030: number;
  projection_2040: number;
  projection_2050: number;
  confidence_level: "low" | "medium" | "high";
  data_sources: Array<{ title: string; url: string }>;
  summary_text: string;
  last_updated: string;
  created_at: string;
}

// Climate-sensitive hazard categories
const CLIMATE_CATEGORIES = [
  "flood", "flooding", "wildfire", "drought", "extreme heat", "extreme cold",
  "hurricane", "tornado", "storm", "severe storm", "precipitation", "sea level",
  "erosion", "permafrost", "ice storm", "blizzard", "heat wave", "weather"
];

export function isClimateRelated(category: string): boolean {
  const lowerCategory = category.toLowerCase();
  return CLIMATE_CATEGORIES.some(c => lowerCategory.includes(c));
}

export function useClimateRiskAdjustment(hazardCategory: string, location: string) {
  return useQuery({
    queryKey: ["climate-risk", hazardCategory, location],
    queryFn: async (): Promise<ClimateRiskAdjustment | null> => {
      const { data, error } = await supabase
        .from("climate_risk_adjustments")
        .select("*")
        .eq("hazard_category", hazardCategory)
        .eq("location_region", location)
        .gte("last_updated", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (error) throw error;
      return data as ClimateRiskAdjustment | null;
    },
    enabled: !!hazardCategory && !!location,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useFetchClimateAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hazardCategory, location }: { hazardCategory: string; location: string }) => {
      const { data, error } = await supabase.functions.invoke("climate-risk-analysis", {
        body: {
          hazard_category: hazardCategory,
          location,
        },
      });

      if (error) throw error;
      return data as ClimateRiskAdjustment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["climate-risk", variables.hazardCategory, variables.location] });
      toast.success("Climate analysis complete");
    },
    onError: (error) => {
      toast.error(`Climate analysis failed: ${error.message}`);
    },
  });
}

// Calculate projected risk score
export function getProjectedRiskScore(
  currentScore: number,
  projection: number
): number {
  return Math.min(20, Math.round(currentScore * projection));
}

// Get percentage change
export function getProjectionChange(projection: number): string {
  const change = (projection - 1) * 100;
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
}
