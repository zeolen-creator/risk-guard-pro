import { canonicalWeights, normalizeWeights, WEIGHT_KEYS } from "./weights.ts";
/** Annual occurrence probability, not expected loss. Matches the app's existing rubric. */
export function likelihoodFromAnnualProbability(p: unknown): number | null {
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) return null;
  if (p === 1) return 6;
  if (p < 0.01) return 1;
  if (p < 0.02) return 2;
  if (p < 0.05) return 3;
  if (p <= 0.20) return 4;
  return 5;
}
export function validLikelihood(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6; }
export function validImpact(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3; }
export function calculateAHPWeights(matrix: number[][]) {
  const n = matrix.length;
  if (n < 2 || n > 10 || matrix.some(row => !Array.isArray(row) || row.length !== n || row.some(v => !Number.isFinite(v) || v < 1/9 - 1e-9 || v > 9 + 1e-9))) throw new Error("Invalid pairwise comparison matrix.");
  for (let i=0;i<n;i++) for(let j=0;j<n;j++) if ((i===j && Math.abs(matrix[i][j]-1)>1e-6) || Math.abs(matrix[i][j]*matrix[j][i]-1)>1e-5) throw new Error("Pairwise comparisons must be reciprocal with a unit diagonal.");
  let weights = Array(n).fill(1/n);
  for(let iteration=0;iteration<1000;iteration++) {
    const next = matrix.map(row=>row.reduce((sum,v,j)=>sum+v*weights[j],0));
    const total=next.reduce((a,b)=>a+b,0); const normalized=next.map(v=>v/total);
    const delta=Math.max(...normalized.map((v,i)=>Math.abs(v-weights[i]))); weights=normalized;
    if(delta<1e-12)break;
    if(iteration===999)throw new Error("AHP calculation did not converge.");
  }
  const lambda=matrix.reduce((sum,row,i)=>sum+row.reduce((a,v,j)=>a+v*weights[j],0)/weights[i],0)/n;
  const ri=[0,0,0,0.58,0.90,1.12,1.24,1.32,1.41,1.45,1.49][n];
  const consistencyRatio=ri ? Math.max(0,(lambda-n)/(n-1)/ri) : 0;
  return {weights,consistencyRatio,isConsistent:consistencyRatio<=0.10};
}
/** Keep user elicitation as the numerical foundation; AI evidence explains/challenges it. */
export function weightingResult(input: unknown, consistencyRatio: unknown) {
  if (typeof consistencyRatio !== "number" || !Number.isFinite(consistencyRatio) || consistencyRatio < 0 || consistencyRatio > 0.10) throw new Error("Review the pairwise comparisons: AHP consistency ratio must be at most 0.10 before synthesis.");
  const raw = canonicalWeights(input);
  const weights = normalizeWeights(raw);
  // ±10% relative perturbation of each priority, renormalized to 100, exposes sensitivity.
  const sensitivity = WEIGHT_KEYS.map(key => {
    const low = normalizeWeights({ ...weights, [key]: weights[key] * 0.9 });
    const high = normalizeWeights({ ...weights, [key]: weights[key] * 1.1 });
    return { consequence: key, base: weights[key], low: low[key], high: high[key] };
  });
  return { weights, sensitivity, contributions: { ahp_influence_percent: 100, regulatory_influence_percent: 0, mission_influence_percent: 0, questionnaire_influence_percent: 0, scenario_influence_percent: 0 } };
}
