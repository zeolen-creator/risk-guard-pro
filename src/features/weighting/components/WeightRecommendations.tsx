import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Shield } from "lucide-react";

interface WeightRecommendationsProps {
  weights: Record<string, number>;
  sourceContributions?: {
    ahp_influence_percent: number;
    regulatory_influence_percent: number;
    mission_influence_percent: number;
    questionnaire_influence_percent: number;
    scenario_influence_percent: number;
  };
  consistencyChecks?: {
    weights_sum_to_100: boolean;
    all_weights_positive: boolean;
    weights_within_reasonable_bounds: boolean;
    regulatory_compliance_confidence: string;
    board_defensibility_score: number;
  };
}

const CONSEQUENCE_COLORS: Record<string, string> = {
  Fatalities: 'bg-red-500',
  Injuries: 'bg-orange-500',
  Displacement: 'bg-yellow-500',
  Psychosocial_Impact: 'bg-purple-500',
  Support_System_Impact: 'bg-indigo-500',
  Property_Damage: 'bg-blue-500',
  Infrastructure_Impact: 'bg-cyan-500',
  Environmental_Damage: 'bg-green-500',
  Economic_Impact: 'bg-emerald-500',
  Reputational_Impact: 'bg-pink-500',
};

export function WeightRecommendations({
  weights,
  sourceContributions,
  consistencyChecks,
}: WeightRecommendationsProps) {
  const sortedWeights = Object.entries(weights).sort(([, a], [, b]) => b - a);
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="space-y-6">
      {/* Main Weights Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Consequence Weights</CardTitle>
          <CardDescription>
            AI-synthesized weights based on all analysis layers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedWeights.map(([name, weight]) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-bold">{weight.toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <Progress value={weight} className="h-3" />
                  <div
                    className={`absolute inset-y-0 left-0 ${CONSEQUENCE_COLORS[name] || 'bg-primary'} rounded-full transition-all`}
                    style={{ width: `${weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Check */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between">
            <span className="font-medium">Total</span>
            <div className="flex items-center gap-2">
              <span className="font-bold">{totalWeight.toFixed(1)}%</span>
              {Math.abs(totalWeight - 100) < 0.1 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Contributions */}
      {sourceContributions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source Influence</CardTitle>
            <CardDescription>
              How each data source contributed to the final recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {sourceContributions.ahp_influence_percent}%
                </div>
                <div className="text-xs text-muted-foreground">AHP Weights</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {sourceContributions.regulatory_influence_percent}%
                </div>
                <div className="text-xs text-muted-foreground">Regulatory</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {sourceContributions.mission_influence_percent}%
                </div>
                <div className="text-xs text-muted-foreground">Mission</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {sourceContributions.questionnaire_influence_percent}%
                </div>
                <div className="text-xs text-muted-foreground">Questionnaire</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {sourceContributions.scenario_influence_percent}%
                </div>
                <div className="text-xs text-muted-foreground">Scenarios</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consistency Checks */}
      {consistencyChecks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Validation Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {consistencyChecks.weights_sum_to_100 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="text-sm">Sum = 100%</span>
              </div>
              <div className="flex items-center gap-2">
                {consistencyChecks.all_weights_positive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="text-sm">All Positive</span>
              </div>
              <div className="flex items-center gap-2">
                {consistencyChecks.weights_within_reasonable_bounds ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="text-sm">Reasonable Bounds</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    consistencyChecks.regulatory_compliance_confidence === 'HIGH'
                      ? 'default'
                      : consistencyChecks.regulatory_compliance_confidence === 'MEDIUM'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {consistencyChecks.regulatory_compliance_confidence} Compliance
                </Badge>
              </div>
            </div>

            {consistencyChecks.board_defensibility_score && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Board Defensibility Score</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={consistencyChecks.board_defensibility_score}
                      className="w-32"
                    />
                    <span className="font-bold">
                      {consistencyChecks.board_defensibility_score}/100
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
