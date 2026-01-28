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

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          ...org,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile with org_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ org_id: orgData.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Create admin role for user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          org_id: orgData.id,
          role: "admin",
        });

      if (roleError) throw roleError;

      // Create free subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          org_id: orgData.id,
          plan_type: "free",
          assessments_limit: 1,
        });

      if (subError) throw subError;

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
        .update(updates as Record<string, unknown>)
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
