import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SlidersHorizontal, RotateCcw, Loader2 } from "lucide-react";
import { TornadoDiagram } from "./TornadoDiagram";

interface SensitivityAnalysisDashboardProps {
  sessionId: string;
  baseWeights: Record<string, number>;
  scenarios?: Array<{
    title: string;
    consequenceValues: Record<string, number>;
  }>;
}

export function SensitivityAnalysisDashboard({
  sessionId,
  baseWeights,
  scenarios = [],
}: SensitivityAnalysisDashboardProps) {
  const { toast } = useToast();
  const [adjustedWeights, setAdjustedWeights] = useState<Record<string, number>>(baseWeights);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sensitivityData, setSensitivityData] = useState<Array<{
    consequence: string;
    baseScore: number;
    minScore: number;
    maxScore: number;
    impact: number;
  }>>([]);

  // Calculate scenario score with current weights
  const calculateScenarioScore = (
    consequenceValues: Record<string, number>,
    weights: Record<string, number>
  ) => {
    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const impact = consequenceValues[key] || 0;
      totalScore += (impact / 5) * weight;
    }
    return totalScore;
  };

  // Recalculate when weights change
  const scenarioScores = useMemo(() => {
    return scenarios.map(scenario => ({
      title: scenario.title,
      baseScore: calculateScenarioScore(scenario.consequenceValues, baseWeights),
      adjustedScore: calculateScenarioScore(scenario.consequenceValues, adjustedWeights),
    }));
  }, [scenarios, baseWeights, adjustedWeights]);

  const handleWeightChange = (consequence: string, value: number) => {
    // Calculate adjustment factor to maintain sum = 100
    const currentWeight = adjustedWeights[consequence];
    const delta = value - currentWeight;
    const otherWeights = { ...adjustedWeights };
    delete otherWeights[consequence];
    
    const otherTotal = Object.values(otherWeights).reduce((sum, w) => sum + w, 0);
    const scaleFactor = (otherTotal - delta) / otherTotal;

    const newWeights: Record<string, number> = {};
    for (const [key, weight] of Object.entries(adjustedWeights)) {
      if (key === consequence) {
        newWeights[key] = value;
      } else {
        newWeights[key] = Math.max(1, weight * scaleFactor);
      }
    }

    // Normalize to exactly 100
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    for (const key of Object.keys(newWeights)) {
      newWeights[key] = (newWeights[key] / total) * 100;
    }

    setAdjustedWeights(newWeights);
  };

  const handleReset = () => {
    setAdjustedWeights(baseWeights);
  };

  const runSensitivityAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sensitivity-analysis', {
        body: {
          session_id: sessionId,
          base_weights: baseWeights,
          variation_percent: 20,
        },
      });

      if (error) throw error;

      if (data?.sensitivity_results) {
        setSensitivityData(data.sensitivity_results);
      }

      toast({
        title: "Analysis Complete",
        description: "Sensitivity analysis completed successfully",
      });
    } catch (error) {
      console.error('Sensitivity analysis error:', error);
      toast({
        title: "Error",
        description: "Failed to run sensitivity analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sortedWeights = Object.entries(adjustedWeights).sort(([, a], [, b]) => b - a);
  const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Sensitivity Analysis
          </CardTitle>
          <CardDescription>
            Explore how changes to consequence weights affect risk scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={runSensitivityAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Run Full Analysis'
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Base
            </Button>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-6">
            {sortedWeights.map(([name, weight]) => (
              <div key={name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{name.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={weight !== baseWeights[name] ? 'default' : 'secondary'}>
                      {weight.toFixed(1)}%
                    </Badge>
                    {weight !== baseWeights[name] && (
                      <span className="text-xs text-muted-foreground">
                        (base: {baseWeights[name]?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[weight]}
                  min={1}
                  max={50}
                  step={0.5}
                  onValueChange={([value]) => handleWeightChange(name, value)}
                />
              </div>
            ))}
          </div>

          {/* Total Check */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between">
            <span className="font-medium">Total</span>
            <Badge variant={Math.abs(totalWeight - 100) < 0.1 ? 'default' : 'destructive'}>
              {totalWeight.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tornado Diagram */}
      {sensitivityData.length > 0 && (
        <TornadoDiagram data={sensitivityData} />
      )}

      {/* Scenario Impact Preview */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scenario Impact Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scenarioScores.map((scenario, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{scenario.title}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Base: {scenario.baseScore.toFixed(1)}
                    </div>
                    <div className="text-sm font-bold">
                      Adjusted: {scenario.adjustedScore.toFixed(1)}
                    </div>
                    <Badge
                      variant={
                        scenario.adjustedScore > scenario.baseScore
                          ? 'destructive'
                          : scenario.adjustedScore < scenario.baseScore
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {scenario.adjustedScore > scenario.baseScore ? '+' : ''}
                      {(scenario.adjustedScore - scenario.baseScore).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
