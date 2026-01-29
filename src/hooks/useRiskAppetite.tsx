import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface RiskAppetiteConfig {
  low_threshold: number;
  medium_threshold: number;
  high_threshold: number;
  extreme_threshold: number;
  acceptance_policy: string;
  requires_approval: string[];
}

export interface RiskAcceptanceRecord {
  id: string;
  org_id: string;
  assessment_id: string | null;
  hazard_id: string;
  risk_score: number;
  risk_level: string;
  exceeds_appetite: boolean;
  accepted: boolean;
  acceptance_rationale: string | null;
  compensating_controls: string[] | null;
  accepted_by: string | null;
  accepted_at: string | null;
  review_date: string | null;
  created_at: string;
}

const DEFAULT_CONFIG: RiskAppetiteConfig = {
  low_threshold: 5,
  medium_threshold: 12,
  high_threshold: 15,
  extreme_threshold: 18,
  acceptance_policy: "Low risks accepted. Medium risks require mitigation plan. High and Extreme risks require executive approval.",
  requires_approval: ["high", "extreme"],
};

export function useRiskAppetite() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["risk-appetite", profile?.org_id],
    queryFn: async (): Promise<RiskAppetiteConfig> => {
      if (!profile?.org_id) return DEFAULT_CONFIG;

      const { data, error } = await supabase
        .from("organizations")
        .select("risk_appetite_config")
        .eq("id", profile.org_id)
        .single();

      if (error) throw error;
      return (data?.risk_appetite_config as unknown as RiskAppetiteConfig) || DEFAULT_CONFIG;
    },
    enabled: !!profile?.org_id,
  });
}

export function useUpdateRiskAppetite() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (config: RiskAppetiteConfig) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { error } = await supabase
        .from("organizations")
        .update({ risk_appetite_config: config as unknown as Json })
        .eq("id", profile.org_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-appetite"] });
      toast.success("Risk appetite settings saved");
    },
  });
}

export function useRiskAcceptanceRecords(assessmentId?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["risk-acceptance", profile?.org_id, assessmentId],
    queryFn: async (): Promise<RiskAcceptanceRecord[]> => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from("risk_acceptance_records")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (assessmentId) {
        query = query.eq("assessment_id", assessmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RiskAcceptanceRecord[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateRiskAcceptance() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (record: Omit<RiskAcceptanceRecord, "id" | "org_id" | "created_at">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("risk_acceptance_records")
        .insert({
          ...record,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-acceptance"] });
      toast.success("Risk acceptance recorded");
    },
  });
}

// Helper functions
export function getRiskLevel(score: number, config: RiskAppetiteConfig): string {
  if (score <= config.low_threshold) return "Low";
  if (score <= config.medium_threshold) return "Medium";
  if (score <= config.high_threshold) return "High";
  return "Extreme";
}

export function exceedsAppetite(score: number, config: RiskAppetiteConfig): boolean {
  return score > config.low_threshold;
}

export function requiresApproval(score: number, config: RiskAppetiteConfig): boolean {
  const level = getRiskLevel(score, config).toLowerCase();
  return config.requires_approval.includes(level);
}
