import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSEQUENCE_NAMES, type ConsequenceName } from "../types";
import { calculateAHPWeights } from "@/hooks/useAHPMatrix";

interface Layer2AHPComparisonProps {
  onComplete: (matrix: number[][], weights: Record<string, number>, consistencyRatio: number) => void;
  initialMatrix?: number[][];
}

// Group pairs by the "anchor" (left-side) consequence
function generateGroupedPairs(items: readonly string[]): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < items.length - 1; i++) {
    const comparisons: number[] = [];
    for (let j = i + 1; j < items.length; j++) {
      comparisons.push(j);
    }
    groups.set(i, comparisons);
  }
  return groups;
}

const sliderToValue = (pos: number): number => {
  const scaleValues = [9, 7, 5, 3, 1, 1/3, 1/5, 1/7, 1/9];
  return scaleValues[pos] || 1;
};

const valueToSlider = (value: number): number => {
  const scaleValues = [9, 7, 5, 3, 1, 1/3, 1/5, 1/7, 1/9];
  let closest = 4;
  let minDiff = Math.abs(value - 1);
  scaleValues.forEach((sv, idx) => {
    const diff = Math.abs(value - sv);
    if (diff < minDiff) {
      minDiff = diff;
      closest = idx;
    }
  });
  return closest;
};

const getSliderLabel = (value: number): string => {
  if (value >= 9) return "Extremely More Important";
  if (value >= 7) return "Very Strongly More Important";
  if (value >= 5) return "Strongly More Important";
  if (value >= 3) return "Moderately More Important";
  if (value > 1) return "Slightly More Important";
  if (value === 1) return "Equally Important";
  if (value >= 1/3) return "Slightly Less Important";
  if (value >= 1/5) return "Moderately Less Important";
  if (value >= 1/7) return "Strongly Less Important";
  return "Extremely Less Important";
};

