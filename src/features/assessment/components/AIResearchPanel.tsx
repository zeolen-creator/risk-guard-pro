import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, ExternalLink, X } from "lucide-react";
import { AIResearchData, ConsequenceInfo, useAIResearch } from "@/hooks/useAIResearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AIResearchPanelProps {
  hazardId: string;
  hazardName: string;
  hazardCategory: string;
  researchType: "probability" | "consequence";
  assessmentId?: string;
  consequences?: ConsequenceInfo[];
  onApplyValue?: (value: number) => void;
  onApplyConsequenceValues?: (values: Record<string, number>) => void;
  currentValue?: number;
  currentConsequenceValues?: Record<string, number>;
}

export function AIResearchPanel({
  hazardId,
  hazardName,
  hazardCategory,
  researchType,
  assessmentId,
  consequences,
  onApplyValue,
  onApplyConsequenceValues,
  currentValue,
  currentConsequenceValues,
}: AIResearchPanelProps) {
  const { research, isLoading, getCachedResult, hasOrganizationContext } = useAIResearch();
  const [showPanel, setShowPanel] = useState(false);
  const [result, setResult] = useState<AIResearchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    setShowPanel(true);
    setError(null);
    
    // Check cache first
    const cached = getCachedResult(hazardId, researchType);
    if (cached?.success && cached.data) {
      setResult(cached.data);
      return;
    }

    const response = await research({
      hazardName,
      hazardCategory,
      researchType,
      consequences,
      assessmentId,
      hazardId,
    });

    if (response?.success && response.data) {
      setResult(response.data);
    } else {
      setError(response?.error || "Research failed");
    }
  };

  const handleApplyAllConsequenceValues = () => {
    if (!result?.consequence_impacts || !onApplyConsequenceValues) return;
    
    const values: Record<string, number> = {};
    result.consequence_impacts.forEach((impact) => {
      if (impact.suggested_value !== null) {
        values[impact.consequence_id] = impact.suggested_value;
      }
    });
    onApplyConsequenceValues(values);
  };

  const hasAppliedAllConsequenceValues = () => {
    if (!result?.consequence_impacts || !currentConsequenceValues) return false;
    return result.consequence_impacts.every(
      (impact) =>
        impact.suggested_value === null ||
        currentConsequenceValues[impact.consequence_id] === impact.suggested_value
    );
  };

  const getConfidenceColor = (level: number) => {
    if (level >= 0.7) return "bg-success/20 text-success border-success/50";
    if (level >= 0.4) return "bg-warning/20 text-warning border-warning/50";
    return "bg-destructive/20 text-destructive border-destructive/50";
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "strong":
        return <Badge variant="outline" className="bg-success/20 text-success">Strong Data</Badge>;
      case "moderate":
        return <Badge variant="outline" className="bg-warning/20 text-warning">Moderate Data</Badge>;
      case "limited":
        return <Badge variant="outline" className="bg-warning/20 text-warning">Limited Data</Badge>;
      case "none":
        return <Badge variant="outline" className="bg-destructive/20 text-destructive">No Data</Badge>;
      default:
        return null;
    }
  };

  if (!hasOrganizationContext) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Research
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Organization context required for AI research</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="w-full">
      {!showPanel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResearch}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1 text-primary" />
              AI Research
            </>
          )}
        </Button>
      ) : (
        <Card className="mt-2 border-primary/20 bg-primary/5">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Research Results
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching for {researchType} data...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResearch}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-3">
                {/* Data Quality & Confidence */}
                <div className="flex flex-wrap gap-2">
                  {getQualityBadge(result.data_quality)}
                  <Badge
                    variant="outline"
                    className={getConfidenceColor(result.confidence_level)}
                  >
                    {Math.round(result.confidence_level * 100)}% Confidence
                  </Badge>
                  {result.location_specific && (
                    <Badge variant="secondary" className="text-xs">
                      Location-specific
                    </Badge>
                  )}
                  {result.industry_specific && (
                    <Badge variant="secondary" className="text-xs">
                      Industry-specific
                    </Badge>
                  )}
                </div>

                {/* Conflicting Data Warning */}
                {result.conflicting_data && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-destructive">
                          Conflicting Data Detected
                        </p>
                        {result.conflict_explanation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.conflict_explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Data Warning */}
                {result.data_quality === "none" && (
                  <div className="bg-muted rounded-md p-3 text-center">
                    <Info className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-medium">No Reliable Data Found</p>
                    <p className="text-xs text-muted-foreground">
                      Please use your professional judgment for this assessment
                    </p>
                  </div>
                )}

                {/* Suggested Value - For Probability Research */}
                {researchType === "probability" && result.suggested_value !== undefined && result.data_quality !== "none" && (
                  <div className="bg-primary/10 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Suggested Probability
                        </p>
                        <p className="text-lg font-bold">{result.suggested_value}</p>
                      </div>
                      {onApplyValue && (
                        <Button
                          size="sm"
                          onClick={() => onApplyValue(result.suggested_value!)}
                          disabled={currentValue === result.suggested_value}
                        >
                          {currentValue === result.suggested_value ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Applied
                            </>
                          ) : (
                            "Apply Value"
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ Review carefully before applying
                    </p>
                  </div>
                )}

                {/* Consequence Impacts - For Impact Research */}
                {researchType === "consequence" && result.consequence_impacts && result.consequence_impacts.length > 0 && result.data_quality !== "none" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Suggested Impact Scores
                      </p>
                      {onApplyConsequenceValues && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleApplyAllConsequenceValues}
                          disabled={hasAppliedAllConsequenceValues()}
                        >
                          {hasAppliedAllConsequenceValues() ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              All Applied
                            </>
                          ) : (
                            "Apply All Values"
                          )}
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-2">
                        {result.consequence_impacts.map((impact) => (
                          <div
                            key={impact.consequence_id}
                            className="bg-primary/10 rounded-md p-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {impact.consequence_name}
                                </p>
                                {impact.suggested_value !== null ? (
                                  <p className="text-lg font-bold">{impact.suggested_value}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">No data</p>
                                )}
                              </div>
                              {currentConsequenceValues && impact.suggested_value !== null && (
                                <Badge
                                  variant={
                                    currentConsequenceValues[impact.consequence_id] === impact.suggested_value
                                      ? "default"
                                      : "outline"
                                  }
                                  className="shrink-0 text-xs"
                                >
                                  {currentConsequenceValues[impact.consequence_id] === impact.suggested_value
                                    ? "Applied"
                                    : "Pending"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {impact.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Review each score carefully before applying
                    </p>
                  </div>
                )}

                {/* Explanation */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-xs">View Explanation</span>
                      <Info className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-32 mt-2">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {result.explanation}
                      </p>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>

                {/* Sources */}
                {result.sources.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="text-xs">
                          Sources ({result.sources.length})
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="h-40 mt-2">
                        <div className="space-y-2">
                          {result.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-muted/50 rounded-md text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium">{source.title}</p>
                                <Badge
                                  variant="outline"
                                  className={`text-xs shrink-0 ${
                                    source.relevance === "high"
                                      ? "bg-success/20 text-success"
                                      : source.relevance === "medium"
                                      ? "bg-warning/20 text-warning"
                                      : "bg-muted"
                                  }`}
                                >
                                  {source.relevance}
                                </Badge>
                              </div>
                              {source.url && source.url !== "N/A" && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate block"
                                >
                                  {source.url}
                                </a>
                              )}
                              <p className="text-muted-foreground">
                                Date: {source.date}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Button variant="outline" size="sm" onClick={handleResearch}>
                  Start Research
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
