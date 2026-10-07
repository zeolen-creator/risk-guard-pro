import { aiTool } from "../_shared/ai-tool-handler.ts";
import { research, structured, object, array, text, strings, choice, number, nullable, boundedText, citations, sourceLinks, AI_METHOD } from "../_shared/modern-ai.ts";
import { EvidenceError } from "../_shared/risk-evidence.ts";
const schema = object({
 summary_text: text, direction: choice("increasing","decreasing","mixed","uncertain"), limitations: strings,
 findings: array(object({ finding: text, source_ids: strings })),
 projections: array(object({ metric: text, unit: text, baseline_period: text, future_period: text, scenario: text, geography: text, lower: nullable(number(-1e12,1e12)), central: number(-1e12,1e12), upper: nullable(number(-1e12,1e12)), source_ids: strings, applicability: text })),
});
export const handler = aiTool("climate-analysis", async (body) => {
 const hazard = boundedText(body.hazard_category,"hazard",150);
 const location = boundedText(body.location,"public region",200);
 const evidence = await research({hazard,location,topic:"Regional climate hazard projections, datasets, baselines, emissions scenarios and uncertainty"},"Prioritize Environment and Climate Change Canada, ClimateData.ca, NOAA, USGS, IPCC and original regional studies. Distinguish hazard intensity/frequency from organizational risk. Do not invent generic risk multipliers.");
 const result = await structured<any>("climate_evidence",schema,
   "Provide qualitative climate findings. Include numerical projections ONLY when a retrieved source directly reports the exact metric, unit, baseline period, future period, scenario and geography. No extrapolation, interpolated years, generic risk multipliers or conversion to HIRA scores. If those details are missing use an empty projections array and explain gaps. Lower/upper can be null if not reported; never fabricate confidence bounds. Each projection must cite sources and explain spatial applicability. Cite every finding; direction uncertain where evidence is insufficient.",
   {hazard,location,evidence});
 for(const f of result.findings) citations(f.source_ids,evidence.sources,true);
 for(const p of result.projections) {
   citations(p.source_ids,evidence.sources,true);
   if ([p.metric,p.unit,p.baseline_period,p.future_period,p.scenario,p.geography].some(v=>!v.trim()) || (p.lower!==null && p.lower>p.central) || (p.upper!==null && p.upper<p.central)) throw new EvidenceError("Climate projection metadata or bounds are invalid.",502);
 }
 return {...result,hazard_category:hazard,location_region:location,data_sources:sourceLinks(evidence.sources),method_version:AI_METHOD,last_updated:new Date().toISOString()};
});
Deno.serve(handler);

