import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MissionAnalysisRequest {
  mission_statement: string;
  vision_statement?: string;
  core_values?: string[];
  industry: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mission_statement, vision_statement, core_values, industry } = await req.json() as MissionAnalysisRequest;

    console.log(`Analyzing mission statement for ${industry} organization`);

    const analysisPrompt = `You are an organizational values analyst specializing in risk management frameworks. Analyze the following organizational statements to determine how they should influence consequence weighting in risk assessments.

ORGANIZATION CONTEXT:
- Industry: ${industry}
- Mission Statement: "${mission_statement}"
${vision_statement ? `- Vision Statement: "${vision_statement}"` : ''}
${core_values?.length ? `- Core Values: ${core_values.join(', ')}` : ''}

CONSEQUENCE TYPES TO ANALYZE:
1. Fatalities - Loss of human life
2. Injuries/Illness - Physical harm to people
3. Displacement - People forced to relocate
4. Psychosocial - Mental health and community wellbeing
5. Support Systems - Healthcare, education, social services
6. Property Damage - Physical assets and structures
7. Infrastructure - Critical systems (power, water, transport)
8. Environmental - Ecological damage and natural resources
9. Economic - Financial losses and business continuity
10. Reputational - Trust, brand, stakeholder confidence

TASK:
Analyze how the organization's stated mission, vision, and values should influence the relative importance of each consequence type. Consider:
- Explicit priorities mentioned
- Implicit values suggested by language
- Industry-specific implications
- Stakeholder focus areas

RESPOND IN JSON FORMAT:
{
  "mission_analysis": {
    "key_themes": ["Theme 1", "Theme 2"],
    "stakeholder_focus": ["Primary stakeholders"],
    "value_priorities": ["Priority 1", "Priority 2"],
    "risk_philosophy": "Description of implied risk philosophy"
  },
  "consequence_implications": {
    "Fatalities": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 15,
      "rationale": "Why this weight based on mission"
    },
    "Injuries/Illness": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 12,
      "rationale": "Why"
    },
    "Displacement": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 8,
      "rationale": "Why"
    },
    "Psychosocial": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 8,
      "rationale": "Why"
    },
    "Support Systems": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 10,
      "rationale": "Why"
    },
    "Property Damage": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 10,
      "rationale": "Why"
    },
    "Infrastructure": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 10,
      "rationale": "Why"
    },
    "Environmental": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 8,
      "rationale": "Why"
    },
    "Economic": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 10,
      "rationale": "Why"
    },
    "Reputational": {
      "influence": "high|medium|low|none",
      "weight_suggestion": 9,
      "rationale": "Why"
    }
  },
  "alignment_notes": "How well the suggested weights align with stated values",
  "tensions_identified": ["Any conflicts between different stated values"],
  "confidence_level": "high|medium|low"
}`;

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
            content: "You are an organizational values analyst. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content || "{}";
    
    let analysisData;
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisData = {
        mission_analysis: { key_themes: [], stakeholder_focus: [], value_priorities: [], risk_philosophy: "Analysis unavailable" },
        consequence_implications: {},
        alignment_notes: "Unable to analyze",
        tensions_identified: [],
        confidence_level: "low"
      };
    }

    console.log("Mission analysis completed successfully");

    return new Response(JSON.stringify({
      success: true,
      data: analysisData,
      metadata: {
        industry,
        analyzed_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Mission analysis error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
