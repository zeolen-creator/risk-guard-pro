import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface ExternalResource {
  name: string;
  url: string;
}

export interface HazardInfoSheet {
  id: string;
  hazard_name: string;
  hazard_category: string;
  definition: string;
  common_causes: string[] | null;
  warning_signs: string[] | null;
  response_actions: string[] | null;
  external_resources: ExternalResource[];
  industry_notes: Record<string, unknown> | null;
  is_system_provided: boolean;
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapToHazardInfoSheet(sheet: unknown): HazardInfoSheet {
  const s = sheet as Record<string, unknown>;
  return {
    id: s.id as string,
    hazard_name: s.hazard_name as string,
    hazard_category: s.hazard_category as string,
    definition: s.definition as string,
    common_causes: s.common_causes as string[] | null,
    warning_signs: s.warning_signs as string[] | null,
    response_actions: s.response_actions as string[] | null,
    external_resources: Array.isArray(s.external_resources) 
      ? s.external_resources as ExternalResource[]
      : [],
    industry_notes: typeof s.industry_notes === 'object' && s.industry_notes !== null
      ? s.industry_notes as Record<string, unknown>
      : null,
    is_system_provided: s.is_system_provided as boolean,
    org_id: s.org_id as string | null,
    created_at: s.created_at as string,
    updated_at: s.updated_at as string,
  };
}

export function useHazardInfoSheets() {
  return useQuery({
    queryKey: ["hazard-info-sheets"],
    queryFn: async (): Promise<HazardInfoSheet[]> => {
      const { data, error } = await supabase
        .from("hazard_information_sheets")
        .select("*")
        .order("hazard_name");

      if (error) throw error;
      return (data || []).map(mapToHazardInfoSheet);
    },
  });
}

export function useHazardInfoSheet(hazardName: string | null) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["hazard-info-sheet", hazardName, profile?.org_id],
    queryFn: async (): Promise<HazardInfoSheet | null> => {
      if (!hazardName) return null;

      // First try to find org-specific sheet
      if (profile?.org_id) {
        const { data: orgSheet } = await supabase
          .from("hazard_information_sheets")
          .select("*")
          .eq("hazard_name", hazardName)
          .eq("org_id", profile.org_id)
          .maybeSingle();

        if (orgSheet) {
          return mapToHazardInfoSheet(orgSheet);
        }
      }

      // Fall back to system sheet
      const { data: systemSheet, error } = await supabase
        .from("hazard_information_sheets")
        .select("*")
        .eq("hazard_name", hazardName)
        .eq("is_system_provided", true)
        .maybeSingle();

      if (error) throw error;
      
      return systemSheet ? mapToHazardInfoSheet(systemSheet) : null;
    },
    enabled: !!hazardName,
  });
}

export function useCreateHazardInfoSheet() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (sheet: Omit<HazardInfoSheet, "id" | "created_at" | "updated_at" | "is_system_provided">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const insertData = {
        hazard_name: sheet.hazard_name,
        hazard_category: sheet.hazard_category,
        definition: sheet.definition,
        common_causes: sheet.common_causes,
        warning_signs: sheet.warning_signs,
        response_actions: sheet.response_actions,
        external_resources: JSON.stringify(sheet.external_resources),
        industry_notes: sheet.industry_notes ? JSON.stringify(sheet.industry_notes) : null,
        org_id: profile.org_id,
        is_system_provided: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("hazard_information_sheets")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return mapToHazardInfoSheet(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hazard-info-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["hazard-info-sheet"] });
    },
  });
}
