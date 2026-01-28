import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calculator, Brain, Edit3, Loader2, CheckCircle2, AlertTriangle, 
  Sparkles, DollarSign, TrendingUp, Settings, Eye, Info, 
  FileText, BarChart3, Target, ChevronDown 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useSimulationTemplates, SimulationTemplate } from "@/hooks/useMonteCarloSimulation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

interface ToolResult {
  likelihood?: number;
  severity?: number;
  source: string;
  confidence?: string;
  details?: Record<string, unknown>;
}

interface DistributionParams {
  type: string;
  min: number;
  mode: number;
  max: number;
}

interface HistogramBin {
  range_start: number;
  range_end: number;
  count: number;
  probability: number;
}

interface DataQuality {
  min_loss: number;
  max_loss: number;
  total_probability: number;
  bin_count: number;
}

interface MCResults {
  eal_amount: number;
  percentile_10: number;
  percentile_50: number;
  percentile_90: number;
  var_95: number;
  probability_exceeds_threshold: Record<string, number>;
  distribution?: HistogramBin[];
  data_quality?: DataQuality;
  execution_time_ms?: number;
  iterations?: number;
  data_source?: string;
}

interface MultiToolAssessmentPanelProps {
  hazardId: string;
  hazardName: string;
  hazardCategory: string;
  assessmentId?: string;
  onRecommendation: (data: { likelihood: number; source: string }) => void;
}

type ToolStatus = "idle" | "running" | "completed" | "error";
type MCMode = "config" | "running" | "results";

