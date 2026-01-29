import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

interface HazardInfoRequest {
  id: string;
  hazard_name: string;
  hazard_category: string | null;
  requested_by: string | null;
  org_id: string;
  status: string;
  created_at: string;
  notes: string | null;
}

export function useHazardInfoRequests() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["hazard-info-requests", profile?.org_id],
    queryFn: async (): Promise<HazardInfoRequest[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("hazard_info_requests")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.org_id,
  });
}

export function useRequestHazardInfoSheet() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ hazardName, hazardCategory }: { hazardName: string; hazardCategory?: string }) => {
      if (!profile?.org_id || !profile?.user_id) {
        throw new Error("You must be logged in to request info sheets");
      }

      // Check if already requested
      const { data: existing } = await supabase
        .from("hazard_info_requests")
        .select("id")
        .eq("hazard_name", hazardName)
        .eq("org_id", profile.org_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        throw new Error("This hazard info sheet has already been requested");
      }

      const { error } = await supabase
        .from("hazard_info_requests")
        .insert({
          hazard_name: hazardName,
          hazard_category: hazardCategory || null,
          requested_by: profile.user_id,
          org_id: profile.org_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Info sheet request submitted! We'll add content for this hazard soon.");
      queryClient.invalidateQueries({ queryKey: ["hazard-info-requests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
