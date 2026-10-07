// @vitest-environment node
import { describe, expect, it } from "vitest";
import { calculateAHPWeights, likelihoodFromAnnualProbability, validLikelihood, validImpact, weightingResult } from "../_shared/hira-scoring";
import { WEIGHT_KEYS } from "../_shared/weights";
import { validSchema, object, array, number, nullable, choice, citations } from "../_shared/modern-ai";
describe("defensible scoring boundaries",()=>{
 it("maps annual probability boundaries, never dollars or missing values",()=>{
  expect([0,.0099,.01,.0199,.02,.0499,.05,.2,.2001,.9999,1].map(likelihoodFromAnnualProbability)).toEqual([1,1,2,2,3,3,4,4,5,5,6]);
  for(const value of [null,undefined,NaN,Infinity,-.1,1.1,500000,"0.2"])expect(likelihoodFromAnnualProbability(value)).toBeNull();
 });
 it("rejects fractional, missing and out-of-range score application",()=>{
  for(const value of [null,undefined,NaN,1.2,-1,7,"3"])expect(validLikelihood(value)).toBe(false);
  expect(validImpact(0)).toBe(true); expect(validImpact(3.5)).toBe(false);
 });
 it("recovers known consistent priorities using the principal eigenvector",()=>{
  const priority=[1,2,3,4,5,6,7,8,9,1];
  const result=calculateAHPWeights(priority.map(a=>priority.map(b=>a/b)));
  result.weights.forEach((w,i)=>expect(w).toBeCloseTo(priority[i]/46,10));
  expect(result.consistencyRatio).toBeLessThan(1e-10);
 });
 it("rejects malformed or nonreciprocal matrices and detects inconsistency",()=>{
  for(const matrix of [[],[[1,0],[0,1]],[[1,2],[2,1]],[[1,NaN],[1,1]]])expect(()=>calculateAHPWeights(matrix)).toThrow();
  expect(calculateAHPWeights([[1,9,1/9],[1/9,1,9],[9,1/9,1]]).isConsistent).toBe(false);
 });
 it("normalizes priorities deterministically without inventing source coefficients",()=>{
  const weights=Object.fromEntries(WEIGHT_KEYS.map((k,i)=>[k,i+1]));
  const result=weightingResult(weights,.05);
  expect(Object.values(result.weights).reduce((a,b)=>a+b,0)).toBeCloseTo(100,10);
  expect(result.contributions.ahp_influence_percent).toBe(100);
  expect(result.contributions.regulatory_influence_percent).toBe(0);
  expect(result.sensitivity).toHaveLength(10);
  for(const row of result.sensitivity){expect(row.low).toBeLessThanOrEqual(row.base);expect(row.high).toBeGreaterThanOrEqual(row.base);}
  expect(()=>weightingResult(weights,.11)).toThrow(/consistency/);
 });
 it("strictly validates nullable numbers, enums, required fields and unknown fields",()=>{
  const schema=object({value:nullable(number(0,1)),status:choice("ok","missing"),list:array(number(0,3))});
  expect(validSchema({value:null,status:"missing",list:[]},schema)).toBe(true);
  for(const value of [{value:2,status:"ok",list:[]},{value:null,status:"bad",list:[]},{value:null,status:"ok",list:[4]},{value:null,status:"ok",list:[],extra:true}])expect(validSchema(value,schema)).toBe(false);
 });
 it("rejects fabricated, duplicate and absent required citations",()=>{
  const source={id:"W1",kind:"web" as const,title:"Agency",retrieved_at:"today"};
  for(const ids of [[],["W99"],["W1","W1"]])expect(()=>citations(ids,[source],true)).toThrow();
  expect(()=>citations(["W1"],[source],true)).not.toThrow();
 });
});
