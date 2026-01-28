import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface TeamStats {
  activeUsers: number;
  lastActivity: Date | null;
}

export function useTeamStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["team-stats", profile?.org_id],
    queryFn: async (): Promise<TeamStats> => {
      if (!profile?.org_id) {
        return { activeUsers: 0, lastActivity: null };
      }

      // Count all users in the organization
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("org_id", profile.org_id);

      if (countError) throw countError;

      // Get the most recent activity from assessments
      const { data: recentActivity, error: activityError } = await supabase
        .from("assessments")
        .select("updated_at")
        .eq("org_id", profile.org_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activityError) throw activityError;

      return {
        activeUsers: count || 0,
        lastActivity: recentActivity?.updated_at ? new Date(recentActivity.updated_at) : null,
      };
    },
    enabled: !!profile?.org_id,
  });
}