export function MultiToolAssessmentPanel({
  hazardId,
  hazardName,
  hazardCategory,
  assessmentId,
  onRecommendation,
}: MultiToolAssessmentPanelProps) {
  const { data: profile } = useProfile();
  const { data: templates } = useSimulationTemplates();
  
  // Tool statuses
  const [mcStatus, setMcStatus] = useState<ToolStatus>("idle");
  const [aiStatus, setAiStatus] = useState<ToolStatus>("idle");
  const [manualStatus, setManualStatus] = useState<"idle" | "provided">("idle");
  const [mcMode, setMcMode] = useState<MCMode>("config");

  // Monte Carlo configuration
  const [iterations, setIterations] = useState<number>(100000);
  const [selectedTemplate, setSelectedTemplate] = useState<SimulationTemplate | null>(null);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);

  // Distribution parameters
  const [freqDist, setFreqDist] = useState<DistributionParams>({
    type: "triangular",
    min: 0.1,
    mode: 0.3,
    max: 0.6,
  });

  const [directCostDist, setDirectCostDist] = useState<DistributionParams>({
    type: "triangular",
    min: 50000,
    mode: 250000,
    max: 1000000,
  });

  const [indirectCostDist, setIndirectCostDist] = useState<DistributionParams>({
    type: "triangular",
    min: 25000,
    mode: 100000,
    max: 500000,
  });

  // Tool results
  const [mcResults, setMcResults] = useState<MCResults | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, unknown> | null>(null);
  const [manualData, setManualData] = useState<{ likelihood: number } | null>(null);

  // Manual input state
  const [manualLikelihood, setManualLikelihood] = useState<string>("");

  // Active tab for detailed view
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Initialize category defaults when no template is selected
  useEffect(() => {
    if (!selectedTemplate && templates !== undefined) {
      const categoryDefaults: Record<string, { freq: DistributionParams; direct: DistributionParams; indirect: DistributionParams }> = {
        'natural': {
          freq: { type: 'triangular', min: 0.05, mode: 0.15, max: 0.4 },
          direct: { type: 'triangular', min: 500000, mode: 2500000, max: 10000000 },
          indirect: { type: 'triangular', min: 200000, mode: 1000000, max: 5000000 }
        },
        'cyber': {
          freq: { type: 'triangular', min: 0.3, mode: 1.0, max: 3.0 },
          direct: { type: 'triangular', min: 200000, mode: 1000000, max: 5000000 },
          indirect: { type: 'triangular', min: 100000, mode: 500000, max: 2000000 }
        },
        'biological': {
          freq: { type: 'triangular', min: 0.1, mode: 0.3, max: 0.8 },
          direct: { type: 'triangular', min: 200000, mode: 1000000, max: 5000000 },
          indirect: { type: 'triangular', min: 100000, mode: 500000, max: 2000000 }
        },
        'operational': {
          freq: { type: 'triangular', min: 0.5, mode: 1.5, max: 4.0 },
          direct: { type: 'triangular', min: 100000, mode: 500000, max: 2000000 },
          indirect: { type: 'triangular', min: 50000, mode: 250000, max: 1000000 }
        },
        'financial': {
          freq: { type: 'triangular', min: 0.1, mode: 0.3, max: 0.8 },
          direct: { type: 'triangular', min: 200000, mode: 1500000, max: 8000000 },
          indirect: { type: 'triangular', min: 100000, mode: 750000, max: 4000000 }
        },
        'default': {
          freq: { type: 'triangular', min: 0.1, mode: 0.3, max: 0.8 },
          direct: { type: 'triangular', min: 100000, mode: 500000, max: 2000000 },
          indirect: { type: 'triangular', min: 50000, mode: 250000, max: 1000000 }
        }
      };

      const catLower = hazardCategory.toLowerCase();
      let defaults = categoryDefaults.default;
      if (catLower.includes('natural')) defaults = categoryDefaults.natural;
      else if (catLower.includes('cyber')) defaults = categoryDefaults.cyber;
      else if (catLower.includes('biological') || catLower.includes('health')) defaults = categoryDefaults.biological;
      else if (catLower.includes('operational') || catLower.includes('process')) defaults = categoryDefaults.operational;
      else if (catLower.includes('financial') || catLower.includes('economic')) defaults = categoryDefaults.financial;

      setFreqDist(defaults.freq);
      setDirectCostDist(defaults.direct);
      setIndirectCostDist(defaults.indirect);
    }
  }, [hazardCategory, templates, selectedTemplate]);

  // Load template parameters
  const loadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      const params = template.default_parameters as Record<string, unknown>;
      
      if (params.frequency_distribution) {
        const fd = params.frequency_distribution as DistributionParams;
        setFreqDist({
          type: fd.type || "triangular",
          min: fd.min || 0.1,
          mode: fd.mode || 0.3,
          max: fd.max || 0.6,
        });
      }
      
      if (params.direct_cost_distribution) {
        const dcd = params.direct_cost_distribution as DistributionParams;
        setDirectCostDist({
          type: dcd.type || "triangular",
          min: dcd.min || 50000,
          mode: dcd.mode || 250000,
          max: dcd.max || 1000000,
        });
      }
      
      if (params.indirect_cost_distribution) {
        const icd = params.indirect_cost_distribution as DistributionParams;
        setIndirectCostDist({
          type: icd.type || "triangular",
          min: icd.min || 25000,
          mode: icd.mode || 100000,
          max: icd.max || 500000,
        });
      }
      
      toast.success(`Loaded template: ${template.template_name}`);
    }
  };

  // Run Monte Carlo Simulation
  const handleRunMonteCarlo = async () => {
    if (!profile?.org_id) {
      toast.error("Organization context required");
      return;
    }

    setMcStatus("running");
    setMcMode("running");
    setSimulationProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setSimulationProgress(prev => Math.min(prev + 15, 90));
    }, 300);

    try {
      const { data, error } = await supabase.functions.invoke("monte-carlo", {
        body: {
          action: "run",
          hazard_id: hazardId,
          assessment_id: assessmentId,
          template_id: selectedTemplate?.id,
          iterations,
          time_horizon_years: 1,
          frequency_distribution: {
            type: freqDist.type,
            min: freqDist.min,
            mode: freqDist.mode,
            max: freqDist.max,
          },
          direct_cost_distribution: {
            type: directCostDist.type,
            min: directCostDist.min,
            mode: directCostDist.mode,
            max: directCostDist.max,
          },
          indirect_cost_distribution: {
            type: indirectCostDist.type,
            min: indirectCostDist.min,
            mode: indirectCostDist.mode,
            max: indirectCostDist.max,
          },
        },
      });

      clearInterval(progressInterval);
      setSimulationProgress(100);

      if (error) throw error;

      setMcResults({
        ...data.results,
        execution_time_ms: data.execution_time_ms,
        iterations,
        data_source: selectedTemplate ? "template" : "manual",
      });
      setMcStatus("completed");
      setMcMode("results");

      toast.success(`Simulation complete! EAL: $${(data.results?.eal_amount || 0).toLocaleString()}`);

      return { likelihood: mapEalToLikelihood(data.results?.eal_amount || 0), source: "monte_carlo" };
    } catch (error) {
      clearInterval(progressInterval);
      setMcStatus("error");
      setMcMode("config");
      toast.error("Simulation failed");
      console.error(error);
      return null;
    }
  };

  // Map EAL to likelihood score
  const mapEalToLikelihood = (ealAmount: number): number => {
    if (ealAmount < 10000) return 1;
    if (ealAmount < 50000) return 2;
    if (ealAmount < 100000) return 3;
    if (ealAmount < 250000) return 4;
    if (ealAmount < 500000) return 5;
    return 6;
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
      recommendations.push({
        likelihood: mapEalToLikelihood(mcResults.eal_amount),
        source: "Monte Carlo",
        confidence: "high",
        details: mcResults as unknown as Record<string, unknown>,
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
        return <Badge variant="secondary">Ready</Badge>;
      case "running":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Running</Badge>;
      case "completed":
      case "provided":
        return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  // Generate histogram data from new distribution data (percentile-based bins)
  const getHistogramData = () => {
    if (!mcResults?.distribution || mcResults.distribution.length === 0) {
      // Fallback to threshold data if no distribution
      if (!mcResults?.probability_exceeds_threshold) return [];
      const thresholds = Object.entries(mcResults.probability_exceeds_threshold);
      return thresholds.map(([label, probability]) => ({
        range: `$${parseInt(label).toLocaleString()}+`,
        probability: probability * 100,
        fill: probability > 0.5 ? "hsl(var(--destructive))" : probability > 0.25 ? "hsl(var(--warning))" : "hsl(var(--primary))",
      }));
    }
    
    // Use distribution data from edge function
    return mcResults.distribution.map((bin) => ({
      range: `$${bin.range_start.toLocaleString()}`,
      probability: bin.probability * 100, // Convert to percentage
      fill: bin.probability > 0.15 ? "hsl(var(--primary))" : bin.probability > 0.08 ? "hsl(var(--primary)/0.8)" : "hsl(var(--primary)/0.6)",
    }));
  };

  // Get threshold data for secondary chart
  const getThresholdData = () => {
    if (!mcResults?.probability_exceeds_threshold) return [];
    const thresholds = Object.entries(mcResults.probability_exceeds_threshold);
    return thresholds.map(([threshold, probability]) => ({
      threshold: `$${parseInt(threshold).toLocaleString()}`,
      probability: probability * 100,
      fill: probability > 0.25 ? "hsl(var(--destructive))" : probability > 0.10 ? "hsl(var(--warning))" : "hsl(var(--primary))",
    }));
  };

  // Generate plain-language interpretation
  const getInterpretation = () => {
    if (!mcResults) return null;
    
    const eal = mcResults.eal_amount || 0;
    const p10 = mcResults.percentile_10 || 0;
    const p50 = mcResults.percentile_50 || 0;
    const p90 = mcResults.percentile_90 || 0;
    const var95 = mcResults.var_95 || 0;
    
    const probs = mcResults.probability_exceeds_threshold || {};
    const prob1M = probs["1000000"] || 0;
    const prob100k = probs["100000"] || 0;
    const prob500k = probs["500000"] || 0;
    
    // Determine likelihood guidance based on probabilities
    let likelihoodGuidance = "";
    let suggestedScore = 3;
    
    if (prob1M > 0.25) {
      likelihoodGuidance = "These results suggest a HIGH probability score (5-6 on your scale). Large losses occur frequently in the simulations, indicating this hazard poses a significant recurring threat.";
      suggestedScore = 6;
    } else if (prob1M > 0.10) {
      likelihoodGuidance = "These results suggest a MODERATE-HIGH probability score (4-5 on your scale). While not every year sees major losses, they occur often enough to warrant serious attention.";
      suggestedScore = 5;
    } else if (prob500k > 0.20) {
      likelihoodGuidance = "These results suggest a MODERATE probability score (3-4 on your scale). Significant losses happen occasionally but are not rare events.";
      suggestedScore = 4;
    } else if (prob100k > 0.20) {
      likelihoodGuidance = "These results suggest a LOW-MODERATE probability score (2-3 on your scale). Losses are possible but occur infrequently in most simulated scenarios.";
      suggestedScore = 3;
    } else if (prob100k > 0.05) {
      likelihoodGuidance = "These results suggest a LOW probability score (1-2 on your scale). Large losses are uncommon in the simulations, though they remain possible.";
      suggestedScore = 2;
    } else {
      likelihoodGuidance = "These results suggest a VERY LOW probability score (1 on your scale). Significant losses are rare events in the simulations.";
      suggestedScore = 1;
    }
    
    return {
      eal,
      p10,
      p50,
      p90,
      var95,
      prob1M,
      prob100k,
      prob500k,
      likelihoodGuidance,
      suggestedScore,
    };
  };

  // Filter templates by hazard category - match on category name
  const relevantTemplates = templates?.filter(t => {
    const templateCat = t.hazard_category.toLowerCase();
    const hazardCat = hazardCategory.toLowerCase();
    
    // Exact match or partial match on key terms
    if (templateCat === hazardCat) return true;
    
    // Match by significant keywords
    const hazardKeywords = hazardCat.split(/[\s,]+/).filter(w => w.length > 3);
    const templateKeywords = templateCat.split(/[\s,]+/).filter(w => w.length > 3);
    
    return hazardKeywords.some(kw => templateKeywords.some(tk => 
      tk.includes(kw) || kw.includes(tk)
    ));
  }) || [];
  

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
        <Tabs defaultValue="monte-carlo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monte-carlo" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Monte Carlo</span>
              {mcStatus === "completed" && <CheckCircle2 className="h-3 w-3 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="ai-research" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Research</span>
              {aiStatus === "completed" && <CheckCircle2 className="h-3 w-3 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
              {manualStatus === "provided" && <CheckCircle2 className="h-3 w-3 text-success" />}
            </TabsTrigger>
          </TabsList>

          {/* MONTE CARLO TAB */}
          <TabsContent value="monte-carlo" className="space-y-4 mt-4">
            <Card className={`border-2 transition-all ${mcStatus === "completed" ? "border-success bg-success/10" : "hover:border-primary/50"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Monte Carlo Simulation
                  </CardTitle>
                  {getStatusBadge(mcStatus)}
                </div>
                <CardDescription className="text-xs">
                  Probabilistic risk analysis with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CONFIGURATION MODE */}
                {mcMode === "config" && (
                  <div className="space-y-4">
                    {/* AI-Generated Parameters Warning */}
                    {!selectedTemplate && relevantTemplates.length === 0 && (
                      <Alert className="border-warning bg-warning/10">
                        <Brain className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-sm">
                          <strong>AI-Generated Parameters</strong>
                          <p className="text-xs mt-1 text-muted-foreground">
                            No pre-configured template exists for <strong>{hazardName}</strong>. 
                            Parameters below are AI-generated based on similar <strong>{hazardCategory}</strong> risks.
                            Review and adjust based on your organization's specific context.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Template Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Load Template for {hazardCategory}
                      </Label>
                      {relevantTemplates.length > 0 ? (
                        <Select onValueChange={loadTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template or start from scratch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scratch">Start from scratch (manual parameters)</SelectItem>
                            {relevantTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.template_name} {t.hazard_name && `- ${t.hazard_name}`}
                                {t.region && ` (${t.region})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                          <p className="text-xs text-muted-foreground text-center">
                            No pre-built templates for <strong>{hazardCategory}</strong>.
                            <br />Using intelligent defaults based on similar risk categories.
                          </p>
                        </div>
                      )}
                      {selectedTemplate && (
                        <Alert className="border-primary/30 bg-primary/5">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-xs">
                            Using template: <strong>{selectedTemplate.template_name}</strong>
                            {selectedTemplate.source_notes && (
                              <span className="block mt-1 text-muted-foreground">
                                Source: {selectedTemplate.source_notes}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Iterations Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Iterations</span>
                        <Badge variant="secondary">{iterations.toLocaleString()}</Badge>
                      </Label>
                      <Select 
                        value={iterations.toString()} 
                        onValueChange={(v) => setIterations(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10000">10,000 (Fast - ~5 sec)</SelectItem>
                          <SelectItem value="50000">50,000 (Standard - ~10 sec)</SelectItem>
                          <SelectItem value="100000">100,000 (High precision - ~15 sec)</SelectItem>
                          <SelectItem value="500000">500,000 (Very high - ~30 sec)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Frequency Distribution */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Target className="h-4 w-4 text-primary" />
                        Frequency Distribution (events per year)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Minimum</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={freqDist.min}
                            onChange={(e) => setFreqDist({...freqDist, min: parseFloat(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Most Likely</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={freqDist.mode}
                            onChange={(e) => setFreqDist({...freqDist, mode: parseFloat(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Maximum</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={freqDist.max}
                            onChange={(e) => setFreqDist({...freqDist, max: parseFloat(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Range: {freqDist.min} to {freqDist.max} events/year (triangular distribution)
                      </p>
                    </div>

                    {/* Direct Cost Distribution */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Direct Cost per Event ($)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Minimum</Label>
                          <Input
                            type="number"
                            value={directCostDist.min}
                            onChange={(e) => setDirectCostDist({...directCostDist, min: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Most Likely</Label>
                          <Input
                            type="number"
                            value={directCostDist.mode}
                            onChange={(e) => setDirectCostDist({...directCostDist, mode: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Maximum</Label>
                          <Input
                            type="number"
                            value={directCostDist.max}
                            onChange={(e) => setDirectCostDist({...directCostDist, max: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${directCostDist.min.toLocaleString()} - ${directCostDist.max.toLocaleString()}
                      </p>
                    </div>

                    {/* Indirect Cost Distribution */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Indirect Cost per Event ($)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Minimum</Label>
                          <Input
                            type="number"
                            value={indirectCostDist.min}
                            onChange={(e) => setIndirectCostDist({...indirectCostDist, min: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Most Likely</Label>
                          <Input
                            type="number"
                            value={indirectCostDist.mode}
                            onChange={(e) => setIndirectCostDist({...indirectCostDist, mode: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Maximum</Label>
                          <Input
                            type="number"
                            value={indirectCostDist.max}
                            onChange={(e) => setIndirectCostDist({...indirectCostDist, max: parseInt(e.target.value) || 0})}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${indirectCostDist.min.toLocaleString()} - ${indirectCostDist.max.toLocaleString()}
                      </p>
                    </div>

                    {/* Data Source Info */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {selectedTemplate ? (
                          <>
                            <strong>Parameters from:</strong> {selectedTemplate.template_name}
                            {selectedTemplate.source_notes && (
                              <p className="mt-1 text-muted-foreground">
                                Evidence: {selectedTemplate.source_notes}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>Parameters:</strong> Default values (customize above)
                            <p className="mt-1 text-muted-foreground">
                              Select a template for evidence-based parameters
                            </p>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>

                    {/* Run Button */}
                    <Button 
                      onClick={handleRunMonteCarlo} 
                      className="w-full"
                      disabled={mcStatus === "running"}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Run Simulation ({iterations.toLocaleString()} iterations)
                    </Button>
                  </div>
                )}

                {/* RUNNING MODE */}
                {mcMode === "running" && (
                  <div className="py-8 text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <div>
                      <p className="font-medium">Running simulation...</p>
                      <p className="text-sm text-muted-foreground">{iterations.toLocaleString()} iterations</p>
                    </div>
                    <Progress value={simulationProgress} className="w-full" />
                  </div>
                )}

                {/* RESULTS MODE */}
                {mcMode === "results" && mcResults && (
                  <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-primary/10">
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Expected Annual Loss</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(mcResults.eal_amount)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-destructive/10">
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Value at Risk (95%)</p>
                          <p className="text-2xl font-bold text-destructive">
                            {formatCurrency(mcResults.var_95)}
                          </p>
                          <p className="text-xs text-muted-foreground">Worst-case scenario</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Percentiles */}
                    <div className="grid grid-cols-3 gap-2">
                      <Card>
                        <CardContent className="pt-3 pb-2">
                          <p className="text-xs text-muted-foreground">10th Percentile</p>
                          <p className="font-semibold">{formatCurrency(mcResults.percentile_10)}</p>
                          <p className="text-xs text-muted-foreground">Low estimate</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-2">
                          <p className="text-xs text-muted-foreground">50th Percentile</p>
                          <p className="font-semibold">{formatCurrency(mcResults.percentile_50)}</p>
                          <p className="text-xs text-muted-foreground">Median</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-2">
                          <p className="text-xs text-muted-foreground">90th Percentile</p>
                          <p className="font-semibold">{formatCurrency(mcResults.percentile_90)}</p>
                          <p className="text-xs text-muted-foreground">High estimate</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Loss Distribution Histogram */}
                    {mcResults.distribution && mcResults.distribution.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Loss Distribution (Percentile-Based Bins)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getHistogramData()} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="range" 
                                  tick={{ fontSize: 9 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                  className="text-muted-foreground"
                                />
                                <YAxis 
                                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                                  domain={[0, 'auto']}
                                  tick={{ fontSize: 11 }}
                                  label={{ value: 'Probability', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                                  className="text-muted-foreground"
                                />
                                <Tooltip 
                                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
                                  labelFormatter={(label) => `Loss Range: ${label}+`}
                                  contentStyle={{ 
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    fontSize: 12
                                  }}
                                />
                                <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          {mcResults.data_quality && (
                            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                              <span>Range: ${mcResults.data_quality.min_loss.toLocaleString()} - ${mcResults.data_quality.max_loss.toLocaleString()}</span>
                              <span>Bins: {mcResults.data_quality.bin_count} | Integrity: {(mcResults.data_quality.total_probability * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          
                          {/* Collapsible Bin Details Table */}
                          <Collapsible className="mt-3">
                            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium w-full justify-center py-2 border rounded-md hover:bg-muted/50 transition-colors">
                              <ChevronDown className="h-3 w-3" />
                              View Bin Details
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="border rounded-md overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="text-xs h-8">Loss Range</TableHead>
                                      <TableHead className="text-xs h-8 text-right">Probability</TableHead>
                                      <TableHead className="text-xs h-8 text-right">Occurrences</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {mcResults.distribution.map((bin, idx) => (
                                      <TableRow key={idx} className="hover:bg-muted/30">
                                        <TableCell className="text-xs py-2">
                                          ${bin.range_start.toLocaleString()} - ${bin.range_end.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs py-2 text-right font-medium">
                                          {(bin.probability * 100).toFixed(1)}%
                                        </TableCell>
                                        <TableCell className="text-xs py-2 text-right text-muted-foreground">
                                          {bin.count.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </CardContent>
                      </Card>
                    )}

                    {/* Probability Thresholds Chart */}
                    {mcResults.probability_exceeds_threshold && (() => {
                      const thresholdData = getThresholdData();
                      // Validate that probabilities decline (higher thresholds should have lower probabilities)
                      let hasThresholdError = false;
                      for (let i = 0; i < thresholdData.length - 1; i++) {
                        if (thresholdData[i + 1].probability > thresholdData[i].probability) {
                          hasThresholdError = true;
                          break;
                        }
                      }
                      
                      return (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Probability of Exceeding Thresholds
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {hasThresholdError && (
                              <Alert variant="destructive" className="mb-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Data Quality Warning:</strong> Probabilities should decline as thresholds increase. 
                                  Try re-running the simulation with more iterations for more accurate results.
                                </AlertDescription>
                              </Alert>
                            )}
                            <div className="h-[180px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={thresholdData}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis 
                                    dataKey="threshold" 
                                    tick={{ fontSize: 10 }}
                                    className="text-muted-foreground"
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 10 }} 
                                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                                    domain={[0, 100]}
                                    className="text-muted-foreground"
                                  />
                                  <Tooltip 
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
                                    contentStyle={{ 
                                      backgroundColor: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))"
                                    }}
                                  />
                                  <Bar dataKey="probability" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            {/* Threshold Values Summary */}
                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                              {thresholdData.map((t) => (
                                <Badge 
                                  key={t.threshold} 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  P(≥{t.threshold}): {t.probability.toFixed(1)}%
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Plain Language Interpretation Panel */}
                    {(() => {
                      const interpretation = getInterpretation();
                      if (!interpretation) return null;
                      
                      return (
                        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 border-l-4">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <AlertTitle className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            What This Means for Your Risk Assessment
                          </AlertTitle>
                          <AlertDescription className="text-sm text-gray-800 dark:text-gray-200 space-y-3">
                            <p>
                              <strong>📊 Expected Annual Impact:</strong> Based on {mcResults.iterations?.toLocaleString() || "100,000"} simulated years for <em>{hazardName}</em>, your organization can expect an average annual loss of <strong>${Math.round(interpretation.eal).toLocaleString()}</strong>.
                            </p>
                            
                            <p>
                              <strong>📈 Typical Range:</strong> In most years (80% of scenarios), losses fall between <strong>${Math.round(interpretation.p10).toLocaleString()}</strong> (low end) and <strong>${Math.round(interpretation.p90).toLocaleString()}</strong> (high end), with a median of <strong>${Math.round(interpretation.p50).toLocaleString()}</strong>.
                            </p>
                            
                            <p>
                              <strong>⚠️ Worst-Case Planning:</strong> In the most severe 5% of scenarios, losses could reach or exceed <strong>${Math.round(interpretation.var95).toLocaleString()}</strong>.
                              {interpretation.prob1M > 0 && (
                                <span> There is a <strong>{(interpretation.prob1M * 100).toFixed(1)}%</strong> chance in any given year that losses exceed $1,000,000.</span>
                              )}
                            </p>
                            
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg mt-3">
                              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                💡 Scoring Guidance for This Hazard:
                              </p>
                              <p className="text-blue-700 dark:text-blue-300">
                                {interpretation.likelihoodGuidance}
                              </p>
                              <Badge className="mt-2 bg-blue-600 text-white">
                                Suggested Score: {interpretation.suggestedScore}/6
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-3 italic">
                              <strong>Important:</strong> These results depend on the input parameters you selected ({mcResults.data_source === "template" ? `from template: ${selectedTemplate?.template_name || "selected template"}` : "AI-generated or manual"}). If they don't align with your organization's historical experience or local conditions, click "Adjust Parameters" to refine the model before applying a final score.
                            </p>
                          </AlertDescription>
                        </Alert>
                      );
                    })()}

                    {/* Data Quality Verification */}
                    {mcResults.data_quality && (
                      <Alert className={mcResults.data_quality.total_probability >= 0.99 ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"}>
                        <CheckCircle2 className={`h-4 w-4 ${mcResults.data_quality.total_probability >= 0.99 ? "text-success" : "text-warning"}`} />
                        <AlertDescription className="text-xs">
                          <strong>Data Quality Verification:</strong>
                          <br />
                          ✓ Simulation integrity: {(mcResults.data_quality.total_probability * 100).toFixed(1)}% (should be ~100%)
                          <br />
                          ✓ Loss range: ${mcResults.data_quality.min_loss.toLocaleString()} - ${mcResults.data_quality.max_loss.toLocaleString()}
                          <br />
                          ✓ Distribution bins: {mcResults.data_quality.bin_count} percentile-based bins
                          <br />
                          <span className="text-muted-foreground">
                            Execution: {((mcResults.execution_time_ms || 0) / 1000).toFixed(1)}s | Source: {mcResults.data_source === "template" ? selectedTemplate?.template_name : "Custom parameters"}
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    {(() => {
                      const interpretation = getInterpretation();
                      const suggestedScore = interpretation?.suggestedScore || mapEalToLikelihood(mcResults.eal_amount);
                      
                      // Color-coded button based on suggested score
                      const getScoreButtonClass = (score: number) => {
                        if (score >= 5) return "bg-destructive hover:bg-destructive/90 text-destructive-foreground";
                        if (score >= 4) return "bg-orange-500 hover:bg-orange-600 text-white";
                        if (score >= 3) return "bg-yellow-500 hover:bg-yellow-600 text-white";
                        return "bg-green-600 hover:bg-green-700 text-white";
                      };
                      
                      return (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setMcMode("config")}
                            className="flex-1"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Adjust Parameters
                          </Button>
                          <Button
                            onClick={() => onRecommendation({ 
                              likelihood: suggestedScore, 
                              source: "Monte Carlo Simulation" 
                            })}
                            className={`flex-1 ${getScoreButtonClass(suggestedScore)}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Apply Score ({suggestedScore}/6)
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI RESEARCH TAB */}
          <TabsContent value="ai-research" className="space-y-4 mt-4">
            <Card className={`transition-all ${aiStatus === "completed" ? "border-success bg-success/10" : ""}`}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent-foreground" />
                    AI Research
                  </CardTitle>
                  {getStatusBadge(aiStatus)}
                </div>
              </CardHeader>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Evidence-based analysis with sources and confidence levels
                </p>
                <Button
                  variant={aiStatus === "completed" ? "outline" : "default"}
                  onClick={handleRunAIResearch}
                  disabled={aiStatus === "running"}
                  className="w-full"
                >
                  {aiStatus === "running" ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Researching...</>
                  ) : aiStatus === "completed" ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1" />Re-run Research</>
                  ) : (
                    "Run AI Research"
                  )}
                </Button>
                {aiResults && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="pt-3">
                          <p className="text-xs text-muted-foreground">Suggested Score</p>
                          <p className="text-xl font-bold text-primary">{aiResults.suggested_value as number}/6</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="text-xl font-bold">{Math.round((aiResults.confidence_level as number) * 100)}%</p>
                        </CardContent>
                      </Card>
                    </div>
                    {aiResults.explanation && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Analysis:</p>
                        <p className="text-sm">{aiResults.explanation as string}</p>
                      </div>
                    )}
                    {(aiResults.sources as unknown[])?.length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Sources: {(aiResults.sources as unknown[]).length} references found
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={() => onRecommendation({ 
                        likelihood: aiResults.suggested_value as number, 
                        source: "AI Research" 
                      })}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Score ({aiResults.suggested_value as number}/6)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <Card className={`transition-all ${manualStatus === "provided" ? "border-success bg-success/10" : ""}`}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-success" />
                    Manual Entry
                  </CardTitle>
                  {getStatusBadge(manualStatus)}
                </div>
              </CardHeader>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Your expert judgment based on experience (1-6 scale)
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    placeholder="Enter score 1-6"
                    value={manualLikelihood}
                    onChange={(e) => setManualLikelihood(e.target.value)}
                    className="h-10"
                  />
                  <Button
                    variant={manualStatus === "provided" ? "outline" : "default"}
                    onClick={handleManualEntry}
                    className="shrink-0"
                  >
                    {manualStatus === "provided" ? "Update" : "Set Score"}
                  </Button>
                </div>
                {manualData && (
                  <div className="space-y-3">
                    <Card>
                      <CardContent className="pt-3">
                        <p className="text-xs text-muted-foreground">Your Score</p>
                        <p className="text-xl font-bold text-success">{manualData.likelihood}/6</p>
                      </CardContent>
                    </Card>
                    <Button
                      onClick={() => onRecommendation({ 
                        likelihood: manualData.likelihood, 
                        source: "Manual Entry" 
                      })}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Score ({manualData.likelihood}/6)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Synthesized Recommendation */}
        {recommendation && hasAnyResults && (
          <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Synthesized Recommendation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Combined from: {recommendation.source}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{recommendation.likelihood}</div>
                  <Badge variant="outline" className="mt-1">
                    {recommendation.confidence} confidence
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => onRecommendation({ 
                  likelihood: recommendation.likelihood!, 
                  source: recommendation.source 
                })}
                className="w-full mt-4"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Combined Recommendation
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
