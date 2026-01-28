import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrgContext {
  id: string;
  name: string;
  sector: string;
  region: string;
  primary_location: string | null;
  industry_type: string | null;
  industry_sub_sectors: string[] | null;
  size: string | null;
}

interface HazardInput {
  id: string;
  category: string;
  category_number: number;
  hazards_list: string[];
  tags: string[];
}

interface RegulatoryRequirement {
  id: string;
  hazard_id: string;
  regulation_name: string;
  regulation_section: string | null;
  requirement_description: string;
  non_compliance_consequences: string;
  source_url: string | null;
}

interface HazardScore {
  hazard_id: string;
  relevance_score: number;
  tier: "high" | "medium" | "low";
  ai_reasoning: string;
  is_mandatory: boolean;
  regulatory_requirement?: RegulatoryRequirement;
  peer_adoption_rate: number | null;
}

interface AIHazardScore {
  hazard_id: string;
  relevance_score: number;
  reasoning: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hazards, org_context, force_refresh = false } = await req.json() as {
      hazards: HazardInput[];
      org_context: OrgContext;
      force_refresh?: boolean;
    };

    if (!hazards || !org_context) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${hazards.length} hazards for org: ${org_context.name}`);

    // Extract province code from primary_location (e.g., "ON" from "Toronto, ON")
    const provinceMatch = org_context.primary_location?.match(/,?\s*([A-Z]{2})\s*$/);
    const provinceCode = provinceMatch ? provinceMatch[1] : org_context.region.split(" - ")[1]?.toUpperCase();

    // LAYER 1: Fetch mandatory regulatory requirements
    let regulatoryRequirements: RegulatoryRequirement[] = [];
    if (provinceCode && org_context.industry_type) {
      const { data: regData } = await supabase
        .from("regulatory_requirements")
        .select("*")
        .eq("province", provinceCode)
        .eq("industry_type", org_context.industry_type);
      
      regulatoryRequirements = regData || [];
      console.log(`Found ${regulatoryRequirements.length} regulatory requirements for ${provinceCode}/${org_context.industry_type}`);
    }

    // LAYER 2: Check for cached AI scores
    let cachedScores: Map<string, { score: number; tier: string; reasoning: string; peer_rate: number | null }> = new Map();
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("hazard_ai_scores")
        .select("hazard_id, relevance_score, tier, ai_reasoning, peer_adoption_rate")
        .eq("org_id", org_context.id)
        .gt("expires_at", new Date().toISOString());

      if (cached && cached.length > 0) {
        cached.forEach(c => {
          cachedScores.set(c.hazard_id, {
            score: c.relevance_score,
            tier: c.tier,
            reasoning: c.ai_reasoning || "",
            peer_rate: c.peer_adoption_rate,
          });
        });
        console.log(`Found ${cached.length} cached scores`);
      }
    }

    // LAYER 3: Fetch peer adoption data from benchmark_data
    const peerAdoptionMap = new Map<string, number>();
    const { data: benchmarkData } = await supabase
      .from("benchmark_data")
      .select("hazard_category, hazard_name")
      .eq("industry", org_context.sector)
      .eq("region", org_context.region);

    if (benchmarkData && benchmarkData.length >= 5) {
      // Group by hazard category and calculate adoption rates
      const totalOrgs = new Set(benchmarkData.map(b => b.hazard_name || b.hazard_category)).size;
      const hazardCounts = new Map<string, number>();
      
      benchmarkData.forEach(b => {
        const key = b.hazard_category;
        hazardCounts.set(key, (hazardCounts.get(key) || 0) + 1);
      });

      hazardCounts.forEach((count, category) => {
        peerAdoptionMap.set(category.toLowerCase(), Math.min(100, (count / totalOrgs) * 100));
      });
    }

    // Identify hazards that need AI scoring
    const hazardsNeedingAI = hazards.filter(h => !cachedScores.has(h.id));
    
    let aiScores: AIHazardScore[] = [];

    if (hazardsNeedingAI.length > 0) {
      // LAYER 4: Call AI for uncached hazards
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured");
        // Fall back to rule-based scoring only
      } else {
        const hazardsList = hazardsNeedingAI.map(h => 
          `- ID: "${h.id}" | Category: "${h.category}" | Items: ${h.hazards_list.slice(0, 3).join(", ")}${h.hazards_list.length > 3 ? "..." : ""}`
        ).join("\n");

        const systemPrompt = `You are an expert risk assessment AI specializing in hazard identification for organizations.
