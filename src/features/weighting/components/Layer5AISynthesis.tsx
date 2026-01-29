import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Brain, CheckCircle2, AlertTriangle, 
  FileText, BarChart3, Settings2 
} from "lucide-react";
import { WeightRecommendations } from "./WeightRecommendations";
import { WeightComparisonTable } from "./WeightComparisonTable";
import { JustificationReport } from "./JustificationReport";

interface Layer5AISynthesisProps {
  sessionId: string;
  organizationId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface SynthesisResult {
  recommended_weights: Record<string, number>;
  source_contributions: {
    ahp_influence_percent: number;
    regulatory_influence_percent: number;
    mission_influence_percent: number;
    questionnaire_influence_percent: number;
    scenario_influence_percent: number;
  };
  comparison_to_ahp: Record<string, string>;
  top_3_drivers: string[];
  executive_summary: string;
  detailed_justification: Record<string, any>;
  consistency_checks: {
    weights_sum_to_100: boolean;
    all_weights_positive: boolean;
    weights_within_reasonable_bounds: boolean;
    regulatory_compliance_confidence: string;
    board_defensibility_score: number;
  };
}

interface ReportData {
  executive: string;
  detailed: string;
  technical: string;
}

export function Layer5AISynthesis({
  sessionId,
  organizationId,
  onComplete,
  onBack,
}: Layer5AISynthesisProps) {
  const { toast } = useToast();
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);
  const [reports, setReports] = useState<ReportData | null>(null);
  const [ahpWeights, setAhpWeights] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load existing synthesis if available
  useEffect(() => {
    async function loadExisting() {
      const { data: synthesis } = await supabase
        .from('weighting_ai_synthesis')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (synthesis) {
        setSynthesisResult({
          recommended_weights: synthesis.recommended_weights as Record<string, number>,
          source_contributions: synthesis.source_weights as any,
          comparison_to_ahp: synthesis.weight_changes as Record<string, string>,
          top_3_drivers: [],
          executive_summary: '',
          detailed_justification: {},
          consistency_checks: synthesis.consistency_checks as any,
        });
        setReports({
          executive: synthesis.justification_report_executive || '',
          detailed: synthesis.justification_report_detailed || '',
          technical: synthesis.justification_report_technical || '',
        });
        setAhpWeights(synthesis.previous_weights as Record<string, number> || {});
      }

      // Also load AHP weights
      const { data: ahp } = await supabase
        .from('weighting_ahp_matrix')
        .select('normalized_weights')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (ahp?.normalized_weights) {
        setAhpWeights(ahp.normalized_weights as Record<string, number>);
      }
    }

    loadExisting();
  }, [sessionId]);

  const startSynthesis = async () => {
    setIsSynthesizing(true);
    setSynthesisProgress(0);

    try {
      // Simulate progress while AI works
      const progressInterval = setInterval(() => {
        setSynthesisProgress(prev => Math.min(prev + 5, 90));
      }, 2000);

      const { data, error } = await supabase.functions.invoke('calculate-consequence-weights', {
        body: { session_id: sessionId },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setSynthesisProgress(100);

      if (data?.synthesis) {
        setSynthesisResult(data.synthesis);
      }
      if (data?.reports) {
        setReports(data.reports);
      }
      if (data?.recommended_weights) {
        setSynthesisResult(prev => ({
          ...prev!,
          recommended_weights: data.recommended_weights,
        }));
      }

      toast({
        title: "AI Synthesis Complete",
        description: "Weight recommendations generated successfully",
      });
    } catch (error) {
      console.error('Synthesis error:', error);
      toast({
        title: "Synthesis Error",
        description: "Failed to complete AI synthesis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleAcceptWeights = async () => {
    if (!synthesisResult?.recommended_weights) return;

    setIsSaving(true);
    try {
      // Update session
      await supabase
        .from('weighting_sessions')
        .update({
          layer5_completed: true,
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      toast({
        title: "Weights Accepted",
        description: "Proceeding to approval workflow",
      });

      onComplete();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to accept weights",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingSynthesis = !!synthesisResult?.recommended_weights;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Layer 5: AI-Powered Weight Synthesis
          </CardTitle>
          <CardDescription>
            The AI analyzes all inputs from Layers 1-4 to generate scientifically justified,
            legally compliant, and organizationally aligned consequence weights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasExistingSynthesis && !isSynthesizing && (
            <div className="text-center py-8">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Synthesize</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                The AI will analyze your questionnaire responses, AHP weights, scenario validations,
                and regulatory research to generate optimal consequence weights.
              </p>
              <Button onClick={startSynthesis} size="lg">
                <Brain className="mr-2 h-5 w-5" />
                Start AI Synthesis
              </Button>
            </div>
          )}

          {isSynthesizing && (
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg">
                  {synthesisProgress < 30
                    ? 'Gathering data from all layers...'
                    : synthesisProgress < 60
                    ? 'Analyzing regulatory requirements...'
                    : synthesisProgress < 90
                    ? 'Generating weight recommendations...'
                    : 'Finalizing reports...'}
                </span>
              </div>
              <Progress value={synthesisProgress} className="max-w-md mx-auto" />
              <p className="text-center text-sm text-muted-foreground">
                This typically takes 30-60 seconds
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {hasExistingSynthesis && (
        <Tabs defaultValue="recommendations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Weights
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations">
            <WeightRecommendations
              weights={synthesisResult!.recommended_weights}
              sourceContributions={synthesisResult!.source_contributions}
              consistencyChecks={synthesisResult!.consistency_checks}
            />
          </TabsContent>

          <TabsContent value="comparison">
            <WeightComparisonTable
              ahpWeights={ahpWeights}
              recommendedWeights={synthesisResult!.recommended_weights}
              changes={synthesisResult!.comparison_to_ahp}
            />
          </TabsContent>

          <TabsContent value="reports">
            <JustificationReport
              executiveReport={reports?.executive || ''}
              detailedReport={reports?.detailed || ''}
              technicalReport={reports?.technical || ''}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Research
        </Button>
        {hasExistingSynthesis && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={startSynthesis} disabled={isSynthesizing}>
              Regenerate
            </Button>
            <Button onClick={handleAcceptWeights} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept & Continue
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
