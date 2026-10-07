import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { useRiskIntelligence } from "@/hooks/useRiskIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { EvidenceReport } from "@/features/intelligence/EvidenceReport";
import { parseEvidenceRequest, publicResearchBrief, type AnalysisKind, type EvidenceRequest } from "../../supabase/functions/_shared/risk-evidence";

const names: Record<AnalysisKind, string> = { scenarios: "Planning scenarios", outlook: "Risk outlook", report: "Executive & professional report" };
const selectStyle = "w-full border rounded-md bg-background px-3 py-2 text-sm";
export default function RiskIntelligencePage() {
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const { runs, generate } = useRiskIntelligence();
  const [search, setSearch] = useSearchParams();
  const requestedKind = search.get("kind");
  const [kind, setKind] = useState<AnalysisKind>(requestedKind && Object.prototype.hasOwnProperty.call(names, requestedKind) ? requestedKind as AnalysisKind : "scenarios");
  const [country, setCountry] = useState<EvidenceRequest["country"]>("Canada and USA");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const [topic, setTopic] = useState("");
  const [horizon, setHorizon] = useState(12);
  const [online, setOnline] = useState(true);
  const [urls, setUrls] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [assessments, setAssessments] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { if (org) { setSector(org.sector || ""); setRegion(org.region || ""); } }, [org?.id]);
  const evidence = useQuery({
    queryKey: ["evidence-picker", profile?.org_id], enabled: !!profile?.org_id,
    queryFn: async () => {
      const [docs, records] = await Promise.all([
        supabase.from("organization_documents").select("id,name,file_size").eq("org_id", profile!.org_id!).order("created_at", { ascending: false }),
        supabase.from("assessments").select("id,title,status,updated_at").eq("org_id", profile!.org_id!).order("updated_at", { ascending: false }),
      ]);
      if (docs.error || records.error) throw new Error("Could not load your evidence. Refresh and try again.");
      return { docs: docs.data, assessments: records.data };
    },
  });
  const request: EvidenceRequest = { kind, country, sector, region, topic, horizon_months: horizon, online_research: online, source_urls: urls.split(/\r?\n/).map(url => url.trim()).filter(Boolean), document_ids: documents, assessment_ids: assessments };
  const requestedRun = search.get("run");
  const selectedRun = requestedRun ? runs.data?.find(run => run.id === requestedRun) : runs.data?.find(run => run.kind === kind && run.status === "completed");
  const active = runs.data?.some(run => run.status === "running" && Date.now() - new Date(run.created_at).getTime() < 300000);
  const toggle = (id: string, selected: string[], setter: (ids: string[]) => void) => setter(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  const submit = async () => {
    setError("");
    try {
      const id = await generate.mutateAsync(parseEvidenceRequest(request));
      setSearch({ kind, run: id });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not generate the analysis."); }
  };
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="container mx-auto py-4 px-4 flex flex-wrap justify-between gap-3"><Link className="font-bold text-xl" to="/dashboard">HIRA Pro</Link><div className="flex gap-4"><Link className="text-primary underline" to="/documents">Upload documents</Link><Link className="text-primary underline" to="/analytics">Analytics</Link><Link className="text-primary underline" to="/dashboard">Dashboard</Link></div></div></header>
    <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div><h1 className="text-3xl font-bold">Research & Scenarios</h1><p className="text-muted-foreground mt-2">Combine your organization’s evidence with online research for planning scenarios, risk outlooks, and reports for both leadership and practitioners.</p></div>
      <section className="border rounded-lg bg-card p-5 space-y-5" aria-label="New analysis">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label htmlFor="analysis-kind">What would you like to generate?</Label><select className={selectStyle} id="analysis-kind" value={kind} onChange={e => { setKind(e.target.value as AnalysisKind); setSearch({ kind: e.target.value }); }}>{Object.entries(names).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></div>
          <div><Label htmlFor="analysis-horizon">Planning horizon</Label><select className={selectStyle} id="analysis-horizon" value={horizon} onChange={e => setHorizon(Number(e.target.value))}>{[3, 6, 12, 60].map(months => <option key={months} value={months}>{months < 12 ? `${months} months` : `${months / 12} year${months > 12 ? "s" : ""}`}</option>)}</select></div>
        </div>
        <div className="rounded-lg bg-muted/30 p-4 space-y-3">
          <h2 className="font-semibold text-lg">Organization evidence</h2><p className="text-sm">The current profile for <strong>{org?.name || "your organization"}</strong> is included. <Link className="underline text-primary" to="/profile">Review organization profile</Link></p>
          {evidence.isLoading && <p>Loading documents and assessments…</p>}
          {evidence.error && <p role="alert" className="text-destructive">{evidence.error.message}</p>}
          <div className="grid md:grid-cols-2 gap-5">
            <fieldset><legend className="font-medium">Documents and published research (up to 3)</legend><p className="text-xs text-muted-foreground mb-2">PDF, Word, Excel, CSV, TXT or Markdown. AI limit: 10 MB each, 20 MB total. Scanned PDFs may require clearer copies; non-PDF charts and large spreadsheets may be partially read.</p>
              <div className="max-h-52 overflow-y-auto space-y-2">{evidence.data?.docs.map(doc => <label key={doc.id} className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={documents.includes(doc.id)} disabled={!documents.includes(doc.id) && documents.length >= 3} onChange={() => toggle(doc.id, documents, setDocuments)} /><span>{doc.name} {doc.file_size ? `(${(doc.file_size / 1048576).toFixed(1)} MB)` : ""}</span></label>)}{evidence.data && !evidence.data.docs.length && <p className="text-sm text-muted-foreground">No documents yet. <Link className="underline" to="/documents">Upload your documents or research publications.</Link></p>}</div>
            </fieldset>
            <fieldset><legend className="font-medium mb-2">Assessments (up to 5)</legend><div className="max-h-52 overflow-y-auto space-y-2">{evidence.data?.assessments.map(item => <label key={item.id} className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={assessments.includes(item.id)} disabled={!assessments.includes(item.id) && assessments.length >= 5} onChange={() => toggle(item.id, assessments, setAssessments)} /><span>{item.title} · {item.status} · {new Date(item.updated_at).toLocaleDateString()}</span></label>)}{evidence.data && !evidence.data.assessments.length && <p className="text-sm text-muted-foreground">No assessments yet. You can still generate exploratory scenarios from the profile and research.</p>}</div></fieldset>
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Public research brief</h2><p className="text-sm text-muted-foreground">Use public information only in these fields. Online search receives this brief, not your uploaded files, assessment content, or organization name.</p>
          <div className="grid md:grid-cols-3 gap-4"><div><Label htmlFor="country">Country</Label><select className={selectStyle} id="country" value={country} onChange={e => setCountry(e.target.value as EvidenceRequest["country"])}><option>Canada</option><option>USA</option><option>Canada and USA</option></select></div><div><Label htmlFor="sector">Industry / sector</Label><Input id="sector" value={sector} maxLength={120} onChange={e => setSector(e.target.value)} /></div><div><Label htmlFor="region">Province, state or locality</Label><Input id="region" value={region} maxLength={160} onChange={e => setRegion(e.target.value)} /></div></div>
          <div><Label htmlFor="topic">Hazards or public research topic (optional)</Label><Textarea id="topic" maxLength={800} value={topic} onChange={e => setTopic(e.target.value)} placeholder="For example: extreme weather, supply disruptions and cyber incidents affecting hospitals in Ontario and New York" /></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={online} onChange={e => { setOnline(e.target.checked); if (!e.target.checked) setUrls(""); }} />Include current online AI research</label>
          <div><Label htmlFor="source-urls">Published source links to investigate (optional, one HTTPS link per line)</Label><Textarea id="source-urls" disabled={!online} value={urls} onChange={e => setUrls(e.target.value)} placeholder="Up to five public links. Upload private or paywalled publications you have permission to use instead." /></div>
          {online && <details className="text-sm"><summary className="cursor-pointer text-primary">Preview public search context</summary><pre className="whitespace-pre-wrap break-words bg-muted p-3 mt-2 rounded">{JSON.stringify(JSON.parse(publicResearchBrief(request)), null, 2)}</pre></details>}
        </div>
        <p className="text-sm text-muted-foreground">Generation sends the selected documents, assessments and organization profile to OpenAI for analysis. Online research uses the separate public brief above. AI drafts preserve citations, assumptions and evidence gaps; they do not change your saved risk scores. API charges apply.</p>
        {(error || generate.error) && <p role="alert" className="text-destructive">{error || generate.error?.message}</p>}
        {runs.error && <p role="alert" className="text-destructive">{runs.error.message}</p>}
        <div className="flex flex-wrap gap-3 items-center"><Button onClick={submit} disabled={generate.isPending || active || !org || evidence.isLoading || !!evidence.error || !!runs.error}>{generate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{generate.isPending ? "Researching and preparing your analysis…" : `Generate ${names[kind].toLowerCase()}`}</Button><Button variant="outline" disabled={generate.isPending} onClick={() => { evidence.refetch(); runs.refetch(); }}>Refresh evidence and history</Button></div>
        {(generate.isPending || active) && <p role="status" className="text-sm">This may take up to two minutes. Please keep this page open. Your selected evidence stays unchanged.</p>}
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Saved analyses</h2>{runs.isLoading && <p>Loading analysis history…</p>}{runs.data?.length === 0 && <p className="text-muted-foreground">Your first completed analysis will appear here.</p>}<div className="flex flex-wrap gap-2">{runs.data?.map(run => <Button key={run.id} variant={selectedRun?.id === run.id ? "default" : "outline"} disabled={run.status !== "completed"} onClick={() => { setKind(run.kind); setSearch({ kind: run.kind, run: run.id }); }}>{names[run.kind]} · {new Date(run.created_at).toLocaleString()} · {run.status === "running" && Date.now() - new Date(run.created_at).getTime() >= 300000 ? "expired — retry" : run.status}</Button>)}</div>{runs.data?.filter(run => run.status === "failed").slice(0, 2).map(run => <p className="text-sm text-destructive" key={run.id}>{new Date(run.created_at).toLocaleString()}: {run.error_message}</p>)}</section>
      {requestedRun && !selectedRun && !runs.isLoading && <p role="status">This analysis is not in your recent history. Select an available analysis above.</p>}
      {selectedRun && <EvidenceReport key={selectedRun.id} run={selectedRun} />}
    </main>
  </div>;
}
