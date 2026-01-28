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

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function runSimulation(params: SimulationParams): {
  results: number[];
  eal_amount: number;
  percentile_10: number;
  percentile_50: number;
  percentile_90: number;
  var_95: number;
  probability_exceeds_threshold: Record<string, number>;
} {
  const iterations = params.iterations || 100000;
  const timeHorizon = params.time_horizon_years || 1;
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Sample frequency (events per year)
    const frequency = sampleDistribution(params.frequency_distribution);
    const eventsThisYear = Math.round(frequency * timeHorizon);

    let totalLoss = 0;
    for (let j = 0; j < eventsThisYear; j++) {
      const directCost = sampleDistribution(params.direct_cost_distribution);
      const indirectCost = sampleDistribution(params.indirect_cost_distribution);
      totalLoss += directCost + indirectCost;
    }

    results.push(totalLoss);
  }

  // Calculate statistics
  const eal_amount = results.reduce((a, b) => a + b, 0) / iterations;
  const p10 = percentile(results, 10);
  const p50 = percentile(results, 50);
  const p90 = percentile(results, 90);
  const var95 = percentile(results, 95);

  // Calculate probability of exceeding thresholds
  const thresholds = [10000, 50000, 100000, 500000, 1000000];
  const probability_exceeds_threshold: Record<string, number> = {};
  for (const threshold of thresholds) {
    const exceedCount = results.filter((r) => r > threshold).length;
    probability_exceeds_threshold[`$${threshold.toLocaleString()}`] =
      Math.round((exceedCount / iterations) * 10000) / 100;
  }

  return {
    results: results.slice(0, 1000), // Store sample of results
    eal_amount: Math.round(eal_amount * 100) / 100,
    percentile_10: Math.round(p10 * 100) / 100,
    percentile_50: Math.round(p50 * 100) / 100,
    percentile_90: Math.round(p90 * 100) / 100,
    var_95: Math.round(var95 * 100) / 100,
    probability_exceeds_threshold,
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

      // Store results
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
          results: { sample: results.results },
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
