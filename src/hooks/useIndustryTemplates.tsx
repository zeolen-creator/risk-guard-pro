import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IndustryTemplate {
  id: string;
  name: string;
  industry_type: string;
  description: string | null;
  hazard_count: number;
  is_system_provided: boolean;
  created_at: string;
}

export interface TemplateHazard {
  id: string;
  template_id: string;
  hazard_name: string;
  category: string;
  description: string | null;
  typical_probability_range: string | null;
  typical_consequence_areas: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export function useIndustryTemplates() {
  return useQuery({
    queryKey: ["industry-templates"],
    queryFn: async (): Promise<IndustryTemplate[]> => {
      const { data, error } = await supabase
        .from("industry_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}

export function useTemplateHazards(templateId: string | null) {
  return useQuery({
    queryKey: ["template-hazards", templateId],
    queryFn: async (): Promise<TemplateHazard[]> => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_hazards")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");

      if (error) throw error;
      return (data || []).map(h => ({
        ...h,
        typical_consequence_areas: typeof h.typical_consequence_areas === 'object' && h.typical_consequence_areas !== null
          ? h.typical_consequence_areas as Record<string, unknown>
          : null,
      }));
    },
    enabled: !!templateId,
  });
}