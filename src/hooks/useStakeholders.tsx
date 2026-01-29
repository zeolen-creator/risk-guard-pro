import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface Stakeholder {
  id: string;
  org_id: string;
  name: string;
  role: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StakeholderReview {
  id: string;
  assessment_id: string;
  stakeholder_id: string;
  org_id: string;
  status: "pending" | "in_review" | "approved" | "changes_requested" | "declined";
  comments: string | null;
  sent_at: string;
  reviewed_at: string | null;
  created_at: string;
  stakeholder?: Stakeholder;
}

export function useStakeholders() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["stakeholders", profile?.org_id],
    queryFn: async (): Promise<Stakeholder[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("stakeholders")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as Stakeholder[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateStakeholder() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (stakeholder: Omit<Stakeholder, "id" | "org_id" | "created_at" | "updated_at" | "is_active">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("stakeholders")
        .insert({
          ...stakeholder,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("Stakeholder added");
    },
  });
}

export function useUpdateStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Stakeholder> & { id: string }) => {
      const { error } = await supabase
        .from("stakeholders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("Stakeholder updated");
    },
  });
}

export function useDeleteStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stakeholders")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("Stakeholder removed");
    },
  });
}

export function useStakeholderReviews(assessmentId: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["stakeholder-reviews", assessmentId],
    queryFn: async (): Promise<StakeholderReview[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("stakeholder_reviews")
        .select(`
          *,
          stakeholder:stakeholders(*)
        `)
        .eq("assessment_id", assessmentId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StakeholderReview[];
    },
    enabled: !!profile?.org_id && !!assessmentId,
  });
}

export function useSendForReview() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ assessmentId, stakeholderIds }: { assessmentId: string; stakeholderIds: string[] }) => {
      if (!profile?.org_id) throw new Error("No organization");

      const reviews = stakeholderIds.map(stakeholderId => ({
        assessment_id: assessmentId,
        stakeholder_id: stakeholderId,
        org_id: profile.org_id,
        status: "pending" as const,
      }));

      const { error } = await supabase
        .from("stakeholder_reviews")
        .insert(reviews);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholder-reviews"] });
      toast.success("Review requests sent");
    },
  });
}

export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: StakeholderReview["status"]; comments?: string }) => {
      const { error } = await supabase
        .from("stakeholder_reviews")
        .update({
          status,
          comments,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholder-reviews"] });
      toast.success("Review status updated");
    },
  });
}
