import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface Control {
  id: string;
  org_id: string;
  hazard_id: string | null;
  name: string;
  description: string | null;
  control_type: "preventive" | "detective" | "corrective" | "administrative";
  implementation_status: "planned" | "in_progress" | "implemented" | "verified";
  effectiveness_rating: number | null;
  last_tested_at: string | null;
  next_review_date: string | null;
  responsible_party: string | null;
  cost_to_implement: number | null;
  created_at: string;
  updated_at: string;
}

export interface ControlTest {
  id: string;
  control_id: string;
  org_id: string;
  test_date: string;
  test_type: "walkthrough" | "observation" | "reperformance" | "inquiry";
  result: "effective" | "partially_effective" | "ineffective";
  findings: string | null;
  recommendations: string | null;
  tested_by: string | null;
  created_at: string;
}

export interface CreateControlInput {
  name: string;
  description?: string;
  control_type: Control["control_type"];
  hazard_id?: string;
  responsible_party?: string;
  cost_to_implement?: number;
  next_review_date?: string;
}

export function useControls() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["controls", profile?.org_id],
    queryFn: async (): Promise<Control[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("controls")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Control[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateControl() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (input: CreateControlInput) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("controls")
        .insert({
          ...input,
          org_id: profile.org_id,
          implementation_status: "planned",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controls"] });
    },
  });
}

export function useUpdateControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Control> & { id: string }) => {
      const { error } = await supabase
        .from("controls")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controls"] });
    },
  });
}

export function useControlTests(controlId?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["control-tests", controlId || profile?.org_id],
    queryFn: async (): Promise<ControlTest[]> => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from("control_tests")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("test_date", { ascending: false });

      if (controlId) {
        query = query.eq("control_id", controlId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ControlTest[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useCreateControlTest() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (input: Omit<ControlTest, "id" | "org_id" | "created_at">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("control_tests")
        .insert({
          ...input,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["control-tests"] });
      queryClient.invalidateQueries({ queryKey: ["controls"] });
    },
  });
}