Your task is to score hazards by relevance (0-100) based on the organization's profile.

CRITICAL SCORING PRINCIPLES:
1. ERR ON THE SIDE OF CAUTION - It is better to flag a hazard as potentially relevant (higher score) than to dismiss it. Missing a critical hazard has far worse consequences than reviewing an extra hazard.
2. CONSIDER CASCADING EFFECTS - Natural disasters cause power outages, which affect life support, medical equipment, refrigerated medications, etc.
3. CONSIDER VULNERABLE POPULATIONS - Healthcare, education, and social services have people who cannot easily evacuate or self-protect.
4. CONSIDER OPERATIONAL DEPENDENCIES - All organizations depend on infrastructure (power, water, HVAC, IT systems, supply chains).
5. CONSIDER HISTORICAL EVENTS - Hurricane Katrina devastated hospitals. COVID-19 showed pandemic risks. Equipment failures cause patient deaths.

SCORING CRITERIA:
- Direct impact: Could this hazard directly affect operations, staff, patients/customers, or assets?
- Indirect/cascading impact: Could this hazard disrupt critical dependencies (power, water, supplies, communications)?
- Vulnerable population exposure: Does the organization serve people who are vulnerable during emergencies?
- Regulatory/compliance: Are there legal requirements to assess and prepare for this hazard?
- Historical precedent: Have similar organizations been significantly impacted by this hazard type?

ORGANIZATION PROFILE:
- Name: ${org_context.name}
- Sector: ${org_context.sector}
- Industry Type: ${org_context.industry_type || "Not specified"}
- Sub-sectors: ${org_context.industry_sub_sectors?.join(", ") || "Not specified"}
- Location: ${org_context.primary_location || org_context.region}
- Size: ${org_context.size || "Not specified"}

SCORING GUIDE (score generously, not restrictively):
- 80-100: Highly relevant - has affected this industry OR location historically, regulatory requirement, or affects vulnerable populations
- 60-79: Relevant - could realistically affect operations, has cascading dependencies, or similar orgs assess this
- 40-59: Potentially relevant - lower probability but non-trivial consequences if it occurs
- 20-39: Lower relevance - unlikely AND limited impact, but still worth awareness
- 0-19: Minimal relevance - truly does not apply (e.g., marine hazards for inland organizations)

INDUSTRY-SPECIFIC GUIDANCE:
- HEALTHCARE: Score ALL natural hazards 60+ (hospitals must operate during disasters, have life-critical equipment, vulnerable patients). Score operational/equipment hazards 70+ (medical device failures, HVAC for infection control, power for life support).
- MANUFACTURING: Score process safety and equipment hazards 80+.
- EDUCATION: Score natural hazards 60+ (evacuation challenges), violence/security 70+.
- ALL SECTORS: Infrastructure hazards (power, water, IT) score minimum 50 (universal dependencies).

DO NOT dismiss hazard categories as "not relevant to this industry" unless they truly cannot apply. Equipment failures, utility disruptions, natural disasters, and supply chain issues affect virtually ALL organizations.`;

        const userPrompt = `Score the following hazards for relevance to this organization:

${hazardsList}

