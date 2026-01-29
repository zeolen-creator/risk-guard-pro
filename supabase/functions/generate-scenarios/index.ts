import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioRequest {
  industry: string;
  org_context?: {
    size?: string;
    location?: string;
    specific_operations?: string[];
  };
  count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { industry, org_context, count = 4 } = await req.json() as ScenarioRequest;

    console.log(`Generating ${count} scenarios for ${industry}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, try to get existing scenarios from the template library
    const { data: existingScenarios, error: fetchError } = await supabase
      .from("scenario_templates")
      .select("*")
      .eq("industry", industry)
      .limit(count);

    if (fetchError) {
      console.error("Error fetching existing scenarios:", fetchError);
    }

    // If we have enough existing scenarios, return them
    if (existingScenarios && existingScenarios.length >= count) {
      console.log(`Returning ${existingScenarios.length} existing scenarios`);
      return new Response(JSON.stringify({
        success: true,
        scenarios: existingScenarios.slice(0, count),
        source: "template_library"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate additional scenarios using AI
    const scenarioPrompt = `You are a risk assessment expert. Generate ${count} realistic emergency/disaster scenarios for an organization in the ${industry} industry.

CONTEXT:
- Industry: ${industry}
${org_context?.size ? `- Organization Size: ${org_context.size}` : ''}
${org_context?.location ? `- Location: ${org_context.location}` : ''}
${org_context?.specific_operations?.length ? `- Operations: ${org_context.specific_operations.join(', ')}` : ''}

CONSEQUENCE TYPES (rate each 0-3):
- 0 = No impact
- 1 = Minor impact
- 2 = Moderate impact  
- 3 = Severe impact

Categories:
1. Fatalities - Loss of life
2. Injuries/Illness - Physical harm
3. Displacement - Forced relocation
4. Psychosocial - Mental health impacts
5. Support Systems - Service disruptions
6. Property Damage - Asset destruction
7. Infrastructure - Critical system failures
8. Environmental - Ecological damage
9. Economic - Financial losses
10. Reputational - Trust/brand damage

Generate ${count} diverse scenarios that test different consequence combinations. Include:
- Natural disasters
- Technological failures
- Human-caused incidents
- Health emergencies

RESPOND IN JSON FORMAT:
{
  "scenarios": [
    {
      "title": "Scenario Title",
      "description": "Detailed 2-3 sentence description of the scenario",
      "category": "natural|technological|human|health",
      "probability": "rare|unlikely|possible|likely|almost_certain",
      "consequence_values": {
        "Fatalities": 2,
        "Injuries/Illness": 3,
        "Displacement": 1,
        "Psychosocial": 2,
        "Support Systems": 1,
        "Property Damage": 2,
        "Infrastructure": 2,
        "Environmental": 1,
        "Economic": 2,
        "Reputational": 2
      },
      "industry_relevance": "Why this scenario is particularly relevant to ${industry}"
    }
  ]
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
            content: "You are a risk assessment expert specializing in emergency scenarios. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: scenarioPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content || "{}";
    
    let scenarioData;
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      scenarioData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return existing scenarios if AI fails
      return new Response(JSON.stringify({
        success: true,
        scenarios: existingScenarios || [],
        source: "template_library_fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Combine existing and generated scenarios
    const allScenarios = [
      ...(existingScenarios || []),
      ...(scenarioData.scenarios || []).map((s: any, idx: number) => ({
        ...s,
        id: `generated-${Date.now()}-${idx}`,
        industry,
        is_ai_generated: true
      }))
    ].slice(0, count);

    console.log(`Returning ${allScenarios.length} scenarios (${existingScenarios?.length || 0} existing + ${scenarioData.scenarios?.length || 0} generated)`);

    return new Response(JSON.stringify({
      success: true,
      scenarios: allScenarios,
      source: "combined"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Scenario generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
