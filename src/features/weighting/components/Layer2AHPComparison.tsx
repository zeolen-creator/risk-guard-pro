import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSEQUENCE_NAMES, type ConsequenceName } from "../types";
import { calculateAHPWeights, AHP_SCALE } from "@/hooks/useAHPMatrix";

interface Layer2AHPComparisonProps {
  onComplete: (matrix: number[][], weights: Record<string, number>, consistencyRatio: number) => void;
  initialMatrix?: number[][];
}

// Generate all unique pairs for pairwise comparison
function generatePairs(items: readonly string[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

export function Layer2AHPComparison({ onComplete, initialMatrix }: Layer2AHPComparisonProps) {
  const pairs = useMemo(() => generatePairs(CONSEQUENCE_NAMES), []);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [matrix, setMatrix] = useState<number[][]>(() => {
    if (initialMatrix) return initialMatrix;
    // Initialize identity matrix (diagonal = 1)
    return CONSEQUENCE_NAMES.map((_, i) =>
      CONSEQUENCE_NAMES.map((_, j) => (i === j ? 1 : 0))
    );
  });
  const [showResults, setShowResults] = useState(false);

  const currentPair = pairs[currentPairIndex];
  const progress = ((currentPairIndex + 1) / pairs.length) * 100;

  // Calculate current comparison value for slider
  const getCurrentValue = (): number => {
    if (!currentPair) return 1;
    const [i, j] = currentPair;
    const value = matrix[i][j];
    if (value === 0) return 1;
    return value;
  };

  const [sliderValue, setSliderValue] = useState(getCurrentValue());

  useEffect(() => {
    setSliderValue(getCurrentValue());
  }, [currentPairIndex, matrix]);

  // Update matrix when slider changes
  const handleSliderChange = (value: number) => {
    setSliderValue(value);
  };

  // Commit the comparison when moving to next
  const commitComparison = () => {
    if (!currentPair) return;
    const [i, j] = currentPair;
    
    setMatrix((prev) => {
      const newMatrix = prev.map((row) => [...row]);
      newMatrix[i][j] = sliderValue;
      newMatrix[j][i] = 1 / sliderValue; // Reciprocal
      return newMatrix;
    });
  };

  const handleNext = () => {
    commitComparison();
    if (currentPairIndex < pairs.length - 1) {
      setCurrentPairIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentPairIndex > 0) {
      setCurrentPairIndex((prev) => prev - 1);
    }
  };

  // Calculate weights and consistency
  const { weights, consistencyRatio, isConsistent } = useMemo(() => {
    // Check if matrix is complete (no zeros except diagonal)
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

  // Slider configuration
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

  const sliderToValue = (pos: number): number => {
    // Position 0-8 maps to AHP scale values
    // Left (pos=0) = 9 means LEFT item is 9x more important
    // Right (pos=8) = 1/9 means LEFT item is 9x less important (RIGHT is more important)
    const scaleValues = [9, 7, 5, 3, 1, 1/3, 1/5, 1/7, 1/9];
    return scaleValues[pos] || 1;
  };

  const valueToSlider = (value: number): number => {
    const scaleValues = [9, 7, 5, 3, 1, 1/3, 1/5, 1/7, 1/9];
    // Find closest position
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

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">AHP Results</h1>
          <p className="text-muted-foreground">
            Review your pairwise comparison results
          </p>
        </div>

        {/* Consistency Status */}
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

        {/* Weight Results */}
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
            setCurrentPairIndex(0);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Pairwise Comparisons</h1>
        <p className="text-muted-foreground">
          Compare the relative importance of consequence types
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Comparison {currentPairIndex + 1} of {pairs.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Comparison Card */}
      {currentPair && (
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              <Scale className="h-5 w-5" />
              Compare Importance
            </CardTitle>
            <CardDescription>
              When assessing risks, how important is one consequence compared to the other?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-6">
            {/* Consequence Labels */}
            <div className="flex justify-between items-center">
              <div className="text-center w-36">
                <p className="font-bold text-lg text-primary">
                  {CONSEQUENCE_NAMES[currentPair[0]]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Left = More Important
                </p>
              </div>
              <div className="text-2xl text-muted-foreground">vs</div>
              <div className="text-center w-36">
                <p className="font-bold text-lg text-primary">
                  {CONSEQUENCE_NAMES[currentPair[1]]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Right = More Important
                </p>
              </div>
            </div>

            {/* Slider */}
            <div className="px-4">
              <Slider
                value={[valueToSlider(sliderValue)]}
                onValueChange={([pos]) => handleSliderChange(sliderToValue(pos))}
                min={0}
                max={8}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>9x More</span>
                <span>Equal</span>
                <span>9x More</span>
              </div>
            </div>

            {/* Current Selection */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Selection:</p>
              <p className="font-semibold text-lg">
                {sliderValue > 1 
                  ? `${CONSEQUENCE_NAMES[currentPair[0]]} is ${getSliderLabel(sliderValue)}`
                  : sliderValue < 1
                  ? `${CONSEQUENCE_NAMES[currentPair[1]]} is ${getSliderLabel(sliderValue)}`
                  : "Both are Equally Important"}
              </p>
              <Badge variant="outline" className="mt-2">
                Value: {sliderValue >= 1 ? sliderValue.toFixed(0) : `1/${(1/sliderValue).toFixed(0)}`}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentPairIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentPairIndex === pairs.length - 1 ? "View Results" : "Next"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
