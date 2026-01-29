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

    const { hazard_category, location } = await req.json();

    if (!hazard_category || !location) {
      return new Response(
        JSON.stringify({ error: "hazard_category and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing climate risk for ${hazard_category} in ${location}`);

    const systemPrompt = `You are a climate risk analyst specializing in how climate change affects natural hazards. 
Your task is to provide evidence-based projections for how climate change will affect the frequency and severity of specific hazards in specific locations.

CRITICAL RULES:
1. Always cite credible sources (IPCC, government climate reports, peer-reviewed studies)
2. Provide specific numerical projections with confidence levels
3. Be conservative - do not overstate projections
4. Acknowledge uncertainty where it exists
5. Focus on the specific hazard and location provided

Return your analysis as a JSON object with this exact structure:
{
  "baseline_year": 2024,
  "projection_2030": 1.15,
  "projection_2040": 1.35,
  "projection_2050": 1.55,
  "confidence_level": "medium",
  "summary_text": "Brief 2-3 sentence summary of the projection",
  "data_sources": [
    {"title": "Source name", "url": "https://..."}
  ]
}

The projection values are multipliers (1.0 = no change, 1.5 = 50% increase, 0.8 = 20% decrease).
Confidence levels: "low", "medium", "high"`;

    const userPrompt = `Analyze how climate change will affect the frequency and severity of "${hazard_category}" hazards in "${location}" over the next 25 years.

Consider:
- Historical trends in this hazard type for this region
- Climate model projections (IPCC, regional studies)
- Geographic and environmental factors specific to this location
- Seasonal patterns and how they may shift

Provide projections for 2030, 2040, and 2050 as risk multipliers compared to current baseline.`;

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
        temperature: 0.3,
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
    let analysisData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse climate analysis response");
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingData } = await supabase
      .from("climate_risk_adjustments")
      .select("id")
      .eq("hazard_category", hazard_category)
      .eq("location_region", location)
      .maybeSingle();

    const climateData = {
      hazard_category,
      location_region: location,
      baseline_year: analysisData.baseline_year || 2024,
      projection_2030: analysisData.projection_2030 || 1.0,
      projection_2040: analysisData.projection_2040 || 1.0,
      projection_2050: analysisData.projection_2050 || 1.0,
      confidence_level: analysisData.confidence_level || "medium",
      summary_text: analysisData.summary_text || "",
      data_sources: analysisData.data_sources || [],
      last_updated: new Date().toISOString(),
    };

    if (existingData?.id) {
      await supabase
        .from("climate_risk_adjustments")
        .update(climateData)
        .eq("id", existingData.id);
    } else {
      await supabase.from("climate_risk_adjustments").insert(climateData);
    }

    console.log("Climate analysis completed successfully");

    return new Response(JSON.stringify(climateData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Climate analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
