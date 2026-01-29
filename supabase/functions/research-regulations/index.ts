import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegulationRequest {
  industry: string;
  jurisdiction: string;
  org_context?: {
    size?: string;
    public_facing?: boolean;
    critical_infrastructure?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { industry, jurisdiction, org_context } = await req.json() as RegulationRequest;

    console.log(`Researching regulations for ${industry} in ${jurisdiction}`);

    // Build research prompt for AI
    const researchPrompt = `You are a regulatory compliance expert. Research and analyze regulatory requirements that affect how organizations in the ${industry} industry should weight consequence types in risk assessments.

CONTEXT:
- Industry: ${industry}
- Jurisdiction: ${jurisdiction}
- Organization Size: ${org_context?.size || 'Not specified'}
- Public-Facing Operations: ${org_context?.public_facing ? 'Yes' : 'No'}
- Critical Infrastructure: ${org_context?.critical_infrastructure ? 'Yes' : 'No'}

TASK:
Identify specific regulations, standards, and guidelines that mandate or recommend how this type of organization should prioritize different consequence types when conducting risk assessments.

For each regulation found, provide:
1. Regulation name and citation
2. Issuing authority
3. Which consequence types it emphasizes (from: Fatalities, Injuries/Illness, Displacement, Psychosocial, Support Systems, Property Damage, Infrastructure, Environmental, Economic, Reputational)
4. Specific weighting implications (e.g., "Must prioritize life safety above property")
5. Compliance requirements
6. Penalties for non-compliance

RESPOND IN JSON FORMAT:
{
  "regulations": [
    {
      "name": "Regulation Name",
      "citation": "Full citation",
      "authority": "Issuing body",
      "jurisdiction": "Applicable jurisdiction",
      "consequence_emphasis": ["Fatalities", "Injuries/Illness"],
      "weight_implications": {
        "Fatalities": "high",
        "Injuries/Illness": "high",
        "Property Damage": "medium"
      },
      "specific_requirements": ["List of specific requirements"],
      "penalties": "Description of penalties",
      "relevance_score": 0.95
    }
  ],
  "recommended_weight_adjustments": {
    "Fatalities": { "min_weight": 15, "max_weight": 35, "rationale": "Why" },
    "Injuries/Illness": { "min_weight": 10, "max_weight": 25, "rationale": "Why" }
  },
  "compliance_summary": "Overall summary of regulatory landscape",
  "confidence_level": "high|medium|low",
  "research_sources": ["List of sources consulted"]
}`;

    // Call AI Gateway
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a regulatory compliance research expert. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: researchPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content || "{}";
    
    // Parse AI response
    let regulatoryData;
    try {
      // Clean up response if it has markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      regulatoryData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      regulatoryData = {
        regulations: [],
        recommended_weight_adjustments: {},
        compliance_summary: "Unable to parse regulatory research results",
        confidence_level: "low",
        research_sources: []
      };
    }

    console.log(`Found ${regulatoryData.regulations?.length || 0} relevant regulations`);

    return new Response(JSON.stringify({
      success: true,
      data: regulatoryData,
      metadata: {
        industry,
        jurisdiction,
        researched_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Regulation research error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
