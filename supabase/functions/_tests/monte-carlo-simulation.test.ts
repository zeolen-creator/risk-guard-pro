// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  sampleEventCount,
  simulateAnnualizedLoss,
  validateDistribution,
  type DistributionParams,
} from "../monte-carlo/simulation-math";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const annualRate: DistributionParams = { type: "uniform", min: 0.2, max: 0.2 };
const fixedDirectCost: DistributionParams = { type: "triangular", min: 1000, mode: 1000, max: 1000 };
const noIndirectCost: DistributionParams = { type: "triangular", min: 0, mode: 0, max: 0 };

describe("Monte Carlo loss model", () => {
  it("uses Poisson event counts instead of rounding fractional annual frequencies", () => {
    const random = seededRandom(42);
    const trials = 100_000;
    let events = 0;
    let zeroEventYears = 0;

    for (let i = 0; i < trials; i++) {
      const count = sampleEventCount(annualRate, 1, random);
      events += count;
      if (count === 0) zeroEventYears++;
    }

    expect(events / trials).toBeCloseTo(0.2, 2);
    expect(zeroEventYears / trials).toBeCloseTo(Math.exp(-0.2), 2);
  });

  it("keeps expected annual loss stable when the simulated horizon changes", () => {
    for (const horizon of [1, 5]) {
      const random = seededRandom(125 + horizon);
      const trials = 50_000;
      let totalAnnualizedLoss = 0;

      for (let i = 0; i < trials; i++) {
        totalAnnualizedLoss += simulateAnnualizedLoss(
          annualRate,
          fixedDirectCost,
          noIndirectCost,
          horizon,
          random,
        );
      }

      // EAL = 0.2 events/year * $1,000 per event.
      expect(Math.abs(totalAnnualizedLoss / trials - 200)).toBeLessThan(10);
    }
  });

  it("rejects malformed triangular assumptions instead of silently simulating them", () => {
    expect(() => validateDistribution(
      { type: "triangular", min: 100, mode: 50, max: 200 },
      "Test cost",
    )).toThrow(/minimum ≤ mode ≤ maximum/);
  });
});
