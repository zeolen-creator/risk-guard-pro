import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export function useUserRole() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["user-role", user?.id, profile?.org_id],
    queryFn: async () => {
      if (!user?.id || !profile?.org_id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (error) throw error;
      return data?.role || "member";
    },
    enabled: !!user?.id && !!profile?.org_id,
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return { isAdmin: role === "admin", isLoading };
}
