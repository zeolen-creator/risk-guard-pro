// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), handlers: [] as Array<(req: Request) => Promise<Response>> }));
vi.mock("https://esm.sh/@supabase/supabase-js@2.91.1", () => ({ createClient: mocks.createClient }));
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient: mocks.createClient }));
vi.mock("https://esm.sh/@supabase/supabase-js@2.49.1", () => ({ createClient: mocks.createClient }));
vi.mock("https://deno.land/std@0.168.0/http/server.ts", () => ({ serve: (fn: (req: Request) => Promise<Response>) => mocks.handlers.push(fn) }));
vi.mock("https://deno.land/x/xhr@0.1.0/mod.ts", () => ({}));
import { requireOrganization, requireOrgResource } from "../_shared/authorization";

const orgA = "00000000-0000-4000-8000-000000000001";
const recordId = "00000000-0000-4000-8000-000000000002";
const cors = { "Access-Control-Allow-Origin": "*" };

function client(profile: { org_id: string } | null = { org_id: orgA }) {
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((key: string, value: unknown) => { filters.push([key,value]); return query; }),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };
  const sdk = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-a" } }, error: null }) }, from: vi.fn(() => query) };
  mocks.createClient.mockReturnValue(sdk);
  return { sdk, query, filters };
}
const request = (token?: string) => new Request("https://example.test", {
  method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("Deno", { env: { get: () => "test-configuration" }, serve: (fn: (req: Request) => Promise<Response>) => mocks.handlers.push(fn) });
});

describe("organization authorization", () => {
  it("rejects absent tokens without creating a client", async () => {
    const result = await requireOrganization(request(), cors);
    expect((result as Response).status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("rejects expired or forged tokens before querying data", async () => {
    const { sdk } = client();
    sdk.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Invalid JWT") });
    const result = await requireOrganization(request("forged"), cors);
    expect((result as Response).status).toBe(401);
    expect(sdk.from).not.toHaveBeenCalled();
  });
  it("rejects valid users without membership", async () => {
    client(null);
    expect((await requireOrganization(request("valid"), cors) as Response).status).toBe(403);
  });
  it("uses the verified user's membership and forwards their token", async () => {
    const { sdk, filters } = client();
    const result = await requireOrganization(request("valid"), cors);
    expect(result).toMatchObject({ userId: "user-a", orgId: orgA });
    expect(sdk.auth.getUser).toHaveBeenCalledWith("valid");
    expect(filters).toContainEqual(["user_id", "user-a"]);
    expect(mocks.createClient.mock.calls[0][2].global.headers.Authorization).toBe("Bearer valid");
  });
  it("fails closed when membership cannot be checked", async () => {
    const { query } = client();
    query.maybeSingle.mockResolvedValue({ data: null, error: new Error("Database offline") });
    expect((await requireOrganization(request("valid"), cors) as Response).status).toBe(503);
  });
  it("denies a resource from another organization before further processing", async () => {
    const { query, filters } = client();
    const access = await requireOrganization(request("valid"), cors);
    if (access instanceof Response) throw new Error("Unexpected denial");
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await requireOrgResource(access, "weighting_sessions", recordId, cors))?.status).toBe(404);
    expect(filters).toContainEqual(["id", recordId]);
    expect(filters).toContainEqual(["org_id", orgA]);
    query.maybeSingle.mockResolvedValue({ data: { id: recordId }, error: null });
    expect(await requireOrgResource(access, "assessments", recordId, cors)).toBeNull();
  });
});

describe("Edge Function entry points", () => {
  const modules = import.meta.glob("../*/index.ts");
  for (const [path, load] of Object.entries(modules)) {
    it(`${path}: rejects anonymous calls and permits CORS preflight`, async () => {
      const previous = mocks.handlers.length;
      await load();
      const handler = mocks.handlers[previous];
      expect(handler).toBeTypeOf("function");
      expect((await handler(new Request("https://example.test", { method: "OPTIONS" }))).status).toBe(200);
      const response = await handler(request());
      expect(response.status).toBe(401);
      expect(mocks.createClient).not.toHaveBeenCalled();
      const { sdk } = client();
      sdk.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Invalid JWT") });
      expect((await handler(request("invalid"))).status).toBe(401);
      expect(sdk.from).not.toHaveBeenCalled();
      if (path.includes("calculate-consequence-weights")) {
        const { query } = client();
        query.maybeSingle.mockResolvedValueOnce({ data: { org_id: orgA }, error: null })
          .mockResolvedValueOnce({ data: null, error: null });
        const fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        const denied = await handler(new Request("https://example.test", {
          method: "POST", headers: { Authorization: "Bearer valid" },
          body: JSON.stringify({ session_id: recordId }),
        }));
        expect(denied.status).toBe(404);
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
      }
    });
  }
});
