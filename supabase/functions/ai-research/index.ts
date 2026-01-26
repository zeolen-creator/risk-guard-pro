import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsequenceInfo {
  id: string;
  name: string;
  weight: number;
}

interface ResearchRequest {
  hazard_name: string;
  hazard_category: string;
  research_type: "probability" | "consequence";
  org_context: {
    name: string;
    sector: string;
    region: string;
    primary_location?: string;
    key_facilities?: string[];
    size?: string;
  };
  consequences?: ConsequenceInfo[]; // For consequence research
  assessment_id?: string;
  hazard_id?: string;
}

interface AISource {
  title: string;
  url: string;
  date: string;
  relevance: "high" | "medium" | "low";
}

interface ConsequenceImpact {
  consequence_id: string;
  consequence_name: string;
  suggested_value: number;
  rationale: string;
}

interface AIResearchResult {
  success: boolean;
  data?: {
    suggested_value?: number; // For probability
    consequence_impacts?: ConsequenceImpact[]; // For consequence research
    explanation: string;
    sources: AISource[];
    confidence_level: number;
    data_quality: "strong" | "moderate" | "limited" | "none";
    conflicting_data: boolean;
    conflict_explanation?: string;
    location_specific: boolean;
    industry_specific: boolean;
  };
  error?: string;
  cached?: boolean;
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
    const userId = claimsData.claims.sub as string;

    const body: ResearchRequest = await req.json();
    const { hazard_name, hazard_category, research_type, org_context, consequences, assessment_id, hazard_id } = body;

