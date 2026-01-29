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

// Random Index values for consistency calculation
const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

export function calculateAHPWeights(matrix: number[][]): {
  weights: number[];
  consistencyRatio: number;
  isConsistent: boolean;
} {
  const n = matrix.length;
  
  // Normalize columns
  const colSums = matrix[0].map((_, colIdx) => 
    matrix.reduce((sum, row) => sum + row[colIdx], 0)
  );
  
  const normalized = matrix.map(row => 
    row.map((val, colIdx) => val / colSums[colIdx])
  );
  
  // Calculate weights (row averages)
  const weights = normalized.map(row => 
    row.reduce((sum, val) => sum + val, 0) / n
  );
  
  // Calculate lambda max (principal eigenvalue approximation)
  const weightedSum = matrix.map((row, i) => 
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );
  
  const lambdaMax = weightedSum.reduce((sum, ws, i) => 
    sum + ws / weights[i], 0
  ) / n;
  
  // Calculate Consistency Index
  const CI = (lambdaMax - n) / (n - 1);
  
  // Calculate Consistency Ratio
  const RI = RANDOM_INDEX[n] || 1.49;
  const CR = RI > 0 ? CI / RI : 0;
  
  return {
    weights,
    consistencyRatio: CR,
    isConsistent: CR < 0.10 // Threshold is 10%
  };
}

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
