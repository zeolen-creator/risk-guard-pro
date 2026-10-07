/** Shared, runtime-independent contract for evidence-based risk tools. */
export type AnalysisKind = "scenarios" | "outlook" | "report";
export interface EvidenceRequest {
  kind: AnalysisKind;
  country: "Canada" | "USA" | "Canada and USA";
  sector: string;
  region: string;
  topic: string;
  horizon_months: number;
  online_research: boolean;
  source_urls: string[];
  document_ids: string[];
  assessment_ids: string[];
}
export interface EvidenceSource {
  id: string;
  kind: "organization" | "assessment" | "document" | "web";
  title: string;
  url?: string;
  record_id?: string;
  retrieved_at: string;
  updated_at?: string;
}
export interface EvidenceClaim { text: string; basis: "evidence" | "inference" | "assumption"; source_ids: string[] }
export interface EvidenceOutput {
  title: string;
  executive_summary: EvidenceClaim[];
  sections: { heading: string; findings: EvidenceClaim[] }[];
  scenarios: { title: string; hazard: string; setting: string; trigger: string; consequences: string[]; capability_gaps: string[]; assumptions: string[]; source_ids: string[] }[];
  outlooks: { hazard: string; direction: "increasing" | "decreasing" | "stable" | "uncertain"; drivers: string[]; monitoring_indicators: string[]; uncertainty: string; source_ids: string[] }[];
  actions: { action: string; owner_role: string; timeframe: string; rationale: string; source_ids: string[] }[];
  assumptions: string[];
  evidence_gaps: string[];
  source_notes: { source_id: string; status: "used" | "not_relevant" | "unreadable"; note: string }[];
}
export interface EvidenceRun {
  id: string; org_id: string; created_by: string; kind: AnalysisKind;
  status: "running" | "completed" | "failed"; created_at: string; completed_at: string | null;
  request: EvidenceRequest; output: EvidenceOutput | null; sources: EvidenceSource[];
  research_text: string | null; error_message: string | null; model: string; method_version: string;
}
export const METHOD_VERSION = "ahra-thira-evidence-v1";
export const FILE_LIMIT = 10 * 1024 * 1024;
export const TOTAL_FILE_LIMIT = 20 * 1024 * 1024;
export const FILE_MIME: Record<string, string> = {
  pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export class EvidenceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!url.hostname.includes(".") || /(?:^|\.)(localhost|local|internal|test)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) return null;
    return url.href;
  } catch { return null; }
}
export function parseEvidenceRequest(value: unknown): EvidenceRequest {
  const v = value as Partial<EvidenceRequest>;
  if (!v || !["scenarios", "outlook", "report"].includes(v.kind ?? "")) throw new EvidenceError("Choose scenarios, outlook, or report.");
  if (!["Canada", "USA", "Canada and USA"].includes(v.country ?? "")) throw new EvidenceError("Choose Canada, USA, or both.");
  for (const [field, max] of [["sector", 120], ["region", 160], ["topic", 800]] as const) {
    if (typeof v[field] !== "string" || v[field]!.length > max || (field === "sector" && !v[field]!.trim())) throw new EvidenceError(`Enter a valid ${field} (maximum ${max} characters).`);
  }
  if (![3, 6, 12, 60].includes(v.horizon_months ?? 0)) throw new EvidenceError("Choose a supported time horizon.");
  if (typeof v.online_research !== "boolean") throw new EvidenceError("Choose whether to include online research.");
  for (const [field, max] of [["document_ids", 3], ["assessment_ids", 5]] as const) {
    const ids = v[field];
    if (!Array.isArray(ids) || ids.length > max || ids.some(id => typeof id !== "string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) || new Set(ids).size !== ids.length) throw new EvidenceError(`Select at most ${max} unique ${field === "document_ids" ? "documents" : "assessments"}.`);
  }
  if (!Array.isArray(v.source_urls) || v.source_urls.length > 5 || v.source_urls.some(url => !publicUrl(url))) throw new EvidenceError("Use at most five public HTTPS source links.");
  if (!v.online_research && v.source_urls.length) throw new EvidenceError("Enable online research to investigate source links, or upload the publications instead.");
  return { kind: v.kind!, country: v.country!, sector: v.sector!.trim(), region: v.region!.trim(), topic: v.topic!.trim(), horizon_months: v.horizon_months!, online_research: v.online_research!, source_urls: v.source_urls!, document_ids: v.document_ids!, assessment_ids: v.assessment_ids! };
}
// Only these user-visible PUBLIC fields are allowed into the web-search pass.
export function publicResearchBrief(request: EvidenceRequest): string {
  return JSON.stringify({ country: request.country, sector: request.sector, region: request.region, topic: request.topic || "All-hazards risk and emerging threats", horizon_months: request.horizon_months, nominated_publications: request.source_urls });
}
export function responseText(response: Record<string, unknown>): string {
  if (response.status !== "completed") throw new EvidenceError("The AI response was incomplete. Please retry with fewer documents or a narrower topic.", 502);
  const output = response.output as { type: string; content?: { type: string; text?: string }[] }[];
  const text = (output ?? []).filter(item => item.type === "message").flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("\n");
  if (!text.trim()) throw new EvidenceError("The AI did not return usable content. Please revise the request.", 502);
  return text;
}
export function webSources(response: Record<string, unknown>, now: string): EvidenceSource[] {
  const output = (response.output ?? []) as { type: string; status?: string; content?: { annotations?: { type: string; url?: string; title?: string }[] }[] }[];
  if (!output.some(item => item.type === "web_search_call" && item.status === "completed")) throw new EvidenceError("Online research did not complete. Retry, or explicitly choose an analysis without online research.", 502);
  const sources: EvidenceSource[] = [];
  for (const item of output) for (const content of item.content ?? []) for (const citation of content.annotations ?? []) {
    const url = publicUrl(citation.url);
    if (citation.type === "url_citation" && url && !sources.some(source => source.url === url)) sources.push({ id: `W${sources.length + 1}`, kind: "web", title: citation.title || url, url, retrieved_at: now });
  }
  if (!sources.length) throw new EvidenceError("No traceable web citations were returned. Narrow the research topic and retry.", 502);
  return sources;
}
const string = { type: "string" };
const strings = { type: "array", items: string };
const object = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: unknown) => ({ type: "array", items });
const claim = object({ text: string, basis: { type: "string", enum: ["evidence", "inference", "assumption"] }, source_ids: strings });
export const EVIDENCE_SCHEMA = object({
  title: string, executive_summary: array(claim), sections: array(object({ heading: string, findings: array(claim) })),
  scenarios: array(object({ title: string, hazard: string, setting: string, trigger: string, consequences: strings, capability_gaps: strings, assumptions: strings, source_ids: strings })),
  outlooks: array(object({ hazard: string, direction: { type: "string", enum: ["increasing", "decreasing", "stable", "uncertain"] }, drivers: strings, monitoring_indicators: strings, uncertainty: string, source_ids: strings })),
  actions: array(object({ action: string, owner_role: string, timeframe: string, rationale: string, source_ids: strings })),
  assumptions: strings, evidence_gaps: strings,
  source_notes: array(object({ source_id: string, status: { type: "string", enum: ["used", "not_relevant", "unreadable"] }, note: string })),
});
function validateSchema(value: unknown, schema: Record<string, any>): boolean {
  if (schema.type === "string") return typeof value === "string" && value.length <= 15000 && (!schema.enum || schema.enum.includes(value));
  if (schema.type === "array") return Array.isArray(value) && value.length <= 80 && value.every(item => validateSchema(item, schema.items));
  if (schema.type === "object") return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => key in schema.properties) && schema.required.every((key: string) => key in (value as object) && validateSchema((value as any)[key], schema.properties[key]));
  return false;
}
export function validateEvidenceOutput(value: unknown, sources: EvidenceSource[], kind: AnalysisKind): EvidenceOutput {
  if (!validateSchema(value, EVIDENCE_SCHEMA)) throw new EvidenceError("The AI returned an invalid report structure. Retry the analysis.", 502);
  const result = value as EvidenceOutput;
  if (!result.title.trim() || !result.executive_summary.length || (kind === "scenarios" && !result.scenarios.length) || (kind === "outlook" && !result.outlooks.length) || (kind === "report" && !result.sections.length)) throw new EvidenceError("The requested analysis is missing from the AI response.", 502);
  const known = new Set(sources.map(source => source.id));
  const notes = result.source_notes;
  if (new Set(notes.map(note => note.source_id)).size !== notes.length || notes.some(note => !known.has(note.source_id)) || sources.some(source => !notes.some(note => note.source_id === source.id))) throw new EvidenceError("The AI did not account for all selected evidence. Retry the analysis.", 502);
  const usable = new Set(notes.filter(note => note.status === "used").map(note => note.source_id));
  const claims = [...result.executive_summary, ...result.sections.flatMap(section => section.findings)];
  const linked = [...claims, ...result.scenarios, ...result.outlooks, ...result.actions];
  if (linked.some(item => item.source_ids.some(id => !known.has(id) || !usable.has(id))) || claims.some(claim => claim.basis === "evidence" && !claim.source_ids.length)) throw new EvidenceError("The AI returned unsupported evidence references. Retry the analysis.", 502);
  return result;
}