export function Layer2AHPComparison({ onComplete, initialMatrix }: Layer2AHPComparisonProps) {
  const groupedPairs = useMemo(() => generateGroupedPairs(CONSEQUENCE_NAMES), []);
  const anchorIndices = useMemo(() => Array.from(groupedPairs.keys()), [groupedPairs]);
  
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [matrix, setMatrix] = useState<number[][]>(() => {
    if (initialMatrix) return initialMatrix;
    return CONSEQUENCE_NAMES.map((_, i) =>
      CONSEQUENCE_NAMES.map((_, j) => (i === j ? 1 : 0))
    );
  });
  const [showResults, setShowResults] = useState(false);

  const currentAnchor = anchorIndices[currentGroupIndex];
  const currentComparisons = groupedPairs.get(currentAnchor) || [];
  
  // Calculate overall progress
  const totalPairs = 45; // C(10,2)
  const completedPairs = useMemo(() => {
    let count = 0;
    for (let i = 0; i < CONSEQUENCE_NAMES.length; i++) {
      for (let j = i + 1; j < CONSEQUENCE_NAMES.length; j++) {
        if (matrix[i][j] !== 0) count++;
      }
    }
    return count;
  }, [matrix]);
  const progress = (completedPairs / totalPairs) * 100;

  // Get/set values for the current group
  const getComparisonValue = (j: number): number => {
    const value = matrix[currentAnchor][j];
    return value === 0 ? 1 : value;
  };

  const setComparisonValue = (j: number, value: number) => {
    setMatrix((prev) => {
      const newMatrix = prev.map((row) => [...row]);
      newMatrix[currentAnchor][j] = value;
      newMatrix[j][currentAnchor] = 1 / value;
      return newMatrix;
    });
  };

  const handleNext = () => {
    if (currentGroupIndex < anchorIndices.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1);
    }
  };

  // Calculate weights and consistency
  const { weights, consistencyRatio, isConsistent } = useMemo(() => {
    const isComplete = matrix.every((row, i) =>
      row.every((val, j) => i === j || val !== 0)
    );
    
    if (!isComplete) {
      return { weights: [], consistencyRatio: 0, isConsistent: false };
    }
    
    return calculateAHPWeights(matrix);
  }, [matrix]);

  const handleComplete = () => {
    const weightMap: Record<string, number> = {};
    CONSEQUENCE_NAMES.forEach((name, idx) => {
      weightMap[name] = Math.round(weights[idx] * 100 * 100) / 100;
    });
    onComplete(matrix, weightMap, consistencyRatio);
  };

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">AHP Results</h1>
          <p className="text-muted-foreground">
            Review your pairwise comparison results
          </p>
        </div>

        <Card className={cn(
          "border-2",
          isConsistent ? "border-green-500/50" : "border-amber-500/50"
        )}>
          <CardContent className="p-6 flex items-center gap-4">
            {isConsistent ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            )}
            <div>
              <h3 className="font-semibold text-lg">
                {isConsistent ? "Consistent Judgments" : "Inconsistent Judgments"}
              </h3>
              <p className="text-muted-foreground">
                Consistency Ratio: {(consistencyRatio * 100).toFixed(1)}%
                {isConsistent 
                  ? " (below 10% threshold - acceptable)"
                  : " (above 10% threshold - review recommended)"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calculated Weights</CardTitle>
            <CardDescription>
              These weights are derived from your pairwise comparisons using the AHP methodology
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CONSEQUENCE_NAMES.map((name, idx) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-36 text-sm font-medium">{name}</span>
                  <div className="flex-1">
                    <Progress 
                      value={weights[idx] * 100} 
                      className="h-6"
                    />
                  </div>
                  <Badge variant="secondary" className="w-16 justify-center">
                    {(weights[idx] * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => {
            setShowResults(false);
            setCurrentGroupIndex(0);
          }}>
            Review Comparisons
          </Button>
          <Button onClick={handleComplete}>
            Accept Weights & Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">Pairwise Comparisons</h1>
        <p className="text-muted-foreground">
          Compare <span className="font-semibold text-primary">{CONSEQUENCE_NAMES[currentAnchor]}</span> against other consequence types
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Group {currentGroupIndex + 1} of {anchorIndices.length}</span>
          <span>{Math.round(progress)}% Complete ({completedPairs}/{totalPairs} pairs)</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Group navigation pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {anchorIndices.map((anchorIdx, idx) => {
          const groupComparisons = groupedPairs.get(anchorIdx) || [];
          const groupComplete = groupComparisons.every(j => matrix[anchorIdx][j] !== 0);
          return (
            <Button
              key={anchorIdx}
              variant={idx === currentGroupIndex ? "default" : groupComplete ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCurrentGroupIndex(idx)}
              className="text-xs"
            >
              {CONSEQUENCE_NAMES[anchorIdx].split('/')[0].substring(0, 8)}
              {groupComplete && idx !== currentGroupIndex && (
                <CheckCircle2 className="h-3 w-3 ml-1" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Comparison Card */}
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2">
            <Scale className="h-5 w-5" />
            How important is <span className="text-primary">{CONSEQUENCE_NAMES[currentAnchor]}</span>?
          </CardTitle>
          <CardDescription>
            Compare against each consequence below. Slide left if {CONSEQUENCE_NAMES[currentAnchor]} is more important, right if less important.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 py-4">
          {currentComparisons.map((j) => {
            const value = getComparisonValue(j);
            return (
              <div key={j} className="border rounded-lg p-4 space-y-3">
                {/* Consequence Labels */}
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <p className="font-semibold text-primary">
                      {CONSEQUENCE_NAMES[currentAnchor]}
                    </p>
                    <p className="text-xs text-muted-foreground">More Important</p>
                  </div>
                  <div className="text-lg text-muted-foreground px-4">vs</div>
                  <div className="text-center flex-1">
                    <p className="font-semibold text-primary">
                      {CONSEQUENCE_NAMES[j]}
                    </p>
                    <p className="text-xs text-muted-foreground">More Important</p>
                  </div>
                </div>

                {/* Slider */}
                <div className="px-2">
                  <Slider
                    value={[valueToSlider(value)]}
                    onValueChange={([pos]) => setComparisonValue(j, sliderToValue(pos))}
                    min={0}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>9x</span>
                    <span>Equal</span>
                    <span>9x</span>
                  </div>
                </div>

                {/* Current Selection */}
                <div className="text-center text-sm">
                  <Badge variant="outline">
                    {value > 1 
                      ? `${CONSEQUENCE_NAMES[currentAnchor]} ${getSliderLabel(value)}`
                      : value < 1
                      ? `${CONSEQUENCE_NAMES[j]} ${getSliderLabel(value)}`
                      : "Equally Important"}
                    {" • "}
                    {value >= 1 ? value.toFixed(0) : `1/${(1/value).toFixed(0)}`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentGroupIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentGroupIndex === anchorIndices.length - 1 ? "View Results" : "Next Group"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
