import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useRiskPredictions, useMarkPredictionReviewed } from "@/hooks/useRiskPredictions";
import { format, addMonths } from "date-fns";

export function RiskPredictionPanel() {
  const [timeHorizon, setTimeHorizon] = useState("1_year");
  const { data: predictions = [], isLoading } = useRiskPredictions(timeHorizon);
  const markReviewed = useMarkPredictionReviewed();

  const getTrendIcon = (current: number, predicted: number) => {
    const diff = predicted - current;
    if (diff > 5) return <TrendingUp className="h-5 w-5 text-red-600" />;
    if (diff < -5) return <TrendingDown className="h-5 w-5 text-green-600" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const getTrendBorderColor = (current: number, predicted: number) => {
    const diff = predicted - current;
    if (diff > 5) return "border-l-4 border-red-500";
    if (diff < -5) return "border-l-4 border-green-500";
    return "border-l-4 border-gray-300";
  };

  const formatTimeHorizon = (horizon: string) => {
    const map: Record<string, string> = {
      "3_months": "3 Months",
      "6_months": "6 Months",
      "1_year": "1 Year",
      "5_years": "5 Years",
    };
    return map[horizon] || horizon;
  };

  const generateForecastData = () => {
    if (!predictions || predictions.length === 0) return [];

    const months =
      timeHorizon === "5_years" ? 60 : timeHorizon === "1_year" ? 12 : timeHorizon === "6_months" ? 6 : 3;
    const data = [];
    const firstPred = predictions[0];

    for (let i = 0; i <= months; i++) {
      const date = addMonths(new Date(), i);
      const progress = i / months;

      data.push({
        date: format(date, "MMM yy"),
        current: firstPred.current_risk_score,
        predicted:
          firstPred.current_risk_score +
          (firstPred.predicted_risk_score - firstPred.current_risk_score) * progress,
        confidence_upper:
          firstPred.predicted_risk_score + ((firstPred.prediction_confidence || 80) / 10),
        confidence_lower: Math.max(
          0,
          firstPred.predicted_risk_score - ((firstPred.prediction_confidence || 80) / 10)
        ),
      });
    }

    return data;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Forecasting</CardTitle>
          <CardDescription>Loading predictions...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Forecasting</CardTitle>
        <CardDescription>AI-powered predictions based on historical data and trends</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={timeHorizon} onValueChange={setTimeHorizon}>
          <TabsList className="mb-4">
            <TabsTrigger value="3_months">3 Months</TabsTrigger>
            <TabsTrigger value="6_months">6 Months</TabsTrigger>
            <TabsTrigger value="1_year">1 Year</TabsTrigger>
            <TabsTrigger value="5_years">5 Years</TabsTrigger>
          </TabsList>

          <TabsContent value={timeHorizon}>
            {predictions && predictions.length > 0 ? (
              <>
                <div className="h-[300px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateForecastData()}>
                      <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="confidence_upper"
                        stackId="1"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="current"
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {predictions.slice(0, 6).map((pred) => (
                    <Card
                      key={pred.id}
                      className={getTrendBorderColor(pred.current_risk_score, pred.predicted_risk_score)}
                    >
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {pred.hazards?.category || "Unknown"}
                          </Badge>
                          {getTrendIcon(pred.current_risk_score, pred.predicted_risk_score)}
                        </div>

                        <div className="flex items-baseline gap-4">
                          <div>
                            <p className="text-2xl font-bold">{pred.current_risk_score}</p>
                            <p className="text-xs text-muted-foreground">Current</p>
                          </div>
                          <div className="text-muted-foreground">→</div>
                          <div>
                            <p className="text-2xl font-bold">{pred.predicted_risk_score}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeHorizon(pred.time_horizon)}
                            </p>
                          </div>
                        </div>

                        {pred.ai_reasoning && (
                          <p className="text-sm text-muted-foreground">
                            {pred.ai_reasoning} Based on {pred.prediction_basis.replace("_", " ")}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {pred.prediction_confidence}% confidence
                          </span>
                          {!pred.reviewed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReviewed.mutate(pred.id)}
                              disabled={markReviewed.isPending}
                            >
                              {markReviewed.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              <span className="ml-1">Mark Reviewed</span>
                            </Button>
                          )}
                        </div>

                        {pred.source_urls && pred.source_urls.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                            <div className="flex flex-wrap gap-1">
                              {pred.source_urls.slice(0, 2).map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  Source {idx + 1}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No predictions available for this time horizon.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Predictions are generated based on your completed assessments.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
