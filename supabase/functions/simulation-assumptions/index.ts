import { aiTool, organization } from "../_shared/ai-tool-handler.ts";
import { research, structured, object, array, text, number, strings, sourceLinks, citations, AI_METHOD } from "../_shared/modern-ai.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";

const distribution = object({ min: number(0, 1e12), mode: number(0, 1e12), max: number(0, 1e12) });
const schema = object({
  frequency_distribution: distribution,
  direct_cost_distribution: distribution,
  indirect_cost_distribution: distribution,
  rationale: text,
  evidence_gaps: strings,
  source_ids: strings,
});

export const handler = aiTool("simulation-assumptions", async (body, access) => {
  const org = await organization(access);
  const template = await access.supabase.from("simulation_templates").select("id,template_name,hazard_category,hazard_name,region,description,default_parameters,source_notes").eq("id", body.template_id).single();
  if (template.error || !template.data) throw new EvidenceError("Choose an existing simulation template.");
  const evidence = await research({
    hazard: template.data.hazard_name || template.data.template_name,
    industry: org.sector,
    region: org.region,
    locality: org.primary_location,
    country: body.country || "Canada and United States",
    purpose: "propose bounded Monte Carlo assumptions for annual frequency and direct/indirect costs",
  }, "Find current authoritative public evidence, preferably government agencies, regulators, public incident datasets and peer-reviewed studies. Look for comparable event definitions, denominators, geography, industry and cost components. Do not invent organization-specific rates. Population incident counts are not facility probabilities. Cost figures must identify currency, year and whether they are direct, indirect or total. Return evidence that can be used as context for ranges, not validated forecasts.");
  const result = await structured<any>("simulation_assumption_recommendation", schema,
    "Propose screening ranges only. Use the template as a starting point, but revise it only when retrieved evidence supports a comparable scenario. Every numeric range must be defensible from cited evidence; otherwise retain the template value and explain the gap. Ensure min <= mode <= max. Frequency is events per year; costs are per event in the organization's local currency. Never convert loss into probability. Explicitly state uncertainty and that the user must review and replace these values.",
    { organization: org, template: template.data, evidence });
  if (result.source_ids.length === 0) throw new EvidenceError("The research did not return usable citations.", 502);
  citations(result.source_ids, evidence.sources, true);
  for (const name of ["frequency_distribution", "direct_cost_distribution", "indirect_cost_distribution"]) {
    const d = result[name];
    if (!(d.min <= d.mode && d.mode <= d.max)) throw new EvidenceError("The research returned an invalid assumption range.", 502);
  }
  return { success: true, data: { ...result, sources: sourceLinks(evidence.sources), source_quality: "published_context_requires_review", method_version: AI_METHOD, researched_at: new Date().toISOString() } };
});

Deno.serve(handler);

