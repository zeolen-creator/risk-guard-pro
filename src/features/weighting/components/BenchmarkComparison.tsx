import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Users, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

interface BenchmarkComparisonProps {
  organizationId: string;
  industryType: string;
  weights: Record<string, number>;
}

interface BenchmarkData {
  consequence: string;
  orgWeight: number;
  industryAvg: number;
  industryMin: number;
  industryMax: number;
  percentile: number;
}

export function BenchmarkComparison({
  organizationId,
  industryType,
  weights,
}: BenchmarkComparisonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [isOptedIn, setIsOptedIn] = useState(false);

  useEffect(() => {
    async function checkOptIn() {
      // Check if org has opted into benchmarking
      const { data: participation } = await supabase
        .from('benchmark_participation')
        .select('opted_in')
        .eq('org_id', organizationId)
        .maybeSingle();

      setIsOptedIn(participation?.opted_in || false);
    }

    checkOptIn();
  }, [organizationId, industryType]);

  const loadBenchmarks = async () => {
    setIsLoading(true);
    try {
      // Get industry benchmarks - use explicit type
      const { data: benchmarks, error } = await supabase
        .from('weighting_industry_benchmarks')
        .select('*')
        .eq('industry_id', industryType.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (benchmarks) {
        setPeerCount(benchmarks.sample_size || 0);

        // Map the individual weight columns to a weights object
        const avgWeights: Record<string, number> = {
          Fatalities: benchmarks.avg_fatalities_weight || 10,
          Injuries: benchmarks.avg_injuries_weight || 10,
          Displacement: benchmarks.avg_displacement_weight || 10,
          Psychosocial_Impact: benchmarks.avg_psychosocial_weight || 10,
          Support_System_Impact: benchmarks.avg_support_system_weight || 10,
          Property_Damage: benchmarks.avg_property_damage_weight || 10,
          Infrastructure_Impact: benchmarks.avg_infrastructure_weight || 10,
          Environmental_Damage: benchmarks.avg_environmental_weight || 10,
          Economic_Impact: benchmarks.avg_economic_impact_weight || 10,
          Reputational_Impact: benchmarks.avg_reputational_weight || 10,
        };

        // Estimate min/max as ±30% of average (simplified)
        const minWeights: Record<string, number> = {};
        const maxWeights: Record<string, number> = {};
        for (const [key, avg] of Object.entries(avgWeights)) {
          minWeights[key] = avg * 0.7;
          maxWeights[key] = avg * 1.3;
        }

        const data: BenchmarkData[] = Object.entries(weights).map(([consequence, weight]) => ({
          consequence,
          orgWeight: weight,
          industryAvg: avgWeights[consequence] || 10,
          industryMin: minWeights[consequence] || 5,
          industryMax: maxWeights[consequence] || 20,
          percentile: calculatePercentile(weight, avgWeights[consequence] || 10),
        }));

        setBenchmarkData(data.sort((a, b) => b.orgWeight - a.orgWeight));
      }

      toast({
        title: "Benchmarks Loaded",
        description: `Comparing against ${benchmarks?.sample_size || 0} peer organizations`,
      });
    } catch (error) {
      console.error('Benchmark error:', error);
      toast({
        title: "Error",
        description: "Failed to load industry benchmarks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePercentile = (value: number, industryAvg: number): number => {
    // Simple percentile estimation based on distance from average
    const ratio = value / industryAvg;
    if (ratio <= 0.8) return 25;
    if (ratio <= 1.0) return 50;
    if (ratio <= 1.2) return 75;
    return 90;
  };

  const handleOptIn = async () => {
    try {
      await supabase.from('benchmark_participation').upsert({
        org_id: organizationId,
        opted_in: true,
        opted_in_at: new Date().toISOString(),
        data_sharing_consent_version: '1.0',
      });

      setIsOptedIn(true);
      toast({
        title: "Opted In",
        description: "Your anonymized data will be included in industry benchmarks",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to opt in to benchmarking",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Industry Benchmarking
          </CardTitle>
          <CardDescription>
            Compare your consequence weights against industry peers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isOptedIn ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Join Industry Benchmarking</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Opt in to share anonymized weight data and compare your organization
                against industry peers. Requires at least 5 participants.
              </p>
              <Button onClick={handleOptIn}>
                Opt In to Benchmarking
              </Button>
            </div>
          ) : benchmarkData.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You're opted in to industry benchmarking.
              </p>
              <Button onClick={loadBenchmarks} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Load Benchmarks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Comparing against {peerCount} peer organizations
                </span>
                <Button variant="ghost" size="sm" onClick={loadBenchmarks}>
                  Refresh
                </Button>
              </div>

              {/* Comparison Table */}
              <div className="space-y-4">
                {benchmarkData.map((item) => (
                  <div key={item.consequence} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {item.consequence.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          You: {item.orgWeight.toFixed(1)}%
                        </Badge>
                        <Badge variant="secondary">
                          Avg: {item.industryAvg.toFixed(1)}%
                        </Badge>
                        <Badge
                          variant={
                            item.percentile >= 75
                              ? 'default'
                              : item.percentile <= 25
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          P{item.percentile}
                        </Badge>
                      </div>
                    </div>

                    {/* Visual Range */}
                    <div className="relative h-2 bg-muted rounded-full">
                      {/* Industry range */}
                      <div
                        className="absolute h-full bg-muted-foreground/30 rounded-full"
                        style={{
                          left: `${(item.industryMin / 30) * 100}%`,
                          width: `${((item.industryMax - item.industryMin) / 30) * 100}%`,
                        }}
                      />
                      {/* Industry average */}
                      <div
                        className="absolute h-full w-1 bg-muted-foreground"
                        style={{ left: `${(item.industryAvg / 30) * 100}%` }}
                      />
                      {/* Your position */}
                      <div
                        className="absolute h-4 w-4 -top-1 rounded-full bg-primary border-2 border-background"
                        style={{ left: `calc(${(item.orgWeight / 30) * 100}% - 8px)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlier Warning */}
      {benchmarkData.some(d => d.percentile >= 90 || d.percentile <= 10) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400">
                  Significant Deviation Detected
                </h4>
                <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                  Some of your weights differ significantly from industry peers.
                  This may be intentional based on your organization's unique context,
                  but consider documenting the rationale.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