Return scores using the score_hazards tool. Provide brief reasoning for each score.`;

        try {
          console.log(`Calling AI to score ${hazardsNeedingAI.length} hazards`);
          
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              tools: [
                {
                  type: "function",
                  function: {
                    name: "score_hazards",
                    description: "Return relevance scores for each hazard",
                    parameters: {
                      type: "object",
                      properties: {
                        scores: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              hazard_id: { type: "string" },
                              relevance_score: { type: "number", minimum: 0, maximum: 100 },
                              reasoning: { type: "string", description: "Brief explanation for the score" },
                            },
                            required: ["hazard_id", "relevance_score", "reasoning"],
                          },
                        },
                      },
                      required: ["scores"],
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "score_hazards" } },
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall?.function?.arguments) {
              const result = JSON.parse(toolCall.function.arguments);
              aiScores = result.scores || [];
              console.log(`AI returned ${aiScores.length} scores`);
            }
          } else {
            console.error("AI response error:", aiResponse.status);
          }
        } catch (aiError) {
          console.error("AI scoring error:", aiError);
        }
      }
    }

    // Combine all layers into final scores
    const finalScores: HazardScore[] = hazards.map(hazard => {
      // Check if mandatory
      const regReq = regulatoryRequirements.find(r => r.hazard_id === hazard.id);
      const isMandatory = !!regReq;

      // Get score from cache or AI
      let relevanceScore = 50; // Default middle score
      let reasoning = "";
      let peerRate = peerAdoptionMap.get(hazard.category.toLowerCase()) || null;

      const cached = cachedScores.get(hazard.id);
      if (cached) {
        relevanceScore = cached.score;
        reasoning = cached.reasoning;
        peerRate = cached.peer_rate;
      } else {
        const aiScore = aiScores.find(s => s.hazard_id === hazard.id);
        if (aiScore) {
          relevanceScore = aiScore.relevance_score;
          reasoning = aiScore.reasoning;
        }
      }

      // Boost score if mandatory or high peer adoption
      if (isMandatory) {
        relevanceScore = 100;
        reasoning = `Mandatory: ${regReq?.regulation_name}`;
      } else if (peerRate && peerRate > 70) {
        // Boost by up to 15 points for high peer adoption
        relevanceScore = Math.min(100, relevanceScore + Math.floor(peerRate - 70) / 2);
        reasoning += reasoning ? ` (${Math.round(peerRate)}% of peers assess this)` : `${Math.round(peerRate)}% of similar organizations assess this hazard`;
      }

      // Determine tier
      let tier: "high" | "medium" | "low";
      if (isMandatory || relevanceScore >= 70) {
        tier = "high";
      } else if (relevanceScore >= 40) {
        tier = "medium";
      } else {
        tier = "low";
      }

      return {
        hazard_id: hazard.id,
        relevance_score: relevanceScore,
        tier,
        ai_reasoning: reasoning,
        is_mandatory: isMandatory,
        regulatory_requirement: regReq,
        peer_adoption_rate: peerRate,
      };
    });

    // Cache new AI scores (upsert)
    const scoresToCache = finalScores
      .filter(s => !cachedScores.has(s.hazard_id) && !s.is_mandatory)
      .map(s => ({
        org_id: org_context.id,
        hazard_id: s.hazard_id,
        relevance_score: s.relevance_score,
        tier: s.tier,
        ai_reasoning: s.ai_reasoning,
        peer_adoption_rate: s.peer_adoption_rate,
      }));

    if (scoresToCache.length > 0) {
      const { error: cacheError } = await supabase
        .from("hazard_ai_scores")
        .upsert(scoresToCache, { onConflict: "org_id,hazard_id" });
      
      if (cacheError) {
        console.error("Cache error:", cacheError);
      } else {
        console.log(`Cached ${scoresToCache.length} new scores`);
      }
    }

    // Sort by relevance (mandatory first, then by score)
    finalScores.sort((a, b) => {
      if (a.is_mandatory && !b.is_mandatory) return -1;
      if (!a.is_mandatory && b.is_mandatory) return 1;
      return b.relevance_score - a.relevance_score;
    });

    const duration = Date.now() - startTime;
    console.log(`Hazard recommendations completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scores: finalScores,
          stats: {
            total: finalScores.length,
            mandatory: finalScores.filter(s => s.is_mandatory).length,
            high_tier: finalScores.filter(s => s.tier === "high").length,
            medium_tier: finalScores.filter(s => s.tier === "medium").length,
            low_tier: finalScores.filter(s => s.tier === "low").length,
            cached: cachedScores.size,
            ai_scored: aiScores.length,
          },
          duration_ms: duration,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Hazard recommendations error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
