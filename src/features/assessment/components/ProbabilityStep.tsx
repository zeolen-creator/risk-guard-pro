import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hazard } from "@/hooks/useHazards";
import { PROBABILITY_SCORES } from "@/constants/hazards";
import { ProbabilityTable } from "@/components/ProbabilityTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ProbabilityStepProps {
  hazards: Hazard[];
  selectedHazards: string[];
  probabilities: Record<string, number>;
  onProbabilityChange: (hazardId: string, value: number) => void;
}

export function ProbabilityStep({
  hazards,
  selectedHazards,
  probabilities,
  onProbabilityChange,
}: ProbabilityStepProps) {
  const [showTable, setShowTable] = useState(true);
  const selectedHazardData = hazards.filter((h) =>
    selectedHazards.includes(h.id)
  );

  const getProbabilityLabel = (score: number) => {
    return PROBABILITY_SCORES.find((p) => p.score === score)?.category || "Unknown";
  };

  const getProbabilityColor = (score: number) => {
    if (score <= 2) return "bg-success/20 text-success border-success/50";
    if (score <= 4) return "bg-warning/20 text-warning border-warning/50";
    return "bg-destructive/20 text-destructive border-destructive/50";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Assign Probability</h3>
        <p className="text-sm text-muted-foreground">
          Rate the likelihood of each hazard occurring
        </p>
      </div>

      <Collapsible open={showTable} onOpenChange={setShowTable}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Probability Reference Table
            </span>
            <span className="text-xs text-muted-foreground">
              {showTable ? "Hide" : "Show"}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <ProbabilityTable compact />
        </CollapsibleContent>
      </Collapsible>

      <ScrollArea className="h-[350px] md:h-[400px]">
        <div className="space-y-3 pr-4">
          {selectedHazardData.map((hazard) => {
            const currentValue = probabilities[hazard.id] || 1;
            const probabilityInfo = PROBABILITY_SCORES.find(
              (p) => p.score === currentValue
            );

            return (
              <Card key={hazard.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <CardTitle className="text-sm font-medium">
                        {hazard.category_number}. {hazard.category}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={getProbabilityColor(currentValue)}
                    >
                      {currentValue} - {getProbabilityLabel(currentValue)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4 pt-0">
                  <div className="space-y-3">
                    <Slider
                      value={[currentValue]}
                      onValueChange={([value]) =>
                        onProbabilityChange(hazard.id, value)
                      }
                      min={1}
                      max={6}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 - Rare</span>
                      <span>6 - Certain</span>
                    </div>
                    {probabilityInfo && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {probabilityInfo.description} ({probabilityInfo.percentChance})
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
