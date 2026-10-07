import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database, Json } from "@/integrations/supabase/types";

type AHPMatrixRow = Database["public"]["Tables"]["weighting_ahp_matrix"]["Row"];

export interface AHPMatrix extends AHPMatrixRow {}

// AHP Scale values
export const AHP_SCALE = [
  { value: 9, label: "Extremely More Important" },
  { value: 7, label: "Very Strongly More Important" },
  { value: 5, label: "Strongly More Important" },
  { value: 3, label: "Moderately More Important" },
  { value: 1, label: "Equally Important" },
  { value: 1/3, label: "Moderately Less Important" },
  { value: 1/5, label: "Strongly Less Important" },
  { value: 1/7, label: "Very Strongly Less Important" },
  { value: 1/9, label: "Extremely Less Important" },
];

export { calculateAHPWeights } from "../../supabase/functions/_shared/hira-scoring";
import { calculateAHPWeights } from "../../supabase/functions/_shared/hira-scoring";

export function useAHPMatrix(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["ahp-matrix", sessionId],
    queryFn: async (): Promise<AHPMatrix | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from("weighting_ahp_matrix")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useSaveAHPMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      matrixData,
      consequences,
    }: {
      sessionId: string;
      matrixData: number[][];
      consequences: string[];
    }) => {
      // Calculate weights and consistency
      const { weights, consistencyRatio, isConsistent } = calculateAHPWeights(matrixData);

      // Convert weights to object
      const normalizedWeights: Record<string, number> = {};
      const rawWeights: Record<string, number> = {};
      consequences.forEach((c, i) => {
        normalizedWeights[c] = Math.round(weights[i] * 100 * 100) / 100; // As percentage, 2 decimal places
        rawWeights[c] = weights[i];
      });

      // Check if matrix already exists
      const { data: existing } = await supabase
        .from("weighting_ahp_matrix")
        .select("id")
        .eq("session_id", sessionId)
        .single();

      const matrixPayload = {
        session_id: sessionId,
        matrix: matrixData as unknown as Json,
        consistency_ratio: consistencyRatio,
        is_consistent: isConsistent,
        normalized_weights: normalizedWeights as unknown as Json,
        raw_weights: rawWeights as unknown as Json,
        eigenvalues: weights as unknown as Json,
        calculated_at: new Date().toISOString(),
      };

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("weighting_ahp_matrix")
          .update(matrixPayload)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("weighting_ahp_matrix")
          .insert(matrixPayload)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return { 
        ...result, 
        weights: normalizedWeights, 
        consistencyRatio, 
        isConsistent 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ahp-matrix"] });
      if (data.isConsistent) {
        toast.success(`AHP matrix saved. Consistency ratio: ${(data.consistencyRatio * 100).toFixed(1)}%`);
      } else {
        toast.warning(`Matrix saved but inconsistent (${(data.consistencyRatio * 100).toFixed(1)}%). Please review your comparisons.`);
      }
    },
    onError: (error) => {
      toast.error("Failed to save AHP matrix: " + error.message);
    },
  });
}
