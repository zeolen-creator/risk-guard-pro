import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Consequence, Hazard } from "@/hooks/useHazards";
import { IMPACT_SCORES } from "@/constants/hazards";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Scale, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeightsImpactsStepProps {
  hazards: Hazard[];
  consequences: Consequence[];
  selectedHazards: string[];
  weights: Record<string, number>;
  impacts: Record<string, Record<string, number>>;
  onWeightChange: (consequenceId: string, value: number) => void;
  onImpactChange: (hazardId: string, consequenceId: string, value: number) => void;
}

export function WeightsImpactsStep({
  hazards,
  consequences,
  selectedHazards,
  weights,
  impacts,
  onWeightChange,
  onImpactChange,
}: WeightsImpactsStepProps) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  const isValidWeight = totalWeight === 100;
  const selectedHazardData = hazards.filter((h) => selectedHazards.includes(h.id));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Weights & Impacts</h3>
        <p className="text-sm text-muted-foreground">
          Set consequence weights and assign impact scores
        </p>
      </div>

      <Tabs defaultValue="weights" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weights" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Weights
          </TabsTrigger>
          <TabsTrigger value="impacts" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Impacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Consequence Weights</CardTitle>
                  <CardDescription>
                    Distribute 100% across consequences
                  </CardDescription>
                </div>
                <Badge
                  variant={isValidWeight ? "default" : "destructive"}
                  className="text-sm"
                >
                  Total: {totalWeight}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {consequences.map((consequence) => (
                    <div
                      key={consequence.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium">
                          {consequence.category_number}. {consequence.category}
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
                          {consequence.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={weights[consequence.id] || 0}
                          onChange={(e) =>
                            onWeightChange(
                              consequence.id,
                              Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            )
                          }
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {!isValidWeight && (
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Weights must sum to exactly 100% (currently {totalWeight}%)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impacts" className="mt-4">
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
                    <div className="grid gap-2">
                      {consequences.map((consequence) => (
                        <div
                          key={consequence.id}
                          className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30"
                        >
                          <span className="text-sm truncate flex-1">
                            {consequence.category}
                          </span>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
