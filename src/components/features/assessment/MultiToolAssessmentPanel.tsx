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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, Brain, Edit3, Loader2, CheckCircle2, AlertTriangle, 
  Sparkles, DollarSign, TrendingUp, Settings, Eye, Info, 
  FileText, BarChart3, Target, ChevronDown, ChevronRight, Play, Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useSimulationTemplates, SimulationTemplate } from "@/hooks/useMonteCarloSimulation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  combination_method?: string;
}

interface ScenarioStats {
  template_name: string;
  eal: number;
  var_95: number;
  occurrence_rate: number;
  contribution_pct: number;
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
  scenario_stats?: Record<string, ScenarioStats>;
  dominant_scenario?: ScenarioStats & { id: string };
  multi_scenario_rate?: number;
}

interface TemplateParams {
  frequency_distribution: DistributionParams;
  direct_cost_distribution: DistributionParams;
  indirect_cost_distribution: DistributionParams;
}

interface MultiToolAssessmentPanelProps {
  hazardId: string;
  hazardName: string;
  hazardCategory: string;
  assessmentId?: string;
  onRecommendation: (data: { likelihood: number; source: string }) => void;
}

type ToolStatus = "idle" | "running" | "completed" | "error";
type MCMode = "template_selection" | "parameters" | "running" | "results";

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
  const [mcMode, setMcMode] = useState<MCMode>("template_selection");

  // Monte Carlo configuration - Multi-template support
  const [iterations, setIterations] = useState<number>(100000);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [useManualParams, setUseManualParams] = useState(false);
  const [templateParameters, setTemplateParameters] = useState<Record<string, TemplateParams>>({});
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);

  // Manual parameters (for scratch/single mode)
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
  const [manualLikelihood, setManualLikelihood] = useState<string>("");

  // Initialize category defaults
  useEffect(() => {
    if (templates !== undefined && selectedTemplateIds.length === 0 && !useManualParams) {
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
  }, [hazardCategory, templates, selectedTemplateIds, useManualParams]);

  // Load template parameters when selected
  useEffect(() => {
    if (!templates) return;
    
    const newParams: Record<string, TemplateParams> = {};
    
    for (const templateId of selectedTemplateIds) {
      if (templateParameters[templateId]) {
        newParams[templateId] = templateParameters[templateId];
        continue;
      }
      
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const defaultParams = template.default_parameters as Record<string, unknown>;
        newParams[templateId] = {
          frequency_distribution: (defaultParams.frequency_distribution as DistributionParams) || { type: 'triangular', min: 0.1, mode: 0.3, max: 0.6 },
          direct_cost_distribution: (defaultParams.direct_cost_distribution as DistributionParams) || { type: 'triangular', min: 50000, mode: 250000, max: 1000000 },
          indirect_cost_distribution: (defaultParams.indirect_cost_distribution as DistributionParams) || { type: 'triangular', min: 25000, mode: 100000, max: 500000 },
        };
      }
    }
    
    setTemplateParameters(prev => ({ ...prev, ...newParams }));
  }, [selectedTemplateIds, templates]);

  // Filter templates by hazard category
  const relevantTemplates = templates?.filter(t => {
    const templateCat = t.hazard_category.toLowerCase();
    const hazardCat = hazardCategory.toLowerCase();
    
    if (templateCat === hazardCat) return true;
    
    const hazardKeywords = hazardCat.split(/[\s,]+/).filter(w => w.length > 3);
    const templateKeywords = templateCat.split(/[\s,]+/).filter(w => w.length > 3);
    
    return hazardKeywords.some(kw => templateKeywords.some(tk => 
      tk.includes(kw) || kw.includes(tk)
    ));
  }) || [];

  const handleTemplateToggle = (templateId: string, checked: boolean) => {
    if (checked) {
      setSelectedTemplateIds(prev => [...prev.filter(id => id !== 'scratch'), templateId]);
      setUseManualParams(false);
    } else {
      setSelectedTemplateIds(prev => prev.filter(id => id !== templateId));
    }
  };

  const handleScratchToggle = (checked: boolean) => {
    if (checked) {
      setSelectedTemplateIds([]);
      setUseManualParams(true);
    } else {
      setUseManualParams(false);
    }
  };

  const updateTemplateParam = (templateId: string, category: 'frequency_distribution' | 'direct_cost_distribution' | 'indirect_cost_distribution', field: 'min' | 'mode' | 'max', value: number) => {
    setTemplateParameters(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [category]: {
          ...prev[templateId]?.[category],
          [field]: value
        }
      }
    }));
  };

  const handleRunMonteCarlo = async () => {
    if (!profile?.org_id) {
      toast.error("Organization context required");
      return;
    }

    setMcStatus("running");
    setMcMode("running");
    setSimulationProgress(0);

    const progressInterval = setInterval(() => {
      setSimulationProgress(prev => Math.min(prev + 15, 90));
    }, 300);

    try {
      let requestBody: Record<string, unknown>;

      if (useManualParams || selectedTemplateIds.length === 0) {
        // Single template / manual mode
        requestBody = {
          action: "run",
          hazard_id: hazardId,
          assessment_id: assessmentId,
          iterations,
          time_horizon_years: 1,
          frequency_distribution: { type: freqDist.type, min: freqDist.min, mode: freqDist.mode, max: freqDist.max },
          direct_cost_distribution: { type: directCostDist.type, min: directCostDist.min, mode: directCostDist.mode, max: directCostDist.max },
          indirect_cost_distribution: { type: indirectCostDist.type, min: indirectCostDist.min, mode: indirectCostDist.mode, max: indirectCostDist.max },
        };
      } else if (selectedTemplateIds.length === 1) {
        // Single template via new interface
        const template = templates?.find(t => t.id === selectedTemplateIds[0]);
        const params = templateParameters[selectedTemplateIds[0]];
        
        requestBody = {
          action: "run",
          hazard_id: hazardId,
          assessment_id: assessmentId,
          template_id: selectedTemplateIds[0],
          iterations,
          time_horizon_years: 1,
          frequency_distribution: params?.frequency_distribution || freqDist,
          direct_cost_distribution: params?.direct_cost_distribution || directCostDist,
          indirect_cost_distribution: params?.indirect_cost_distribution || indirectCostDist,
        };
      } else {
        // Multi-template compound simulation
        const templatesConfig = selectedTemplateIds.map(id => {
          const template = templates?.find(t => t.id === id);
          const params = templateParameters[id];
          return {
            id,
            name: template?.template_name || 'Unknown',
            parameters: {
              frequency_distribution: params?.frequency_distribution || { type: 'triangular', min: 0.1, mode: 0.3, max: 0.6 },
              direct_cost_distribution: params?.direct_cost_distribution || { type: 'triangular', min: 50000, mode: 250000, max: 1000000 },
              indirect_cost_distribution: params?.indirect_cost_distribution || { type: 'triangular', min: 25000, mode: 100000, max: 500000 },
            }
          };
        });

        requestBody = {
          action: "run",
          hazard_id: hazardId,
          assessment_id: assessmentId,
          iterations,
          combination_method: "compound",
          templates: templatesConfig,
        };
      }

      const { data, error } = await supabase.functions.invoke("monte-carlo", { body: requestBody });

      clearInterval(progressInterval);
      setSimulationProgress(100);

      if (error) throw error;

      setMcResults({
        ...data.results,
        execution_time_ms: data.execution_time_ms,
        iterations,
        data_source: selectedTemplateIds.length > 0 ? "template" : "manual",
      });
      setMcStatus("completed");
      setMcMode("results");

      const scenarioText = data.scenario_count > 1 ? ` (${data.scenario_count} scenarios)` : '';
      toast.success(`Simulation complete${scenarioText}! EAL: $${(data.results?.eal_amount || 0).toLocaleString()}`);

      return { likelihood: mapEalToLikelihood(data.results?.eal_amount || 0), source: "monte_carlo" };
    } catch (error) {
      clearInterval(progressInterval);
      setMcStatus("error");
      setMcMode("template_selection");
      toast.error("Simulation failed");
      console.error(error);
      return null;
    }
  };

  const mapEalToLikelihood = (ealAmount: number): number => {
    if (ealAmount < 10000) return 1;
    if (ealAmount < 50000) return 2;
    if (ealAmount < 100000) return 3;
    if (ealAmount < 250000) return 4;
    if (ealAmount < 500000) return 5;
    return 6;
  };

  const handleRunAIResearch = async () => {
    if (!profile?.org_id) {
      toast.error("Organization context required");
      return;
    }

    setAiStatus("running");
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("name, sector, region, primary_location, key_facilities, size")
        .eq("id", profile.org_id)
        .single();

      if (orgError || !orgData) {
        throw new Error("Could not fetch organization context");
      }

      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: {
          hazard_name: hazardName,
          hazard_category: hazardCategory,
          research_type: "probability",
          org_context: {
            name: orgData.name,
            sector: orgData.sector,
            region: orgData.region,
            primary_location: orgData.primary_location,
            key_facilities: orgData.key_facilities,
            size: orgData.size,
          },
          assessment_id: assessmentId,
          hazard_id: hazardId,
        },
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setAiResults(data.data);
        setAiStatus("completed");
        toast.success("AI Research complete!");
        return { likelihood: data.data.suggested_value || 3, source: "ai_research" };
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

  const getHistogramData = () => {
    if (!mcResults?.distribution || mcResults.distribution.length === 0) {
      if (!mcResults?.probability_exceeds_threshold) return [];
      const thresholds = Object.entries(mcResults.probability_exceeds_threshold);
      return thresholds.map(([label, probability]) => ({
        range: `$${parseInt(label).toLocaleString()}+`,
        probability: probability * 100,
        fill: probability > 0.5 ? "hsl(var(--destructive))" : probability > 0.25 ? "hsl(var(--warning))" : "hsl(var(--primary))",
      }));
    }
    
    return mcResults.distribution.map((bin) => ({
      range: `$${bin.range_start.toLocaleString()}`,
      probability: bin.probability * 100,
      fill: bin.probability > 0.15 ? "hsl(var(--primary))" : bin.probability > 0.08 ? "hsl(var(--primary)/0.8)" : "hsl(var(--primary)/0.6)",
    }));
  };

  const getThresholdData = () => {
    if (!mcResults?.probability_exceeds_threshold) return [];
    const thresholds = Object.entries(mcResults.probability_exceeds_threshold);
    return thresholds.map(([threshold, probability]) => ({
      threshold: `$${parseInt(threshold).toLocaleString()}`,
      probability: probability * 100,
      fill: probability > 0.25 ? "hsl(var(--destructive))" : probability > 0.10 ? "hsl(var(--warning))" : "hsl(var(--primary))",
    }));
  };

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
    
    return { eal, p10, p50, p90, var95, prob1M, prob100k, prob500k, likelihoodGuidance, suggestedScore };
  };

  const isMultiTemplate = selectedTemplateIds.length > 1;

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
                  {isMultiTemplate ? "Multi-scenario compound risk analysis" : "Probabilistic risk analysis with confidence intervals"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* TEMPLATE SELECTION MODE */}
                {mcMode === "template_selection" && (
                  <div className="space-y-4">
                    <Card className="bg-white dark:bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Select Templates
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Choose one or more templates. Multiple templates will be combined into a comprehensive risk assessment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Manual/Scratch Option */}
                        <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox 
                            id="scratch" 
                            checked={useManualParams}
                            onCheckedChange={(checked) => handleScratchToggle(checked as boolean)}
                          />
                          <label htmlFor="scratch" className="text-sm font-medium cursor-pointer flex-1">
                            Start from scratch (manual parameters)
                          </label>
                        </div>

                        {relevantTemplates.length > 0 && (
                          <>
                            <Separator />
                            <p className="text-xs text-muted-foreground font-medium">
                              Available templates for {hazardCategory}:
                            </p>
                            <ScrollArea className="max-h-[250px]">
                              <div className="space-y-2">
                                {relevantTemplates.map((template) => (
                                  <div key={template.id} className="flex items-start space-x-2 p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-muted">
                                    <Checkbox 
                                      id={template.id}
                                      checked={selectedTemplateIds.includes(template.id)}
                                      onCheckedChange={(checked) => handleTemplateToggle(template.id, checked as boolean)}
                                      disabled={useManualParams}
                                    />
                                    <div className="flex-1">
                                      <label htmlFor={template.id} className="text-sm font-medium cursor-pointer">
                                        {template.template_name}
                                      </label>
                                      {template.region && (
                                        <Badge variant="outline" className="ml-2 text-xs">{template.region}</Badge>
                                      )}
                                      {template.description && (
                                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </>
                        )}

                        {relevantTemplates.length === 0 && !useManualParams && (
                          <Alert className="border-warning bg-warning/10">
                            <Brain className="h-4 w-4 text-warning" />
                            <AlertDescription className="text-xs">
                              <strong>No pre-built templates</strong> for {hazardCategory}. 
                              Select "Start from scratch" to use AI-generated defaults.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Selection Status */}
                        {(selectedTemplateIds.length > 0 || useManualParams) && (
                          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                              {useManualParams ? (
                                'You will manually configure parameters'
                              ) : selectedTemplateIds.length === 1 ? (
                                '1 template selected — Standard Monte Carlo simulation'
                              ) : (
                                `${selectedTemplateIds.length} templates selected — Combined Monte Carlo will run ${selectedTemplateIds.length} scenarios and integrate results`
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>

                    {/* Continue to Parameters Button */}
                    {(selectedTemplateIds.length > 0 || useManualParams) && (
                      <Button 
                        onClick={() => setMcMode("parameters")} 
                        className="w-full"
                      >
                        Continue to Parameters
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* PARAMETERS MODE */}
                {mcMode === "parameters" && (
                  <div className="space-y-4">
                    {/* Back Button */}
                    <Button variant="outline" size="sm" onClick={() => setMcMode("template_selection")}>
                      ← Back to Template Selection
                    </Button>

                    {/* Multi-Template Parameters Review */}
                    {selectedTemplateIds.length > 1 && (
                      <Card className="bg-white dark:bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Multi-Template Parameters Review</CardTitle>
                          <CardDescription className="text-xs">
                            Review parameters for each selected template. Click to expand and edit.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {selectedTemplateIds.map((templateId, index) => {
                            const template = templates?.find(t => t.id === templateId);
                            const params = templateParameters[templateId];
                            const isExpanded = expandedTemplates.includes(templateId);
                            
                            return (
                              <Collapsible key={templateId} open={isExpanded} onOpenChange={(open) => {
                                setExpandedTemplates(prev => open ? [...prev, templateId] : prev.filter(id => id !== templateId));
                              }}>
                                <CollapsibleTrigger className="w-full">
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">Scenario {index + 1}</Badge>
                                      <span className="font-medium text-sm">{template?.template_name}</span>
                                    </div>
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-3 px-3">
                                  <div className="space-y-3">
                                    {/* Frequency */}
                                    <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
                                      <Label className="text-xs font-medium">Frequency (events/year)</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Min</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={params?.frequency_distribution.min || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'frequency_distribution', 'min', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Mode</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={params?.frequency_distribution.mode || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'frequency_distribution', 'mode', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Max</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={params?.frequency_distribution.max || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'frequency_distribution', 'max', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Direct Cost */}
                                    <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
                                      <Label className="text-xs font-medium">Direct Cost per Event ($)</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Min</Label>
                                          <Input
                                            type="number"
                                            value={params?.direct_cost_distribution.min || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'direct_cost_distribution', 'min', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Mode</Label>
                                          <Input
                                            type="number"
                                            value={params?.direct_cost_distribution.mode || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'direct_cost_distribution', 'mode', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Max</Label>
                                          <Input
                                            type="number"
                                            value={params?.direct_cost_distribution.max || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'direct_cost_distribution', 'max', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Indirect Cost */}
                                    <div className="space-y-2 p-2 bg-muted/30 rounded-lg">
                                      <Label className="text-xs font-medium">Indirect Cost per Event ($)</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Min</Label>
                                          <Input
                                            type="number"
                                            value={params?.indirect_cost_distribution.min || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'indirect_cost_distribution', 'min', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Mode</Label>
                                          <Input
                                            type="number"
                                            value={params?.indirect_cost_distribution.mode || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'indirect_cost_distribution', 'mode', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Max</Label>
                                          <Input
                                            type="number"
                                            value={params?.indirect_cost_distribution.max || 0}
                                            onChange={(e) => updateTemplateParam(templateId, 'indirect_cost_distribution', 'max', parseInt(e.target.value) || 0)}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {template?.source_notes && (
                                      <p className="text-xs text-muted-foreground italic">
                                        Source: {template.source_notes}
                                      </p>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* Single Template or Manual Parameters */}
                    {(selectedTemplateIds.length <= 1 || useManualParams) && (
                      <div className="space-y-4">
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
                        </div>
                      </div>
                    )}

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

                    {/* Run Button */}
                    <Button 
                      onClick={handleRunMonteCarlo} 
                      className="w-full"
                      disabled={mcStatus === "running"}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run {selectedTemplateIds.length > 1 ? `Combined Simulation (${selectedTemplateIds.length} Scenarios)` : `Simulation (${iterations.toLocaleString()} iterations)`}
                    </Button>
                  </div>
                )}

                {/* RUNNING MODE */}
                {mcMode === "running" && (
                  <div className="space-y-4 py-4">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Running {selectedTemplateIds.length > 1 ? `${selectedTemplateIds.length} scenarios` : 'simulation'}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {iterations.toLocaleString()} iterations
                      </p>
                    </div>
                    <Progress value={simulationProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {simulationProgress}% complete
                    </p>
                  </div>
                )}

                {/* RESULTS MODE */}
                {mcMode === "results" && mcResults && (
                  <div className="space-y-4">
                    {/* Aggregate Results Header */}
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          {mcResults.scenario_stats ? 'Combined Risk Profile — All Scenarios' : 'Risk Profile'}
                        </CardTitle>
                        {mcResults.scenario_stats && (
                          <CardDescription className="text-xs">
                            Integrated assessment across {Object.keys(mcResults.scenario_stats).length} risk scenarios
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Card>
                            <CardContent className="pt-3">
                              <p className="text-xs text-muted-foreground">Expected Annual Loss</p>
                              <p className="text-xl font-bold text-primary">{formatCurrency(mcResults.eal_amount)}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-3">
                              <p className="text-xs text-muted-foreground">Value at Risk (95%)</p>
                              <p className="text-xl font-bold">{formatCurrency(mcResults.var_95)}</p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">10th Percentile</p>
                            <p className="font-semibold text-sm">{formatCurrency(mcResults.percentile_10)}</p>
                            <p className="text-xs text-muted-foreground">Low estimate</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">50th Percentile</p>
                            <p className="font-semibold text-sm">{formatCurrency(mcResults.percentile_50)}</p>
                            <p className="text-xs text-muted-foreground">Median</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">90th Percentile</p>
                            <p className="font-semibold text-sm">{formatCurrency(mcResults.percentile_90)}</p>
                            <p className="text-xs text-muted-foreground">High estimate</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Multi-Scenario Alert */}
                    {mcResults.multi_scenario_rate !== undefined && mcResults.multi_scenario_rate > 0 && (
                      <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-xs text-orange-800 dark:text-orange-200">
                          <strong>Multi-Scenario Risk:</strong> In {(mcResults.multi_scenario_rate * 100).toFixed(1)}% of simulated years, multiple scenarios occurred simultaneously, compounding losses.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Scenario Contribution Analysis */}
                    {mcResults.scenario_stats && Object.keys(mcResults.scenario_stats).length > 1 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Scenario Contribution Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(mcResults.scenario_stats).map(([id, stats]) => {
                            const isDominant = mcResults.dominant_scenario?.id === id;
                            return (
                              <div key={id} className={`p-3 rounded-lg border ${isDominant ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{stats.template_name}</span>
                                    {isDominant && (
                                      <Badge className="bg-primary text-primary-foreground text-xs">
                                        <Crown className="h-3 w-3 mr-1" />
                                        DOMINANT RISK
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {stats.contribution_pct.toFixed(1)}% of total EAL
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">EAL:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(stats.eal)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">VaR 95%:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(stats.var_95)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Occurs In:</span>
                                    <span className="ml-1 font-medium">{(stats.occurrence_rate * 100).toFixed(1)}% of years</span>
                                  </div>
                                </div>
                                <Progress value={stats.contribution_pct} className="h-1 mt-2" />
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* Loss Distribution Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Loss Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getHistogramData()}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="range" 
                                tick={{ fontSize: 10 }}
                                className="text-muted-foreground"
                              />
                              <YAxis 
                                tick={{ fontSize: 10 }} 
                                tickFormatter={(v) => `${v.toFixed(0)}%`}
                                className="text-muted-foreground"
                              />
                              <Tooltip 
                                formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
                                contentStyle={{ 
                                  backgroundColor: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))"
                                }}
                              />
                              <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Bin Details Table */}
                        {mcResults.distribution && mcResults.distribution.length > 0 && (
                          <Collapsible className="mt-3">
                            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                              <ChevronDown className="h-3 w-3" />
                              View bin details
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Loss Range</TableHead>
                                    <TableHead className="text-xs">Probability</TableHead>
                                    <TableHead className="text-xs">Count</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {mcResults.distribution.map((bin, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-xs">
                                        ${bin.range_start.toLocaleString()} - ${bin.range_end.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-xs">{(bin.probability * 100).toFixed(1)}%</TableCell>
                                      <TableCell className="text-xs">{bin.count.toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>

                    {/* Probability Thresholds Chart */}
                    {mcResults.probability_exceeds_threshold && (() => {
                      const thresholdData = getThresholdData();
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
                                  <strong>Data Quality Warning:</strong> Probabilities should decline as thresholds increase. Try re-running with more iterations.
                                </AlertDescription>
                              </Alert>
                            )}
                            <div className="h-[180px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={thresholdData}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="threshold" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} className="text-muted-foreground" />
                                  <Tooltip 
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
                                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                                  />
                                  <Bar dataKey="probability" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                              {thresholdData.map((t) => (
                                <Badge key={t.threshold} variant="outline" className="text-xs">
                                  P(≥{t.threshold}): {t.probability.toFixed(1)}%
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Plain Language Interpretation */}
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
                              <strong>📊 Expected Annual Impact:</strong> Based on {mcResults.iterations?.toLocaleString() || "100,000"} simulated years{mcResults.scenario_stats ? ` across ${Object.keys(mcResults.scenario_stats).length} risk scenarios` : ''} for <em>{hazardName}</em>, your organization can expect an average annual loss of <strong>${Math.round(interpretation.eal).toLocaleString()}</strong>.
                            </p>
                            
                            {mcResults.dominant_scenario && (
                              <p>
                                <strong>👑 Dominant Risk:</strong> <em>{mcResults.dominant_scenario.template_name}</em> is your primary driver, contributing <strong>{mcResults.dominant_scenario.contribution_pct.toFixed(1)}%</strong> of expected losses. This scenario occurs in {(mcResults.dominant_scenario.occurrence_rate * 100).toFixed(1)}% of years.
                              </p>
                            )}
                            
                            <p>
                              <strong>📈 Typical Range:</strong> In most years (80% of scenarios), losses fall between <strong>${Math.round(interpretation.p10).toLocaleString()}</strong> (low end) and <strong>${Math.round(interpretation.p90).toLocaleString()}</strong> (high end), with a median of <strong>${Math.round(interpretation.p50).toLocaleString()}</strong>.
                            </p>
                            
                            <p>
                              <strong>⚠️ Worst-Case Planning:</strong> In the most severe 5% of scenarios, losses could reach or exceed <strong>${Math.round(interpretation.var95).toLocaleString()}</strong>.
                              {interpretation.prob1M > 0 && (
                                <span> There is a <strong>{(interpretation.prob1M * 100).toFixed(1)}%</strong> chance in any given year that losses exceed $1,000,000.</span>
                              )}
                            </p>

                            {mcResults.multi_scenario_rate !== undefined && mcResults.multi_scenario_rate > 0.05 && (
                              <p className="text-orange-700 dark:text-orange-300">
                                <strong>⚡ Compounding Risk Alert:</strong> Multiple scenarios frequently occur in the same year ({(mcResults.multi_scenario_rate * 100).toFixed(1)}% of simulations), indicating this hazard has high correlation or clustering behavior.
                              </p>
                            )}
                            
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
                          {mcResults.data_quality.combination_method && (
                            <><br />✓ Combination method: {mcResults.data_quality.combination_method}</>
                          )}
                          <br />
                          <span className="text-muted-foreground">
                            Execution: {((mcResults.execution_time_ms || 0) / 1000).toFixed(1)}s | Source: {mcResults.scenario_stats ? `${Object.keys(mcResults.scenario_stats).length} templates` : (mcResults.data_source === "template" ? "Template" : "Custom parameters")}
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    {(() => {
                      const interpretation = getInterpretation();
                      const suggestedScore = interpretation?.suggestedScore || mapEalToLikelihood(mcResults.eal_amount);
                      
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
                            onClick={() => setMcMode("template_selection")}
                            className="flex-1"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Adjust Parameters
                          </Button>
                          <Button
                            onClick={() => onRecommendation({ 
                              likelihood: suggestedScore, 
                              source: mcResults.scenario_stats ? `Monte Carlo (${Object.keys(mcResults.scenario_stats).length} scenarios)` : "Monte Carlo Simulation" 
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
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Synthesized Recommendation</span>
                    <Badge variant="secondary" className="text-xs">{recommendation.source}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    Score: {recommendation.likelihood}/6
                  </p>
                </div>
                <Button
                  onClick={() => onRecommendation({
                    likelihood: recommendation.likelihood || 3,
                    source: recommendation.source || "Synthesized"
                  })}
                  size="lg"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
