import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, Brain, Edit3, Loader2, CheckCircle2, AlertTriangle, Sparkles, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

interface ToolResult {
  likelihood?: number;
  severity?: number;
  source: string;
  confidence?: string;
  details?: Record<string, unknown>;
}

interface MultiToolAssessmentPanelProps {
  hazardId: string;
  hazardName: string;
  hazardCategory: string;
  assessmentId?: string;
  onRecommendation: (data: { likelihood: number; source: string }) => void;
}

type ToolStatus = "idle" | "running" | "completed" | "error";

export function MultiToolAssessmentPanel({
  hazardId,
  hazardName,
  hazardCategory,
  assessmentId,
  onRecommendation,
}: MultiToolAssessmentPanelProps) {
  const { data: profile } = useProfile();
  
  // Tool statuses
  const [mcStatus, setMcStatus] = useState<ToolStatus>("idle");
  const [aiStatus, setAiStatus] = useState<ToolStatus>("idle");
  const [manualStatus, setManualStatus] = useState<"idle" | "provided">("idle");

  // Tool results
  const [mcResults, setMcResults] = useState<Record<string, unknown> | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, unknown> | null>(null);
  const [manualData, setManualData] = useState<{ likelihood: number } | null>(null);

  // Manual input state
  const [manualLikelihood, setManualLikelihood] = useState<string>("");

  // Active tab for detailed view
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Run Monte Carlo Simulation
  const handleRunMonteCarlo = async () => {
    if (!profile?.org_id) {
      toast.error("Organization context required");
      return;
    }

    setMcStatus("running");
    try {
      const { data, error } = await supabase.functions.invoke("monte-carlo", {
        body: {
          action: "run",
          hazard_id: hazardId,
          assessment_id: assessmentId,
          iterations: 10000,
          time_horizon_years: 1,
          frequency_distribution: { type: "triangular", min: 0.05, mode: 0.2, max: 0.5 },
          direct_cost_distribution: { type: "lognormal", mean: 100000, std: 50000 },
          indirect_cost_distribution: { type: "lognormal", mean: 50000, std: 25000 },
        },
      });

      if (error) throw error;

      setMcResults(data.results);
      setMcStatus("completed");

      // Convert EAL to likelihood score (1-6 scale)
      const ealAmount = data.results?.eal_amount || 0;
      let suggestedLikelihood = 3;
      if (ealAmount < 10000) suggestedLikelihood = 1;
      else if (ealAmount < 50000) suggestedLikelihood = 2;
      else if (ealAmount < 100000) suggestedLikelihood = 3;
      else if (ealAmount < 250000) suggestedLikelihood = 4;
      else if (ealAmount < 500000) suggestedLikelihood = 5;
      else suggestedLikelihood = 6;

      toast.success(`Simulation complete! EAL: $${ealAmount.toLocaleString()}`);

      return { likelihood: suggestedLikelihood, source: "monte_carlo" };
    } catch (error) {
      setMcStatus("error");
      toast.error("Simulation failed");
      console.error(error);
      return null;
    }
  };

  // Run AI Research
  const handleRunAIResearch = async () => {
    if (!profile?.org_id) {
      toast.error("Organization context required");
      return;
    }

    setAiStatus("running");
    try {
      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: {
          hazardName,
          hazardCategory,
          researchType: "probability",
          assessmentId,
          hazardId,
        },
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setAiResults(data.data);
        setAiStatus("completed");
        toast.success("AI Research complete!");
        return { 
          likelihood: data.data.suggested_value || 3, 
          source: "ai_research" 
        };
      } else {
        throw new Error(data?.error || "Research failed");
      }
    } catch (error) {
      setAiStatus("error");
      toast.error("AI Research failed");
      console.error(error);
      return null;
    }
  };

  // Handle Manual Entry
  const handleManualEntry = () => {
    const value = parseInt(manualLikelihood);
    if (isNaN(value) || value < 1 || value > 6) {
      toast.error("Please enter a value between 1 and 6");
      return;
    }
    setManualData({ likelihood: value });
    setManualStatus("provided");
    toast.success("Manual score recorded");
  };

  // Synthesize recommendations from all tools
  const getSynthesizedRecommendation = (): ToolResult | null => {
    const recommendations: ToolResult[] = [];

    if (mcStatus === "completed" && mcResults) {
      const ealAmount = (mcResults.eal_amount as number) || 0;
      let likelihood = 3;
      if (ealAmount < 10000) likelihood = 1;
      else if (ealAmount < 50000) likelihood = 2;
      else if (ealAmount < 100000) likelihood = 3;
      else if (ealAmount < 250000) likelihood = 4;
      else if (ealAmount < 500000) likelihood = 5;
      else likelihood = 6;

      recommendations.push({
        likelihood,
        source: "Monte Carlo",
        confidence: "high",
        details: mcResults,
      });
    }

    if (aiStatus === "completed" && aiResults) {
      recommendations.push({
        likelihood: (aiResults.suggested_value as number) || 3,
        source: "AI Research",
        confidence: (aiResults.confidence_level as number) > 0.7 ? "high" : "medium",
        details: aiResults,
      });
    }

    if (manualStatus === "provided" && manualData) {
      recommendations.push({
        likelihood: manualData.likelihood,
        source: "Manual Entry",
        confidence: "user_judgment",
      });
    }

    if (recommendations.length === 0) return null;

    // Average the likelihood scores, weighted by confidence
    let totalWeight = 0;
    let weightedSum = 0;
    const sources: string[] = [];

    recommendations.forEach((rec) => {
      const weight = rec.confidence === "high" ? 1.5 : rec.confidence === "medium" ? 1 : 0.8;
      weightedSum += (rec.likelihood || 0) * weight;
      totalWeight += weight;
      sources.push(rec.source);
    });

    return {
      likelihood: Math.round(weightedSum / totalWeight),
      source: sources.join(" + "),
      confidence: recommendations.length > 1 ? "high" : "medium",
    };
  };

  const recommendation = getSynthesizedRecommendation();
  const hasAnyResults = mcStatus === "completed" || aiStatus === "completed" || manualStatus === "provided";

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getStatusBadge = (status: ToolStatus | "provided") => {
    switch (status) {
      case "idle":
        return <Badge variant="secondary">Not run</Badge>;
      case "running":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Running</Badge>;
      case "completed":
      case "provided":
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Decision Support Tools
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Use any combination of tools to estimate probability for: <strong>{hazardName}</strong>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Monte Carlo */}
          <Card className={`transition-all ${mcStatus === "completed" ? "border-primary" : ""}`}>
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Monte Carlo
                </CardTitle>
                {getStatusBadge(mcStatus)}
              </div>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <p className="text-xs text-muted-foreground mb-2">
                Run 10,000 probabilistic simulations
              </p>
              <Button
                size="sm"
                variant={mcStatus === "completed" ? "outline" : "default"}
                onClick={handleRunMonteCarlo}
                disabled={mcStatus === "running"}
                className="w-full"
              >
                {mcStatus === "running" ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Running...</>
                ) : mcStatus === "completed" ? (
                  <><CheckCircle2 className="h-4 w-4 mr-1" />Re-run</>
                ) : (
                  "Run Simulation"
                )}
              </Button>
              {mcResults && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EAL:</span>
                    <span className="font-medium">{formatCurrency(mcResults.eal_amount as number)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VaR 95%:</span>
                    <span className="font-medium">{formatCurrency(mcResults.var_95 as number)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Research */}
          <Card className={`transition-all ${aiStatus === "completed" ? "border-primary" : ""}`}>
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent-foreground" />
                  AI Research
                </CardTitle>
                {getStatusBadge(aiStatus)}
              </div>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <p className="text-xs text-muted-foreground mb-2">
                Evidence-based analysis with sources
              </p>
              <Button
                size="sm"
                variant={aiStatus === "completed" ? "outline" : "default"}
                onClick={handleRunAIResearch}
                disabled={aiStatus === "running"}
                className="w-full"
              >
                {aiStatus === "running" ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Researching...</>
                ) : aiStatus === "completed" ? (
                  <><CheckCircle2 className="h-4 w-4 mr-1" />Re-run</>
                ) : (
                  "Run Research"
                )}
              </Button>
              {aiResults && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suggested:</span>
                    <span className="font-medium">{aiResults.suggested_value as number}/6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium">{Math.round((aiResults.confidence_level as number) * 100)}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card className={`transition-all ${manualStatus === "provided" ? "border-primary" : ""}`}>
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-success" />
                  Manual Entry
                </CardTitle>
                {getStatusBadge(manualStatus)}
              </div>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <p className="text-xs text-muted-foreground mb-2">
                Your expert judgment (1-6 scale)
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={6}
                  placeholder="1-6"
                  value={manualLikelihood}
                  onChange={(e) => setManualLikelihood(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant={manualStatus === "provided" ? "outline" : "default"}
                  onClick={handleManualEntry}
                  className="shrink-0"
                >
                  {manualStatus === "provided" ? "Update" : "Set"}
                </Button>
              </div>
              {manualData && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Score:</span>
                    <span className="font-medium">{manualData.likelihood}/6</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Synthesized Recommendation */}
        {recommendation && hasAnyResults && (
          <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Recommended Probability Score</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on: {recommendation.source}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{recommendation.likelihood}</div>
                  <Badge variant="outline" className="mt-1">
                    {recommendation.confidence} confidence
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => onRecommendation({ 
                    likelihood: recommendation.likelihood!, 
                    source: recommendation.source 
                  })}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply Recommendation
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("details")}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Results Tab (collapsible) */}
        {hasAnyResults && activeTab === "details" && (
          <Card>
            <CardHeader className="py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Detailed Results</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("overview")}>
                  Hide Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mcResults && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Monte Carlo Results
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Expected Annual Loss</p>
                      <p className="font-semibold flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(mcResults.eal_amount as number)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">10th Percentile</p>
                      <p className="font-medium">{formatCurrency(mcResults.percentile_10 as number)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Median (50th)</p>
                      <p className="font-medium">{formatCurrency(mcResults.percentile_50 as number)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">VaR 95%</p>
                      <p className="font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-destructive" />
                        {formatCurrency(mcResults.var_95 as number)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {aiResults && (
                <div className="p-3 bg-accent/20 rounded-lg">
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-accent-foreground" />
                    AI Research Results
                  </h4>
                  <div className="text-xs space-y-2">
                    <p className="text-muted-foreground line-clamp-3">
                      {aiResults.explanation as string}
                    </p>
                    {(aiResults.sources as unknown[])?.length > 0 && (
                      <p className="text-muted-foreground">
                        Sources: {(aiResults.sources as unknown[]).length} references found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
