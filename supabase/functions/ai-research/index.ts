import { aiTool, organization, cors } from "../_shared/ai-tool-handler.ts";
import { requireOrgResource } from "../_shared/authorization.ts";
import { research, structured, object, text, nullable, number, bool, strings, choice, array, citations, sourceLinks, AI_METHOD } from "../_shared/modern-ai.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
import { likelihoodFromAnnualProbability, validImpact } from "../_shared/hira-scoring.ts";

const schema = object({
  annual_probability: nullable(number(0, 1)), probability_applicable: bool,
  probability_source_ids: strings, probability_basis: text,
  consequence_impacts: array(object({ consequence_id: text, suggested_value: nullable(number(0, 3)), rationale: text, source_ids: strings })),
  explanation: text, data_quality: choice("strong", "moderate", "limited", "none"),
  conflicting_data: bool, conflict_explanation: text, location_specific: bool, industry_specific: bool,
  evidence_gaps: strings,
});
export const handler = aiTool("assessment-research", async (body, access) => {
  if (!["probability", "consequence"].includes(body.research_type)) throw new EvidenceError("Choose probability or consequence research.");
  if (body.assessment_id) {
    const denied = await requireOrgResource(access, "assessments", body.assessment_id, cors);
    if (denied) throw new EvidenceError("Assessment not available.", 404);
  }
  const org = await organization(access);
  const hazard = await access.supabase.from("hazards").select("id,category,hazards_list,description").eq("id", body.hazard_id).single();
  if (hazard.error || !hazard.data) throw new EvidenceError("Choose an existing hazard.");
  const selected = body.consequences;
  if (body.research_type === "consequence" && (!Array.isArray(selected) || !selected.length || selected.length > 10 || new Set(selected.map(c => c.id)).size !== selected.length)) throw new EvidenceError("Select up to ten unique consequence types.");
  const catalog = body.research_type === "consequence" ? await access.supabase.from("consequences").select("id,category,description").in("id", selected.map(c => c.id)) : { data: [], error: null };
  if (catalog.error || catalog.data.length !== (body.research_type === "consequence" ? selected.length : 0)) throw new EvidenceError("Consequence selection is unavailable.");
  const evidence = await research({ hazard: hazard.data.category, industry: org.sector, region: org.region, locality: org.primary_location, research_type: body.research_type },
    "For likelihood: find annual event probabilities with event definition, denominator and geographic exposure. A return period, a population incident count and a site's annual probability are different quantities. For impacts: identify comparable event severity, exposure, controls and recovery capacity; do not assume global cases transfer unchanged.");
  const result = await structured<any>("assessment_research", schema,
    "Evaluate this hazard for the organization. Return annual_probability only when retrieved evidence explicitly supports an annual probability applicable to this event and organization/location; otherwise null and probability_applicable false. Do not convert dollar loss to probability or treat broad multi-hazard categories as a single event. Scores for impacts use the catalog description and 0=no impact,1=minor/easily managed,2=moderate/requires attention,3=severe/significant consequences. State the assumed event scenario and distinguish illustrative scores from validated measurements. Return null for impacts lacking sufficient contextual evidence. Return one impact per selected catalog ID, no others; for probability return no impacts. Cite each numeric recommendation. Evidence quality is a qualitative appraisal, not statistical confidence.",
    { organization: org, hazard: hazard.data, consequences: catalog.data, type: body.research_type, evidence });
  citations(result.probability_source_ids, evidence.sources, result.annual_probability !== null);
  const ids = catalog.data.map(c => c.id);
  if (result.consequence_impacts.length !== ids.length || new Set(result.consequence_impacts.map(c => c.consequence_id)).size !== ids.length) throw new EvidenceError("AI response omitted or duplicated consequences.", 502);
  for (const impact of result.consequence_impacts) {
    if (!ids.includes(impact.consequence_id) || (impact.suggested_value !== null && !validImpact(impact.suggested_value))) throw new EvidenceError("Invalid impact recommendation.", 502);
    citations(impact.source_ids, evidence.sources, impact.suggested_value !== null);
    impact.consequence_name = catalog.data.find(c => c.id === impact.consequence_id).category;
    if (result.data_quality === "none") impact.suggested_value = null;
  }
  const suggested = result.probability_applicable && result.data_quality !== "none" && !result.conflicting_data ? likelihoodFromAnnualProbability(result.annual_probability) : null;
  return { success: true, cached: false, data: { ...result, suggested_value: suggested, confidence_level: null, explanation: result.explanation + "\n\n" + result.probability_basis + "\nEvidence gaps: " + result.evidence_gaps.join("; "), sources: sourceLinks(evidence.sources), method_version: AI_METHOD, researched_at: new Date().toISOString(), input_snapshot: { organization: org, hazard: hazard.data, consequences: catalog.data } } };
});
Deno.serve(handler);

