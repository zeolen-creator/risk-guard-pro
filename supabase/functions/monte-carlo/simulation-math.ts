export interface DistributionParams {
  type: "normal" | "lognormal" | "triangular" | "uniform" | "poisson";
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  mode?: number;
  lambda?: number;
}

type Random = () => number;

function randomNormal(mean: number, std: number, random: Random): number {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * std;
}

function randomPoisson(lambda: number, random: Random): number {
  if (lambda <= 0) return 0;

  // Knuth's exact sampler is efficient for the low event rates used in risk
  // models. Split larger rates into independent chunks to avoid exp(-lambda)
  // underflow while preserving the Poisson sum property.
  const chunks = Math.ceil(lambda / 20);
  const chunkLambda = lambda / chunks;
  const limit = Math.exp(-chunkLambda);
  let total = 0;

  for (let chunk = 0; chunk < chunks; chunk++) {
    let product = 1;
    let count = 0;
    do {
      count++;
      product *= Math.max(random(), Number.EPSILON);
    } while (product > limit);
    total += count - 1;
  }

  return total;
}

export function validateDistribution(
  params: DistributionParams,
  label: string,
): void {
  if (!params || !["normal", "lognormal", "triangular", "uniform", "poisson"].includes(params.type)) {
    throw new Error(`${label} has an unsupported distribution type.`);
  }

  const values = [params.min, params.max, params.mean, params.std, params.mode, params.lambda];
  if (values.some((value) => value !== undefined && !Number.isFinite(value))) {
    throw new Error(`${label} distribution values must be finite numbers.`);
  }

  switch (params.type) {
    case "normal":
      if ((params.mean ?? 0) < 0 || (params.std ?? 1) < 0) {
        throw new Error(`${label} normal distribution requires a non-negative mean and standard deviation.`);
      }
      break;
    case "lognormal":
      if ((params.mean ?? 1) <= 0 || (params.std ?? 0.5) < 0) {
        throw new Error(`${label} lognormal distribution requires a positive mean and non-negative standard deviation.`);
      }
      break;
    case "triangular": {
      const min = params.min ?? 0;
      const max = params.max ?? 100;
      const mode = params.mode ?? (min + max) / 2;
      if (min < 0 || min > mode || mode > max) {
        throw new Error(`${label} triangular distribution requires 0 ≤ minimum ≤ mode ≤ maximum.`);
      }
      break;
    }
    case "uniform":
      if ((params.min ?? 0) < 0 || (params.max ?? 100) < (params.min ?? 0)) {
        throw new Error(`${label} uniform distribution requires 0 ≤ minimum ≤ maximum.`);
      }
      break;
    case "poisson":
      if ((params.lambda ?? 1) < 0) {
        throw new Error(`${label} Poisson distribution requires a non-negative lambda.`);
      }
      break;
  }
}

export function sampleDistribution(params: DistributionParams, random: Random = Math.random): number {
  switch (params.type) {
    case "normal":
      return Math.max(0, randomNormal(params.mean ?? 0, params.std ?? 1, random));
    case "lognormal": {
      const mean = params.mean ?? 1;
      const std = params.std ?? 0.5;
      const normalMean = Math.log(mean ** 2 / Math.sqrt(std ** 2 + mean ** 2));
      const normalStd = Math.sqrt(Math.log(1 + std ** 2 / mean ** 2));
      return Math.exp(randomNormal(normalMean, normalStd, random));
    }
    case "triangular": {
      const min = params.min ?? 0;
      const max = params.max ?? 100;
      const mode = params.mode ?? (min + max) / 2;
      if (min === max) return min;
      const u = random();
      const split = (mode - min) / (max - min);
      return u < split
        ? min + Math.sqrt(u * (max - min) * (mode - min))
        : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
    case "uniform": {
      const min = params.min ?? 0;
      return min + random() * ((params.max ?? 100) - min);
    }
    case "poisson":
      return randomPoisson(params.lambda ?? 1, random);
  }
}

/**
 * Frequency distributions describe an annual rate. Draw the uncertain rate,
 * then sample the event count over the requested horizon with a Poisson model.
 * A Poisson frequency is already a count model, so scale its annual lambda
 * directly instead of drawing a Poisson rate and then drawing a second count.
 */
export function sampleEventCount(
  frequency: DistributionParams,
  timeHorizonYears: number,
  random: Random = Math.random,
): number {
  const lambda = frequency.type === "poisson"
    ? (frequency.lambda ?? 1) * timeHorizonYears
    : sampleDistribution(frequency, random) * timeHorizonYears;
  return randomPoisson(lambda, random);
}

export function simulateAnnualizedLoss(
  frequency: DistributionParams,
  directCost: DistributionParams,
  indirectCost: DistributionParams,
  timeHorizonYears: number,
  random: Random = Math.random,
): number {
  const eventCount = sampleEventCount(frequency, timeHorizonYears, random);
  let totalLoss = 0;
  for (let event = 0; event < eventCount; event++) {
    totalLoss += sampleDistribution(directCost, random) + sampleDistribution(indirectCost, random);
  }
  return totalLoss / timeHorizonYears;
}
