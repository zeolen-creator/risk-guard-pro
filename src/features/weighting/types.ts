// Core types for the Consequence Weighting Methodology Module

export interface ConsequenceType {
  id: string;
  name: string;
  short_name: string;
  description: string;
  category_number: number;
  examples: string[];
  typical_weight_ranges: {
    [industry: string]: { min: number; max: number };
  };
}

export interface Industry {
  id: string;
  industry_id: string;
  name: string;
  description: string;
  sub_sectors: string[];
  expected_weight_patterns: Record<string, { priority: string; rationale: string }>;
}

export interface ScenarioTemplate {
  id: string;
  industry: string;
  title: string;
  description: string;
  category: "natural" | "technological" | "human" | "health";
  probability: "rare" | "unlikely" | "possible" | "likely" | "almost_certain";
  consequence_values: Record<string, number>;
  industry_relevance?: string;
  is_ai_generated?: boolean;
}

export interface QuestionnaireResponse {
  org_size: "small" | "medium" | "large" | "enterprise";
  public_facing: boolean;
  critical_infrastructure: boolean;
  regulatory_environment: "low" | "moderate" | "high" | "very_high";
  geographic_risk: "low" | "moderate" | "high";
  stakeholder_priority: string;
  previous_incidents: string[];
  mission_statement?: string;
  vision_statement?: string;
  core_values?: string[];
}

export interface AHPResult {
  weights: Record<string, number>;
  consistencyRatio: number;
  isConsistent: boolean;
  comparisons: Array<{
    row: string;
    col: string;
    value: number;
  }>;
}

export interface ScenarioValidation {
  scenario_id: string;
  adjusted_weights: Record<string, number>;
  adjustment_rationale: string;
  confidence_level: number;
}

export interface RegulatoryResearch {
  regulations: Array<{
    name: string;
    authority: string;
    consequence_emphasis: string[];
    weight_implications: Record<string, string>;
    relevance_score: number;
  }>;
  recommended_adjustments: Record<string, { min: number; max: number; rationale: string }>;
  confidence_level: "high" | "medium" | "low";
}

export interface AISynthesis {
  recommended_weights: Record<string, number>;
  justifications: Record<string, string>;
  source_contributions: {
    ahp: number;
    questionnaire: number;
    scenarios: number;
    regulatory: number;
    mission: number;
  };
  confidence_scores: Record<string, number>;
  reports: {
    executive: string;
    detailed: string;
    technical: string;
  };
}

export interface WeightingWizardState {
  sessionId: string;
  currentLayer: number;
  questionnaire: QuestionnaireResponse | null;
  ahpResult: AHPResult | null;
  scenarioValidations: ScenarioValidation[];
  regulatoryResearch: RegulatoryResearch | null;
  aiSynthesis: AISynthesis | null;
  finalWeights: Record<string, number> | null;
}

export const WIZARD_LAYERS = [
  { id: 1, title: "Organization Context", description: "Answer questions about your organization" },
  { id: 2, title: "Executive Judgment", description: "Pairwise comparisons using AHP methodology" },
  { id: 3, title: "Scenario Validation", description: "Test weights against realistic scenarios" },
  { id: 4, title: "Regulatory Research", description: "AI analysis of compliance requirements" },
  { id: 5, title: "AI Synthesis", description: "Generate final weight recommendations" },
  { id: 6, title: "Approval & Activation", description: "Review, approve, and activate weights" },
] as const;

export const CONSEQUENCE_NAMES = [
  "Fatalities",
  "Injuries/Illness",
  "Displacement",
  "Psychosocial",
  "Support Systems",
  "Property Damage",
  "Infrastructure",
  "Environmental",
  "Economic",
  "Reputational",
] as const;

export type ConsequenceName = typeof CONSEQUENCE_NAMES[number];
