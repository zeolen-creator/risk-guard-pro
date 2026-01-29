import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layer3ScenarioCard, ScenarioTemplate } from "./Layer3ScenarioCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Layer3ScenarioValidatorProps {
  sessionId: string;
  organizationId: string;
  industryType: string;
  ahpWeights: Record<string, number>;
  onComplete: () => void;
  onBack: () => void;
}

interface ScenarioValidation {
  scenarioId: string;
  userRating: string;
  aiCalculatedScore: number;
  aiRiskCategory: string;
  isAligned: boolean;
  misalignmentMagnitude: number;
}

const RISK_THRESHOLDS = {
  low: { min: 0, max: 25 },
  medium: { min: 25, max: 50 },
  high: { min: 50, max: 75 },
  extreme: { min: 75, max: 100 },
};

function calculateRiskScore(
  consequenceValues: Record<string, number>,
  weights: Record<string, number>
): number {
  let totalScore = 0;
  const weightEntries = Object.entries(weights);
  
  for (const [key, weight] of weightEntries) {
    const impact = consequenceValues[key] || 0;
    // Convert 1-5 impact to 0-100 scale contribution
    totalScore += (impact / 5) * weight;
  }
  
  return totalScore;
}

function getRiskCategory(score: number): string {
  if (score < RISK_THRESHOLDS.low.max) return 'low';
  if (score < RISK_THRESHOLDS.medium.max) return 'medium';
  if (score < RISK_THRESHOLDS.high.max) return 'high';
  return 'extreme';
}

function getMisalignmentMagnitude(userRating: string, aiCategory: string): number {
  const levels = ['low', 'medium', 'high', 'extreme'];
  const userIndex = levels.indexOf(userRating);
  const aiIndex = levels.indexOf(aiCategory);
  return Math.abs(userIndex - aiIndex);
}

