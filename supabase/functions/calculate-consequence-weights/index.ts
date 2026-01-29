import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getRiskToleranceDescription(tolerance: string): string {
  const descriptions: Record<string, string> = {
    extremely_conservative: "Prioritize preventing any harm, even at high cost",
    conservative: "Strong preference for safety, willing to invest in prevention",
    balanced: "Balance prevention costs with likelihood/severity",
    pragmatic: "Focus on most likely and severe risks, accept some residual risk",
  };
  return descriptions[tolerance] || tolerance;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("session_id is required");
    }

    console.log(`[AI Synthesis] Starting for session ${session_id}`);

    // Step 1: Gather all input data
    const { data: session, error: sessionError } = await supabase
      .from("weighting_sessions")
      .select("*, organizations(*)")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    // Get Layer 1: Questionnaire responses
    const { data: questionnaire } = await supabase
      .from("weighting_questionnaire_responses")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Get Layer 2: AHP Matrix and Weights
    const { data: ahp } = await supabase
      .from("weighting_ahp_matrix")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Get Layer 3: Scenario Validations
    const { data: scenarios } = await supabase
      .from("weighting_scenario_validations")
      .select("*")
      .eq("session_id", session_id)
      .order("scenario_number");

    // Get Layer 4: Regulatory Research
    const { data: regulatory } = await supabase
      .from("weighting_regulatory_research")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Get Layer 4: Mission Analysis
    const { data: missionAnalysis } = await supabase
      .from("weighting_mission_analysis")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Step 2: Build comprehensive AI prompt
    const org = session.organizations || {};
    const synthesisPrompt = `
You are an expert risk management consultant specializing in consequence weighting methodologies for hazard and risk assessments. You have been hired by ${org.name || "this organization"} to develop scientifically justified consequence weights.

# ORGANIZATION PROFILE

**Name:** ${org.name || "Organization"}
**Industry:** ${org.industry_type || "General"} (${org.industry_sub_sectors?.join(", ") || "N/A"})
**Location:** ${org.primary_location || "N/A"}
**Size:** ${org.employee_count || "N/A"} employees
**Mission Statement:** "${questionnaire?.mission_statement || "Not provided"}"

# SOURCE 1: ORGANIZATIONAL CONTEXT QUESTIONNAIRE

**Primary Mandate:**
${questionnaire?.primary_mandate?.map((m: string) => `- ${m}`).join("\n") || "Not specified"}

**Primary Stakeholders (ranked by importance):**
${JSON.stringify(questionnaire?.primary_stakeholders || [], null, 2)}

**Regulatory Environment:**
${questionnaire?.regulatory_environment?.map((r: string) => `- ${r}`).join("\n") || "Not specified"}

**Hardest Consequence to Recover From (per executive judgment):**
${questionnaire?.hardest_to_recover_consequence || "Not specified"}

**Risk Tolerance:**
${questionnaire?.risk_tolerance || "balanced"} - ${getRiskToleranceDescription(questionnaire?.risk_tolerance || "balanced")}

**Budget Allocation Priority:**
${questionnaire?.budget_allocation_priority || "Not specified"}

# SOURCE 2: ANALYTIC HIERARCHY PROCESS (AHP) RESULTS

**AHP Consistency Ratio:** ${ahp?.consistency_ratio?.toFixed(4) || "N/A"}
**Is Consistent (CR ≤ 0.10):** ${ahp?.is_consistent ? "YES" : "NO"}

**AHP-Derived Weights:**
${JSON.stringify(ahp?.normalized_weights || {}, null, 2)}

${ahp?.is_consistent === false ? `
⚠️ WARNING: AHP matrix is INCONSISTENT. The executive's pairwise comparisons contain logical contradictions. 
AHP weights should be down-weighted in the final synthesis. Consider relying more heavily on regulatory and mission alignment.
` : ""}

# SOURCE 3: SCENARIO VALIDATION RESULTS

${scenarios?.map((s: any, idx: number) => `
## Scenario ${idx + 1}: ${s.scenario_title}

**Description:** ${s.scenario_description}

**Consequence Breakdown:**
${JSON.stringify(s.consequence_values, null, 2)}

