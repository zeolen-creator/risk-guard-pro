import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Shield,
} from "lucide-react";
import { useAssessments } from "@/hooks/useAssessments";

interface AssessmentForComparison {
  id: string;
  title: string;
  created_at: string;
  status: string;
  total_risk: number | null;
  selected_hazards: unknown;
  probabilities: unknown;
  impacts: unknown;
  results: unknown;
}

interface HazardComparison {
  name: string;
  category: string;
  baselineScore: number | null;
  comparisonScore: number | null;
  change: number;
  changePercent: number;
}

interface ComparisonData {
  risksIncreased: number;
  risksDecreased: number;
  risksUnchanged: number;
  overallRiskChange: number;
  hazardComparisons: HazardComparison[];
}

export default function AssessmentComparisonPage() {
  const { data: assessments, isLoading } = useAssessments();
  const [baselineId, setBaselineId] = useState<string>("");
  const [comparisonId, setComparisonId] = useState<string>("");

  const completedAssessments = useMemo(() => {
    return (assessments || []).filter(a => a.status === "completed") as AssessmentForComparison[];
  }, [assessments]);

  const baselineAssessment = completedAssessments.find(a => a.id === baselineId);
  const comparisonAssessment = completedAssessments.find(a => a.id === comparisonId);

  const comparisonData = useMemo<ComparisonData | null>(() => {
    if (!baselineAssessment || !comparisonAssessment) return null;

    const baselineResults = (baselineAssessment.results || {}) as Record<string, { risk_score?: number; hazard_category?: string }>;
    const comparisonResults = (comparisonAssessment.results || {}) as Record<string, { risk_score?: number; hazard_category?: string }>;

    const allHazardIds = new Set([
      ...Object.keys(baselineResults),
      ...Object.keys(comparisonResults),
    ]);

    const hazardComparisons: HazardComparison[] = Array.from(allHazardIds).map(hazardId => {
      const baselineScore = baselineResults[hazardId]?.risk_score ?? null;
      const comparisonScore = comparisonResults[hazardId]?.risk_score ?? null;
      const change = (comparisonScore ?? 0) - (baselineScore ?? 0);
      const changePercent = baselineScore && baselineScore > 0 
        ? (change / baselineScore) * 100 
        : 0;

      return {
        name: hazardId,
        category: baselineResults[hazardId]?.hazard_category || comparisonResults[hazardId]?.hazard_category || "Unknown",
        baselineScore,
        comparisonScore,
        change,
        changePercent,
      };
    });

    const risksIncreased = hazardComparisons.filter(h => h.change > 0).length;
    const risksDecreased = hazardComparisons.filter(h => h.change < 0).length;
    const risksUnchanged = hazardComparisons.filter(h => h.change === 0).length;

    const baselineTotal = baselineAssessment.total_risk || 0;
    const comparisonTotal = comparisonAssessment.total_risk || 0;
    const overallRiskChange = baselineTotal > 0 
      ? ((comparisonTotal - baselineTotal) / baselineTotal) * 100 
      : 0;

    return {
      risksIncreased,
      risksDecreased,
      risksUnchanged,
      overallRiskChange,
      hazardComparisons: hazardComparisons.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    };
  }, [baselineAssessment, comparisonAssessment]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-red-600";
    if (change < 0) return "text-green-600";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">HIRA Pro</span>
          </Link>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <GitCompare className="h-8 w-8 text-primary" />
            Assessment Comparison
          </h1>
          <p className="text-muted-foreground">
            Compare two assessments to track risk evolution over time
          </p>
        </div>

        {/* Selection Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Assessments to Compare</CardTitle>
            <CardDescription>
              Choose a baseline (older) and comparison (newer) assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedAssessments.length < 2 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">
                  At least 2 completed assessments are required for comparison
                </p>
                <p className="text-sm text-muted-foreground">
                  You have {completedAssessments.length} completed assessment(s)
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Baseline Assessment</label>
                  <Select value={baselineId} onValueChange={setBaselineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select baseline..." />
                    </SelectTrigger>
                    <SelectContent>
                      {completedAssessments
                        .filter(a => a.id !== comparisonId)
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.title} - {format(new Date(a.created_at), "MMM yyyy")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comparison Assessment</label>
                  <Select value={comparisonId} onValueChange={setComparisonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select comparison..." />
                    </SelectTrigger>
                    <SelectContent>
                      {completedAssessments
                        .filter(a => a.id !== baselineId)
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.title} - {format(new Date(a.created_at), "MMM yyyy")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    className="w-full"
                    disabled={!baselineId || !comparisonId}
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Generate Comparison
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparisonData && baselineAssessment && comparisonAssessment && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className={`text-3xl font-bold ${comparisonData.overallRiskChange > 0 ? "text-red-600" : comparisonData.overallRiskChange < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {comparisonData.overallRiskChange > 0 ? "+" : ""}
                    {comparisonData.overallRiskChange.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Overall Risk Change</p>
                  {comparisonData.overallRiskChange > 0 ? (
                    <TrendingUp className="h-6 w-6 text-red-500 mx-auto mt-2" />
                  ) : comparisonData.overallRiskChange < 0 ? (
                    <TrendingDown className="h-6 w-6 text-green-500 mx-auto mt-2" />
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-red-600">{comparisonData.risksIncreased}</p>
                  <p className="text-sm text-muted-foreground mt-1">Risks Increased</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">{comparisonData.risksDecreased}</p>
                  <p className="text-sm text-muted-foreground mt-1">Risks Decreased</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-muted-foreground">{comparisonData.risksUnchanged}</p>
                  <p className="text-sm text-muted-foreground mt-1">Unchanged</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hazard-by-Hazard Comparison</CardTitle>
                <CardDescription>
                  {baselineAssessment.title} ({format(new Date(baselineAssessment.created_at), "MMM yyyy")})
                  vs {comparisonAssessment.title} ({format(new Date(comparisonAssessment.created_at), "MMM yyyy")})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hazard</TableHead>
                        <TableHead className="text-right">Baseline</TableHead>
                        <TableHead className="text-right">Comparison</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.hazardComparisons.map((hazard) => (
                        <TableRow key={hazard.name}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{hazard.name}</p>
                              <p className="text-xs text-muted-foreground">{hazard.category}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {hazard.baselineScore !== null ? hazard.baselineScore.toFixed(1) : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            {hazard.comparisonScore !== null ? hazard.comparisonScore.toFixed(1) : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {getTrendIcon(hazard.change)}
                              <span className={getTrendColor(hazard.change)}>
                                {hazard.change > 0 ? "+" : ""}
                                {hazard.change.toFixed(1)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Export Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export Comparison Report
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
