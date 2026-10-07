import { aiTool, organization } from "../_shared/ai-tool-handler.ts";
import { weightingSession, invalidateSynthesis } from "../_shared/weighting-evidence.ts";
import { research, structured, object, array, text, strings, nullable, number, choice, citations, sourceLinks, AI_METHOD } from "../_shared/modern-ai.ts";
import { WEIGHT_KEYS } from "../_shared/weights.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
const entry = object({ consequence: { type: "string", enum: [...WEIGHT_KEYS] }, regulatory_emphasis: nullable(number(0,100)), key_regulations: strings, penalty_examples: strings, compliance_notes: text, source_ids: strings });
const regulation = object({ name: text, citation: text, authority: text, jurisdiction: text, effective_date: text, source_type: choice("legislation","regulation","standard","guidance"), applicability: text, source_ids: strings });
const schema = object({ consequence_analysis: array(entry), regulations_found: array(regulation), compliance_summary: text, data_gaps: strings });
export const handler = aiTool("regulatory-research", async (body, access) => {
  await weightingSession(access, body.session_id);
  const org = await organization(access);
  const industry = org.industry_type || org.sector;
  const jurisdiction = org.primary_location || org.region;
  const evidence = await research({ industry, jurisdiction }, "Use official government/regulator legal texts. Distinguish federal, provincial/state, municipal and sector applicability; statutes from voluntary standards; current requirements from proposed or superseded rules. Do not infer legally mandated percentage weights.");
  const result = await structured<any>("regulatory_evidence", schema,
    "Cover all ten consequence keys exactly once. Regulatory emphasis is a qualitative review aid expressed on 0-100, NOT a legally mandated weight. Use null when evidence is insufficient. Each claimed regulation or penalty needs an official retrieved citation with section and applicable jurisdiction. If the source does not establish a penalty omit it. For each obligation explain conditional applicability and dates; never claim this research establishes compliance. Do not invent minimum weights. Source gaps must be explicit.",
    { industry, jurisdiction, consequence_keys: WEIGHT_KEYS, evidence });
  if (result.consequence_analysis.length !== 10 || new Set(result.consequence_analysis.map(c => c.consequence)).size !== 10) throw new EvidenceError("Incomplete consequence coverage.", 502);
  for (const c of result.consequence_analysis) citations(c.source_ids, evidence.sources, c.regulatory_emphasis !== null || c.key_regulations.length > 0 || c.penalty_examples.length > 0);
  for (const r of result.regulations_found) citations(r.source_ids, evidence.sources, true);
  const analysis = Object.fromEntries(result.consequence_analysis.map(c => [c.consequence, c]));
  const top = [...result.consequence_analysis].filter(c => c.regulatory_emphasis !== null).sort((a,b) => b.regulatory_emphasis-a.regulatory_emphasis).slice(0,3).map(c=>c.consequence);
  const response = { success: true, consequence_analysis: analysis, top_regulated_consequences: top, regulations_found: result.regulations_found, compliance_summary: result.compliance_summary, research_quality: { confidence_level: "requires_review", sources_consulted: sourceLinks(evidence.sources), data_gaps: result.data_gaps }, sources: sourceLinks(evidence.sources), method_version: AI_METHOD, metadata: { industry, jurisdiction, researched_at: new Date().toISOString() } };
  await invalidateSynthesis(access, body.session_id);
  const saved = await access.supabase.from("weighting_regulatory_research").upsert({ session_id: body.session_id, industry, jurisdiction, consequence_regulatory_analysis: analysis, top_regulated_consequences: top, regulatory_environment_tags: [], search_queries_used: [JSON.stringify({industry,jurisdiction})], total_sources_found: evidence.sources.length, web_search_results: response, researched_at: new Date().toISOString() }, { onConflict: "session_id" });
  if (saved.error) throw new EvidenceError("Could not save regulatory evidence.", 503);
  return response;
});
Deno.serve(handler);

