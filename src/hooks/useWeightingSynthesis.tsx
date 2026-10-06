import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { canonicalWeights, validWeightTotal } from "../../supabase/functions/_shared/weights";

export function useWeightingSynthesis(sessionId: string | undefined) {
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ["weighting-synthesis", profile?.org_id, sessionId],
    enabled: !!sessionId && !!profile?.org_id,
    staleTime: 0,
    queryFn: async () => {
      const { data: session, error: sessionError } = await supabase.from("weighting_sessions")
        .select("status, layer5_completed").eq("id", sessionId!).eq("org_id", profile!.org_id!).single();
      if (sessionError) throw sessionError;
      // Approved sessions display their immutable final snapshot, not a later AI result.
      if (session.status === "approved" || session.status === "archived") {
        const { data, error } = await supabase.from("weighting_final_weights")
          .select("weights_json, is_active, version").eq("session_id", sessionId!)
          .order("version", { ascending: false }).limit(1).single();
        if (error) throw error;
        return { weights: canonicalWeights(data.weights_json), approved: true, accepted: true,
          isActive: data.is_active, version: data.version };
      }
      const { data, error } = await supabase.from("weighting_ai_synthesis")
        .select("recommended_weights").eq("session_id", sessionId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const weights = canonicalWeights(data.recommended_weights);
      if (!validWeightTotal(weights)) throw new Error("Saved recommendations must sum to 100%");
      return { weights, approved: false, accepted: session.layer5_completed && session.status === "completed",
        isActive: false, version: null };
    },
  });
}
