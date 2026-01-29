import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface EventAssessment {
  id: string;
  org_id: string;
  assessment_id: string | null;
  event_name: string;
  event_type: "conference" | "festival" | "sports" | "concert" | "fair" | "parade" | "other";
  event_date_start: string | null;
  event_date_end: string | null;
  expected_attendance: number | null;
  venue_type: string | null;
  venue_address: string | null;
  is_outdoor: boolean;
  has_food_service: boolean;
  has_alcohol: boolean;
  special_considerations: string | null;
  pre_event_checklist: ChecklistItem[];
  during_event_checklist: ChecklistItem[];
  post_event_checklist: ChecklistItem[];
  status: "planning" | "approved" | "in_progress" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

// Event-specific hazards by event type
export const EVENT_HAZARDS: Record<string, string[]> = {
  conference: [
    "Fire evacuation",
    "Medical emergency",
    "Power outage",
    "Security threat",
    "Food safety (if catered)",
  ],
  festival: [
    "Crowd crush/stampede",
    "Severe weather",
    "Medical emergencies",
    "Food/water contamination",
    "Security incidents",
    "Lost children",
    "Traffic/parking",
  ],
  sports: [
    "Spectator injuries",
    "Crowd control",
    "Weather delays",
    "Medical emergencies",
    "Violence/altercations",
  ],
  concert: [
    "Crowd crush",
    "Sound/lighting failure",
    "Severe weather (outdoor)",
    "Medical emergencies",
    "Security threats",
  ],
  fair: [
    "Ride malfunction",
    "Food safety",
    "Lost children",
    "Weather events",
    "Medical emergencies",
  ],
  parade: [
    "Vehicle incidents",
    "Crowd control",
    "Weather",
    "Medical emergencies",
    "Security threats",
  ],
  other: [
    "Fire evacuation",
    "Medical emergencies",
    "Weather events",
    "Security incidents",
  ],
};

// Default checklists by phase
export const DEFAULT_CHECKLISTS = {
  pre_event: [
    { id: "pre-1", task: "Emergency exits identified and marked", completed: false },
    { id: "pre-2", task: "Medical staff/first aid stations arranged", completed: false },
    { id: "pre-3", task: "Communication plan established", completed: false },
    { id: "pre-4", task: "Security briefing completed", completed: false },
    { id: "pre-5", task: "Weather contingency plan reviewed", completed: false },
  ],
  during_event: [
    { id: "dur-1", task: "Crowd density monitoring active", completed: false },
    { id: "dur-2", task: "Communication channels tested", completed: false },
    { id: "dur-3", task: "First aid stations staffed", completed: false },
    { id: "dur-4", task: "Security patrols active", completed: false },
  ],
  post_event: [
    { id: "post-1", task: "Incident report completed", completed: false },
    { id: "post-2", task: "Lessons learned documented", completed: false },
    { id: "post-3", task: "Equipment returned/accounted for", completed: false },
    { id: "post-4", task: "Follow-up with any injured parties", completed: false },
  ],
};

export function useEventAssessments() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["event-assessments", profile?.org_id],
    queryFn: async (): Promise<EventAssessment[]> => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from("event_assessments")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("event_date_start", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as EventAssessment[];
    },
    enabled: !!profile?.org_id,
  });
}

export function useEventAssessment(id: string) {
  return useQuery({
    queryKey: ["event-assessment", id],
    queryFn: async (): Promise<EventAssessment | null> => {
      const { data, error } = await supabase
        .from("event_assessments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as EventAssessment;
    },
    enabled: !!id,
  });
}

export function useCreateEventAssessment() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<EventAssessment, "id" | "org_id" | "created_at" | "updated_at" | "created_by">) => {
      if (!profile?.org_id) throw new Error("No organization");

      const insertData = {
        event_name: event.event_name,
        event_type: event.event_type,
        event_date_start: event.event_date_start,
        event_date_end: event.event_date_end,
        expected_attendance: event.expected_attendance,
        venue_type: event.venue_type,
        venue_address: event.venue_address,
        is_outdoor: event.is_outdoor,
        has_food_service: event.has_food_service,
        has_alcohol: event.has_alcohol,
        special_considerations: event.special_considerations,
        assessment_id: event.assessment_id,
        status: event.status,
        org_id: profile.org_id,
        created_by: user?.id,
        pre_event_checklist: (event.pre_event_checklist || DEFAULT_CHECKLISTS.pre_event) as unknown as Json,
        during_event_checklist: (event.during_event_checklist || DEFAULT_CHECKLISTS.during_event) as unknown as Json,
        post_event_checklist: (event.post_event_checklist || DEFAULT_CHECKLISTS.post_event) as unknown as Json,
      };

      const { data, error } = await supabase
        .from("event_assessments")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-assessments"] });
      toast.success("Event assessment created");
    },
  });
}

export function useUpdateEventAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pre_event_checklist, during_event_checklist, post_event_checklist, ...updates }: Partial<EventAssessment> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (pre_event_checklist) updateData.pre_event_checklist = pre_event_checklist as unknown as Json;
      if (during_event_checklist) updateData.during_event_checklist = during_event_checklist as unknown as Json;
      if (post_event_checklist) updateData.post_event_checklist = post_event_checklist as unknown as Json;

      const { error } = await supabase
        .from("event_assessments")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["event-assessment", variables.id] });
      toast.success("Event assessment updated");
    },
  });
}

export function useDeleteEventAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_assessments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-assessments"] });
      toast.success("Event assessment deleted");
    },
  });
}

// Helper: Get attendance-based risk multiplier
export function getAttendanceRiskMultiplier(attendance: number): number {
  if (attendance < 100) return 1.0;
  if (attendance < 500) return 1.2;
  if (attendance < 1000) return 1.4;
  if (attendance < 5000) return 1.6;
  if (attendance < 10000) return 1.8;
  return 2.0;
}
