import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SensitivityRequest {
  base_weights: Record<string, number>;
  scenarios: Array<{
    id: string;
    title: string;
    consequence_values: Record<string, number>;
  }>;
  variation_range?: number; // Default ±5%
}

interface SensitivityResult {
  consequence: string;
  base_weight: number;
  scenarios_affected: Array<{
    scenario_id: string;
    scenario_title: string;
    base_score: number;
    min_score: number;
    max_score: number;
    score_range: number;
    sensitivity: "high" | "medium" | "low";
  }>;
  overall_sensitivity: "high" | "medium" | "low";
  recommendation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { base_weights, scenarios, variation_range = 5 } = await req.json() as SensitivityRequest;

    console.log(`Running sensitivity analysis with ±${variation_range}% variation`);

    const consequenceTypes = Object.keys(base_weights);
    const results: SensitivityResult[] = [];

    // For each consequence type, analyze sensitivity
    for (const consequence of consequenceTypes) {
      const baseWeight = base_weights[consequence];
      const minWeight = Math.max(0, baseWeight - variation_range);
      const maxWeight = Math.min(100, baseWeight + variation_range);

      const scenariosAffected: SensitivityResult["scenarios_affected"] = [];

      for (const scenario of scenarios) {
        const consequenceValue = scenario.consequence_values[consequence] || 0;
        
        // Calculate base scenario score (weighted sum)
        let baseScore = 0;
        let minScore = 0;
        let maxScore = 0;

        for (const [cons, weight] of Object.entries(base_weights)) {
          const value = scenario.consequence_values[cons] || 0;
          
          if (cons === consequence) {
            baseScore += value * (weight / 100);
            minScore += value * (minWeight / 100);
            maxScore += value * (maxWeight / 100);
          } else {
            // Normalize other weights when this one changes
            const adjustedWeight = weight * (100 / (100 - baseWeight + minWeight));
            const adjustedWeightMax = weight * (100 / (100 - baseWeight + maxWeight));
            
            baseScore += value * (weight / 100);
            minScore += value * (adjustedWeight / 100);
            maxScore += value * (adjustedWeightMax / 100);
          }
        }

        const scoreRange = Math.abs(maxScore - minScore);
        let sensitivity: "high" | "medium" | "low";
        
        if (scoreRange > 0.3) sensitivity = "high";
        else if (scoreRange > 0.15) sensitivity = "medium";
        else sensitivity = "low";

        scenariosAffected.push({
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          base_score: Math.round(baseScore * 100) / 100,
          min_score: Math.round(minScore * 100) / 100,
          max_score: Math.round(maxScore * 100) / 100,
          score_range: Math.round(scoreRange * 100) / 100,
          sensitivity
        });
      }

      // Calculate overall sensitivity for this consequence
      const highSensitivityCount = scenariosAffected.filter(s => s.sensitivity === "high").length;
      const mediumSensitivityCount = scenariosAffected.filter(s => s.sensitivity === "medium").length;
      
      let overallSensitivity: "high" | "medium" | "low";
      if (highSensitivityCount > scenarios.length / 3) {
        overallSensitivity = "high";
      } else if (highSensitivityCount + mediumSensitivityCount > scenarios.length / 2) {
        overallSensitivity = "medium";
      } else {
        overallSensitivity = "low";
      }

      // Generate recommendation
      let recommendation: string;
      if (overallSensitivity === "high") {
        recommendation = `${consequence} weight significantly impacts scenario scores. Consider additional validation or stakeholder review before finalizing.`;
      } else if (overallSensitivity === "medium") {
        recommendation = `${consequence} weight has moderate impact. Current weight appears reasonable but monitor for changes.`;
      } else {
        recommendation = `${consequence} weight has minimal impact on overall risk scores. Weight can be adjusted with confidence.`;
      }

      results.push({
        consequence,
        base_weight: baseWeight,
        scenarios_affected: scenariosAffected,
        overall_sensitivity: overallSensitivity,
        recommendation
      });
    }

    // Sort by sensitivity (high first)
    results.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.overall_sensitivity] - order[b.overall_sensitivity];
    });

    // Generate tornado diagram data
    const tornadoData = results.map(r => {
      const avgRange = r.scenarios_affected.reduce((sum, s) => sum + s.score_range, 0) / r.scenarios_affected.length;
      return {
        consequence: r.consequence,
        weight: r.base_weight,
        impact_range: Math.round(avgRange * 100) / 100,
        sensitivity: r.overall_sensitivity
      };
    }).sort((a, b) => b.impact_range - a.impact_range);

    console.log(`Analysis complete: ${results.filter(r => r.overall_sensitivity === 'high').length} high sensitivity consequences`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        results,
        tornado_data: tornadoData,
        summary: {
          high_sensitivity_count: results.filter(r => r.overall_sensitivity === "high").length,
          medium_sensitivity_count: results.filter(r => r.overall_sensitivity === "medium").length,
          low_sensitivity_count: results.filter(r => r.overall_sensitivity === "low").length,
          most_sensitive: results[0]?.consequence || null,
          least_sensitive: results[results.length - 1]?.consequence || null
        },
        parameters: {
          variation_range,
          scenarios_analyzed: scenarios.length,
          consequences_analyzed: consequenceTypes.length
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sensitivity analysis error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
