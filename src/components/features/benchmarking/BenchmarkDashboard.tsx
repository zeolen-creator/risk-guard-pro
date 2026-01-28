import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Lock,
  Shield,
  Building,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useBenchmarkStats, useBenchmarkParticipation, useOptInBenchmark } from "@/hooks/useBenchmarkStats";
import { useAssessments } from "@/hooks/useAssessments";
import { toast } from "sonner";

export function BenchmarkDashboard() {
  const { data: stats, isLoading: statsLoading } = useBenchmarkStats();
  const { data: participation, isLoading: partLoading } = useBenchmarkParticipation();
  const { data: assessments = [] } = useAssessments();
  const optIn = useOptInBenchmark();

  const [showOptInDialog, setShowOptInDialog] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isOptedIn = participation?.opted_in ?? false;

  // Calculate user's overall risk score
  const completedAssessments = assessments.filter((a) => a.status === "completed");
  const userAvgRisk = completedAssessments.length > 0
    ? completedAssessments.reduce((sum, a) => sum + (a.total_risk || 0), 0) / completedAssessments.length
    : 0;

  // Calculate percentile
  const calculatePercentile = (userScore: number, avgScore: number | null, p75: number | null) => {
    if (!avgScore || !p75) return null;
    if (userScore <= avgScore * 0.5) return 90;
    if (userScore <= avgScore) return 75;
    if (userScore <= p75) return 50;
    return 25;
  };

  const percentile = stats ? calculatePercentile(userAvgRisk, stats.avg_risk_score, stats.percentile_75) : null;

  const handleOptIn = async () => {
    try {
      await optIn.mutateAsync(true);
      toast.success("Successfully opted in to benchmarking");
      setShowOptInDialog(false);
    } catch {
      toast.error("Failed to opt in");
    }
  };

  const handleOptOut = async () => {
    try {
      await optIn.mutateAsync(false);
      toast.success("Opted out of benchmarking");
    } catch {
      toast.error("Failed to opt out");
    }
  };

  if (statsLoading || partLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry Benchmarking</CardTitle>
          <CardDescription>Loading benchmark data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isOptedIn) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Industry Benchmarking</CardTitle>
            <CardDescription>Compare your risk profile to industry peers</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Join the Benchmarking Community</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Compare your organization's risk profile to similar organizations in your industry.
              Your data is fully anonymized and aggregated.
            </p>
            <Button onClick={() => setShowOptInDialog(true)}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </CardContent>
        </Card>

        {/* Opt-in Dialog */}
        <Dialog open={showOptInDialog} onOpenChange={setShowOptInDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Help Improve Industry Safety & Get Insights
              </DialogTitle>
              <DialogDescription>
                Join our benchmarking community to compare your risk assessments with similar organizations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Benefits */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">What You Get (FREE)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "Compare your risk profile to similar organizations",
                    "Identify blind spots: hazards others rate high but you rated low",
                    "See your percentile ranking (\"Better than 68% of peers\")",
                    "Access industry trends and best practices",
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">How Anonymization Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-center">
                      <Building className="h-8 w-8 text-blue-600 mx-auto" />
                      <p className="text-sm mt-1">Your Data</p>
                      <p className="text-xs text-muted-foreground">Assessments</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <div className="text-center">
                      <Shield className="h-8 w-8 text-yellow-600 mx-auto" />
                      <p className="text-sm mt-1">Anonymized</p>
                      <p className="text-xs text-muted-foreground">Name removed</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <div className="text-center">
                      <Users className="h-8 w-8 text-green-600 mx-auto" />
                      <p className="text-sm mt-1">Aggregated</p>
                      <p className="text-xs text-muted-foreground">5+ orgs min</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-purple-600 mx-auto" />
                      <p className="text-sm mt-1">Insights</p>
                      <p className="text-xs text-muted-foreground">Benchmarks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy guarantees */}
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Privacy Guarantees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "Your organization name is NEVER shared - completely stripped",
                    "Only industry, size range, and province shared",
                    "Data aggregated with at least 5 other organizations",
                    "Compliant with PIPEDA and provincial privacy laws",
                  ].map((guarantee, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Lock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{guarantee}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Agreement */}
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Checkbox
                  id="opt-in-agree"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <label htmlFor="opt-in-agree" className="text-sm leading-relaxed cursor-pointer">
                  I agree to share my organization's anonymized risk assessment data to help improve
                  industry safety standards. I understand my data will be fully anonymized, aggregated
                  with other organizations, and I can opt-out at any time.
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="ghost" onClick={() => setShowOptInDialog(false)}>
                Skip for Now
              </Button>
              <Button onClick={handleOptIn} disabled={!agreedToTerms || optIn.isPending}>
                {optIn.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Join & See My Benchmark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // User is opted in - show benchmark data
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Industry Benchmarking</CardTitle>
            <CardDescription>Compare your risk profile to {stats?.sample_size || 0}+ similar organizations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleOptOut} disabled={optIn.isPending}>
            Opt Out
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!stats || stats.sample_size < 5 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Insufficient Data</AlertTitle>
            <AlertDescription>
              We need at least 5 organizations in your industry/region to show benchmarks.
              Check back soon as more organizations join.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Percentile Card */}
            <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Risk Score</p>
                  <p className="text-3xl font-bold">{Math.round(userAvgRisk)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Industry Average</p>
                  <p className="text-3xl font-bold">{Math.round(stats.avg_risk_score || 0)}</p>
                </div>
              </div>
              {percentile && (
                <div className="text-center">
                  <Badge className="text-lg py-1 px-4 bg-green-600">
                    Better than {percentile}% of peers
                  </Badge>
                </div>
              )}
            </div>

            {/* Distribution Chart */}
            <div>
              <h3 className="font-semibold mb-4">Risk Score Distribution</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "25th %ile", score: stats.percentile_25 || 0 },
                      { name: "Median", score: stats.median_risk_score || 0 },
                      { name: "75th %ile", score: stats.percentile_75 || 0 },
                      { name: "90th %ile", score: stats.percentile_90 || 0 },
                      { name: "You", score: userAvgRisk },
                    ]}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <Cell key={idx} fill={idx === 4 ? "#10b981" : "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Hazards */}
            {stats.top_3_hazards && stats.top_3_hazards.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Top Industry Hazards</h3>
                <div className="space-y-3">
                  {stats.top_3_hazards.map((hazard, idx) => (
                    <div key={idx} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{hazard.name}</span>
                        <Badge variant="secondary">{hazard.pct_rated_high}% rate as high risk</Badge>
                      </div>
                      <Progress value={hazard.avg_score} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg score: {Math.round(hazard.avg_score)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
