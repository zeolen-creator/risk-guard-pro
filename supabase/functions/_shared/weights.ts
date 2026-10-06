export const WEIGHT_KEYS = [
  "Fatalities", "Injuries", "Displacement", "Psychosocial_Impact",
  "Support_System_Impact", "Property_Damage", "Infrastructure_Impact",
  "Environmental_Damage", "Economic_Impact", "Reputational_Impact",
] as const;

const aliases = [
  ["fatalities"], ["injuries", "injuriesillness", "injuriesandillness"], ["displacement"],
  ["psychosocial", "psychosocialimpact", "psychosocialimpacts"],
  ["supportsystems", "supportsystem", "supportsystemimpact", "supportsystemsimpact"],
  ["propertydamage"], ["infrastructure", "infrastructureimpact"],
  ["environmental", "environmentaldamage", "environmentalimpact"],
  ["economic", "economicimpact"], ["reputational", "reputationalimpact"],
];

export function canonicalWeights(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Weights must be an object");
  const result: Record<string, number> = {};
  for (const [name, value] of Object.entries(input)) {
    const index = aliases.findIndex(names => names.includes(name.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (index < 0 || WEIGHT_KEYS[index] in result) throw new Error(`Unknown or duplicate consequence: ${name}`);
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`Invalid weight for ${name}`);
    }
    result[WEIGHT_KEYS[index]] = value;
  }
  if (Object.keys(result).length !== WEIGHT_KEYS.length) throw new Error("All ten consequence weights are required");
  return result;
}

/** Normalize AI output to exactly 100.00%, preserving legitimate zero weights. */
export function normalizeWeights(input: unknown): Record<string, number> {
  const weights = canonicalWeights(input);
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("Weights must have a positive total");
  const parts = WEIGHT_KEYS.map((key, index) => {
    const exact = weights[key] / sum * 10000;
    return { key, index, units: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const remaining = 10000 - parts.reduce((total, p) => total + p.units, 0);
  const ranked = [...parts].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remaining; i++) ranked[i].units++;
  return Object.fromEntries(parts.map(p => [p.key, p.units / 100]));
}

export function validWeightTotal(weights: Record<string, number>): boolean {
  return Object.keys(weights).length > 0 && Object.values(weights).every(w =>
    Number.isFinite(w) && w >= 0 && w <= 100) &&
    Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 100) < 0.000001;
}
