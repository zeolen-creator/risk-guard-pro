import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export interface ScenarioTemplate {
  id: string;
  industry_id: string;
  scenario_title: string;
  scenario_description: string;
  consequence_values: Record<string, number>;
  expected_risk_category: string;
  learning_objective: string;
}

interface Layer3ScenarioCardProps {
  scenario: ScenarioTemplate;
  scenarioNumber: number;
  userRating: string | null;
  onRate: (rating: string) => void;
  aiCalculatedScore?: number;
  aiRiskCategory?: string;
  isAligned?: boolean;
  misalignmentMagnitude?: number;
  showResults: boolean;
}

const RISK_RATINGS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'extreme', label: 'Extreme', color: 'bg-red-500' },
];

const CONSEQUENCE_LABELS: Record<string, string> = {
  Fatalities: 'Fatalities',
  Injuries: 'Injuries',
  Displacement: 'Displacement',
  Psychosocial_Impact: 'Psychosocial',
  Support_System_Impact: 'Support Systems',
  Property_Damage: 'Property Damage',
  Infrastructure_Impact: 'Infrastructure',
  Environmental_Damage: 'Environmental',
  Economic_Impact: 'Economic',
  Reputational_Impact: 'Reputational',
};

export function Layer3ScenarioCard({
  scenario,
  scenarioNumber,
  userRating,
  onRate,
  aiCalculatedScore,
  aiRiskCategory,
  isAligned,
  misalignmentMagnitude,
  showResults,
}: Layer3ScenarioCardProps) {
  const consequenceEntries = Object.entries(scenario.consequence_values || {});
  
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Scenario {scenarioNumber}: {scenario.scenario_title}
          </CardTitle>
          <Badge variant="outline">Expected: {scenario.expected_risk_category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Description */}
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm leading-relaxed">{scenario.scenario_description}</p>
        </div>

        {/* Consequence Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Consequence Impact Levels (1-5 scale)</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {consequenceEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col items-center p-2 bg-muted/50 rounded text-center"
              >
                <span className="text-xs text-muted-foreground truncate w-full">
                  {CONSEQUENCE_LABELS[key] || key.replace(/_/g, ' ')}
                </span>
                <span className="text-lg font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Rating Selection */}
        <div>
          <h4 className="text-sm font-medium mb-3">Your Intuitive Risk Rating</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Based on your organization's priorities, how would you rate the overall risk of this scenario?
          </p>
          <RadioGroup
            value={userRating || ''}
            onValueChange={onRate}
            className="flex flex-wrap gap-4"
          >
            {RISK_RATINGS.map((rating) => (
              <div key={rating.value} className="flex items-center space-x-2">
                <RadioGroupItem value={rating.value} id={`${scenario.id}-${rating.value}`} />
                <Label
                  htmlFor={`${scenario.id}-${rating.value}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className={`w-3 h-3 rounded-full ${rating.color}`} />
                  {rating.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Results (shown after rating) */}
        {showResults && userRating && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI-Calculated Score</p>
                <p className="text-2xl font-bold">{aiCalculatedScore?.toFixed(1) || '—'}/100</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Risk Category</p>
                <Badge
                  variant={
                    aiRiskCategory === 'extreme'
                      ? 'destructive'
                      : aiRiskCategory === 'high'
                      ? 'default'
                      : 'secondary'
                  }
                  className="text-lg px-3 py-1"
                >
                  {aiRiskCategory?.toUpperCase() || '—'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isAligned ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <span className="text-green-600 font-medium">Aligned</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-amber-500" />
                    <span className="text-amber-600 font-medium">
                      Misaligned ({misalignmentMagnitude} {misalignmentMagnitude === 1 ? 'level' : 'levels'})
                    </span>
                  </>
                )}
              </div>
            </div>

            {!isAligned && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Rating Misalignment Detected
                  </p>
                  <p className="text-amber-600 dark:text-amber-300">
                    Your intuitive rating differs from the AI-calculated result using your AHP weights.
                    This may indicate your weights need adjustment, or this scenario has unique factors.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