**Executive's Intuitive Risk Rating:** ${s.user_risk_rating?.toUpperCase()}
**AI-Calculated Score (using AHP weights):** ${s.ai_calculated_score || "N/A"}/100 → ${s.ai_risk_category?.toUpperCase() || "N/A"}
**Alignment:** ${s.rating_aligned ? "✓ ALIGNED" : `✗ MISALIGNED (off by ${s.misalignment_magnitude} category)`}
`).join("\n") || "No scenario validations available"}

# SOURCE 4: REGULATORY & LEGAL FRAMEWORK ANALYSIS

**Industry:** ${regulatory?.industry || org.industry_type || "General"}
**Jurisdiction:** ${regulatory?.jurisdiction || "Not specified"}

**Top Regulated Consequences (by regulatory emphasis):**
${regulatory?.top_regulated_consequences?.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n") || "Not specified"}

**Detailed Regulatory Analysis:**
${JSON.stringify(regulatory?.consequence_regulatory_analysis || {}, null, 2)}

# SOURCE 5: MISSION & VALUES ANALYSIS

**Mission Statement:** "${questionnaire?.mission_statement || "Not provided"}"

**Mission Analysis Results:**
${JSON.stringify(missionAnalysis?.analysis_result || {}, null, 2)}

**Consequence Relevance to Mission:**
${JSON.stringify(missionAnalysis?.consequence_relevance || {}, null, 2)}

# YOUR TASK

Synthesize all five data sources to produce FINAL RECOMMENDED CONSEQUENCE WEIGHTS that are:

1. **Mathematically Sound:** Based on rigorous AHP methodology
2. **Strategically Aligned:** Reflect organizational mission and stakeholder priorities
3. **Legally Compliant:** Account for regulatory mandates and legal liability
4. **Empirically Validated:** Match executive intuition in scenario testing
5. **Practically Defensible:** Can be explained and justified to auditors, board members, regulators

# SYNTHESIS METHODOLOGY

Use this weighted approach to combine sources:

IF AHP is CONSISTENT (CR ≤ 0.10) and Scenarios are ALIGNED (≥3/4):
- AHP weights: 40%
- Regulatory emphasis: 25%
- Mission/values alignment: 20%
- Questionnaire insights: 10%
- Scenario adjustments: 5%

IF AHP is INCONSISTENT or Scenarios are MISALIGNED:
- AHP weights: 25% (downweighted due to reliability concerns)
- Regulatory emphasis: 30% (increased - more objective)
- Mission/values alignment: 25% (increased)
- Questionnaire insights: 15%
- Scenario adjustments: 5%

# OUTPUT REQUIREMENTS

Provide your response as a JSON object with the following structure:

{
  "recommended_weights": {
    "Fatalities": <0-100>,
    "Injuries": <0-100>,
    "Displacement": <0-100>,
    "Psychosocial_Impact": <0-100>,
    "Support_System_Impact": <0-100>,
    "Property_Damage": <0-100>,
    "Infrastructure_Impact": <0-100>,
    "Environmental_Damage": <0-100>,
    "Economic_Impact": <0-100>,
    "Reputational_Impact": <0-100>
  },
  "source_contributions": {
    "ahp_influence_percent": <0-100>,
    "regulatory_influence_percent": <0-100>,
    "mission_influence_percent": <0-100>,
    "questionnaire_influence_percent": <0-100>,
    "scenario_influence_percent": <0-100>
  },
  "comparison_to_ahp": {
    "Fatalities": "<+/- change from AHP>",
    "Injuries": "<+/- change>",
    "Displacement": "<+/- change>",
    "Psychosocial_Impact": "<+/- change>",
    "Support_System_Impact": "<+/- change>",
    "Property_Damage": "<+/- change>",
    "Infrastructure_Impact": "<+/- change>",
    "Environmental_Damage": "<+/- change>",
    "Economic_Impact": "<+/- change>",
    "Reputational_Impact": "<+/- change>"
  },
  "top_3_drivers": [
    "Primary reason weight X is high",
    "Primary reason weight Y is moderate",
    "Primary reason weight Z is low"
  ],
  "executive_summary": "2-3 paragraph summary explaining the recommended weights at a high level, suitable for presentation to executive leadership.",
  "detailed_justification": {
    "Fatalities": {
      "weight": <0-100>,
      "rationale": "Comprehensive justification citing specific data from all 5 sources.",
      "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
      "regulatory_considerations": "Specific regulations/penalties that influenced this weight.",
      "organizational_context": "How this weight aligns with mission/stakeholders/past incidents."
    }
  },
  "consistency_checks": {
    "weights_sum_to_100": true,
    "all_weights_positive": true,
    "weights_within_reasonable_bounds": true,
    "regulatory_compliance_confidence": "HIGH|MEDIUM|LOW",
    "board_defensibility_score": <0-100>
  }
}

# CRITICAL REQUIREMENTS

1. Weights MUST sum to exactly 100.00
2. All weights MUST be > 0 (minimum 1.00)
3. Cite specific data points in justifications
4. No hallucinations - only reference data provided above
5. Be specific to THIS organization
6. Explain disagreements with AHP

# TONE

Professional, authoritative, data-driven. You are presenting to executives who will scrutinize your methodology.

Begin your analysis now.
`;

    // Step 3: Call AI for synthesis
    console.log("[AI Synthesis] Calling Lovable AI Gateway...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "You are an expert risk management consultant. Always respond with valid JSON. Be precise with numbers - weights must sum to exactly 100.",
          },
          {
            role: "user",
            content: synthesisPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[AI Synthesis] AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "";

    console.log("[AI Synthesis] AI response received");

    // Parse JSON response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }

    const synthesis = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Step 4: Validate and normalize weights
    const weights: Record<string, number> = synthesis.recommended_weights || {};
    const weightValues = Object.values(weights) as number[];
    let weightSum = weightValues.reduce((a, b) => a + b, 0);

    if (Math.abs(weightSum - 100) > 0.1) {
      console.warn(`[AI Synthesis] Weights sum to ${weightSum}, normalizing...`);
      for (const key of Object.keys(weights)) {
        weights[key] = Math.round((weights[key] / weightSum) * 100 * 100) / 100;
      }
    }

    // Ensure no zeros
    for (const key of Object.keys(weights)) {
      if (weights[key] === 0) {
        console.warn(`[AI Synthesis] ${key} has zero weight, setting to minimum 1.00`);
        weights[key] = 1.0;
      }
    }

    // Final normalization
    const finalValues = Object.values(weights) as number[];
    const finalSum = finalValues.reduce((a, b) => a + b, 0);
    for (const key of Object.keys(weights)) {
      weights[key] = Math.round((weights[key] / finalSum) * 100 * 100) / 100;
    }

    // Step 5: Generate reports
    const executiveReport = generateExecutiveReport(synthesis, org, questionnaire);
    const detailedReport = generateDetailedReport(synthesis, org, ahp, scenarios || [], regulatory);
    const technicalReport = generateTechnicalReport(ahp, synthesis);

    const processingDuration = Math.round((Date.now() - startTime) / 1000);

    // Step 6: Store results
    await supabase.from("weighting_ai_synthesis").insert({
      session_id,
      sources_used: {
        ahp: !!ahp,
        questionnaire: !!questionnaire,
        scenarios: (scenarios?.length || 0) > 0,
        regulatory: !!regulatory,
        mission_analysis: !!missionAnalysis,
      },
      source_weights: synthesis.source_contributions,
      recommended_weights: weights,
      previous_weights: ahp?.normalized_weights,
      weight_changes: synthesis.comparison_to_ahp,
      justification_report_executive: executiveReport,
      justification_report_detailed: detailedReport,
      justification_report_technical: technicalReport,
      consistency_checks: synthesis.consistency_checks,
      all_checks_passed:
        synthesis.consistency_checks?.weights_sum_to_100 &&
        synthesis.consistency_checks?.all_weights_positive &&
        synthesis.consistency_checks?.weights_within_reasonable_bounds,
      sensitivity_preview: null,
      ai_model_used: "google/gemini-2.5-pro",
      ai_prompt_tokens: aiData.usage?.prompt_tokens || 0,
      ai_response_tokens: aiData.usage?.completion_tokens || 0,
      ai_total_cost_usd: 0.02,
      processing_duration_seconds: processingDuration,
    });

    // Update session status
    await supabase
      .from("weighting_sessions")
      .update({
        layer5_completed: true,
        ai_processing_completed_at: new Date().toISOString(),
        ai_processing_duration_seconds: processingDuration,
        ai_processing_tokens_used: (aiData.usage?.prompt_tokens || 0) + (aiData.usage?.completion_tokens || 0),
        ai_processing_cost_usd: 0.02,
      })
      .eq("id", session_id);

    console.log("[AI Synthesis] Complete!");

    return new Response(
      JSON.stringify({
        success: true,
        recommended_weights: weights,
        synthesis,
        reports: {
          executive: executiveReport,
          detailed: detailedReport,
          technical: technicalReport,
        },
        processing_time_seconds: processingDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI Synthesis] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateExecutiveReport(synthesis: any, org: any, questionnaire: any): string {
  return `# Consequence Weighting Methodology
## Executive Summary

**Organization:** ${org.name || "Organization"}
**Date:** ${new Date().toLocaleDateString()}
**Prepared By:** HIRA Pro AI Synthesis Engine
**Status:** Ready for Executive Review

---

## Recommended Consequence Weights

The following weights have been scientifically derived through a comprehensive 5-layer methodology combining executive judgment, regulatory analysis, and organizational values alignment.

${Object.entries(synthesis.recommended_weights || {})
  .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
  .map(([name, weight]: [string, any]) => `- **${name.replace(/_/g, " ")}:** ${weight}%`)
  .join("\n")}

---

## Key Insights

${synthesis.executive_summary || "No executive summary available."}

---

## Top 3 Weight Drivers

${synthesis.top_3_drivers?.map((d: string, i: number) => `${i + 1}. ${d}`).join("\n") || "No drivers specified."}

---

## Methodology Confidence

- **Regulatory Compliance Confidence:** ${synthesis.consistency_checks?.regulatory_compliance_confidence || "N/A"}
- **Board Defensibility Score:** ${synthesis.consistency_checks?.board_defensibility_score || "N/A"}/100
- **All Validation Checks Passed:** ${synthesis.consistency_checks?.weights_sum_to_100 ? "Yes" : "No"}
`;
}

function generateDetailedReport(synthesis: any, org: any, ahp: any, scenarios: any[], regulatory: any): string {
  const justifications = synthesis.detailed_justification || {};
  
  return `# Detailed Consequence Weight Justification Report

**Organization:** ${org.name || "Organization"}
**Generated:** ${new Date().toISOString()}

---

## Methodology Overview

This report provides comprehensive justification for each recommended consequence weight, citing evidence from:
1. Analytic Hierarchy Process (AHP) pairwise comparisons
2. Organizational context questionnaire
3. Scenario-based validation
4. Regulatory framework analysis
5. Mission and values alignment

---

## AHP Analysis Summary

- **Consistency Ratio:** ${ahp?.consistency_ratio?.toFixed(4) || "N/A"}
- **Matrix Consistent:** ${ahp?.is_consistent ? "Yes (CR ≤ 0.10)" : "No (CR > 0.10)"}

---

## Individual Weight Justifications

${Object.entries(justifications)
  .map(
    ([consequence, details]: [string, any]) => `
### ${consequence.replace(/_/g, " ")}

**Recommended Weight:** ${details.weight || synthesis.recommended_weights?.[consequence]}%

**Rationale:** ${details.rationale || "Not specified"}

**Key Factors:**
${details.key_factors?.map((f: string) => `- ${f}`).join("\n") || "- Not specified"}

**Regulatory Considerations:**
${details.regulatory_considerations || "Not specified"}

**Organizational Context:**
${details.organizational_context || "Not specified"}

---
`
  )
  .join("\n")}

## Scenario Validation Results

${scenarios
  ?.map(
    (s: any) => `
### ${s.scenario_title}
- User Rating: ${s.user_risk_rating}
- AI Calculated: ${s.ai_risk_category}
- Aligned: ${s.rating_aligned ? "Yes" : "No"}
`
  )
  .join("\n") || "No scenarios available"}

---

## Regulatory Framework Summary

**Jurisdiction:** ${regulatory?.jurisdiction || "N/A"}
**Top Regulated Consequences:** ${regulatory?.top_regulated_consequences?.join(", ") || "N/A"}
`;
}

function generateTechnicalReport(ahp: any, synthesis: any): string {
  return `# Technical Report: AHP Matrix Analysis

## Mathematical Foundation

The Analytic Hierarchy Process (AHP) uses pairwise comparisons on a 1-9 scale (Saaty scale) to derive priority weights through eigenvalue computation.

---

## Pairwise Comparison Matrix

\`\`\`json
${JSON.stringify(ahp?.matrix || {}, null, 2)}
\`\`\`

---

## Eigenvalue Calculation Results

\`\`\`json
${JSON.stringify(ahp?.eigenvalues || {}, null, 2)}
\`\`\`

---

## Consistency Analysis

- **λmax (Principal Eigenvalue):** Calculated from matrix
- **Consistency Index (CI):** (λmax - n) / (n - 1)
- **Random Index (RI):** 1.49 (for n=10)
- **Consistency Ratio (CR):** ${ahp?.consistency_ratio?.toFixed(4) || "N/A"}
- **Acceptable (CR ≤ 0.10):** ${ahp?.is_consistent ? "Yes" : "No"}

---

## Raw vs Normalized Weights

| Consequence | Raw Weight | Normalized Weight | Final Recommended |
|-------------|------------|-------------------|-------------------|
${Object.keys(ahp?.raw_weights || {})
  .map(
    (c) =>
      `| ${c} | ${ahp?.raw_weights?.[c]?.toFixed(4) || "N/A"} | ${ahp?.normalized_weights?.[c]?.toFixed(2) || "N/A"}% | ${synthesis.recommended_weights?.[c]?.toFixed(2) || "N/A"}% |`
  )
  .join("\n")}

---

## Source Contribution Weights

${JSON.stringify(synthesis.source_contributions || {}, null, 2)}
`;
}
