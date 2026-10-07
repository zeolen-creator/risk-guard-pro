import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { requireOrganization, requireOrgResource, type OrganizationAccess } from "./authorization.ts";
import { EvidenceError } from "./risk-evidence.ts";
import { aiModel, AI_METHOD } from "./modern-ai.ts";
export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
export function aiTool(kind: string, work: (body: Record<string, any>, access: OrganizationAccess) => Promise<unknown>) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    const access = await requireOrganization(req, cors);
    if (access instanceof Response) return access;
    let id: string | undefined;
    let admin: any;
    try {
      const raw = await req.text();
      if (raw.length > 40000) throw new EvidenceError("Request too large.");
      let body; try { body = JSON.parse(raw); } catch { throw new EvidenceError("Invalid request."); }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new EvidenceError("Invalid request.");
      for (const [field, table] of [["session_id", "weighting_sessions"], ["assessment_id", "assessments"]] as const) {
        if (body[field] !== undefined) {
          const denied = await requireOrgResource(access, table, body[field], cors);
          if (denied) return denied;
        }
      }
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!key) throw new EvidenceError("AI audit storage is not configured.", 503);
      admin = createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false } });
      const now = new Date().toISOString();
      const expired = await admin.from("ai_tool_runs").update({ status: "failed", error_message: "Request expired", completed_at: now } as any).eq("created_by", access.userId).eq("status", "running").lt("created_at", new Date(Date.now() - 5 * 60000).toISOString());
      if (expired.error) throw new EvidenceError("Apply the AI tools database migration first.", 503);
      const recent = await admin.from("ai_tool_runs").select("id", { count: "exact", head: true }).eq("created_by", access.userId).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if (recent.error) throw new EvidenceError("Could not check AI request limit.", 503);
      if ((recent.count || 0) >= 30) throw new EvidenceError("30 AI requests per hour reached. Please retry later.", 429);
      const started = await admin.from("ai_tool_runs").insert({ org_id: access.orgId, created_by: access.userId, kind, model: aiModel(), method_version: AI_METHOD } as any).select("id").single();
      if (started.error) throw new EvidenceError(started.error.code === "23505" ? "An AI tool is already running. Wait for it to finish." : "Could not start AI analysis.", 409);
      if (!started.data?.id) throw new EvidenceError("Could not start AI analysis.", 503);
      id = started.data.id;
      const output = await work(body, access);
      const saved = await admin.from("ai_tool_runs").update({ status: "completed", output, completed_at: new Date().toISOString() } as any).eq("id", id).eq("org_id", access.orgId);
      if (saved.error) throw new EvidenceError("Could not save the AI audit record. Retry later.", 503);
      return json(output);
    } catch (cause) {
      const message = cause instanceof EvidenceError ? cause.message : "Analysis could not be completed. No new AI recommendation is available.";
      if (admin && id) await admin.from("ai_tool_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() } as any).eq("id", id).eq("org_id", access.orgId);
      return json({ success: false, error: message }, cause instanceof EvidenceError ? cause.status : 500);
    }
  };
}
export async function organization(access: OrganizationAccess) {
  const { data, error } = await access.supabase.from("organizations").select("id,name,sector,region,primary_location,industry_type,industry_sub_sectors,size,key_facilities,description,vulnerability_factors").eq("id", access.orgId).single();
  if (error || !data) throw new EvidenceError("Could not load your organization profile.", 503);
  return data;
}
