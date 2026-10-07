import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRiskIntelligence } from "@/hooks/useRiskIntelligence";

export function RiskPredictionPanel() {
  const { runs } = useRiskIntelligence();
  const outlooks = runs.data?.filter(run => run.kind === "outlook" && run.status === "completed").slice(0, 3) ?? [];
  return <Card>
    <CardHeader><CardTitle>Evidence-based Risk Outlook</CardTitle><CardDescription>Explore emerging threats using your organization's evidence and current public research. Outlooks show qualitative drivers and uncertainty, without inventing numerical forecasts.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <Button asChild><Link to="/risk-intelligence?kind=outlook">Create a risk outlook</Link></Button>
      {runs.isLoading && <p className="text-sm">Loading saved outlooks…</p>}
      {runs.error && <p role="alert" className="text-sm text-muted-foreground">{runs.error.message}</p>}
      {!runs.isLoading && !runs.error && !outlooks.length && <p className="text-sm text-muted-foreground">No outlooks yet. Select supporting documents and assessments in the research workspace to create one.</p>}
      {outlooks.map(run => <div key={run.id} className="rounded border p-3"><Link className="font-medium text-primary underline" to={`/risk-intelligence?kind=outlook&run=${run.id}`}>{run.output?.title}</Link><p className="text-sm text-muted-foreground">AI draft · {new Date(run.created_at).toLocaleDateString()} · {run.request.horizon_months}-month horizon</p></div>)}
    </CardContent>
  </Card>;
}
