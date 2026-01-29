import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { assessment_id, report_type = "summary" } = await req.json();

    if (!assessment_id) {
      return new Response(
        JSON.stringify({ error: "assessment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*, organization_locations(*)")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization info
    const { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", assessment.org_id)
      .single();

    console.log(`Generating ${report_type} report for assessment ${assessment_id}`);

    const systemPrompt = `You are a professional risk management consultant generating executive summaries for board presentations.

Your reports should be:
1. Clear and concise - suitable for C-suite executives
2. Data-driven - include specific numbers and percentages
3. Action-oriented - provide clear recommendations
4. Professional tone - formal business language
5. Structured - use clear sections and bullet points

Return your report as a JSON object with this structure:
{
  "title": "Executive Risk Assessment Summary",
  "summary": {
    "overview": "1-2 paragraph executive overview",
    "total_hazards_assessed": number,
    "high_risk_count": number,
    "medium_risk_count": number,
    "low_risk_count": number,
    "overall_risk_level": "Low|Medium|High|Extreme"
  },
  "key_findings": [
    {"finding": "Finding description", "severity": "High|Medium|Low", "recommendation": "Action to take"}
  ],
  "risk_overview": {
    "top_risks": [{"hazard": "Name", "score": number, "category": "Category"}],
    "risk_distribution": {"high": number, "medium": number, "low": number}
  },
  "recommendations": [
    {"priority": 1, "action": "Recommended action", "timeline": "Immediate|Short-term|Long-term", "estimated_impact": "High|Medium|Low"}
  ],
  "next_steps": ["Step 1", "Step 2", "Step 3"]
}`;

    const results = assessment.results || {};
    const hazardScores = Object.entries(results).map(([hazardId, data]: [string, any]) => ({
      hazardId,
      score: data?.totalScore || 0,
      category: data?.category || "Unknown",
      hazardName: data?.hazardName || hazardId,
    }));

    const highRiskCount = hazardScores.filter(h => h.score >= 15).length;
    const mediumRiskCount = hazardScores.filter(h => h.score >= 8 && h.score < 15).length;
    const lowRiskCount = hazardScores.filter(h => h.score < 8).length;
    const topRisks = hazardScores.sort((a, b) => b.score - a.score).slice(0, 5);

    const userPrompt = `Generate an executive summary report for the following Hazard Identification and Risk Assessment:

Organization: ${organization?.name || "Unknown Organization"}
Industry: ${organization?.industry_type || "Not specified"}
Location: ${assessment.organization_locations?.location_name || organization?.primary_location || "Not specified"}
Assessment Title: ${assessment.title}
Assessment Date: ${new Date(assessment.created_at).toLocaleDateString()}
Status: ${assessment.status}

RISK ASSESSMENT DATA:
Total Hazards Assessed: ${hazardScores.length}
High Risk Hazards (score 15+): ${highRiskCount}
Medium Risk Hazards (score 8-14): ${mediumRiskCount}
Low Risk Hazards (score <8): ${lowRiskCount}

TOP 5 HIGHEST RISKS:
${topRisks.map((r, i) => `${i + 1}. ${r.hazardName} (${r.category}): Score ${r.score}`).join("\n")}

Generate a professional executive summary suitable for board presentation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let reportData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse executive summary response");
    }

    // Store the report using service role
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: savedReport, error: saveError } = await supabaseService
      .from("executive_reports")
      .insert({
        org_id: assessment.org_id,
        assessment_id: assessment_id,
        report_type: report_type,
        title: reportData.title || "Executive Risk Assessment Summary",
        period_start: assessment.created_at,
        period_end: new Date().toISOString(),
        summary: reportData.summary || {},
        key_findings: reportData.key_findings || [],
        risk_overview: reportData.risk_overview || {},
        recommendations: reportData.recommendations || [],
        generated_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save report:", saveError);
    }

    console.log("Executive summary generated successfully");

    return new Response(
      JSON.stringify({
        report: reportData,
        saved_report_id: savedReport?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Executive summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
