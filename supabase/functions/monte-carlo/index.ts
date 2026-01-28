import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SimulationParams {
  hazard_id?: string;
  assessment_id?: string;
  template_id?: string;
  iterations?: number;
  time_horizon_years?: number;
  frequency_distribution: DistributionParams;
  direct_cost_distribution: DistributionParams;
  indirect_cost_distribution: DistributionParams;
  downtime_distribution?: DistributionParams;
}

interface DistributionParams {
  type: "normal" | "lognormal" | "triangular" | "uniform" | "poisson";
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  mode?: number;
  lambda?: number;
}

interface HistogramBin {
  range_start: number;
  range_end: number;
  count: number;
  probability: number;
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

function runSimulation(params: SimulationParams): {
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

  // Run simulations
  for (let i = 0; i < iterations; i++) {
    const frequency = sampleDistribution(params.frequency_distribution);
    const eventsThisYear = Math.round(frequency * timeHorizon);

    let totalLoss = 0;
    for (let j = 0; j < eventsThisYear; j++) {
      const directCost = sampleDistribution(params.direct_cost_distribution);
      const indirectCost = sampleDistribution(params.indirect_cost_distribution);
      totalLoss += directCost + indirectCost;
    }

    losses.push(totalLoss);
  }

  // Sort losses ascending for percentile calculations
  losses.sort((a, b) => a - b);

  // Calculate key statistics
  const eal = losses.reduce((sum, l) => sum + l, 0) / iterations;
  const p10 = losses[Math.floor(iterations * 0.10)];
  const p50 = losses[Math.floor(iterations * 0.50)];
  const p90 = losses[Math.floor(iterations * 0.90)];
  const var95 = losses[Math.floor(iterations * 0.95)];

  // ============================================
  // CORRECTED HISTOGRAM CALCULATION
  // Using percentile-based bins for proper distribution
  // ============================================

  const minLoss = Math.max(0, losses[0]);
  const maxLoss = losses[losses.length - 1];

  // Create 10 bins using percentile-based edges (not equal-width)
  const binCount = 10;
  const binEdges: number[] = [];

  for (let i = 0; i <= binCount; i++) {
    const percentile = i / binCount;
    const index = Math.floor(percentile * (iterations - 1));
    binEdges.push(losses[index]);
  }

  // Remove duplicate edges and sort
  const uniqueBinEdges = [...new Set(binEdges)].sort((a, b) => a - b);

  // Count observations in each bin
  const histogram: HistogramBin[] = [];
  for (let i = 0; i < uniqueBinEdges.length - 1; i++) {
    const rangeStart = uniqueBinEdges[i];
    const rangeEnd = uniqueBinEdges[i + 1];

    // Count losses in this bin
    const count = losses.filter(l => l >= rangeStart && l < rangeEnd).length;

    // CRITICAL: Calculate probability as fraction of total iterations
    const probability = count / iterations;

    histogram.push({
      range_start: Math.round(rangeStart),
      range_end: Math.round(rangeEnd),
      count: count,
      probability: probability, // Decimal format: 0.35 = 35%
    });
  }

  // Handle last bin edge case
  const lastBinStart = uniqueBinEdges[uniqueBinEdges.length - 1];
  const lastBinCount = losses.filter(l => l >= lastBinStart).length;
  if (lastBinCount > 0 && (histogram.length === 0 || histogram[histogram.length - 1].range_start !== lastBinStart)) {
    histogram.push({
      range_start: Math.round(lastBinStart),
      range_end: Math.round(maxLoss),
      count: lastBinCount,
      probability: lastBinCount / iterations,
    });
  }

  // Verify total probability sums to ~1.0
  const totalProbability = histogram.reduce((sum, bin) => sum + bin.probability, 0);
  console.log(`Histogram check: Total probability = ${totalProbability.toFixed(4)}`);

  if (Math.abs(totalProbability - 1.0) > 0.01) {
    console.warn(`WARNING: Histogram probabilities sum to ${totalProbability}, not 1.0`);
  }

  console.log('Distribution bins:');
  histogram.forEach((bin, idx) => {
    console.log(`  ${idx}: $${bin.range_start.toLocaleString()}-$${bin.range_end.toLocaleString()} = ${(bin.probability * 100).toFixed(1)}% (${bin.count} occurrences)`);
  });

  // Calculate probability of exceeding thresholds
  const thresholds = [10000, 50000, 100000, 500000, 1000000];
  const probability_exceeds_threshold: Record<string, number> = {};

  for (const threshold of thresholds) {
    const exceedCount = losses.filter((l) => l >= threshold).length;
    probability_exceeds_threshold[threshold.toString()] = exceedCount / iterations;
  }

  return {
    results: losses.slice(0, 1000), // Store sample of results
    eal_amount: Math.round(eal * 100) / 100,
    percentile_10: Math.round(p10 * 100) / 100,
    percentile_50: Math.round(p50 * 100) / 100,
    percentile_90: Math.round(p90 * 100) / 100,
    var_95: Math.round(var95 * 100) / 100,
    probability_exceeds_threshold,
    distribution: histogram,
    data_quality: {
      min_loss: Math.round(minLoss),
      max_loss: Math.round(maxLoss),
      total_probability: Math.round(totalProbability * 1000) / 1000,
      bin_count: histogram.length,
    },
  };
}

Deno.serve(async (req) => {
  // Handle CORS
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

    // Verify user
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

    // Get user's org_id
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
      console.log("Running Monte Carlo simulation with params:", params);
      const startTime = Date.now();

      // If template_id provided, fetch template params
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
      }

      // Run the simulation
      const results = runSimulation(simulationParams);
      const executionTime = Date.now() - startTime;

      // Store results with distribution and data quality
      const { data: simulation, error: insertError } = await supabase
        .from("monte_carlo_simulations")
        .insert({
          org_id: profile.org_id,
          hazard_id: params.hazard_id || null,
          assessment_id: params.assessment_id || null,
          template_id: params.template_id || null,
          iterations: params.iterations || 100000,
          time_horizon_years: params.time_horizon_years || 1,
          frequency_distribution: simulationParams.frequency_distribution,
          direct_cost_distribution: simulationParams.direct_cost_distribution,
          indirect_cost_distribution: simulationParams.indirect_cost_distribution,
          downtime_distribution: simulationParams.downtime_distribution || null,
          results: { 
            sample: results.results,
            distribution: results.distribution,
            data_quality: results.data_quality,
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
          data_source: params.template_id ? "template" : "manual",
        })
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
          results: {
            eal_amount: results.eal_amount,
            percentile_10: results.percentile_10,
            percentile_50: results.percentile_50,
            percentile_90: results.percentile_90,
            var_95: results.var_95,
            probability_exceeds_threshold: results.probability_exceeds_threshold,
            distribution: results.distribution,
            data_quality: results.data_quality,
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
