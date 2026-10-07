import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClimateRiskAdjustment,useFetchClimateAnalysis,isClimateRelated } from "@/hooks/useClimateRisk";
import { publicUrl } from "../../../../supabase/functions/_shared/risk-evidence";
export function ClimateRiskWidget({hazardCategory,location}:{hazardCategory:string;location:string;currentScore?:number}){
 const {data,isLoading,error}=useClimateRiskAdjustment(hazardCategory,location);
 const analysis=useFetchClimateAnalysis();
 if(!isClimateRelated(hazardCategory))return null;
 return <Card><CardHeader><CardTitle>Climate evidence</CardTitle></CardHeader><CardContent className="space-y-3">
  <p className="text-sm">Research public climate evidence for {hazardCategory} in {location}. Findings do not automatically change your HIRA score.</p>
  {error&&<p role="alert" className="text-destructive">{error.message}</p>}
  {isLoading&&<p>Loading saved evidence…</p>}
  <Button disabled={analysis.isPending||!location} onClick={()=>analysis.mutate({hazardCategory,location})}>{analysis.isPending?"Researching…":data?"Refresh climate evidence":"Research climate evidence"}</Button>
  {data&&<><p><strong>Direction:</strong> {data.direction} · AI draft</p><p>{data.summary_text}</p>
   {data.findings.map((f,i)=><p key={i}>{f.finding} <span className="text-muted-foreground">[{f.source_ids.join(", ")}]</span></p>)}
   {data.projections.length===0&&<p>No sufficiently specified numerical projections were extracted.</p>}
   {data.projections.map((p,i)=><div key={i} className="border rounded p-3 text-sm"><strong>{p.metric}: {p.central} {p.unit}</strong><p>Reported range: {p.lower??"not reported"} – {p.upper??"not reported"}</p><p>Baseline: {p.baseline_period} · Future: {p.future_period}</p><p>Scenario: {p.scenario} · Geography: {p.geography}</p><p>{p.applicability} [{p.source_ids.join(", ")}]</p></div>)}
   <h4 className="font-medium">Limitations</h4>{data.limitations.map((v,i)=><p className="text-sm" key={i}>{v}</p>)}
   <h4 className="font-medium">Sources</h4>{data.data_sources.map(s=><a key={s.id} className="block text-sm underline" href={publicUrl(s.url)||undefined} target="_blank" rel="noopener noreferrer">{s.id}: {s.title}</a>)}
   <p className="text-xs text-muted-foreground">Researched {new Date(data.last_updated).toLocaleString()}. Source extraction and local applicability require review.</p>
  </>}
 </CardContent></Card>;
}

