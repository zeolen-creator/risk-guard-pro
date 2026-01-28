import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DistributionParams {
  type: "normal" | "lognormal" | "triangular" | "uniform" | "poisson";
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  mode?: number;
  lambda?: number;
}

interface TemplateConfig {
  id: string;
  name: string;
  parameters: {
    frequency_distribution: DistributionParams;
    direct_cost_distribution: DistributionParams;
    indirect_cost_distribution: DistributionParams;
  };
}

interface SimulationParams {
  hazard_id?: string;
  assessment_id?: string;
  template_id?: string;
  template_ids?: string[];
  templates?: TemplateConfig[];
  iterations?: number;
  time_horizon_years?: number;
  combination_method?: "single" | "compound" | "additive" | "weighted";
  frequency_distribution?: DistributionParams;
  direct_cost_distribution?: DistributionParams;
  indirect_cost_distribution?: DistributionParams;
  downtime_distribution?: DistributionParams;
}

interface HistogramBin {
  range_start: number;
  range_end: number;
  count: number;
  probability: number;
}

interface ScenarioStats {
  template_name: string;
  eal: number;
  var_95: number;
  occurrence_rate: number;
  contribution_pct: number;
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * std;
}

// Log-normal distribution
function randomLognormal(mean: number, std: number): number {
  const normalMean = Math.log(mean ** 2 / Math.sqrt(std ** 2 + mean ** 2));
  const normalStd = Math.sqrt(Math.log(1 + std ** 2 / mean ** 2));
  return Math.exp(randomNormal(normalMean, normalStd));
}

