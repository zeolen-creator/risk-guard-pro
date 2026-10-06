import { describe, expect, it } from "vitest";
import { canonicalWeights, normalizeWeights, validWeightTotal, WEIGHT_KEYS } from "../../supabase/functions/_shared/weights";
const equal = Object.fromEntries(WEIGHT_KEYS.map(k => [k, 10]));
describe("consequence weights", () => {
  it("preserves zero and normalizes fractional recommendations to exactly 100 percent", () => {
    const result = normalizeWeights({...equal, Injuries: 0, Fatalities: 17.321});
    expect(result.Injuries).toBe(0);
    expect(Object.values(result).reduce((sum, v) => sum + Math.round(v * 100), 0)).toBe(10000);
    expect(validWeightTotal(result)).toBe(true);
  });
  it("maps human category labels without relying on order", () => {
    const { Injuries, ...rest } = equal;
    expect(canonicalWeights({...rest, "Injuries/Illness": Injuries})).toEqual(equal);
  });
  it.each([{}, {...equal, Unknown: 0}, {...equal, Injuries: -1}, {...equal, Injuries: "10"}, {...equal, Injuries: NaN}])("rejects incomplete or malformed recommendations", input => {
    expect(() => canonicalWeights(input)).toThrow();
  });
  it("rejects all-zero synthesis", () => {
    expect(() => normalizeWeights(Object.fromEntries(WEIGHT_KEYS.map(k => [k, 0])))).toThrow();
  });
});
