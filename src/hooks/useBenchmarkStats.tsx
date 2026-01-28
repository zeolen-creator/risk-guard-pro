import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useOrganization } from "./useOrganization";

export interface BenchmarkStatistics {
  id: string;
  industry: string;
  org_size: string | null;
  region: string | null;
  hazard_category: string | null;
  sample_size: number;
  avg_risk_score: number | null;
  median_risk_score: number | null;
  percentile_25: number | null;
  percentile_75: number | null;
  percentile_90: number | null;
  top_3_hazards: Array<{
    name: string;
    avg_score: number;
    pct_rated_high: number;
  }>;
  avg_controls_per_assessment: number | null;
  calculated_at: string;
}

export interface BenchmarkParticipation {
  org_id: string;
  opted_in: boolean;
  opted_in_at: string | null;
  opted_out_at: string | null;
  data_sharing_consent_version: string;
  created_at: string;
}

function getOrgSizeCategory(size: string | null): string {
  if (!size) return "medium";
  const lowerSize = size.toLowerCase();
  if (lowerSize.includes("small") || lowerSize === "1-50") return "small";
  if (lowerSize.includes("large") || lowerSize === "251+") return "large";
  return "medium";
}

export function useBenchmarkStats() {
  const { data: org } = useOrganization();

  return useQuery({
    queryKey: ["benchmark-stats", org?.sector, org?.size, org?.region],
    queryFn: async (): Promise<BenchmarkStatistics | null> => {
      if (!org) return null;

      const orgSize = getOrgSizeCategory(org.size);
      const region = org.region?.split(",").pop()?.trim() || org.region;

      const { data, error } = await supabase
        .from("benchmark_statistics")
        .select("*")
        .eq("industry", org.sector)
        .eq("org_size", orgSize)
        .eq("region", region)
        .gte("sample_size", 5)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as BenchmarkStatistics | null;
    },
    enabled: !!org,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });
}

export function useBenchmarkParticipation() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["benchmark-participation", profile?.org_id],
    queryFn: async (): Promise<BenchmarkParticipation | null> => {
      if (!profile?.org_id) return null;

      const { data, error } = await supabase
        .from("benchmark_participation")
        .select("*")
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as BenchmarkParticipation | null;
    },
    enabled: !!profile?.org_id,
  });
}

export function useOptInBenchmark() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (optIn: boolean) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { error } = await supabase.from("benchmark_participation").upsert({
        org_id: profile.org_id,
        opted_in: optIn,
        opted_in_at: optIn ? new Date().toISOString() : null,
        opted_out_at: optIn ? null : new Date().toISOString(),
        data_sharing_consent_version: "1.0",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benchmark-participation"] });
    },
  });
}
