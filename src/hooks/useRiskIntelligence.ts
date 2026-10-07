import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import type { EvidenceRequest, EvidenceRun } from "../../supabase/functions/_shared/risk-evidence";

export function useRiskIntelligence() {
  const { data: profile } = useProfile();
  const client = useQueryClient();
  const orgId = profile?.org_id;
  const queryKey = ["risk-intelligence", orgId];
  const runs = useQuery({
    queryKey, enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from("risk_intelligence_runs")
        .select("id,org_id,created_by,kind,status,request,sources,output,research_text,error_message,model,method_version,created_at,completed_at")
        .eq("org_id", orgId!).order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error("Analysis history is unavailable. Check your connection and make sure the risk intelligence migration has been applied.");
      return data as unknown as EvidenceRun[];
    },
    refetchInterval: query => query.state.data?.some(run => run.status === "running" && Date.now() - new Date(run.created_at).getTime() < 300000) ? 5000 : false,
  });
  const generate = useMutation({
    mutationFn: async (request: EvidenceRequest) => {
      const { data, error } = await supabase.functions.invoke("risk-intelligence", { body: request });
      if (error) {
        let message = error.message;
        if (error.context instanceof Response) {
          try { message = (await error.context.clone().json()).error || message; } catch { /* retain network error */ }
        }
        throw new Error(message);
      }
      if (!data?.success || !data.id) throw new Error(data?.error || "No saved analysis was returned.");
      return data.id as string;
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  return { runs, generate };
}
