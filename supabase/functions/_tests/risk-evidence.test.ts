// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseEvidenceRequest, publicResearchBrief, publicUrl, responseText, validateEvidenceOutput, webSources, type EvidenceOutput, type EvidenceSource } from "../_shared/risk-evidence";

const request = { kind: "report", country: "Canada and USA", sector: "Healthcare", region: "Ontario / New York", topic: "Power outages", horizon_months: 12, online_research: true, source_urls: [], document_ids: [], assessment_ids: [] };
const sources: EvidenceSource[] = [{ id: "O1", kind: "organization", title: "Profile", retrieved_at: "2026-10-06" }];
const output: EvidenceOutput = { title: "Risk report", executive_summary: [{ text: "The organization is a hospital.", basis: "evidence", source_ids: ["O1"] }], sections: [{ heading: "Review", findings: [{ text: "Verify backup power capacity.", basis: "inference", source_ids: ["O1"] }] }], scenarios: [], outlooks: [], actions: [], assumptions: [], evidence_gaps: ["No local loss history."], source_notes: [{ source_id: "O1", status: "used", note: "Profile only." }] };

describe("evidence contract", () => {
  it("rejects malformed resource IDs, unsupported countries, excessive file counts and unsafe URLs", () => {
    for (const bad of [{ ...request, document_ids: ["../another-org"] }, { ...request, country: "Mars" }, { ...request, source_urls: ["http://localhost/admin"] }, { ...request, document_ids: Array(4).fill("00000000-0000-4000-8000-000000000001") }]) expect(() => parseEvidenceRequest(bad)).toThrow();
  });
  it("only sends public brief fields to the research pass", () => {
    const parsed = parseEvidenceRequest({ ...request, org_name: "SECRET", document_text: "CONFIDENTIAL", assessment_results: "PRIVATE" });
    const brief = publicResearchBrief(parsed);
    expect(brief).toContain("Healthcare");
    expect(brief).not.toMatch(/SECRET|CONFIDENTIAL|PRIVATE|document_ids|assessment_ids/);
  });
  it("requires explicit online research for nominated URLs", () => {
    expect(() => parseEvidenceRequest({ ...request, online_research: false, source_urls: ["https://www.fema.gov"] })).toThrow(/Enable online/);
  });
  it("extracts real provider citation annotations, not URLs invented in generated text", () => {
    const result = { status: "completed", output: [{ type: "web_search_call", status: "completed" }, { type: "message", content: [{ type: "output_text", text: "https://fake.gov", annotations: [{ type: "url_citation", url: "https://www.fema.gov/", title: "FEMA" }, { type: "url_citation", url: "javascript:alert(1)" }] }] }] };
    expect(webSources(result, "today")).toEqual([{ id: "W1", kind: "web", title: "FEMA", url: "https://www.fema.gov/", retrieved_at: "today" }]);
    expect(() => webSources({ output: result.output.slice(1) }, "today")).toThrow(/did not complete/);
    expect(() => responseText({ status: "incomplete", output: [] })).toThrow(/incomplete/);
  });
  it("rejects unsupported references and evidence claims without a source", () => {
    expect(validateEvidenceOutput(output, sources, "report")).toEqual(output);
    expect(() => validateEvidenceOutput({ ...output, executive_summary: [{ ...output.executive_summary[0], source_ids: ["W99"] }] }, sources, "report")).toThrow(/unsupported/);
    expect(() => validateEvidenceOutput({ ...output, executive_summary: [{ ...output.executive_summary[0], source_ids: [] }] }, sources, "report")).toThrow(/unsupported/);
  });
  it("requires coverage of every selected source and forbids citing unreadable sources", () => {
    expect(() => validateEvidenceOutput({ ...output, source_notes: [] }, sources, "report")).toThrow(/all selected/);
    expect(() => validateEvidenceOutput({ ...output, source_notes: [{ source_id: "O1", status: "unreadable", note: "Missing" }] }, sources, "report")).toThrow(/unsupported/);
    expect(() => validateEvidenceOutput(output, sources, "outlook")).toThrow(/missing/);
  });
  it("rejects unsupported forecast fields and directions", () => {
    expect(() => validateEvidenceOutput({ ...output, invented_probability: 0.9 }, sources, "report")).toThrow(/invalid/);
  });
  it("rejects credential URLs, private hostnames and executable schemes", () => {
    for (const url of ["https://user:pass@example.com", "https://127.0.0.1/a", "https://host.internal/a", "javascript:alert(1)", "https://[::1]/"]) expect(publicUrl(url)).toBeNull();
  });
});
