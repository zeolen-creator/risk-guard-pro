import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";

export interface ExecutiveReport {
  id: string;
  org_id: string;
  report_type: "quarterly" | "annual" | "ad_hoc" | "board";
  title: string;
  period_start: string;
  period_end: string;
  summary: {
    total_assessments?: number;
    total_hazards?: number;
    avg_risk_score?: number;
    high_risk_count?: number;
    trend?: "improving" | "stable" | "declining";
  };
  risk_overview: Record<string, unknown> | null;
  key_findings: Array<{ title: string; description: string; severity?: string }>;
  recommendations: Array<{ title: string; description: string; priority?: string }>;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface GenerateReportInput {
  report_type: ExecutiveReport["report_type"];
  title: string;
  period_start: string;
  period_end: string;
}

export function useExecutiveReports() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["executive-reports", profile?.org_id],
    queryFn: async (): Promise<ExecutiveReport[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("executive_reports")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("period_end", { ascending: false });

      if (error) throw error;
      return (data || []) as ExecutiveReport[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: GenerateReportInput) => {
      if (!profile?.org_id) throw new Error("No organization");

      // Fetch data for the report period
      const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("status", "completed")
        .gte("created_at", input.period_start)
        .lte("created_at", input.period_end);

      const totalAssessments = assessments?.length || 0;
      const avgRiskScore = assessments?.length
        ? assessments.reduce((sum, a) => sum + (a.total_risk || 0), 0) / assessments.length
        : 0;
      const highRiskCount = assessments?.filter((a) => (a.total_risk || 0) > 70).length || 0;

      const summary = {
        total_assessments: totalAssessments,
        avg_risk_score: Math.round(avgRiskScore * 10) / 10,
        high_risk_count: highRiskCount,
        trend: avgRiskScore < 50 ? "improving" : avgRiskScore > 70 ? "declining" : "stable",
      };

      const keyFindings = [];
      if (highRiskCount > 0) {
        keyFindings.push({
          title: "High Risk Items Identified",
          description: `${highRiskCount} assessments identified high-risk hazards requiring immediate attention.`,
          severity: "high",
        });
      }

      const recommendations = [];
      if (highRiskCount > 0) {
        recommendations.push({
          title: "Address High Risk Hazards",
          description: "Implement controls for identified high-risk hazards to reduce organizational exposure.",
          priority: "high",
        });
      }

      const { data, error } = await supabase
        .from("executive_reports")
        .insert({
          ...input,
          org_id: profile.org_id,
          summary,
          key_findings: keyFindings,
          recommendations,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executive-reports"] });
    },
  });
}

export function useApproveReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("executive_reports")
        .update({
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executive-reports"] });
    },
  });
}
