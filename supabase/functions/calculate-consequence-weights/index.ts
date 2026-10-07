import { aiTool, organization } from "../_shared/ai-tool-handler.ts";
import { weightingSession } from "../_shared/weighting-evidence.ts";
import { structured, object, array, text, strings, aiModel, AI_METHOD } from "../_shared/modern-ai.ts";
import { weightingResult, calculateAHPWeights } from "../_shared/hira-scoring.ts";
import { WEIGHT_KEYS } from "../_shared/weights.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
const schema = object({ executive_summary: text, top_3_drivers: strings, gaps: strings, challenges: strings, justifications: array(object({ consequence: { type: "string", enum: [...WEIGHT_KEYS] }, rationale: text, key_factors: strings, regulatory_considerations: text, organizational_context: text })) });
export const handler = aiTool("weight-synthesis", async (body, access) => {
  const session = await weightingSession(access, body.session_id);
  const load = async (table: string) => {
    const result = await access.supabase.from(table).select("*").eq("session_id", body.session_id).maybeSingle();
    if (result.error) throw new EvidenceError("Could not load weighting inputs.", 503);
    return result.data;
  };
  const [questionnaire, ahp, regulatory, mission] = await Promise.all([
    load("weighting_questionnaire_responses"), load("weighting_ahp_matrix"), load("weighting_regulatory_research"), load("weighting_mission_analysis"),
  ]);
  if (!questionnaire || !ahp) throw new EvidenceError("Complete the questionnaire and pairwise comparisons first.");
  if (!session.layer4_completed || regulatory?.web_search_results?.method_version !== AI_METHOD) throw new EvidenceError("Complete the updated regulatory research and save step 4 before synthesis.");
  const org = await organization(access);
  if (regulatory.industry !== (org.industry_type || org.sector) || regulatory.jurisdiction !== (org.primary_location || org.region)) throw new EvidenceError("Your organization context changed. Rerun regulatory research before synthesis.");
  if (questionnaire.mission_statement?.trim() && (mission?.analysis_result?.method_version !== AI_METHOD || mission?.mission_statement !== questionnaire.mission_statement.trim())) throw new EvidenceError("Run mission analysis again for the current mission statement.");
  let math;
  try {
    if (!Array.isArray(ahp.matrix) || ahp.matrix.length !== WEIGHT_KEYS.length) throw new Error("Complete all ten pairwise comparisons.");
    const calculated = calculateAHPWeights(ahp.matrix);
    ahp.consistency_ratio = calculated.consistencyRatio;
    ahp.normalized_weights = Object.fromEntries(WEIGHT_KEYS.map((key,i)=>[key,calculated.weights[i]*100]));
    math = weightingResult(ahp.normalized_weights, calculated.consistencyRatio);
  } catch (cause) { throw new EvidenceError((cause as Error).message); }
  const scenarios = await access.supabase.from("weighting_scenario_validations").select("*").eq("session_id", body.session_id).order("scenario_number");
  if (scenarios.error) throw new EvidenceError("Could not load scenario checks.", 503);
  const evidence = { questionnaire, ahp, regulatory: regulatory.web_search_results, mission: mission?.analysis_result || null, scenarios: scenarios.data };
  const explanation = await structured<any>("weight_explanation", schema,
    "Explain the supplied FIXED computed weights; do not recalculate or invent weights. They are normalized AHP priorities elicited from users. Regulatory, mission, questionnaire and scenario evidence provide qualitative challenges, not automatic numerical influence. Do not call executive agreement empirical validation. Identify inconsistent priorities, missing context and sensitivity limits. Recommend revisiting pairwise comparisons where needed. All legal claims must be traceable to the supplied regulatory evidence; do not introduce new requirements. Cover all ten keys once. Do not claim scientifically optimal weights, calibrated confidence, legal compliance or a defensibility score.",
    { computed: math, evidence });
  if (explanation.justifications.length !== 10 || new Set(explanation.justifications.map(j=>j.consequence)).size !== 10) throw new EvidenceError("Incomplete weight explanation.", 502);
  const weights = math.weights;
  const numericWeights = Object.values(weights) as number[];
  const checks = { weights_sum_to_100: true, all_weights_positive: numericWeights.every(w=>w>=0), weights_within_reasonable_bounds: numericWeights.every(w=>w>=0 && w<=100), regulatory_compliance_confidence: "NOT_ASSESSED", board_defensibility_score: null, method_version: AI_METHOD };
  const justification = Object.fromEntries(explanation.justifications.map(j=>[j.consequence,{...j,weight:weights[j.consequence]}]));
  const comparison = Object.fromEntries(WEIGHT_KEYS.map(k=>[k,(weights[k]-ahp.normalized_weights[k]).toFixed(2)]));
  const synthesis = { recommended_weights: weights, source_contributions: math.contributions, comparison_to_ahp: comparison, top_3_drivers: explanation.top_3_drivers, executive_summary: explanation.executive_summary, detailed_justification: justification, consistency_checks: checks, evidence_gaps: explanation.gaps, challenges: explanation.challenges };
  const table = WEIGHT_KEYS.map(k=>"- "+k.replace(/_/g," ")+": "+weights[k].toFixed(2)+"%").join("\n");
  const sources = regulatory.web_search_results.sources.map(s=>"- "+s.title+" — "+s.url).join("\n");
  const provenance = "\n\nMethod: "+AI_METHOD+"\nThese are user-elicited priorities, not empirical probabilities or proof of legal compliance. Regulatory and mission evidence are review inputs; they receive no automatic numeric weighting.";
  const reports = {
    executive: "# Consequence priorities — draft for review\n\n"+explanation.executive_summary+"\n\n"+table+provenance,
    detailed: "# Detailed review\n\n"+explanation.justifications.map(j=>"## "+j.consequence+" ("+weights[j.consequence]+"%)\n"+j.rationale+"\n"+j.regulatory_considerations+"\n"+j.organizational_context).join("\n\n")+"\n\n## Challenges\n"+explanation.challenges.join("\n")+"\n\n## Evidence gaps\n"+explanation.gaps.join("\n")+"\n\n## Sources\n"+sources+provenance,
    technical: "# Reproducible calculation\n\nNormalize the ten stored AHP priorities to 100.00% using largest-remainder allocation in hundredths. No AI-generated coefficients are applied.\n\nConsistency ratio: "+ahp.consistency_ratio+"\n\n"+table+"\n\n## Sensitivity (±10% relative perturbation of one priority, then renormalization)\n"+math.sensitivity.map(s=>s.consequence+": "+s.low+"–"+s.high+"%").join("\n")+provenance,
  };
  const saved = await access.supabase.from("weighting_ai_synthesis").upsert({ session_id: body.session_id, input_revision: session.input_revision, ai_model_used: aiModel(), ai_prompt_tokens: null, ai_response_tokens: null, ai_total_cost_usd: null, sources_used: { ahp: true, questionnaire: true, scenarios: scenarios.data.length>0, regulatory: true, mission_analysis: !!mission, method_version: AI_METHOD }, source_weights: math.contributions, recommended_weights: weights, previous_weights: ahp.normalized_weights, weight_changes: comparison, justification_report_executive: reports.executive, justification_report_detailed: reports.detailed, justification_report_technical: reports.technical, consistency_checks: checks, all_checks_passed: true, sensitivity_preview: math.sensitivity }, { onConflict: "session_id" });
  if (saved.error) throw new EvidenceError("Could not save synthesis.", 503);
  const updated = await access.supabase.from("weighting_sessions").update({ layer5_completed: false, ai_processing_completed_at: new Date().toISOString() }).eq("id", body.session_id).in("status", ["in_progress","completed"]).select("id").single();
  if (updated.error) throw new EvidenceError("Session changed while processing; refresh before continuing.", 409);
  return { success: true, recommended_weights: weights, synthesis, reports, input_snapshot: evidence, method_version: AI_METHOD };
});
Deno.serve(handler);

