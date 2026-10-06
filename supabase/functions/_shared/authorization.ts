import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

export interface OrganizationAccess {
  supabase: SupabaseClient;
  userId: string;
  orgId: string;
}

function rejection(status: number, error: string, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Validate the token with Auth; never trust a decoded JWT or a caller's org_id. */
export async function requireOrganization(
  req: Request,
  cors: Record<string, string>,
): Promise<OrganizationAccess | Response> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    return rejection(401, "Unauthorized", cors);
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(authorization.slice(7));
    if (error || !user) return rejection(401, "Unauthorized", cors);
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("org_id").eq("user_id", user.id).maybeSingle();
    if (profileError) return rejection(503, "Unable to verify organization access", cors);
    if (!profile?.org_id) return rejection(403, "Organization membership required", cors);
    return { supabase, userId: user.id, orgId: profile.org_id };
  } catch {
    return rejection(503, "Unable to verify organization access", cors);
  }
}

/** Scope linked records before any external API call or privileged write. */
export async function requireOrgResource(
  access: OrganizationAccess,
  table: "assessments" | "weighting_sessions",
  id: unknown,
  cors: Record<string, string>,
): Promise<Response | null> {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return rejection(400, "A valid resource ID is required", cors);
  }
  const { data, error } = await access.supabase.from(table).select("id")
    .eq("id", id).eq("org_id", access.orgId).maybeSingle();
  if (error) return rejection(503, "Unable to verify resource access", cors);
  // Same response for missing and other-organization records.
  return data ? null : rejection(404, "Resource not found", cors);
}
