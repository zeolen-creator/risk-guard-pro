import { aiTool, organization } from "../_shared/ai-tool-handler.ts";
import { research, structured, object, array, text, number, strings, citations, sourceLinks } from "../_shared/modern-ai.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
const schema = object({ scores: array(object({ hazard_id: text, relevance_score: number(0, 100), reasoning: text, assumptions: strings, source_ids: strings })) });
export const handler = aiTool("hazard-recommendations", async (body, access) => {
  const org = await organization(access);
  if (body.org_context?.id && body.org_context.id !== access.orgId) throw new EvidenceError("Organization not available.", 403);
  if (!Array.isArray(body.hazards) || !body.hazards.length || body.hazards.length > 60) throw new EvidenceError("Select a valid hazard catalog.");
  const ids = body.hazards.map(h => h.id);
  if (new Set(ids).size !== ids.length) throw new EvidenceError("Duplicate hazard IDs.");
  const { data: hazards, error } = await access.supabase.from("hazards").select("id,category,hazards_list,description").in("id", ids);
  if (error || hazards.length !== ids.length) throw new EvidenceError("Hazard catalog unavailable.");
  const evidence = await research({ industry: org.sector, region: org.region, locality: org.primary_location, categories: hazards.map(h => h.category) }, "Investigate exposure, operational dependencies and cascading hazards. Do not infer that every hazard in a broad category applies to every organization.");
  const result = await structured<any>("hazard_relevance", schema,
    "Rank each supplied hazard ID exactly once. Relevance 0-100 is a screening priority, NOT a probability, confidence or risk score. Use local exposure, operations, vulnerable populations, controls when known and dependency chains. No blanket industry score floors. Explain unavailable organization details, screening assumptions and whether relevance is direct or cascading. Cite supporting retrieved source IDs. Do not call a hazard legally mandatory: legal applicability needs a separate reviewed determination.",
    { organization: org, hazards, evidence });
  if (result.scores.length !== ids.length || new Set(result.scores.map(s => s.hazard_id)).size !== ids.length) throw new EvidenceError("AI did not cover the full hazard catalog.", 502);
  const scores = result.scores.map(s => {
    if (!ids.includes(s.hazard_id)) throw new EvidenceError("AI returned an unknown hazard.", 502);
    citations(s.source_ids, evidence.sources, true);
    const refs = s.source_ids.map(id => evidence.sources.find(v => v.id === id));
    return { hazard_id: s.hazard_id, relevance_score: Math.round(s.relevance_score), tier: s.relevance_score >= 70 ? "high" : s.relevance_score >= 40 ? "medium" : "low", ai_reasoning: s.reasoning + "\nAssumptions: " + s.assumptions.join("; "), is_mandatory: false, peer_adoption_rate: null, sources: sourceLinks(refs) };
  }).sort((a, b) => b.relevance_score - a.relevance_score);
  return { success: true, data: { scores, sources: sourceLinks(evidence.sources), stats: { total: scores.length, mandatory: 0, high_tier: scores.filter(s => s.tier === "high").length, medium_tier: scores.filter(s => s.tier === "medium").length, low_tier: scores.filter(s => s.tier === "low").length, cached: 0, ai_scored: scores.length }, note: "Screening suggestions for review. Peer rates are unavailable without a valid organization-level denominator. Legal requirements must be verified separately.", input_snapshot: org } };
});
Deno.serve(handler);

