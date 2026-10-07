import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicUrl, type EvidenceClaim, type EvidenceRun } from "../../../supabase/functions/_shared/risk-evidence";

const references = (ids: string[]) => ids.map(id => `[${id}]`).join(" ");
export function reportMarkdown(run: EvidenceRun): string {
  const output = run.output;
  if (!output) return "";
  const claim = (item: EvidenceClaim) => `- ${item.text} (${item.basis}) ${references(item.source_ids)}`;
  return [
    `# ${output.title}`, `AI draft — human review required. Generated ${run.created_at}.`,
    `Scope: ${run.request.country}; ${run.request.region}; ${run.request.sector}. Horizon: ${run.request.horizon_months} months.`,
    `Method: ${run.method_version}. Model: ${run.model}. Run: ${run.id}.`,
    "Qualitative decision support, not a calibrated statistical forecast. Hypothetical scenarios do not predict occurrence.",
    "## Executive brief", ...output.executive_summary.map(claim),
    ...output.scenarios.flatMap(s => [`## Scenario: ${s.title}`, `Hazard: ${s.hazard}`, s.setting, s.trigger, `Consequences: ${s.consequences.join("; ")}`, `Capability gaps: ${s.capability_gaps.join("; ")}`, `Assumptions: ${s.assumptions.join("; ")}`, references(s.source_ids)]),
    ...output.outlooks.flatMap(o => [`## Outlook: ${o.hazard} — ${o.direction}`, `Drivers: ${o.drivers.join("; ")}`, `Monitor: ${o.monitoring_indicators.join("; ")}`, `Uncertainty: ${o.uncertainty}`, references(o.source_ids)]),
    ...output.sections.flatMap(section => [`## ${section.heading}`, ...section.findings.map(claim)]),
    "## Recommended actions", ...output.actions.map(a => `- ${a.action} — suggested owner: ${a.owner_role}; timeframe: ${a.timeframe}. ${a.rationale} ${references(a.source_ids)}`),
    "## Assumptions", ...output.assumptions.map(a => `- ${a}`), "## Evidence gaps", ...output.evidence_gaps.map(g => `- ${g}`),
    "## Evidence register", ...run.sources.map(source => {
      const note = output.source_notes.find(n => n.source_id === source.id);
      return `[${source.id}] ${source.title} (${source.kind})${source.url ? ` — ${source.url}` : ""}. Retrieved/snapshotted: ${source.retrieved_at}${source.updated_at ? `; record date: ${source.updated_at}` : ""}. ${note?.status}: ${note?.note}`;
    }),
  ].join("\n\n");
}
export function EvidenceReport({ run }: { run: EvidenceRun }) {
  const [audience, setAudience] = useState<"executive" | "professional">("executive");
  if (!run.output) return null;
  const output = run.output;
  const citation = (ids: string[]) => <span className="inline-flex gap-1 ml-1 flex-wrap">{ids.map(id => <a className="text-primary underline" key={id} href={`#${run.id}-${id}`}>[{id}]</a>)}</span>;
  const claims = (items: EvidenceClaim[]) => <ul className="space-y-3">{items.map((item, i) => <li key={i} className="leading-relaxed"><Badge variant="outline" className="mr-2">{item.basis}</Badge>{item.text}{citation(item.source_ids)}</li>)}</ul>;
  const download = () => {
    const url = URL.createObjectURL(new Blob([reportMarkdown(run)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `hira-${run.kind}-${run.id}.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <article className="space-y-6 rounded-lg border bg-card p-5">
    <div className="flex flex-wrap justify-between gap-3">
      <div><Badge variant="secondary">AI draft · review required</Badge><h2 className="text-2xl font-semibold mt-2">{output.title}</h2><p className="text-sm text-muted-foreground">{new Date(run.created_at).toLocaleString()} · {run.request.country} · {run.request.horizon_months}-month planning horizon</p></div>
      <Button variant="outline" onClick={download}>Download report</Button>
    </div>
    <p className="text-sm text-muted-foreground">Qualitative decision support. Scenarios are hypothetical; outlooks are not calibrated statistical forecasts. Saved assessments are unchanged.</p>
    <div className="flex gap-2" role="group" aria-label="Report audience">
      <Button variant={audience === "executive" ? "default" : "outline"} onClick={() => setAudience("executive")}>Executive brief</Button>
      <Button variant={audience === "professional" ? "default" : "outline"} onClick={() => setAudience("professional")}>Professional analysis</Button>
    </div>
    {claims(output.executive_summary)}
    {audience === "professional" && <>
      {output.scenarios.map((scenario, i) => <section key={i} className="border rounded-lg p-4 space-y-2"><h3 className="text-lg font-semibold">{scenario.title}</h3><p className="text-sm text-muted-foreground">{scenario.hazard} · Hypothetical scenario</p><p>{scenario.setting}</p><p><strong>Trigger: </strong>{scenario.trigger}</p><p><strong>Consequences: </strong>{scenario.consequences.join("; ")}</p><p><strong>Capability gaps: </strong>{scenario.capability_gaps.join("; ")}</p><p><strong>Assumptions: </strong>{scenario.assumptions.join("; ")}</p>{citation(scenario.source_ids)}</section>)}
      {output.outlooks.map((outlook, i) => <section key={i} className="border rounded-lg p-4 space-y-2"><h3 className="text-lg font-semibold">{outlook.hazard} <Badge variant="outline">{outlook.direction}</Badge></h3><p><strong>Drivers: </strong>{outlook.drivers.join("; ")}</p><p><strong>Monitor: </strong>{outlook.monitoring_indicators.join("; ")}</p><p><strong>Uncertainty: </strong>{outlook.uncertainty}</p>{citation(outlook.source_ids)}</section>)}
      {output.sections.map((section, i) => <section key={i}><h3 className="text-lg font-semibold mb-3">{section.heading}</h3>{claims(section.findings)}</section>)}
    </>}
    <section><h3 className="font-semibold text-lg mb-3">Recommended actions</h3><ul className="space-y-3">{output.actions.map((action, i) => <li key={i}><strong>{action.action}</strong><p className="text-sm text-muted-foreground">Suggested owner: {action.owner_role} · {action.timeframe}</p><p>{action.rationale}{citation(action.source_ids)}</p></li>)}</ul></section>
    <section className="rounded-lg bg-muted/40 p-4"><h3 className="font-semibold">Assumptions and missing evidence</h3><ul className="list-disc pl-5 mt-2 space-y-1">{[...output.assumptions, ...output.evidence_gaps].map((item, i) => <li key={i}>{item}</li>)}</ul></section>
    <section><h3 className="text-lg font-semibold mb-3">Evidence register</h3><p className="text-sm text-muted-foreground mb-3">Web links came from the research tool's citations. Relevance and factual support still require human review.</p><ol className="space-y-4">{run.sources.map(source => {
      const note = output.source_notes.find(n => n.source_id === source.id);
      const url = publicUrl(source.url);
      return <li id={`${run.id}-${source.id}`} key={source.id} className="scroll-mt-24 text-sm"><strong>[{source.id}] </strong>{url ? <a className="text-primary underline break-words" href={url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.kind === "assessment" ? <Link className="text-primary underline" to={`/assessment/${source.record_id}`}>{source.title}</Link> : source.title}<Badge variant="outline" className="ml-2">{source.kind}</Badge><p className="text-muted-foreground">Retrieved/snapshotted {new Date(source.retrieved_at).toLocaleString()}{source.updated_at ? ` · Record date ${new Date(source.updated_at).toLocaleDateString()}` : ""}</p><p>{note?.status}: {note?.note}</p></li>;
    })}</ol></section>
  </article>;
}
