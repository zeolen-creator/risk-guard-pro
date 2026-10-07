// @vitest-environment node
import { beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import { WEIGHT_KEYS } from "../_shared/weights";
const mocks=vi.hoisted(()=>({research:vi.fn(),structured:vi.fn(),session:vi.fn(),invalidate:vi.fn()}));
vi.mock("../_shared/ai-tool-handler.ts",()=>({aiTool:(_kind:string,work:any)=>work,cors:{},organization:async()=>({id:"org",name:"PRIVATE NAME",sector:"Healthcare",region:"Ontario",primary_location:"Toronto"})}));
vi.mock("../_shared/authorization.ts",()=>({requireOrgResource:vi.fn(async()=>null)}));
vi.mock("../_shared/weighting-evidence.ts",()=>({weightingSession:mocks.session,invalidateSynthesis:mocks.invalidate}));
vi.mock("../_shared/modern-ai.ts",async(importOriginal)=>({...await importOriginal<any>(),research:mocks.research,structured:mocks.structured}));
let likelihood:any,hazards:any,regulations:any,mission:any,climate:any,synthesis:any;
beforeAll(async()=>{
 vi.stubGlobal("Deno",{serve:vi.fn(),env:{get:()=>undefined}});
 likelihood=(await import("../ai-research/index")).handler;
 hazards=(await import("../hazard-recommendations/index")).handler;
 regulations=(await import("../research-regulations/index")).handler;
 mission=(await import("../analyze-mission-statement/index")).handler;
 climate=(await import("../climate-risk-analysis/index")).handler;
 synthesis=(await import("../calculate-consequence-weights/index")).handler;
});
let writes:any[],failure:boolean;let tables:Record<string,any>;let access:any;
beforeEach(()=>{
 vi.clearAllMocks();writes=[];failure=false;
 mocks.research.mockResolvedValue({text:"Retrieved research",sources:[{id:"W1",kind:"web",title:"Agency",url:"https://www.fema.gov/",retrieved_at:"today"}]});
 mocks.session.mockResolvedValue({id:"session",status:"in_progress",layer4_completed:true,input_revision:1});
 tables={hazards:{id:"hazard",category:"Flood",hazards_list:["River flood"]},consequences:[{id:"c1",category:"Fatalities"}],weighting_questionnaire_responses:{mission_statement:"Protect people"},weighting_ahp_matrix:{matrix:WEIGHT_KEYS.map(()=>WEIGHT_KEYS.map(()=>1))},weighting_regulatory_research:{industry:"Healthcare",jurisdiction:"Toronto",web_search_results:{method_version:"hira-evidence-v2",sources:[]}},weighting_mission_analysis:{mission_statement:"Protect people",analysis_result:{method_version:"hira-evidence-v2"}},weighting_scenario_validations:[]};
 access={orgId:"org",supabase:{from:(table:string)=>{
  let write=false;const result=()=>({data:write?{id:"session"}:tables[table],error:write&&failure?{message:"failed"}:null});
  const chain:any={select:()=>chain,eq:()=>chain,in:()=>chain,order:()=>chain,upsert:(v:any)=>{writes.push({table,value:v});write=true;return chain;},update:(v:any)=>{writes.push({table,value:v});write=true;return chain;},single:async()=>result(),maybeSingle:async()=>result(),then:(resolve:any)=>Promise.resolve(result()).then(resolve)};return chain;
 }}};
});
function researchResult(extra={}){return {annual_probability:.03,probability_applicable:true,probability_source_ids:["W1"],probability_basis:"Annual occurrence for comparable exposure",consequence_impacts:[],explanation:"Review evidence",data_quality:"moderate",conflicting_data:false,conflict_explanation:"",location_specific:true,industry_specific:true,evidence_gaps:[],...extra};}
describe("upgraded endpoint contracts",()=>{
 it("derives likelihood from evidence and keeps private profile out of the public brief",async()=>{
  mocks.structured.mockResolvedValue(researchResult());
  const result=await likelihood({hazard_id:"hazard",research_type:"probability"},access);
  expect(result.data.suggested_value).toBe(3);expect(result.data.confidence_level).toBeNull();
  expect(JSON.stringify(mocks.research.mock.calls)).not.toContain("PRIVATE NAME");
  expect(JSON.stringify(mocks.structured.mock.calls)).toContain("PRIVATE NAME");
 });
 it("abstains when probability is missing, inapplicable or conflicted",async()=>{
  for(const result of [researchResult({annual_probability:null,probability_source_ids:[]}),researchResult({probability_applicable:false}),researchResult({conflicting_data:true})]){
   mocks.structured.mockResolvedValue(result);expect((await likelihood({hazard_id:"hazard",research_type:"probability"},access)).data.suggested_value).toBeNull();
  }
 });
 it("rejects impact IDs outside the selected catalog and fractional scores",async()=>{
  for(const impact of [{consequence_id:"other",suggested_value:2,source_ids:["W1"]},{consequence_id:"c1",suggested_value:1.5,source_ids:["W1"]}]){
   mocks.structured.mockResolvedValue(researchResult({consequence_impacts:[impact]}));
   await expect(likelihood({hazard_id:"hazard",research_type:"consequence",consequences:[{id:"c1"}]},access)).rejects.toThrow(/Invalid impact/);
  }
 });
 it("returns valid zero impacts without converting absent evidence into scores",async()=>{
  mocks.structured.mockResolvedValue(researchResult({consequence_impacts:[{consequence_id:"c1",suggested_value:0,source_ids:["W1"],rationale:"No exposure under this scenario"}]}));
  const r=await likelihood({hazard_id:"hazard",research_type:"consequence",consequences:[{id:"c1"}]},access);expect(r.data.consequence_impacts[0].suggested_value).toBe(0);
 });
 it("rejects another organization and never silently fabricates hazard scores",async()=>{
  await expect(hazards({org_context:{id:"other"},hazards:[{id:"hazard"}]},access)).rejects.toThrow(/Organization/);
  tables.hazards=[tables.hazards];mocks.structured.mockResolvedValue({scores:[]});
  await expect(hazards({hazards:[{id:"hazard"}]},access)).rejects.toThrow(/full hazard/);
 });
 it("keeps peer rates and mandatory status out of model-generated screening",async()=>{
  tables.hazards=[tables.hazards];mocks.structured.mockResolvedValue({scores:[{hazard_id:"hazard",relevance_score:71,reasoning:"Exposure",assumptions:[],source_ids:["W1"]}]});
  const r=await hazards({hazards:[{id:"hazard"}]},access);expect(r.data.scores[0]).toMatchObject({peer_adoption_rate:null,is_mandatory:false,tier:"high"});
 });
 it("persists sourced regulation evidence; storage failures are not success",async()=>{
  mocks.structured.mockResolvedValue({consequence_analysis:WEIGHT_KEYS.map(k=>({consequence:k,regulatory_emphasis:null,key_regulations:[],penalty_examples:[],compliance_notes:"Gap",source_ids:[]})),regulations_found:[],compliance_summary:"No verified obligations",data_gaps:["Review required"]});
  await regulations({session_id:"session"},access);expect(writes[0].table).toBe("weighting_regulatory_research");expect(writes[0].value.web_search_results.sources).toHaveLength(1);
  failure=true;await expect(regulations({session_id:"session"},access)).rejects.toThrow(/save regulatory/);
 });
 it("verifies mission quotations and saves the frontend response contract",async()=>{
  const result={key_themes:["Protection"],tensions_identified:[],consequences:WEIGHT_KEYS.map(consequence=>({consequence,influence:"high",basis:"explicit",quotation:"Protect people",alignment_explanation:"Mission priority",stakeholder_impact:"People"}))};
  mocks.structured.mockResolvedValue(result);const r=await mission({session_id:"session"},access);
  expect(r.consequence_relevance.Fatalities.quotation).toBe("Protect people");expect(writes[0].table).toBe("weighting_mission_analysis");
  result.consequences[0].quotation="Invented mission";await expect(mission({session_id:"session"},access)).rejects.toThrow(/quotation/);
 });
 it("rejects climate numbers with missing metadata or inverted uncertainty bounds",async()=>{
  mocks.structured.mockResolvedValue({summary_text:"Draft",direction:"increasing",limitations:[],findings:[],projections:[{metric:"heat days",unit:"days",baseline_period:"1981–2010",future_period:"2041–2070",scenario:"SSP2-4.5",geography:"Ontario",central:4,lower:5,upper:6,source_ids:["W1"]}]});
  await expect(climate({hazard_category:"heat",location:"Ontario"},access)).rejects.toThrow(/bounds/);expect(writes).toHaveLength(0);
 });
 it("computes weights from the actual matrix and records no invented billing or compliance score",async()=>{
  mocks.structured.mockResolvedValue({executive_summary:"Review",top_3_drivers:[],gaps:[],challenges:[],justifications:WEIGHT_KEYS.map(consequence=>({consequence,rationale:"Equal priorities",key_factors:[],regulatory_considerations:"Review sources",organizational_context:"Review mission"}))});
  const r=await synthesis({session_id:"session"},access);
  expect(r.recommended_weights.Fatalities).toBe(10);expect(r.synthesis.source_contributions.ahp_influence_percent).toBe(100);
  expect(writes[0].value.input_revision).toBe(1);expect(writes[0].value.ai_total_cost_usd).toBeNull();expect(r.synthesis.consistency_checks.board_defensibility_score).toBeNull();
 });
});
