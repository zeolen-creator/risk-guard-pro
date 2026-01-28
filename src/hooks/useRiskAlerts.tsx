import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useToast } from "./use-toast";

export interface RiskAlert {
  id: string;
  org_id: string;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  hazard_ids: string[];
  action_required: string | null;
  source_data: Record<string, unknown>;
  is_read: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export function useRiskAlerts() {
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["risk-alerts", profile?.org_id],
    queryFn: async (): Promise<RiskAlert[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("risk_alerts")
        .select("*")
        .eq("org_id", profile.org_id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as RiskAlert[];
    },
    enabled: !!profile?.org_id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!profile?.org_id) return;

    const channel = supabase
      .channel("risk-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "risk_alerts",
          filter: `org_id=eq.${profile.org_id}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ["risk-alerts", profile.org_id],
            (old: RiskAlert[] | undefined) => [payload.new as RiskAlert, ...(old || [])]
          );

          const newAlert = payload.new as RiskAlert;
          if (newAlert.severity === "critical" || newAlert.severity === "high") {
            toast({
              title: newAlert.title,
              description: newAlert.description,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.org_id, queryClient, toast]);

  return query;
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("risk_alerts")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("risk_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });
    },
  });
}
