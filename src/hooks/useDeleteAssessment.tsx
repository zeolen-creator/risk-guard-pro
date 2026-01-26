import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      // First delete related hazard assignments
      await supabase
        .from("hazard_assignments")
        .delete()
        .eq("assessment_id", assessmentId);

      // Then delete the assessment
      const { error } = await supabase
        .from("assessments")
        .delete()
        .eq("id", assessmentId);

      if (error) throw error;
      return assessmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}
