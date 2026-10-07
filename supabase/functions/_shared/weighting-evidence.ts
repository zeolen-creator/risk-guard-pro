import { requireOrgResource, type OrganizationAccess } from "./authorization.ts";
import { cors } from "./ai-tool-handler.ts";
import { EvidenceError } from "./risk-evidence.ts";
export async function weightingSession(access: OrganizationAccess, id: unknown) {
  const denied = await requireOrgResource(access, "weighting_sessions", id, cors);
  if (denied) throw new EvidenceError("Weighting session unavailable.", 404);
  const { data, error } = await access.supabase.from("weighting_sessions").select("*").eq("id", id).single();
  if (error || !data || ["approved", "archived"].includes(data.status)) throw new EvidenceError("Start a new weighting session to change approved research.");
  return data;
}
export async function invalidateSynthesis(access: OrganizationAccess, id: string) {
  const result = await access.supabase.from("weighting_sessions").update({ layer4_completed: false, layer5_completed: false }).eq("id", id).in("status", ["in_progress", "completed"]).select("id").single();
  if (result.error) throw new EvidenceError("The session changed. Refresh before continuing.", 409);
  const invalidated = await access.supabase.from("weighting_ai_synthesis").update({ all_checks_passed: false }).eq("session_id", id);
  if (invalidated.error) throw new EvidenceError("Could not invalidate the previous synthesis.", 503);
}