export function Layer3ScenarioValidator({
  sessionId,
  organizationId,
  industryType,
  ahpWeights,
  onComplete,
  onBack,
}: Layer3ScenarioValidatorProps) {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [validations, setValidations] = useState<Map<string, ScenarioValidation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load scenarios for this industry
  useEffect(() => {
    async function loadScenarios() {
      setIsLoading(true);
      try {
        // Map industry type to industry_id
        const industryMapping: Record<string, string> = {
          'Healthcare': 'healthcare',
          'Pediatric Hospital': 'healthcare',
          'Hospital': 'healthcare',
          'Manufacturing': 'manufacturing',
          'Finance': 'finance',
          'Education': 'education',
          'Retail': 'retail',
          'Government': 'government',
          'Transportation': 'transportation',
          'Energy': 'energy',
          'Construction': 'construction',
          'Hospitality': 'hospitality',
          'Technology': 'technology',
          'Agriculture': 'agriculture',
        };

        const industryId = industryMapping[industryType] || 'healthcare';

        const { data, error } = await supabase
          .from('scenario_templates')
          .select('*')
          .eq('industry', industryId)
          .eq('is_active', true)
          .order('scenario_order')
          .limit(4);

        if (error) throw error;

        // Type assertion for the scenario data using actual column names
        const typedData = (data || []).map(item => ({
          id: item.id,
          industry_id: item.industry,
          scenario_title: item.scenario_title,
          scenario_description: item.scenario_description_template,
          consequence_values: item.consequence_values_template as Record<string, number>,
          expected_risk_category: item.expected_risk_level,
          learning_objective: item.customization_prompt || '',
        }));

        setScenarios(typedData);
      } catch (error) {
        console.error('Error loading scenarios:', error);
        toast({
          title: "Error",
          description: "Failed to load validation scenarios",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadScenarios();
  }, [industryType, toast]);

  const handleRate = (scenarioId: string, rating: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const aiScore = calculateRiskScore(scenario.consequence_values, ahpWeights);
    const aiCategory = getRiskCategory(aiScore);
    const isAligned = rating === aiCategory;
    const misalignment = getMisalignmentMagnitude(rating, aiCategory);

    const validation: ScenarioValidation = {
      scenarioId,
      userRating: rating,
      aiCalculatedScore: aiScore,
      aiRiskCategory: aiCategory,
      isAligned,
      misalignmentMagnitude: misalignment,
    };

    setValidations(prev => new Map(prev).set(scenarioId, validation));
  };

  const allRated = scenarios.length > 0 && scenarios.every(s => validations.has(s.id));
  const alignedCount = Array.from(validations.values()).filter(v => v.isAligned).length;
  const alignmentPercentage = scenarios.length > 0 ? (alignedCount / scenarios.length) * 100 : 0;

  const handleShowResults = () => {
    setShowResults(true);
  };

  const handleSaveAndContinue = async () => {
    if (!allRated) return;

    setIsSaving(true);
    try {
      // Save each validation to the database
      for (const [index, scenario] of scenarios.entries()) {
        const validation = validations.get(scenario.id);
        if (!validation) continue;

        await supabase.from('weighting_scenario_validations').upsert({
          session_id: sessionId,
          scenario_template_id: scenario.id,
          scenario_number: index + 1,
          scenario_title: scenario.scenario_title,
          scenario_description: scenario.scenario_description,
          consequence_values: scenario.consequence_values,
          user_risk_rating: validation.userRating,
          ai_calculated_score: validation.aiCalculatedScore,
          ai_risk_category: validation.aiRiskCategory,
          rating_aligned: validation.isAligned,
          misalignment_magnitude: validation.misalignmentMagnitude,
        }, {
          onConflict: 'session_id,scenario_number',
        });
      }

      // Update session
      await supabase
        .from('weighting_sessions')
        .update({
          layer3_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      toast({
        title: "Scenarios Validated",
        description: `${alignedCount}/${scenarios.length} scenarios aligned with your weights`,
      });

      onComplete();
    } catch (error) {
      console.error('Error saving validations:', error);
      toast({
        title: "Error",
        description: "Failed to save scenario validations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Layer 3: Scenario Validation</CardTitle>
          <CardDescription>
            Rate these realistic scenarios using your intuition. We'll compare your ratings
            to the AI-calculated scores using your AHP weights to validate consistency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={(validations.size / scenarios.length) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {validations.size}/{scenarios.length} rated
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Cards */}
      <div className="space-y-6">
        {scenarios.map((scenario, index) => (
          <Layer3ScenarioCard
            key={scenario.id}
            scenario={scenario}
            scenarioNumber={index + 1}
            userRating={validations.get(scenario.id)?.userRating || null}
            onRate={(rating) => handleRate(scenario.id, rating)}
            aiCalculatedScore={validations.get(scenario.id)?.aiCalculatedScore}
            aiRiskCategory={validations.get(scenario.id)?.aiRiskCategory}
            isAligned={validations.get(scenario.id)?.isAligned}
            misalignmentMagnitude={validations.get(scenario.id)?.misalignmentMagnitude}
            showResults={showResults}
          />
        ))}
      </div>

      {/* Results Summary */}
      {showResults && allRated && (
        <Card className={alignmentPercentage >= 75 ? 'border-green-500' : 'border-amber-500'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {alignmentPercentage >= 75 ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {alignmentPercentage >= 75 ? 'Good Alignment!' : 'Some Misalignment Detected'}
                </h3>
                <p className="text-muted-foreground">
                  {alignedCount} of {scenarios.length} scenarios ({alignmentPercentage.toFixed(0)}%) matched your intuitive ratings.
                  {alignmentPercentage < 75 && ' The AI synthesis will account for these discrepancies.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to AHP
        </Button>
        <div className="flex gap-2">
          {!showResults && allRated && (
            <Button onClick={handleShowResults}>
              Show Results
            </Button>
          )}
          {showResults && (
            <Button onClick={handleSaveAndContinue} disabled={isSaving || !allRated}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue to Regulatory Research'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
