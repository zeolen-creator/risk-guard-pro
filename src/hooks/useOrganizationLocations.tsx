import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface OrganizationLocation {
  id: string;
  org_id: string;
  location_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  is_headquarters: boolean;
  employee_count: number | null;
  geographic_risks: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useOrganizationLocations() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["organization-locations", profile?.org_id],
    queryFn: async (): Promise<OrganizationLocation[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("organization_locations")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("is_headquarters", { ascending: false })
        .order("location_name");

      if (error) throw error;
      return (data || []) as OrganizationLocation[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (location: Omit<OrganizationLocation, "id" | "org_id" | "created_at" | "updated_at">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const insertData = {
        location_name: location.location_name,
        address: location.address,
        city: location.city,
        province: location.province,
        country: location.country,
        is_headquarters: location.is_headquarters,
        employee_count: location.employee_count,
        geographic_risks: location.geographic_risks as Json,
        org_id: profile.org_id,
      };

      const { data, error } = await supabase
        .from("organization_locations")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-locations"] });
      toast.success("Location added");
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, geographic_risks, ...updates }: Partial<OrganizationLocation> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (geographic_risks) {
        updateData.geographic_risks = geographic_risks as Json;
      }

      const { error } = await supabase
        .from("organization_locations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-locations"] });
      toast.success("Location updated");
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-locations"] });
      toast.success("Location deleted");
    },
  });
}
