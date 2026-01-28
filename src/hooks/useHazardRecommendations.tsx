import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { Hazard } from "./useHazards";
import { useAuth } from "./useAuth";

export interface RegulatoryRequirement {
  id: string;
  hazard_id: string;
  regulation_name: string;
  regulation_section: string | null;
  requirement_description: string;
  non_compliance_consequences: string;
  source_url: string | null;
}

export interface HazardScore {
  hazard_id: string;
  relevance_score: number;
  tier: "high" | "medium" | "low";
  ai_reasoning: string;
  is_mandatory: boolean;
  regulatory_requirement?: RegulatoryRequirement;
  peer_adoption_rate: number | null;
}

export interface RecommendationStats {
  total: number;
  mandatory: number;
  high_tier: number;
  medium_tier: number;
  low_tier: number;
  cached: number;
  ai_scored: number;
}

interface RecommendationResponse {
  success: boolean;
  data?: {
    scores: HazardScore[];
    stats: RecommendationStats;
    duration_ms: number;
  };
  error?: string;
}

export function useHazardRecommendations(hazards: Hazard[]) {
  const { data: organization } = useOrganization();
  const { session } = useAuth();

  return useQuery({
    queryKey: ["hazard-recommendations", organization?.id, hazards.length],
    queryFn: async (): Promise<{ scores: HazardScore[]; stats: RecommendationStats }> => {
      if (!organization || !session?.access_token || hazards.length === 0) {
        return { scores: [], stats: { total: 0, mandatory: 0, high_tier: 0, medium_tier: 0, low_tier: 0, cached: 0, ai_scored: 0 } };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hazard-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            hazards: hazards.map(h => ({
              id: h.id,
              category: h.category,
              category_number: h.category_number,
              hazards_list: h.hazards_list,
              tags: h.tags,
            })),
            org_context: {
              id: organization.id,
              name: organization.name,
              sector: organization.sector,
              region: organization.region,
              primary_location: organization.primary_location,
              industry_type: organization.industry_type,
              industry_sub_sectors: organization.industry_sub_sectors,
              size: organization.size,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.status}`);
      }

      const result: RecommendationResponse = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get recommendations");
      }

      return {
        scores: result.data.scores,
        stats: result.data.stats,
      };
    },
    enabled: !!organization?.id && !!session?.access_token && hazards.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useLogComplianceOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      hazard_id,
      regulatory_requirement_id,
      regulation_name,
      action,
      reason,
      assessment_id,
    }: {
      hazard_id: string;
      regulatory_requirement_id?: string;
      regulation_name: string;
      action: "unchecked" | "acknowledged";
      reason?: string;
      assessment_id?: string;
    }) => {
      if (!user?.id || !organization?.id) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("compliance_override_logs")
        .insert({
          org_id: organization.id,
          user_id: user.id,
          hazard_id,
          regulatory_requirement_id,
          regulation_name,
          action,
          reason,
          assessment_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-logs"] });
    },
  });
}

// Helper to get ordered hazards by recommendation
export function getOrderedHazards(
  hazards: Hazard[],
  scores: HazardScore[]
): { hazard: Hazard; score: HazardScore | null }[] {
  const scoreMap = new Map(scores.map(s => [s.hazard_id, s]));
  
  const result = hazards.map(h => ({
    hazard: h,
    score: scoreMap.get(h.id) || null,
  }));

  // Sort by score (mandatory first, then by relevance)
  result.sort((a, b) => {
    const aScore = a.score;
    const bScore = b.score;
    
    // If no scores, maintain original order
    if (!aScore && !bScore) return 0;
    if (!aScore) return 1;
    if (!bScore) return -1;
    
    // Mandatory items first
    if (aScore.is_mandatory && !bScore.is_mandatory) return -1;
    if (!aScore.is_mandatory && bScore.is_mandatory) return 1;
    
    // Then by relevance score
    return bScore.relevance_score - aScore.relevance_score;
  });

  return result;
}

// Get default selected hazards (mandatory + high tier)
export function getDefaultSelectedHazards(scores: HazardScore[]): string[] {
  return scores
    .filter(s => s.is_mandatory || s.tier === "high")
    .map(s => s.hazard_id);
}
