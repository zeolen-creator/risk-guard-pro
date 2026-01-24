import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hazard, Consequence } from "@/hooks/useHazards";
import { RiskResult, calculateWeightedImpact, calculateRiskScore, getRiskLevel } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ResultsStepProps {
  hazards: Hazard[];
  consequences: Consequence[];
  selectedHazards: string[];
  probabilities: Record<string, number>;
  weights: Record<string, number>;
  impacts: Record<string, Record<string, number>>;
}

export function ResultsStep({
  hazards,
  consequences,
  selectedHazards,
  probabilities,
  weights,
  impacts,
}: ResultsStepProps) {
  const results = useMemo((): RiskResult[] => {
    const selectedHazardData = hazards.filter((h) =>
      selectedHazards.includes(h.id)
    );

    return selectedHazardData
      .map((hazard) => {
        const probability = probabilities[hazard.id] || 1;
        const weightedImpact = calculateWeightedImpact(hazard.id, impacts, weights);
        const riskScore = calculateRiskScore(probability, weightedImpact);
        const riskLevel = getRiskLevel(riskScore);

        return {
          hazardId: hazard.id,
          hazardCategory: `${hazard.category_number}. ${hazard.category}`,
          probability,
          weightedImpact,
          riskScore,
          riskLevel,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [hazards, selectedHazards, probabilities, weights, impacts]);

  const totalRisk = results.reduce((sum, r) => sum + r.riskScore, 0);
  const avgRisk = results.length > 0 ? totalRisk / results.length : 0;
  const criticalCount = results.filter((r) => r.riskLevel === "Critical").length;
  const highCount = results.filter((r) => r.riskLevel === "High").length;

  const getRiskBadgeVariant = (level: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (level) {
      case "Critical":
        return "destructive";
      case "High":
        return "destructive";
      case "Medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "Critical":
        return <XCircle className="h-4 w-4" />;
      case "High":
        return <AlertCircle className="h-4 w-4" />;
      case "Medium":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Risk Assessment Results</h3>
        <p className="text-sm text-muted-foreground">
          Review your calculated risk scores
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{results.length}</div>
            <p className="text-xs text-muted-foreground">Hazards Assessed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{avgRisk.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Average Risk</p>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-destructive">{criticalCount}</span>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">Critical Risks</p>
          </CardContent>
        </Card>
        <Card className={highCount > 0 ? "border-warning" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-warning">{highCount}</span>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground">High Risks</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranked Risk Table</CardTitle>
          <CardDescription>Sorted by risk score (highest first)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Hazard</TableHead>
                  <TableHead className="text-center w-16">Prob</TableHead>
                  <TableHead className="text-center w-20">Impact</TableHead>
                  <TableHead className="text-center w-16">Score</TableHead>
                  <TableHead className="text-right w-24">Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={result.hazardId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {result.hazardCategory}
                    </TableCell>
                    <TableCell className="text-center">{result.probability}</TableCell>
                    <TableCell className="text-center">
                      {result.weightedImpact.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {result.riskScore.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={getRiskBadgeVariant(result.riskLevel)}
                        className="gap-1"
                      >
                        {getRiskIcon(result.riskLevel)}
                        {result.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-success/5 border-success/20">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">Assessment Complete</p>
            <p className="text-sm text-muted-foreground">
              Click "Save Assessment" to save your results
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
