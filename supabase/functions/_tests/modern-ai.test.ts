// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { research, structured, object, text } from "../_shared/modern-ai";
beforeEach(()=>{vi.stubGlobal("Deno",{env:{get:(key:string)=>key==="OPENAI_API_KEY"?"test-secret":undefined}});});
const response=(text:string,extra:any[]=[])=>new Response(JSON.stringify({status:"completed",output:[...extra,{type:"message",content:[{type:"output_text",text,annotations:[{type:"url_citation",url:"https://www.fema.gov/",title:"FEMA"}]}]}]}));
describe("modern provider boundary",()=>{
 it("requires live search, current configured model and traceable citations",async()=>{
  const fetcher=vi.fn(async()=>response("Evidence",[{type:"web_search_call",status:"completed"}]));vi.stubGlobal("fetch",fetcher);
  const result=await research({industry:"Healthcare",region:"Ontario"});
  const sent=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(sent.model).toBe("gpt-6-luna");expect(sent.tool_choice).toBe("required");expect(sent.store).toBe(false);
  expect(result.sources[0].url).toBe("https://www.fema.gov/");
 });
 it("uses a separate no-tool synthesis and rejects unknown fields",async()=>{
  const fetcher=vi.fn(async()=>response(JSON.stringify({summary:"Draft"})));vi.stubGlobal("fetch",fetcher);
  expect(await structured("test",object({summary:text}),"Review",{private:"organization evidence"})).toEqual({summary:"Draft"});
  const sent=JSON.parse(fetcher.mock.calls[0][1].body);expect(sent.tools).toBeUndefined();expect(sent.text.format.strict).toBe(true);
  fetcher.mockImplementation(async()=>response(JSON.stringify({summary:"Draft",extra:true})));
  await expect(structured("test",object({summary:text}),"Review",{})).rejects.toThrow(/validation/);
 });
 it("does not turn failed retrieval or provider errors into default evidence",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>response("No search occurred")));
  await expect(research({topic:"flood"})).rejects.toThrow(/did not complete/);
  vi.stubGlobal("fetch",vi.fn(async()=>new Response("private provider body",{status:429})));
  await expect(research({topic:"flood"})).rejects.toThrow(/usage limit/);
 });
});
