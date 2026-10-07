// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), admin: vi.fn() }));
vi.mock("../_shared/authorization.ts", () => ({ requireOrganization: mocks.authorize }));
vi.mock("https://esm.sh/@supabase/supabase-js@2.91.1", () => ({ createClient: mocks.admin }));
const org = "00000000-0000-4000-8000-000000000001";
const docId = "00000000-0000-4000-8000-000000000002";
const body = { kind: "report", country: "Canada", sector: "Healthcare", region: "Ontario", topic: "Power outages", horizon_months: 12, online_research: true, source_urls: [], document_ids: [docId], assessment_ids: [] };
let handler: (req: Request) => Promise<Response>;
beforeAll(async () => {
  vi.stubGlobal("Deno", { env: { get: () => "test-value" }, serve: vi.fn() });
  handler = (await import("../risk-intelligence/index")).handleEvidence;
});
let queries: { table: string; op: string; filters: [string, unknown][]; value?: any }[];
let docPath: string;
let missingDoc: boolean;
let fetcher: ReturnType<typeof vi.fn>;
function database(privileged = false) {
  return {
    from(table: string) {
      const record = { table, op: "select", filters: [] as [string, unknown][], value: undefined as any }; queries.push(record);
      const result = () => {
        if (privileged) return { data: record.op === "insert" || record.op === "update" ? { id: "saved-run" } : [], error: null, count: 0 };
        if (table === "organizations") return { data: { id: org, name: "PRIVATE ORGANIZATION", description: "PRIVATE PROFILE", sector: "Healthcare" }, error: null };
        if (table === "organization_documents") return { data: missingDoc ? [] : [{ id: docId, name: "private.txt", file_path: docPath, file_size: 8, created_at: "2026-10-06" }], error: null };
        return { data: [], error: null };
      };
      const chain: any = {
        select: () => chain, eq: (key: string, value: unknown) => { record.filters.push([key, value]); return chain; },
        in: (key: string, value: unknown) => { record.filters.push([key, value]); return chain; },
        lt: () => chain, gte: () => chain,
        insert: (value: any) => { record.op = "insert"; record.value = value; return chain; },
        update: (value: any) => { record.op = "update"; record.value = value; return chain; },
        single: async () => result(), then: (resolve: (value: any) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return chain;
    },
    storage: { from: () => ({ download: async () => ({ data: new Blob(["PRIVATE FILE CONTENT"]), error: null }) }) },
  };
}
beforeEach(() => {
  vi.clearAllMocks(); queries = []; docPath = `${org}/private.txt`; missingDoc = false;
  vi.stubGlobal("Deno", { env: { get: () => "test-value" }, serve: vi.fn() });
  mocks.authorize.mockResolvedValue({ orgId: org, userId: "current-user", supabase: database() });
  mocks.admin.mockReturnValue(database(true));
  fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(init.body as string);
    if (payload.tools) return new Response(JSON.stringify({ status: "completed", output: [{ type: "web_search_call", status: "completed" }, { type: "message", content: [{ type: "output_text", text: "Public research with citations.", annotations: [{ type: "url_citation", url: "https://www.fema.gov/", title: "FEMA" }] }] }] }));
    const context = JSON.parse(payload.input[0].content[0].text);
    const result = { title: "Report", executive_summary: [{ text: "Review the evidence.", basis: "inference", source_ids: ["O1"] }], sections: [{ heading: "Findings", findings: [] }], scenarios: [], outlooks: [], actions: [], assumptions: [], evidence_gaps: ["No incident history."], source_notes: context.evidence_manifest.map((s: { id: string }) => ({ source_id: s.id, status: "used", note: "Considered" })) };
    return new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(result) }] }] }));
  });
  vi.stubGlobal("fetch", fetcher);
});
const invoke = (value = body) => handler(new Request("https://example.com", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify(value) }));

describe("evidence generation boundary", () => {
  it("rejects unauthenticated requests before database or provider access", async () => {
    mocks.authorize.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await invoke()).status).toBe(401); expect(fetcher).not.toHaveBeenCalled(); expect(queries).toHaveLength(0);
  });
  it("scopes selected evidence to the current organization and fails closed on missing records", async () => {
    missingDoc = true;
    expect((await invoke()).status).toBe(404);
    expect(queries.find(q => q.table === "organization_documents")?.filters).toContainEqual(["org_id", org]);
    expect(fetcher).not.toHaveBeenCalled(); expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects a forged document storage path before accessing storage or the provider", async () => {
    docPath = "other-org/private.txt";
    expect((await invoke()).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps private evidence out of online searches and persists scoped provenance", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    const research = JSON.parse(fetcher.mock.calls[0][1].body as string);
    const synthesis = JSON.parse(fetcher.mock.calls[1][1].body as string);
    expect(research.input).not.toMatch(/PRIVATE|private.txt|document_ids/);
    expect(research.tool_choice).toBe("required");
    expect(synthesis.tools).toBeUndefined();
    expect(synthesis.input[0].content[0].text).toContain("PRIVATE PROFILE");
    expect(synthesis.input[0].content.some((c: any) => c.type === "input_file")).toBe(true);
    const saved = queries.find(q => q.value?.status === "completed");
    expect(saved?.filters).toContainEqual(["org_id", org]);
    expect(saved?.value.sources.map((s: any) => s.kind)).toEqual(["organization", "document", "web"]);
    expect(queries.some(q => q.table === "assessments" && q.op !== "select")).toBe(false);
  });
  it("supports an explicitly offline evidence run without claiming to have searched", async () => {
    expect((await invoke({ ...body, online_research: false })).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string).tools).toBeUndefined();
    expect(queries.find(q => q.value?.status === "completed")?.value.research_text).toContain("explicitly disabled");
  });
  it("records a failed run when online search fails instead of silently generating uncited research", async () => {
    fetcher.mockResolvedValue(new Response("provider failure", { status: 500 }));
    expect((await invoke()).status).toBe(502);
    expect(queries.some(q => q.value?.status === "failed")).toBe(true);
    expect(queries.some(q => q.value?.status === "completed")).toBe(false);
  });
});
