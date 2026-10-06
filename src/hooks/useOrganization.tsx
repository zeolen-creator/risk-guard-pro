import type { TablesUpdate } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import type { NewsSettings } from "@/constants/canadianProvinces";

export interface Organization {
  id: string;
  name: string;
  sector: string;
  region: string;
  size: string | null;
  description: string | null;
  owner_id: string;
  weights_configured: boolean;
  primary_location: string | null;
  key_facilities: string[] | null;
  industry_type: string | null;
  industry_sub_sectors: string[] | null;
  news_settings: NewsSettings | null;
  created_at: string;
  updated_at: string;
}

export function useOrganization() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["organization", profile?.org_id],
    queryFn: async (): Promise<Organization | null> => {
      if (!profile?.org_id) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.org_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      // Cast news_settings from Json to NewsSettings
      return {
        ...data,
        news_settings: data.news_settings as unknown as NewsSettings | null,
      } as Organization;
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (org: Omit<Organization, "id" | "owner_id" | "created_at" | "updated_at" | "industry_type" | "industry_sub_sectors" | "news_settings">) => {
      if (!user?.id) throw new Error("Not authenticated");

      // One transaction creates the organization, membership, admin role and plan.
      const { data: orgData, error } = await supabase.rpc("create_organization", {
        p_name: org.name,
        p_sector: org.sector,
        p_region: org.region,
        p_size: org.size,
        p_description: org.description,
        p_primary_location: org.primary_location,
        p_key_facilities: org.key_facilities,
      });
      if (error) throw error;

      return orgData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<Organization, "primary_location" | "industry_type" | "industry_sub_sectors" | "news_settings" | "key_facilities">>) => {
      if (!profile?.org_id) throw new Error("No organization found");

      const { data, error } = await supabase
        .from("organizations")
        .update(updates as unknown as TablesUpdate<"organizations">)
        .eq("id", profile.org_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
