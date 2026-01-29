import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface InfrastructureAsset {
  id: string;
  org_id: string;
  location_id: string | null;
  asset_name: string;
  asset_type: string;
  criticality: "low" | "medium" | "high" | "critical";
  description: string | null;
  vendor: string | null;
  replacement_cost: number | null;
  recovery_time_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureDependency {
  id: string;
  org_id: string;
  upstream_asset_id: string;
  downstream_asset_id: string;
  dependency_type: "power" | "data" | "physical" | "logical" | "process";
  criticality: "low" | "medium" | "high" | "critical";
  notes: string | null;
  created_at: string;
  upstream_asset?: InfrastructureAsset;
  downstream_asset?: InfrastructureAsset;
}

export function useInfrastructureAssets() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["infrastructure-assets", profile?.org_id],
    queryFn: async (): Promise<InfrastructureAsset[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("infrastructure_assets")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("criticality", { ascending: false })
        .order("asset_name");

      if (error) throw error;
      return (data || []) as InfrastructureAsset[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateInfrastructureAsset() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (asset: Omit<InfrastructureAsset, "id" | "org_id" | "created_at" | "updated_at">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("infrastructure_assets")
        .insert({
          ...asset,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructure-assets"] });
      toast.success("Asset added");
    },
  });
}

export function useUpdateInfrastructureAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InfrastructureAsset> & { id: string }) => {
      const { error } = await supabase
        .from("infrastructure_assets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructure-assets"] });
      toast.success("Asset updated");
    },
  });
}

export function useDeleteInfrastructureAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("infrastructure_assets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructure-assets"] });
      queryClient.invalidateQueries({ queryKey: ["infrastructure-dependencies"] });
      toast.success("Asset deleted");
    },
  });
}

export function useInfrastructureDependencies() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["infrastructure-dependencies", profile?.org_id],
    queryFn: async (): Promise<InfrastructureDependency[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("infrastructure_dependencies")
        .select(`
          *,
          upstream_asset:infrastructure_assets!upstream_asset_id(*),
          downstream_asset:infrastructure_assets!downstream_asset_id(*)
        `)
        .eq("org_id", profile.org_id);

      if (error) throw error;
      return (data || []) as unknown as InfrastructureDependency[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateDependency() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (dependency: Omit<InfrastructureDependency, "id" | "org_id" | "created_at" | "upstream_asset" | "downstream_asset">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("infrastructure_dependencies")
        .insert({
          ...dependency,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructure-dependencies"] });
      toast.success("Dependency added");
    },
  });
}

export function useDeleteDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("infrastructure_dependencies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infrastructure-dependencies"] });
      toast.success("Dependency removed");
    },
  });
}

// Helper: Find cascade failures
export function findCascadeFailures(
  assetId: string,
  dependencies: InfrastructureDependency[]
): string[] {
  const affectedAssets = new Set<string>();
  const queue = [assetId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    dependencies
      .filter(d => d.upstream_asset_id === currentId)
      .forEach(d => {
        if (!affectedAssets.has(d.downstream_asset_id)) {
          affectedAssets.add(d.downstream_asset_id);
          queue.push(d.downstream_asset_id);
        }
      });
  }

  return Array.from(affectedAssets);
}

// Helper: Find single points of failure
export function findSinglePointsOfFailure(
  assets: InfrastructureAsset[],
  dependencies: InfrastructureDependency[]
): InfrastructureAsset[] {
  return assets.filter(asset => {
    const cascadeCount = findCascadeFailures(asset.id, dependencies).length;
    // If failing this asset affects 3 or more other assets, it's a SPOF
    return cascadeCount >= 3;
  });
}
