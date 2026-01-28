import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface SimulationTemplate {
  id: string;
  template_name: string;
  hazard_category: string;
  hazard_name: string | null;
  description: string | null;
  region: string | null;
  default_parameters: Record<string, unknown>;
  source_notes: string | null;
}

export interface MonteCarloSimulation {
  id: string;
  org_id: string;
  hazard_id: string | null;
  assessment_id: string | null;
  template_id: string | null;
  iterations: number;
  time_horizon_years: number;
  frequency_distribution: Record<string, unknown>;
  direct_cost_distribution: Record<string, unknown>;
  indirect_cost_distribution: Record<string, unknown>;
  eal_amount: number | null;
  percentile_10: number | null;
  percentile_50: number | null;
  percentile_90: number | null;
  var_95: number | null;
  probability_exceeds_threshold: Record<string, number> | null;
  status: string;
  execution_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface SimulationParams {
  template_id?: string;
  hazard_id?: string;
  assessment_id?: string;
  iterations?: number;
  time_horizon_years?: number;
  frequency_distribution?: {
    type: string;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
    lambda?: number;
  };
  direct_cost_distribution?: {
    type: string;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
  };
  indirect_cost_distribution?: {
    type: string;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mode?: number;
  };
}

export function useSimulationTemplates() {
  return useQuery({
    queryKey: ["simulation-templates"],
    queryFn: async (): Promise<SimulationTemplate[]> => {
      const { data, error } = await supabase
        .from("simulation_templates")
        .select("*")
        .order("hazard_category");

      if (error) throw error;
      return (data || []) as SimulationTemplate[];
    },
  });
}

export function useMonteCarloSimulations() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["monte-carlo-simulations", profile?.org_id],
    queryFn: async (): Promise<MonteCarloSimulation[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("monte_carlo_simulations")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MonteCarloSimulation[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useRunSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SimulationParams) => {
      const { data, error } = await supabase.functions.invoke("monte-carlo", {
        body: { action: "run", ...params },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monte-carlo-simulations"] });
    },
  });
}
