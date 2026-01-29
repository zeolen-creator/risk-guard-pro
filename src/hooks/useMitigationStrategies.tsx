import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface MitigationStrategy {
  id: string;
  strategy_name: string;
  hazard_category: string;
  description: string | null;
  implementation_complexity: "low" | "medium" | "high" | null;
  typical_timeframe_days_min: number | null;
  typical_timeframe_days_max: number | null;
  effectiveness_notes: string | null;
  prerequisites: string[] | null;
  ongoing_maintenance_notes: string | null;
  is_system_provided: boolean;
  org_id: string | null;
  created_at: string;
}

export interface OrganizationMitigation {
  id: string;
  org_id: string;
  assessment_id: string | null;
  hazard_id: string | null;
  mitigation_strategy_id: string | null;
  status: "proposed" | "approved" | "in_progress" | "completed" | "rejected";
  estimated_cost: number | null;
  expected_risk_reduction_percent: number | null;
  annual_loss_estimate: number | null;
  implementation_start_date: string | null;
  implementation_completion_date: string | null;
  roi_score: number | null;
  priority_rank: number | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  strategy?: MitigationStrategy;
}

export function useMitigationStrategies(hazardCategory?: string) {
  return useQuery({
    queryKey: ["mitigation-strategies", hazardCategory],
    queryFn: async (): Promise<MitigationStrategy[]> => {
      let query = supabase
        .from("mitigation_strategies")
        .select("*")
        .order("strategy_name");

      if (hazardCategory) {
        query = query.or(`hazard_category.eq.${hazardCategory},hazard_category.eq.All Hazards`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MitigationStrategy[];
    },
  });
}

export function useOrganizationMitigations(assessmentId?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["organization-mitigations", profile?.org_id, assessmentId],
    queryFn: async (): Promise<OrganizationMitigation[]> => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from("organization_mitigations")
        .select(`
          *,
          strategy:mitigation_strategies(*)
        `)
        .eq("org_id", profile.org_id)
        .order("priority_rank", { ascending: true, nullsFirst: false });

      if (assessmentId) {
        query = query.eq("assessment_id", assessmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OrganizationMitigation[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateMitigation() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mitigation: {
      assessment_id?: string;
      hazard_id?: string;
      mitigation_strategy_id?: string;
      estimated_cost?: number;
      expected_risk_reduction_percent?: number;
      annual_loss_estimate?: number;
      notes?: string;
    }) => {
      if (!profile?.org_id) throw new Error("No organization");

      // Calculate ROI if we have cost and risk reduction
      let roi_score: number | null = null;
      if (mitigation.estimated_cost && mitigation.expected_risk_reduction_percent) {
        if (mitigation.annual_loss_estimate) {
          const riskReductionValue = (mitigation.annual_loss_estimate * mitigation.expected_risk_reduction_percent) / 100;
          roi_score = riskReductionValue / mitigation.estimated_cost;
        } else {
          // Use risk point value proxy ($10,000 per point)
          const riskPointValue = 10000;
          const riskPointsReduced = (10 * mitigation.expected_risk_reduction_percent) / 100; // Assuming avg score of 10
          roi_score = (riskPointsReduced * riskPointValue) / mitigation.estimated_cost;
        }
      }

      const { data, error } = await supabase
        .from("organization_mitigations")
        .insert({
          ...mitigation,
          org_id: profile.org_id,
          created_by: user?.id,
          roi_score,
          status: "proposed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-mitigations"] });
    },
  });
}

export function useUpdateMitigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrganizationMitigation> & { id: string }) => {
      // Recalculate ROI if relevant fields changed
      let roi_score = updates.roi_score;
      if (updates.estimated_cost !== undefined || updates.expected_risk_reduction_percent !== undefined) {
        const cost = updates.estimated_cost;
        const reduction = updates.expected_risk_reduction_percent;
        const loss = updates.annual_loss_estimate;

        if (cost && reduction) {
          if (loss) {
            roi_score = (loss * reduction / 100) / cost;
          } else {
            const riskPointValue = 10000;
            roi_score = (10 * reduction / 100 * riskPointValue) / cost;
          }
        }
      }

      const { data, error } = await supabase
        .from("organization_mitigations")
        .update({ ...updates, roi_score, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-mitigations"] });
    },
  });
}
