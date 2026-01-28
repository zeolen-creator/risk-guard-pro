import { useState } from "react";
import { format } from "date-fns";
import { Play, TrendingUp, DollarSign, Loader2, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSimulationTemplates,
  useMonteCarloSimulations,
  useRunSimulation,
} from "@/hooks/useMonteCarloSimulation";
import { toast } from "sonner";

export function MonteCarloPanel() {
  const { data: templates = [], isLoading: templatesLoading } = useSimulationTemplates();
  const { data: simulations = [], isLoading: simulationsLoading } = useMonteCarloSimulations();
  const runSimulation = useRunSimulation();

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [iterations, setIterations] = useState("10000");
  const [timeHorizon, setTimeHorizon] = useState("1");

  const handleRunSimulation = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    try {
      const result = await runSimulation.mutateAsync({
        template_id: selectedTemplate,
        iterations: parseInt(iterations),
        time_horizon_years: parseInt(timeHorizon),
      });
      toast.success(
        `Simulation complete! Expected Annual Loss: $${result.results.eal_amount.toLocaleString()}`
      );
    } catch {
      toast.error("Simulation failed");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.hazard_category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, typeof templates>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Monte Carlo Risk Simulations
        </CardTitle>
        <CardDescription>
          Run probabilistic simulations to estimate expected annual losses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simulation Setup */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
          <h3 className="font-medium">New Simulation</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label>Hazard Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hazard template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {categoryTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                          {template.region && ` (${template.region})`}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Iterations</Label>
              <Select value={iterations} onValueChange={setIterations}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1,000 (Fast)</SelectItem>
                  <SelectItem value="10000">10,000 (Standard)</SelectItem>
                  <SelectItem value="100000">100,000 (Precise)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Time Horizon (Years)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleRunSimulation}
                disabled={runSimulation.isPending || !selectedTemplate}
                className="w-full"
              >
                {runSimulation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Simulation
              </Button>
            </div>
          </div>
        </div>

        {/* Previous Simulations */}
        <div>
          <h3 className="font-medium mb-3">Simulation History</h3>

          {simulationsLoading || templatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : simulations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No simulations run yet</p>
              <p className="text-sm text-muted-foreground">
                Select a template above and run your first simulation
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {simulations.slice(0, 10).map((sim) => (
                <div
                  key={sim.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={sim.status === "completed" ? "default" : "secondary"}
                        >
                          {sim.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sim.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                        {sim.execution_time_ms && (
                          <span className="text-xs text-muted-foreground">
                            ({sim.execution_time_ms}ms)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Expected Annual Loss</p>
                          <p className="font-semibold text-primary flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(sim.eal_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">10th Percentile</p>
                          <p className="font-medium">{formatCurrency(sim.percentile_10)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Median (50th)</p>
                          <p className="font-medium">{formatCurrency(sim.percentile_50)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">90th Percentile</p>
                          <p className="font-medium">{formatCurrency(sim.percentile_90)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">VaR (95%)</p>
                          <p className="font-medium flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-destructive" />
                            {formatCurrency(sim.var_95)}
                          </p>
                        </div>
                      </div>

                      {sim.probability_exceeds_threshold && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(sim.probability_exceeds_threshold).map(
                            ([threshold, prob]) => (
                              <Badge key={threshold} variant="outline" className="text-xs">
                                {threshold}: {prob}% chance
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
