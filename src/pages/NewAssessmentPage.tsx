import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useHazards, useConsequences } from "@/hooks/useHazards";
import { useCreateAssessment, useUpdateAssessment } from "@/hooks/useAssessments";
import { useConsequenceWeightsMap } from "@/hooks/useConsequenceWeights";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Shield, ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { WizardProgress } from "@/features/assessment/components/WizardProgress";
import { HazardSelectionStep } from "@/features/assessment/components/HazardSelectionStep";
import { ProbabilityStep } from "@/features/assessment/components/ProbabilityStep";
import { ImpactsStep } from "@/features/assessment/components/ImpactsStep";
import { ResultsStep } from "@/features/assessment/components/ResultsStep";
import { calculateWeightedImpact, calculateRiskScore } from "@/features/assessment/types";

const titleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
});

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const { data: hazards = [], isLoading: hazardsLoading } = useHazards();
  const { data: consequences = [], isLoading: consequencesLoading } = useConsequences();
  const { data: weights = {}, isLoading: weightsLoading } = useConsequenceWeightsMap();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Form state
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [impacts, setImpacts] = useState<Record<string, Record<string, number>>>({});

  const form = useForm<z.infer<typeof titleSchema>>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: "" },
  });

  // Redirect to weights setup if not configured
  useEffect(() => {
    if (!orgLoading && organization && !organization.weights_configured) {
      toast.info("Please configure consequence weights first");
      navigate("/settings/weights");
    }
  }, [organization, orgLoading, navigate]);

  const handleProbabilityChange = (hazardId: string, value: number) => {
    setProbabilities((prev) => ({ ...prev, [hazardId]: value }));
  };

  const handleImpactChange = (hazardId: string, consequenceId: string, value: number) => {
    setImpacts((prev) => ({
      ...prev,
      [hazardId]: { ...(prev[hazardId] || {}), [consequenceId]: value },
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedHazards.length > 0;
      case 2:
        return selectedHazards.every((id) => probabilities[id] && probabilities[id] >= 1);
      case 3:
        return true; // Impacts are optional (default to 0)
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceed()) {
      toast.error("Please complete all required fields before continuing");
      return;
    }

    // Save draft on first step completion
    if (currentStep === 1 && !assessmentId) {
      const title = form.getValues("title") || `Assessment ${new Date().toLocaleDateString()}`;
      try {
        const result = await createAssessment.mutateAsync(title);
        setAssessmentId(result.id);
        toast.success("Draft saved");
      } catch (error) {
        toast.error("Failed to create assessment");
        return;
      }
    }

    // Save progress
    if (assessmentId) {
      try {
        await updateAssessment.mutateAsync({
          id: assessmentId,
          selected_hazards: selectedHazards,
          probabilities,
          weights,
          impacts,
        });
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    }

    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!assessmentId) {
      toast.error("No assessment to save");
      return;
    }

    // Calculate total risk
    const totalRisk = selectedHazards.reduce((sum, hazardId) => {
      const probability = probabilities[hazardId] || 1;
      const weightedImpact = calculateWeightedImpact(hazardId, impacts, weights);
      return sum + calculateRiskScore(probability, weightedImpact);
    }, 0);

    try {
      await updateAssessment.mutateAsync({
        id: assessmentId,
        selected_hazards: selectedHazards,
        probabilities,
        weights,
        impacts,
        total_risk: totalRisk,
        status: "completed",
        results: {
          completedAt: new Date().toISOString(),
          hazardCount: selectedHazards.length,
          avgRisk: selectedHazards.length > 0 ? totalRisk / selectedHazards.length : 0,
        },
      });
      toast.success("Assessment saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to save assessment");
    }
  };

  if (hazardsLoading || consequencesLoading || weightsLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if weights not configured (will redirect)
  if (!organization?.weights_configured) {
    return null;
  }

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

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Title Input */}
        {currentStep === 1 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Assessment Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Enter assessment title..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <WizardProgress currentStep={currentStep} completedSteps={completedSteps} />

        {/* Step Content */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <HazardSelectionStep
                hazards={hazards}
                selectedHazards={selectedHazards}
                onSelectionChange={setSelectedHazards}
                assessmentId={assessmentId || undefined}
              />
            )}
            {currentStep === 2 && (
              <ProbabilityStep
                hazards={hazards}
                selectedHazards={selectedHazards}
                probabilities={probabilities}
                onProbabilityChange={handleProbabilityChange}
                assessmentId={assessmentId || undefined}
              />
            )}
            {currentStep === 3 && (
              <ImpactsStep
                hazards={hazards}
                consequences={consequences}
                selectedHazards={selectedHazards}
                weights={weights}
                impacts={impacts}
                onImpactChange={handleImpactChange}
                assessmentId={assessmentId || undefined}
              />
            )}
            {currentStep === 4 && (
              <ResultsStep
                hazards={hazards}
                consequences={consequences}
                selectedHazards={selectedHazards}
                probabilities={probabilities}
                weights={weights}
                impacts={impacts}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || createAssessment.isPending}
              >
                {createAssessment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="accent"
                onClick={handleSave}
                disabled={updateAssessment.isPending}
              >
                {updateAssessment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Assessment
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
