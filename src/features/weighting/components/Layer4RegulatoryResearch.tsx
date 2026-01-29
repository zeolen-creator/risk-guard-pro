import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Scale, FileText, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

interface Layer4RegulatoryResearchProps {
  sessionId: string;
  industryType?: string;
  jurisdiction?: string;
  ahpWeights?: Record<string, number>;
  organizationId?: string;
  onComplete?: () => void;
  onBack?: () => void;
}

interface RegulatoryResult {
  consequence: string;
  regulatoryScore: number;
  keyRegulations: string[];
  penaltyExamples: string[];
  complianceNotes: string;
}

interface MissionAnalysis {
  consequence: string;
  relevanceScore: number;
  missionAlignment: string;
  stakeholderImpact: string;
}

export function Layer4RegulatoryResearch({
  sessionId,
  industryType = 'general',
  jurisdiction = 'Canada',
  ahpWeights = {},
  organizationId,
  onComplete,
  onBack,
}: Layer4RegulatoryResearchProps) {
  const { toast } = useToast();
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [regulatoryResults, setRegulatoryResults] = useState<RegulatoryResult[]>([]);
  const [missionResults, setMissionResults] = useState<MissionAnalysis[]>([]);
  const [topRegulatedConsequences, setTopRegulatedConsequences] = useState<string[]>([]);
  const [researchComplete, setResearchComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startResearch = async () => {
    setIsResearching(true);
    setResearchProgress(0);

    try {
      // Step 1: Research regulations
      setResearchProgress(20);
      const { data: regData, error: regError } = await supabase.functions.invoke('research-regulations', {
        body: {
          session_id: sessionId,
          industry: industryType,
          jurisdiction: jurisdiction || 'Canada',
        },
      });

      if (regError) throw regError;

      setResearchProgress(50);

      // Process regulatory results
      if (regData?.consequence_analysis) {
        const results: RegulatoryResult[] = Object.entries(regData.consequence_analysis).map(
          ([consequence, analysis]: [string, any]) => ({
            consequence,
            regulatoryScore: analysis.regulatory_emphasis || 0,
            keyRegulations: analysis.key_regulations || [],
            penaltyExamples: analysis.penalty_examples || [],
            complianceNotes: analysis.compliance_notes || '',
          })
        );
        setRegulatoryResults(results);
        setTopRegulatedConsequences(regData.top_regulated_consequences || []);
      }

      // Step 2: Analyze mission statement
      setResearchProgress(70);
      
      // Get questionnaire data for mission statement
      const { data: questionnaire } = await supabase
        .from('weighting_questionnaire_responses')
        .select('mission_statement')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (questionnaire?.mission_statement) {
        const { data: missionData, error: missionError } = await supabase.functions.invoke(
          'analyze-mission-statement',
          {
            body: {
              session_id: sessionId,
              mission_statement: questionnaire.mission_statement,
              industry: industryType,
            },
          }
        );

        if (!missionError && missionData?.consequence_relevance) {
          const missionAnalysis: MissionAnalysis[] = Object.entries(missionData.consequence_relevance).map(
            ([consequence, analysis]: [string, any]) => ({
              consequence,
              relevanceScore: analysis.relevance_score || 0,
              missionAlignment: analysis.alignment_explanation || '',
              stakeholderImpact: analysis.stakeholder_impact || '',
            })
          );
          setMissionResults(missionAnalysis);
        }
      }

      setResearchProgress(100);
      setResearchComplete(true);

      toast({
        title: "Research Complete",
        description: "Regulatory and mission analysis completed successfully",
      });
    } catch (error) {
      console.error('Research error:', error);
      toast({
        title: "Research Error",
        description: "Failed to complete research. You can proceed with available data.",
        variant: "destructive",
      });
      setResearchComplete(true);
    } finally {
      setIsResearching(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      // Update session
      await supabase
        .from('weighting_sessions')
        .update({
          layer4_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      onComplete?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to save research results",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Layer 4: Regulatory & Mission Analysis
          </CardTitle>
          <CardDescription>
            AI-powered research of regulatory requirements and alignment with your organization's
            mission statement to ensure weights reflect legal obligations and core values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Industry:</span>
              <span className="ml-2 font-medium">{industryType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Jurisdiction:</span>
              <span className="ml-2 font-medium">{jurisdiction || 'Canada'}</span>
            </div>
          </div>

          {!researchComplete && !isResearching && (
            <Button onClick={startResearch} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Start AI Research
            </Button>
          )}

          {isResearching && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {researchProgress < 50
                    ? 'Researching regulatory requirements...'
                    : researchProgress < 80
                    ? 'Analyzing mission statement alignment...'
                    : 'Finalizing analysis...'}
                </span>
              </div>
              <Progress value={researchProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regulatory Results */}
      {researchComplete && regulatoryResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regulatory Analysis</CardTitle>
            <CardDescription>
              Consequences ranked by regulatory emphasis and legal liability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Top Regulated */}
              {topRegulatedConsequences.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-4 border-b">
                  <span className="text-sm text-muted-foreground">Top Regulated:</span>
                  {topRegulatedConsequences.map((c, i) => (
                    <Badge key={i} variant="default">
                      #{i + 1} {c.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Detailed Results */}
              <div className="grid gap-3">
                {regulatoryResults
                  .sort((a, b) => b.regulatoryScore - a.regulatoryScore)
                  .map((result) => (
                    <div
                      key={result.consequence}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {result.consequence.replace(/_/g, ' ')}
                          </span>
                          <Badge
                            variant={
                              result.regulatoryScore >= 80
                                ? 'destructive'
                                : result.regulatoryScore >= 50
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {result.regulatoryScore}% emphasis
                          </Badge>
                        </div>
                        {result.keyRegulations.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Key regulations: {result.keyRegulations.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mission Analysis Results */}
      {researchComplete && missionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mission Alignment Analysis</CardTitle>
            <CardDescription>
              How each consequence type aligns with your organization's stated mission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {missionResults
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 5)
                .map((result) => (
                  <div
                    key={result.consequence}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {result.consequence.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline">{result.relevanceScore}% relevant</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.missionAlignment}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results State */}
      {researchComplete && regulatoryResults.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="font-medium">Limited Research Available</h3>
                <p className="text-sm text-muted-foreground">
                  AI research returned limited results. The synthesis will rely more heavily on
                  your AHP weights and scenario validations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={!onBack}>
          Back to Scenarios
        </Button>
        <Button
          onClick={handleSaveAndContinue}
          disabled={!researchComplete || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue to AI Synthesis'
          )}
        </Button>
      </div>
    </div>
  );
}
