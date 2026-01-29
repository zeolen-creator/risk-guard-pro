import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Thermometer, TrendingUp, Info, RefreshCw, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClimateRiskAdjustment, useFetchClimateAnalysis, isClimateRelated, getProjectionChange, getProjectedRiskScore } from "@/hooks/useClimateRisk";

interface ClimateRiskWidgetProps {
  hazardCategory: string;
  location: string;
  currentScore?: number;
}

export function ClimateRiskWidget({ hazardCategory, location, currentScore }: ClimateRiskWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { data: climateData, isLoading } = useClimateRiskAdjustment(hazardCategory, location);
  const fetchAnalysis = useFetchClimateAnalysis();

  const isClimate = isClimateRelated(hazardCategory);

  if (!isClimate) {
    return null;
  }

  const handleFetchAnalysis = () => {
    fetchAnalysis.mutate({ hazardCategory, location });
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "high": return "bg-green-500/20 text-green-400";
      case "medium": return "bg-yellow-500/20 text-yellow-400";
      case "low": return "bg-orange-500/20 text-orange-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border-cyan-500/20">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  if (!climateData) {
    return (
      <Card className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border-cyan-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-cyan-400" />
            Climate Risk Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Get AI-powered climate change projections for this hazard in your region.
          </p>
          <Button 
            size="sm" 
            onClick={handleFetchAnalysis}
            disabled={fetchAnalysis.isPending}
            className="w-full"
          >
            {fetchAnalysis.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Thermometer className="h-4 w-4 mr-2" />
                Analyze Climate Impact
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border-cyan-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-cyan-400" />
            Climate Risk Projection
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(climateData.confidence_level)}>
              {climateData.confidence_level} confidence
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={handleFetchAnalysis}
              disabled={fetchAnalysis.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${fetchAnalysis.isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {hazardCategory} projections for {location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { year: 2030, value: climateData.projection_2030 },
            { year: 2040, value: climateData.projection_2040 },
            { year: 2050, value: climateData.projection_2050 },
          ].map(({ year, value }) => (
            <div key={year} className="text-center p-2 rounded-lg bg-background/30">
              <div className="text-xs text-muted-foreground">{year}</div>
              <div className={`font-bold ${value > 1 ? "text-orange-400" : value < 1 ? "text-green-400" : "text-muted-foreground"}`}>
                {getProjectionChange(value)}
              </div>
              {currentScore && (
                <div className="text-xs text-muted-foreground mt-1">
                  Score: {getProjectedRiskScore(currentScore, value)}
                </div>
              )}
            </div>
          ))}
        </div>

        {climateData.summary_text && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
            {climateData.summary_text}
          </p>
        )}

        {climateData.data_sources && climateData.data_sources.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              {showDetails ? "Hide" : "View"} sources ({climateData.data_sources.length})
            </button>
            {showDetails && (
              <div className="space-y-1 pl-4">
                {climateData.data_sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {source.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