    if (!hazard_name || !research_type || !org_context) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For consequence research, require consequences array
    if (research_type === "consequence" && (!consequences || consequences.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: "Consequences array required for impact research" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.org_id) {
      return new Response(
        JSON.stringify({ success: false, error: "User has no organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache first
    const cacheKey = `${org_context.sector}_${org_context.region}_${hazard_category}_${research_type}`.toLowerCase().replace(/\s+/g, "_");
    
    const { data: cachedResult } = await supabase
      .from("ai_research_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("org_id", profile.org_id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedResult) {
      // Update hit count
      await supabase
        .from("ai_research_cache")
        .update({ hit_count: (cachedResult.hit_count || 0) + 1 })
        .eq("id", cachedResult.id);

      // Log the cached request
      await supabase.from("ai_research_logs").insert({
        org_id: profile.org_id,
        user_id: userId,
        assessment_id,
        hazard_id,
        request_type: research_type,
        request_params: { hazard_name, hazard_category, org_context },
        response_data: cachedResult.result_data,
        sources_found: (cachedResult.sources as unknown[])?.length || 0,
        confidence_score: cachedResult.confidence_level,
        cache_hit: true,
        duration_ms: Date.now() - startTime,
      });

      console.log("Returning cached result for:", cacheKey);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...cachedResult.result_data,
            sources: cachedResult.sources,
            confidence_level: cachedResult.confidence_level,
          },
          cached: true,
        } as AIResearchResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No cache - call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a risk assessment research assistant specializing in Hazard Identification and Risk Assessment (HIRA) for emergency management and business continuity.

CRITICAL RULES:
1. NEVER fabricate or hallucinate data. If you don't have reliable information, say "No reliable data found"
2. ALWAYS cite real sources with actual URLs when available
3. ALWAYS indicate confidence level honestly (0.0 to 1.0)
4. ALWAYS note if data is location-specific or industry-specific
5. If sources conflict, flag this clearly and explain the discrepancy
6. Provide conservative estimates when uncertain
7. Focus on the specific geographic region and industry sector provided

ORGANIZATION CONTEXT:
- Name: ${org_context.name}
- Industry/Sector: ${org_context.sector}
- Region: ${org_context.region}
- Location: ${org_context.primary_location || "Not specified"}
- Key Facilities: ${org_context.key_facilities?.join(", ") || "Not specified"}
- Organization Size: ${org_context.size || "Not specified"}

You must respond using the research_result tool to provide structured output.`;

    // Build consequence list for the prompt if this is consequence research
    // IMPORTANT: Include IDs so the AI uses exact IDs in its response
    const consequencesList = consequences?.map(c => `- ID: "${c.id}" | Name: "${c.name}" | Weight: ${c.weight}%`).join("\n") || "";

    const userPrompt = research_type === "probability"
      ? `Research the probability/likelihood of "${hazard_name}" (category: ${hazard_category}) occurring in ${org_context.primary_location || org_context.region} for a ${org_context.sector} organization.

Find:
1. Historical frequency data for this region
2. Industry-specific incident rates
3. Any relevant statistics or studies
4. Suggested probability score (1-6 scale where 1=Rare/once in 100+ years, 6=Certain/multiple times per year)

Be conservative - if data is limited, suggest lower confidence and note data limitations.`
      : `Research the potential consequences/impacts of "${hazard_name}" (category: ${hazard_category}) on ${org_context.sector} organizations.

CONTEXT: The user's organization is located in ${org_context.primary_location || org_context.region}, but IMPACT RESEARCH SHOULD BE GLOBAL IN SCOPE.

CRITICAL INSTRUCTION FOR IMPACT RESEARCH:
Unlike probability research (which is location-specific), impact research should look at WORLDWIDE data because:
- A hospital in Toronto will experience similar impacts from an earthquake as a hospital in Japan or California
- The consequences of a flood on critical infrastructure are similar whether in the UK, US, or Canada
- Industry-specific impacts are transferable across regions

RESEARCH SCOPE - Look for sources from:
1. GLOBAL case studies from similar ${org_context.sector} organizations worldwide
2. International disaster reports (WHO, UN OCHA, FEMA, academic journals)
3. Industry-specific incident reports from ANY country
4. Historical impact data from similar events in comparable organizations globally
5. Local sources are acceptable but should NOT be the only sources

IMPORTANT: You MUST provide a SEPARATE impact score (0-3) for EACH of the following consequence types.
Use the EXACT IDs provided below in your response:
${consequencesList}

Impact Scale:
- 0 = None/Not Applicable
- 1 = Minor impact
- 2 = Moderate impact  
- 3 = Severe impact

For EACH consequence type:
1. Use the EXACT consequence_id from the list above
2. Research historical impact data from similar incidents GLOBALLY
3. Consider ${org_context.sector}-specific consequence patterns
4. Provide a suggested impact score with brief rationale

If you cannot find reliable data for a specific consequence type, set its score to null and explain why.`;

    console.log("Calling Lovable AI for research:", { hazard_name, research_type, org: org_context.name });

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
              name: "research_result",
              description: "Return structured research findings with sources and confidence levels",
              parameters: {
                type: "object",
                properties: {
                  suggested_value: {
                    type: "number",
                    description: "For probability research: Suggested score (1-6). Omit if no data found. NOT used for consequence research.",
                  },
                  consequence_impacts: {
                    type: "array",
                    description: "For consequence research: Array of impact scores for each consequence type. Required for consequence research.",
                    items: {
                      type: "object",
                      properties: {
                        consequence_id: { type: "string", description: "The ID of the consequence" },
                        consequence_name: { type: "string", description: "Name of the consequence type" },
                        suggested_value: { type: "number", description: "Suggested impact score (0-3). Use null if no reliable data." },
                        rationale: { type: "string", description: "Brief explanation for this specific impact score" },
                      },
                      required: ["consequence_id", "consequence_name", "suggested_value", "rationale"],
                    },
                  },
                  explanation: {
                    type: "string",
                    description: "Overall explanation of findings, methodology, and any caveats. Be honest about data limitations.",
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Source title or description" },
                        url: { type: "string", description: "URL if available, or 'N/A' if not" },
                        date: { type: "string", description: "Publication date if known, or 'Unknown'" },
                        relevance: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "url", "date", "relevance"],
                    },
                    description: "List of sources. Empty array if no reliable sources found.",
                  },
                  confidence_level: {
                    type: "number",
                    description: "Confidence in findings (0.0 to 1.0). Be conservative - use 0.3 or less if data is limited.",
                  },
                  data_quality: {
                    type: "string",
                    enum: ["strong", "moderate", "limited", "none"],
                    description: "Quality of available data",
                  },
                  conflicting_data: {
                    type: "boolean",
                    description: "True if sources provide conflicting information",
                  },
                  conflict_explanation: {
                    type: "string",
                    description: "Explanation of conflicts if conflicting_data is true",
                  },
                  location_specific: {
                    type: "boolean",
                    description: "True if findings are specific to the requested location",
                  },
                  industry_specific: {
                    type: "boolean",
                    description: "True if findings are specific to the requested industry",
                  },
                },
                required: ["explanation", "sources", "confidence_level", "data_quality", "conflicting_data", "location_specific", "industry_specific"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "research_result" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", aiData);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const duration = Date.now() - startTime;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    console.log("AI research completed:", {
      hazard: hazard_name,
      confidence: result.confidence_level,
      sources: result.sources?.length || 0,
      duration,
    });

    // Cache the result (only if we have meaningful data)
    if (result.data_quality !== "none" && result.sources?.length > 0) {
      await supabase.from("ai_research_cache").insert({
        cache_key: cacheKey,
        org_id: profile.org_id,
        hazard_type: hazard_category,
        research_type,
        location: org_context.primary_location || org_context.region,
        industry: org_context.sector,
        query_params: { hazard_name, hazard_category, org_context },
        result_data: {
          suggested_value: result.suggested_value,
          consequence_impacts: result.consequence_impacts,
          explanation: result.explanation,
          data_quality: result.data_quality,
          conflicting_data: result.conflicting_data,
          conflict_explanation: result.conflict_explanation,
          location_specific: result.location_specific,
          industry_specific: result.industry_specific,
        },
        sources: result.sources,
        confidence_level: result.confidence_level,
      });
    }

    // Log the request
    await supabase.from("ai_research_logs").insert({
      org_id: profile.org_id,
      user_id: userId,
      assessment_id,
      hazard_id,
      request_type: research_type,
      request_params: { hazard_name, hazard_category, org_context },
      response_data: result,
      sources_found: result.sources?.length || 0,
      confidence_score: result.confidence_level,
      cache_hit: false,
      duration_ms: duration,
      tokens_used: tokensUsed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        cached: false,
      } as AIResearchResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI research error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
