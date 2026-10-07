import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "../../../../supabase/functions/_shared/risk-evidence";
interface Props { sessionId: string; industryType?: string; jurisdiction?: string; ahpWeights?: Record<string,number>; organizationId?: string; onComplete?:()=>void; onBack?:()=>void }
export function Layer4RegulatoryResearch({sessionId,onComplete,onBack}:Props) {
 const [reg,setReg]=useState<any>(null),[mission,setMission]=useState<any>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[needsMission,setNeedsMission]=useState(false);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let live=true; setReg(null);setMission(null);setLoaded(false);setError("");
  Promise.all([
   supabase.from("weighting_regulatory_research").select("web_search_results").eq("session_id",sessionId).maybeSingle(),
   supabase.from("weighting_mission_analysis").select("analysis_result,mission_statement").eq("session_id",sessionId).maybeSingle(),
   supabase.from("weighting_questionnaire_responses").select("mission_statement").eq("session_id",sessionId).maybeSingle(),
  ]).then(([r,m,q])=>{if(!live)return;if(r.error||m.error||q.error){setError("Could not load saved research.");return;}
    const rr=r.data?.web_search_results as any,mm=m.data?.analysis_result as any;
    if(rr?.method_version==="hira-evidence-v2")setReg(rr);
    if(mm?.method_version==="hira-evidence-v2" && m.data?.mission_statement===q.data?.mission_statement?.trim())setMission(mm);
    setNeedsMission(!!q.data?.mission_statement?.trim());setLoaded(true);
  });return()=>{live=false};
 },[sessionId]);
 const invoke=async(name:string)=>{
   const {data,error}=await supabase.functions.invoke(name,{body:{session_id:sessionId}});
   if(error){let message=error.message;try{if(error.context instanceof Response)message=(await error.context.json()).error||message;}catch{}throw new Error(message);}
   if(!data?.success)throw new Error(data?.error||"Research incomplete.");
   return data;
 };
 const run=async()=>{
  setBusy(true);setError("");setReg(null);setMission(null);
  try{const r=await invoke("research-regulations");setReg(r);if(needsMission)setMission(await invoke("analyze-mission-statement"));}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const save=async()=>{
  setBusy(true);setError("");
  try{
   const {error}=await supabase.from("weighting_sessions").update({layer4_completed:true,layer5_completed:false}).eq("id",sessionId).in("status",["in_progress","completed"]).select("id").single();
   if(error)throw error;onComplete?.();
  }catch{setError("Could not save this step. Refresh and try again.");}finally{setBusy(false);}
 };
 return <div className="space-y-5">
  <Card><CardHeader><CardTitle>Regulatory & Mission Evidence</CardTitle></CardHeader><CardContent className="space-y-3">
   <p>Research official sources for your organization’s saved industry and location. Review applicability, effective dates and gaps before using the findings. Regulatory emphasis is a review aid, not a legally required weight.</p>
   <p className="text-sm text-muted-foreground">Public search uses industry and location. Mission text is analyzed separately. API charges apply.</p>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   {!needsMission&&loaded&&<p>No mission statement is saved. Mission analysis will be omitted; add one in the questionnaire to include it.</p>}
   <Button disabled={busy||!loaded} onClick={run}>{busy?"Researching…":"Research regulations and mission"}</Button>
  </CardContent></Card>
  {reg&&<Card><CardHeader><CardTitle>Regulatory findings — draft</CardTitle></CardHeader><CardContent className="space-y-4">
   <p>{reg.compliance_summary}</p>
   {Object.entries(reg.consequence_analysis).map(([key,value]:[string,any])=><div key={key} className="border rounded p-3"><h3 className="font-medium">{key.replace(/_/g," ")} · {value.regulatory_emphasis===null?"Insufficient evidence":value.regulatory_emphasis+"/100 review emphasis"}</h3><p>{value.compliance_notes}</p>{value.key_regulations.map((v:string,i:number)=><p key={i}>{v}</p>)}</div>)}
   {reg.regulations_found?.map((r:any,i:number)=><div key={i} className="text-sm border-t pt-2"><strong>{r.name}</strong> · {r.source_type} · {r.jurisdiction}<p>{r.citation} · Effective date: {r.effective_date}</p><p>{r.applicability}</p></div>)}
   <h3 className="font-medium">Retrieved sources</h3>{reg.sources.map((s:any,i:number)=><a className="block underline text-sm" key={i} href={publicUrl(s.url)||undefined} target="_blank" rel="noopener noreferrer">{s.title}</a>)}
   <h3 className="font-medium">Evidence gaps</h3>{reg.research_quality.data_gaps.map((g:string,i:number)=><p key={i}>{g}</p>)}
  </CardContent></Card>}
  {mission&&<Card><CardHeader><CardTitle>Mission interpretation — review required</CardTitle></CardHeader><CardContent className="space-y-3">
   {Object.entries(mission.consequence_relevance).map(([key,value]:[string,any])=><div key={key} className="border rounded p-3"><h3 className="font-medium">{key.replace(/_/g," ")} · {value.influence} influence · {value.basis}</h3>{value.quotation&&<blockquote className="border-l pl-3 my-2">“{value.quotation}”</blockquote>}<p>{value.alignment_explanation}</p><p>{value.stakeholder_impact}</p></div>)}
  </CardContent></Card>}
  <div className="flex justify-between"><Button variant="outline" disabled={busy} onClick={onBack}>Back</Button><Button disabled={busy||!reg||(needsMission&&!mission)||!!error} onClick={save}>Save reviewed evidence and continue</Button></div>
 </div>;
}

