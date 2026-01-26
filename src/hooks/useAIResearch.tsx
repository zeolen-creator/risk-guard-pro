import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface AISource {
  title: string;
  url: string;
  date: string;
  relevance: "high" | "medium" | "low";
}

export interface ConsequenceImpact {
  consequence_id: string;
  consequence_name: string;
  suggested_value: number | null;
  rationale: string;
}

export interface ConsequenceInfo {
  id: string;
  name: string;
  weight: number;
}

export interface AIResearchData {
  suggested_value?: number;
  consequence_impacts?: ConsequenceImpact[];
  explanation: string;
  sources: AISource[];
  confidence_level: number;
  data_quality: "strong" | "moderate" | "limited" | "none";
  conflicting_data: boolean;
  conflict_explanation?: string;
  location_specific: boolean;
  industry_specific: boolean;
}

export interface AIResearchResult {
  success: boolean;
  data?: AIResearchData;
  error?: string;
  cached?: boolean;
}

interface ResearchParams {
  hazardName: string;
  hazardCategory: string;
  researchType: "probability" | "consequence";
  consequences?: ConsequenceInfo[];
  assessmentId?: string;
  hazardId?: string;
}

export function useAIResearch() {
  const { data: organization } = useOrganization();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, AIResearchResult>>({});

  const research = async ({
    hazardName,
    hazardCategory,
    researchType,
    consequences,
    assessmentId,
    hazardId,
  }: ResearchParams): Promise<AIResearchResult | null> => {
    if (!organization) {
      toast({
        title: "Error",
        description: "Organization context not available",
        variant: "destructive",
      });
      return null;
    }

    const cacheKey = `${hazardId}_${researchType}`;
    
    // Check local state cache first
    if (results[cacheKey]?.success) {
      return results[cacheKey];
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: {
          hazard_name: hazardName,
          hazard_category: hazardCategory,
          research_type: researchType,
          consequences: consequences,
          org_context: {
            name: organization.name,
            sector: organization.sector,
            region: organization.region,
            primary_location: organization.primary_location,
            key_facilities: organization.key_facilities,
            size: organization.size,
          },
          assessment_id: assessmentId,
          hazard_id: hazardId,
        },
      });

      if (error) {
        const errorMessage = error.message || "AI research failed";
        toast({
          title: "Research Error",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }

      const result = data as AIResearchResult;
      
      if (result.success) {
        setResults((prev) => ({ ...prev, [cacheKey]: result }));
        
        if (result.cached) {
          toast({
            title: "Research Complete",
            description: "Retrieved cached research data",
          });
        } else if (result.data?.data_quality === "none") {
          toast({
            title: "Limited Data",
            description: "No reliable data found for this hazard",
            variant: "destructive",
          });
        } else if (result.data?.conflicting_data) {
          toast({
            title: "Conflicting Sources",
            description: "Sources provide conflicting information - review carefully",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Research Complete",
            description: `Found ${result.data?.sources?.length || 0} sources with ${Math.round((result.data?.confidence_level || 0) * 100)}% confidence`,
          });
        }
      } else {
        toast({
          title: "Research Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Research Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = (hazardId?: string, researchType?: string) => {
    if (hazardId && researchType) {
      const cacheKey = `${hazardId}_${researchType}`;
      setResults((prev) => {
        const newResults = { ...prev };
        delete newResults[cacheKey];
        return newResults;
      });
    } else {
      setResults({});
    }
  };

  const getCachedResult = (hazardId: string, researchType: string): AIResearchResult | null => {
    const cacheKey = `${hazardId}_${researchType}`;
    return results[cacheKey] || null;
  };

  return {
    research,
    isLoading,
    results,
    clearCache,
    getCachedResult,
    hasOrganizationContext: !!organization,
  };
}