// Triangular distribution
function randomTriangular(min: number, max: number, mode: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

// Uniform distribution
function randomUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Poisson distribution
function randomPoisson(lambda: number): number {
  if (lambda === 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function sampleDistribution(params: DistributionParams): number {
  switch (params.type) {
    case "normal":
      return Math.max(0, randomNormal(params.mean || 0, params.std || 1));
    case "lognormal":
      return randomLognormal(params.mean || 1, params.std || 0.5);
    case "triangular":
      return randomTriangular(
        params.min || 0,
        params.max || 100,
        params.mode || 50
      );
    case "uniform":
      return randomUniform(params.min || 0, params.max || 100);
    case "poisson":
      return randomPoisson(params.lambda || 1);
    default:
      return params.mean || 0;
  }
}

function calculateHistogram(losses: number[], iterations: number): HistogramBin[] {
  const minLoss = losses[0];
  const maxLoss = losses[losses.length - 1];
  
  // Handle edge case where all losses are zero or identical
  if (maxLoss === minLoss) {
    return [{
      range_start: Math.round(minLoss),
      range_end: Math.round(maxLoss),
      count: iterations,
      probability: 1.0,
    }];
  }
  
  // Use fixed-width bins based on the ACTUAL loss range
  // This shows the TRUE probability distribution, not equal-count percentiles
  const binCount = 12;
  const histogram: HistogramBin[] = [];
  
  // For right-skewed distributions (common in risk), use logarithmic bin edges
  // This provides better resolution at lower values while still capturing tail risk
  const nonZeroLosses = losses.filter(l => l > 0);
  const zeroCount = losses.filter(l => l === 0).length;
  
  // First bin is always $0 (no-loss years)
  if (zeroCount > 0) {
    histogram.push({
      range_start: 0,
      range_end: 0,
      count: zeroCount,
      probability: zeroCount / iterations,
    });
  }
  
  if (nonZeroLosses.length === 0) {
    return histogram;
  }
  
  // For non-zero losses, create logarithmic bins for better visualization
  const minNonZero = Math.max(1, nonZeroLosses[0]);
  const maxNonZero = nonZeroLosses[nonZeroLosses.length - 1];
  
  // Calculate bin edges using logarithmic scale
  const logMin = Math.log10(minNonZero);
  const logMax = Math.log10(maxNonZero);
  const logStep = (logMax - logMin) / (binCount - 1);
  
  const binEdges: number[] = [];
  for (let i = 0; i < binCount; i++) {
    const edge = Math.pow(10, logMin + i * logStep);
    binEdges.push(edge);
  }
  binEdges.push(maxNonZero + 1); // Ensure we capture the max value
  
  // Count losses in each bin
  for (let i = 0; i < binEdges.length - 1; i++) {
    const rangeStart = binEdges[i];
    const rangeEnd = binEdges[i + 1];
    
    const count = nonZeroLosses.filter(l => l >= rangeStart && l < rangeEnd).length;
    
    if (count > 0) {
      histogram.push({
        range_start: Math.round(rangeStart),
        range_end: Math.round(rangeEnd),
        count: count,
        probability: count / iterations,
      });
    }
  }
  
  return histogram;
}

// Run SINGLE template simulation (backward compatible)
function runSingleSimulation(params: SimulationParams): {
  results: number[];
  eal_amount: number;
  percentile_10: number;
  percentile_50: number;
  percentile_90: number;
  var_95: number;
  probability_exceeds_threshold: Record<string, number>;
  distribution: HistogramBin[];
  data_quality: {
    min_loss: number;
    max_loss: number;
    total_probability: number;
    bin_count: number;
  };
} {
  const iterations = params.iterations || 100000;
  const timeHorizon = params.time_horizon_years || 1;
  const losses: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const frequency = sampleDistribution(params.frequency_distribution!);
    const eventsThisYear = Math.round(frequency * timeHorizon);

    let totalLoss = 0;
    for (let j = 0; j < eventsThisYear; j++) {
      const directCost = sampleDistribution(params.direct_cost_distribution!);
      const indirectCost = sampleDistribution(params.indirect_cost_distribution!);
      totalLoss += directCost + indirectCost;
    }

    losses.push(totalLoss);
  }

  losses.sort((a, b) => a - b);

  const eal = losses.reduce((sum, l) => sum + l, 0) / iterations;
  const p10 = losses[Math.floor(iterations * 0.10)];
  const p50 = losses[Math.floor(iterations * 0.50)];
  const p90 = losses[Math.floor(iterations * 0.90)];
  const var95 = losses[Math.floor(iterations * 0.95)];

  const histogram = calculateHistogram(losses, iterations);
  const totalProbability = histogram.reduce((sum, bin) => sum + bin.probability, 0);

  const thresholds = [10000, 50000, 100000, 500000, 1000000];
  const probability_exceeds_threshold: Record<string, number> = {};
  for (const threshold of thresholds) {
    const exceedCount = losses.filter((l) => l >= threshold).length;
    probability_exceeds_threshold[threshold.toString()] = exceedCount / iterations;
  }

  return {
    results: losses.slice(0, 1000),
    eal_amount: Math.round(eal * 100) / 100,
    percentile_10: Math.round(p10 * 100) / 100,
    percentile_50: Math.round(p50 * 100) / 100,
    percentile_90: Math.round(p90 * 100) / 100,
    var_95: Math.round(var95 * 100) / 100,
    probability_exceeds_threshold,
    distribution: histogram,
    data_quality: {
      min_loss: Math.round(losses[0]),
      max_loss: Math.round(losses[losses.length - 1]),
      total_probability: Math.round(totalProbability * 1000) / 1000,
      bin_count: histogram.length,
    },
  };
}

// Run MULTI-TEMPLATE compound simulation
function runCompoundSimulation(templates: TemplateConfig[], iterations: number): {
  results: number[];
  eal_amount: number;
  percentile_10: number;
  percentile_50: number;
  percentile_90: number;
  var_95: number;
  probability_exceeds_threshold: Record<string, number>;
  distribution: HistogramBin[];
  scenario_stats: Record<string, ScenarioStats>;
  dominant_scenario: ScenarioStats & { id: string };
  multi_scenario_rate: number;
  data_quality: {
    min_loss: number;
    max_loss: number;
    total_probability: number;
    bin_count: number;
    combination_method: string;
  };
} {
  console.log(`Starting compound Monte Carlo: ${templates.length} scenarios, ${iterations} iterations`);
  
  const losses: number[] = [];
  const scenarioOccurrences: Record<string, number> = {};
  const scenarioLosses: Record<string, number[]> = {};
  
  // Initialize tracking for each scenario
  templates.forEach(t => {
    scenarioOccurrences[t.id] = 0;
    scenarioLosses[t.id] = [];
  });
  
  let multiScenarioYears = 0;
  
  // Run simulations
  for (let i = 0; i < iterations; i++) {
    let totalYearLoss = 0;
    let scenariosThisYear = 0;
    
    // For each template/scenario
    for (const template of templates) {
      const params = template.parameters;
      
      // Sample frequency (events per year for this scenario)
      const frequency = sampleDistribution(params.frequency_distribution);
      const numEvents = randomPoisson(frequency);
      
      if (numEvents > 0) {
        scenarioOccurrences[template.id]++;
        scenariosThisYear++;
      }
      
      let scenarioYearLoss = 0;
      
      // For each event occurrence
      for (let e = 0; e < numEvents; e++) {
        const directCost = sampleDistribution(params.direct_cost_distribution);
        const indirectCost = sampleDistribution(params.indirect_cost_distribution);
        scenarioYearLoss += directCost + indirectCost;
      }
      
      scenarioLosses[template.id].push(scenarioYearLoss);
      totalYearLoss += scenarioYearLoss;
    }
    
    if (scenariosThisYear > 1) {
      multiScenarioYears++;
    }
    
    losses.push(totalYearLoss);
  }
  
  // Sort losses for percentile calculations
  losses.sort((a, b) => a - b);
  
  // Calculate aggregate statistics
  const eal = losses.reduce((sum, l) => sum + l, 0) / iterations;
  const p10 = losses[Math.floor(iterations * 0.10)];
  const p50 = losses[Math.floor(iterations * 0.50)];
  const p90 = losses[Math.floor(iterations * 0.90)];
  const var95 = losses[Math.floor(iterations * 0.95)];
  
  // Calculate per-scenario statistics
  const scenarioStats: Record<string, ScenarioStats> = {};
  
  for (const template of templates) {
    const scenarioLossArray = [...scenarioLosses[template.id]].sort((a, b) => a - b);
    const scenarioEAL = scenarioLossArray.reduce((sum, l) => sum + l, 0) / iterations;
    const scenarioVar95 = scenarioLossArray[Math.floor(iterations * 0.95)];
    const occurrenceRate = scenarioOccurrences[template.id] / iterations;
    
    scenarioStats[template.id] = {
      template_name: template.name,
      eal: Math.round(scenarioEAL),
      var_95: Math.round(scenarioVar95),
      occurrence_rate: occurrenceRate,
      contribution_pct: eal > 0 ? (scenarioEAL / eal) * 100 : 0,
    };
    
    console.log(`Scenario "${template.name}": EAL=$${Math.round(scenarioEAL).toLocaleString()}, Occurs in ${(occurrenceRate * 100).toFixed(1)}% of years`);
  }
  
  // Identify dominant scenario
  const sortedScenarios = Object.entries(scenarioStats)
    .sort((a, b) => b[1].contribution_pct - a[1].contribution_pct);
  
  const dominantScenario = {
    id: sortedScenarios[0][0],
    ...sortedScenarios[0][1],
  };
  
  const multiScenarioRate = multiScenarioYears / iterations;
  
  // Generate histogram
  const histogram = calculateHistogram(losses, iterations);
  const totalProbability = histogram.reduce((sum, bin) => sum + bin.probability, 0);
  
  // Calculate threshold probabilities
  const thresholds = [10000, 50000, 100000, 500000, 1000000];
  const probability_exceeds_threshold: Record<string, number> = {};
  for (const threshold of thresholds) {
    const exceedCount = losses.filter((l) => l >= threshold).length;
    probability_exceeds_threshold[threshold.toString()] = exceedCount / iterations;
  }
  
  console.log(`Compound simulation completed: EAL=$${Math.round(eal).toLocaleString()}, Multi-scenario rate: ${(multiScenarioRate * 100).toFixed(1)}%`);
  
  return {
    results: losses.slice(0, 1000),
    eal_amount: Math.round(eal * 100) / 100,
    percentile_10: Math.round(p10 * 100) / 100,
    percentile_50: Math.round(p50 * 100) / 100,
    percentile_90: Math.round(p90 * 100) / 100,
    var_95: Math.round(var95 * 100) / 100,
    probability_exceeds_threshold,
    distribution: histogram,
    scenario_stats: scenarioStats,
    dominant_scenario: dominantScenario,
    multi_scenario_rate: multiScenarioRate,
    data_quality: {
      min_loss: Math.round(losses[0]),
      max_loss: Math.round(losses[losses.length - 1]),
      total_probability: Math.round(totalProbability * 1000) / 1000,
      bin_count: histogram.length,
      combination_method: "compound",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, simulation_id, ...params } = body;

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.org_id) {
      return new Response(
        JSON.stringify({ error: "User not associated with organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "run") {
      console.log("Running Monte Carlo simulation with params:", JSON.stringify(params, null, 2));
      const startTime = Date.now();

      const iterations = params.iterations || 100000;
      const isMultiTemplate = params.templates && params.templates.length > 1;

      let results;
      let templateIds: string[] = [];
      let combinationMethod = "single";
      let scenarioCount = 1;

      if (isMultiTemplate) {
        // Multi-template compound simulation
        const templates: TemplateConfig[] = params.templates;
        templateIds = templates.map(t => t.id);
        combinationMethod = params.combination_method || "compound";
        scenarioCount = templates.length;
        
        results = runCompoundSimulation(templates, iterations);
      } else {
        // Single template or manual parameters (backward compatible)
        let simulationParams = params as SimulationParams;
        
        if (params.template_id) {
          const { data: template } = await supabase
            .from("simulation_templates")
            .select("*")
            .eq("id", params.template_id)
            .single();

          if (template?.default_parameters) {
            const defaultParams = template.default_parameters as Record<string, unknown>;
            simulationParams = {
              ...defaultParams,
              ...params,
              frequency_distribution: params.frequency_distribution || defaultParams.frequency_distribution,
              direct_cost_distribution: params.direct_cost_distribution || defaultParams.direct_cost_distribution,
              indirect_cost_distribution: params.indirect_cost_distribution || defaultParams.indirect_cost_distribution,
            } as SimulationParams;
          }
          templateIds = [params.template_id];
        } else if (params.templates && params.templates.length === 1) {
          // Single template via new interface
          const template = params.templates[0];
          simulationParams = {
            iterations,
            frequency_distribution: template.parameters.frequency_distribution,
            direct_cost_distribution: template.parameters.direct_cost_distribution,
            indirect_cost_distribution: template.parameters.indirect_cost_distribution,
          };
          templateIds = [template.id];
        }

        results = runSingleSimulation({
          ...simulationParams,
          iterations,
        });
      }

      const executionTime = Date.now() - startTime;

      // Store results
      const insertData: Record<string, unknown> = {
        org_id: profile.org_id,
        hazard_id: params.hazard_id || null,
        assessment_id: params.assessment_id || null,
        template_id: templateIds.length === 1 ? templateIds[0] : null,
        template_ids: templateIds.length > 0 ? templateIds : null,
        combination_method: combinationMethod,
        scenario_count: scenarioCount,
        iterations: iterations,
        time_horizon_years: params.time_horizon_years || 1,
        frequency_distribution: isMultiTemplate ? params.templates[0].parameters.frequency_distribution : params.frequency_distribution,
        direct_cost_distribution: isMultiTemplate ? params.templates[0].parameters.direct_cost_distribution : params.direct_cost_distribution,
        indirect_cost_distribution: isMultiTemplate ? params.templates[0].parameters.indirect_cost_distribution : params.indirect_cost_distribution,
        downtime_distribution: params.downtime_distribution || null,
        results: {
          sample: results.results,
          distribution: results.distribution,
          data_quality: results.data_quality,
          ...(isMultiTemplate && {
            scenario_stats: (results as any).scenario_stats,
            dominant_scenario: (results as any).dominant_scenario,
            multi_scenario_rate: (results as any).multi_scenario_rate,
          }),
        },
        eal_amount: results.eal_amount,
        percentile_10: results.percentile_10,
        percentile_50: results.percentile_50,
        percentile_90: results.percentile_90,
        var_95: results.var_95,
        probability_exceeds_threshold: results.probability_exceeds_threshold,
        status: "completed",
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        created_by: userId,
        data_source: templateIds.length > 0 ? "template" : "manual",
      };

      const { data: simulation, error: insertError } = await supabase
        .from("monte_carlo_simulations")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Error storing simulation:", insertError);
        return new Response(JSON.stringify({ error: "Failed to store results" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Simulation completed in ${executionTime}ms, EAL: $${results.eal_amount}`);

      return new Response(
        JSON.stringify({
          success: true,
          simulation_id: simulation.id,
          is_multi_template: isMultiTemplate,
          scenario_count: scenarioCount,
          results: {
            eal_amount: results.eal_amount,
            percentile_10: results.percentile_10,
            percentile_50: results.percentile_50,
            percentile_90: results.percentile_90,
            var_95: results.var_95,
            probability_exceeds_threshold: results.probability_exceeds_threshold,
            distribution: results.distribution,
            data_quality: results.data_quality,
            ...(isMultiTemplate && {
              scenario_stats: (results as any).scenario_stats,
              dominant_scenario: (results as any).dominant_scenario,
              multi_scenario_rate: (results as any).multi_scenario_rate,
            }),
          },
          execution_time_ms: executionTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_templates") {
      const { data: templates } = await supabase
        .from("simulation_templates")
        .select("*")
        .order("hazard_category");

      return new Response(JSON.stringify({ templates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Monte Carlo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
