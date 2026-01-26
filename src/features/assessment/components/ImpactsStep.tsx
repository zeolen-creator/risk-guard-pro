import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Consequence, Hazard } from "@/hooks/useHazards";
import { IMPACT_SCORES } from "@/constants/hazards";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AIResearchPanel } from "./AIResearchPanel";

interface ImpactsStepProps {
  hazards: Hazard[];
  consequences: Consequence[];
  selectedHazards: string[];
  weights: Record<string, number>;
  impacts: Record<string, Record<string, number>>;
  onImpactChange: (hazardId: string, consequenceId: string, value: number) => void;
  assessmentId?: string;
}

export function ImpactsStep({
  hazards,
  consequences,
  selectedHazards,
  weights,
  impacts,
  onImpactChange,
  assessmentId,
}: ImpactsStepProps) {
  const selectedHazardData = hazards.filter((h) => selectedHazards.includes(h.id));

  // Get non-zero weighted consequences (only show consequences that matter)
  const activeConsequences = consequences.filter((c) => (weights[c.id] || 0) > 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Assign Impact Scores
        </h3>
        <p className="text-sm text-muted-foreground">
          For each hazard, rate the impact (0-3) on each consequence type
        </p>
      </div>

      {/* Weights Reference */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Organization Consequence Weights
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  These weights are set at the organization level and apply to all assessments.
                  Contact an admin to modify them.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex flex-wrap gap-2">
            {activeConsequences.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">
                {c.category}: {weights[c.id]}%
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {selectedHazardData.map((hazard) => (
            <Card key={hazard.id}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">
                  {hazard.category_number}. {hazard.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-4 pt-0">
                <div className="space-y-3">
                  <div className="grid gap-2">
                    {activeConsequences.map((consequence) => (
                      <div
                        key={consequence.id}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm truncate">
                            {consequence.category}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {weights[consequence.id]}%
                          </Badge>
                        </div>
                        <Select
                          value={String(
                            impacts[hazard.id]?.[consequence.id] ?? 0
                          )}
                          onValueChange={(value) =>
                            onImpactChange(
                              hazard.id,
                              consequence.id,
                              parseInt(value)
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMPACT_SCORES.map((score) => (
                              <SelectItem
                                key={score.score}
                                value={String(score.score)}
                              >
                                {score.score} - {score.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  {/* AI Research Panel for consequence research */}
                  <AIResearchPanel
                    hazardId={hazard.id}
                    hazardName={hazard.category}
                    hazardCategory={hazard.category}
                    researchType="consequence"
                    assessmentId={assessmentId}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
