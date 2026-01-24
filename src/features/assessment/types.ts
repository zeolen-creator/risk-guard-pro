import { z } from "zod";

export const assessmentFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  selectedHazards: z.array(z.string()).min(1, "Select at least one hazard"),
  probabilities: z.record(z.string(), z.number().min(1).max(6)),
  weights: z.record(z.string(), z.number().min(0).max(100)),
  impacts: z.record(z.string(), z.record(z.string(), z.number().min(0).max(3))),
}).refine(
  (data) => {
    const totalWeight = Object.values(data.weights).reduce((sum, w) => sum + w, 0);
    return totalWeight === 100;
  },
  { message: "Consequence weights must sum to 100%", path: ["weights"] }
);

export type AssessmentFormData = z.infer<typeof assessmentFormSchema>;

export interface RiskResult {
  hazardId: string;
  hazardCategory: string;
  probability: number;
  weightedImpact: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
}

export const WIZARD_STEPS = [
  { id: 1, title: "Select Hazards", description: "Choose relevant hazards" },
  { id: 2, title: "Probability", description: "Assign occurrence likelihood" },
  { id: 3, title: "Impacts", description: "Assign impact scores" },
  { id: 4, title: "Results", description: "View risk assessment" },
] as const;

export function calculateRiskScore(probability: number, weightedImpact: number): number {
  return probability * weightedImpact;
}

export function getRiskLevel(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score <= 3) return "Low";
  if (score <= 6) return "Medium";
  if (score <= 12) return "High";
  return "Critical";
}

export function calculateWeightedImpact(
  hazardId: string,
  impacts: Record<string, Record<string, number>>,
  weights: Record<string, number>
): number {
  const hazardImpacts = impacts[hazardId] || {};
  let totalWeightedImpact = 0;
  
  for (const [consequenceId, weight] of Object.entries(weights)) {
    const impact = hazardImpacts[consequenceId] || 0;
    totalWeightedImpact += (impact * weight) / 100;
  }
  
  return totalWeightedImpact;
}
