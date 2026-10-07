import { aiTool } from "../_shared/ai-tool-handler.ts";
import { weightingSession, invalidateSynthesis } from "../_shared/weighting-evidence.ts";
import { structured, object, array, text, strings, choice, AI_METHOD } from "../_shared/modern-ai.ts";
import { WEIGHT_KEYS } from "../_shared/weights.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
const schema = object({ key_themes: strings, tensions_identified: strings, consequences: array(object({ consequence: { type: "string", enum: [...WEIGHT_KEYS] }, influence: choice("high","medium","low","none"), basis: choice("explicit","inference","not_stated"), quotation: text, alignment_explanation: text, stakeholder_impact: text })) });
export const handler = aiTool("mission-analysis", async (body, access) => {
  await weightingSession(access, body.session_id);
  const { data: questionnaire, error } = await access.supabase.from("weighting_questionnaire_responses").select("mission_statement").eq("session_id", body.session_id).single();
  if (error) throw new EvidenceError("Save the organization questionnaire first.");
  const mission = questionnaire?.mission_statement?.trim();
  if (!mission || mission.length > 12000) throw new EvidenceError("Save a mission statement of at most 12,000 characters.");
  const result = await structured<any>("mission_analysis", schema,
    "Interpret the supplied mission. Cover each consequence key once. Explicit findings must quote an exact substring. Inferences must be labeled. Do not turn absent priorities into lack of concern, or mission language into numeric risk weights. For not_stated use empty quotation. Do not infer actual controls, risk appetite or compliance. No external search is needed for interpretation.",
    { mission_statement: mission, consequence_keys: WEIGHT_KEYS });
  if (result.consequences.length !== 10 || new Set(result.consequences.map(c=>c.consequence)).size !== 10) throw new EvidenceError("Incomplete mission analysis.", 502);
  for (const c of result.consequences) if ((c.basis === "explicit" && !c.quotation.trim()) || (c.quotation && !mission.includes(c.quotation))) throw new EvidenceError("Mission quotation could not be verified.", 502);
  const relevance = Object.fromEntries(result.consequences.map(c=>[c.consequence,c]));
  const response = { success: true, data: result, consequence_relevance: relevance, method_version: AI_METHOD };
  await invalidateSynthesis(access, body.session_id);
  const saved = await access.supabase.from("weighting_mission_analysis").upsert({ session_id: body.session_id, mission_statement: mission, analysis_result: response, consequence_relevance: relevance, analyzed_at: new Date().toISOString() }, { onConflict: "session_id" });
  if (saved.error) throw new EvidenceError("Could not save mission analysis.", 503);
  return response;
});
Deno.serve(handler);

