import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WeightingWizardLayout } from "@/features/weighting/components/WeightingWizardLayout";
import { Layer1Questionnaire } from "@/features/weighting/components/Layer1Questionnaire";
import { Layer2AHPComparison } from "@/features/weighting/components/Layer2AHPComparison";
import { useWeightingSession, useUpdateWeightingSession } from "@/hooks/useWeightingSessions";
import { useSaveAHPMatrix } from "@/hooks/useAHPMatrix";
import { supabase } from "@/integrations/supabase/client";
import type { QuestionnaireResponse } from "@/features/weighting/types";
import { CONSEQUENCE_NAMES } from "@/features/weighting/types";

export default function WeightingWizardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useWeightingSession(sessionId);
  const updateSession = useUpdateWeightingSession();
  const saveAHPMatrix = useSaveAHPMatrix();

  const [currentLayer, setCurrentLayer] = useState(1);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireResponse | null>(null);
  const [ahpWeights, setAhpWeights] = useState<Record<string, number> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync current layer from session
  useEffect(() => {
    if (session) {
      // Determine current layer based on completion status
      if (session.layer5_completed) setCurrentLayer(6);
      else if (session.layer4_completed) setCurrentLayer(5);
      else if (session.layer3_completed) setCurrentLayer(4);
      else if (session.layer2_completed) setCurrentLayer(3);
      else if (session.layer1_completed) setCurrentLayer(2);
      else setCurrentLayer(1);
    }
  }, [session]);

  const layerCompleted = [
    session?.layer1_completed ?? false,
    session?.layer2_completed ?? false,
    session?.layer3_completed ?? false,
    session?.layer4_completed ?? false,
    session?.layer5_completed ?? false,
    session?.status === "approved",
  ];

  const handleQuestionnaireChange = useCallback((data: QuestionnaireResponse) => {
    setQuestionnaireData(data);
  }, []);

  const handleAHPComplete = async (
    matrix: number[][],
    weights: Record<string, number>,
    consistencyRatio: number
  ) => {
    if (!sessionId) return;

    try {
      await saveAHPMatrix.mutateAsync({
        sessionId,
        matrixData: matrix,
        consequences: [...CONSEQUENCE_NAMES],
      });
      setAhpWeights(weights);
    } catch (error) {
      console.error("Failed to save AHP matrix:", error);
    }
  };

  const handleNext = async () => {
    if (!sessionId) return;
    setIsProcessing(true);

    try {
      switch (currentLayer) {
        case 1:
          // Save questionnaire responses
          if (questionnaireData) {
            // Save to weighting_questionnaire_responses table
            const { error } = await supabase
              .from("weighting_questionnaire_responses")
              .upsert({
                session_id: sessionId,
                mission_statement: questionnaireData.mission_statement || "",
                primary_stakeholders: { priority: questionnaireData.stakeholder_priority },
                primary_mandate: [questionnaireData.org_size],
                regulatory_environment: [questionnaireData.regulatory_environment],
                risk_tolerance: questionnaireData.geographic_risk,
                budget_allocation_priority: questionnaireData.public_facing ? "public_safety" : "operations",
                hardest_to_recover_consequence: "Reputational",
                past_major_incident: questionnaireData.previous_incidents?.[0] || null,
                past_incident_consequence_type: null,
              }, { onConflict: "session_id" });

            if (error) throw error;

            await updateSession.mutateAsync({
              sessionId,
              updates: { layer1_completed: true },
            });
          }
          setCurrentLayer(2);
          break;

        case 2:
          // AHP already saved in handleAHPComplete
          await updateSession.mutateAsync({
            sessionId,
            updates: { layer2_completed: true },
          });
          setCurrentLayer(3);
          break;

        case 3:
          // Scenario validation - mark complete for now
          await updateSession.mutateAsync({
            sessionId,
            updates: { layer3_completed: true },
          });
          setCurrentLayer(4);
          break;

        case 4:
          // Regulatory research - mark complete for now
          await updateSession.mutateAsync({
            sessionId,
            updates: { layer4_completed: true },
          });
          setCurrentLayer(5);
          break;

        case 5:
          // AI Synthesis - mark complete for now
          await updateSession.mutateAsync({
            sessionId,
            updates: { layer5_completed: true },
          });
          setCurrentLayer(6);
          break;

        case 6:
          // Final approval
          await updateSession.mutateAsync({
            sessionId,
            updates: { 
              status: "approved",
              approved_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            },
          });
          toast.success("Weights approved and activated!");
          navigate("/settings/weights");
          break;
      }
    } catch (error) {
      console.error("Failed to proceed:", error);
      toast.error("Failed to save progress");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentLayer > 1) {
      setCurrentLayer(currentLayer - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Session Not Found</h1>
          <p className="text-muted-foreground">This weighting session doesn't exist.</p>
        </div>
      </div>
    );
  }

  const renderLayerContent = () => {
    switch (currentLayer) {
      case 1:
        return (
          <Layer1Questionnaire
            initialData={questionnaireData || undefined}
            onChange={handleQuestionnaireChange}
          />
        );
      case 2:
        return (
          <Layer2AHPComparison
            onComplete={handleAHPComplete}
          />
        );
      case 3:
        return (
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Scenario Validation</h1>
            <p className="text-muted-foreground mb-8">
              Test your weights against realistic scenarios to validate they produce sensible risk scores.
            </p>
            <p className="text-sm text-muted-foreground">
              (Layer 3 - Coming soon. Click Next to continue.)
            </p>
          </div>
        );
      case 4:
        return (
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Regulatory Research</h1>
            <p className="text-muted-foreground mb-8">
              AI analyzes regulatory requirements for your industry and jurisdiction.
            </p>
            <p className="text-sm text-muted-foreground">
              (Layer 4 - Coming soon. Click Next to continue.)
            </p>
          </div>
        );
      case 5:
        return (
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">AI Synthesis</h1>
            <p className="text-muted-foreground mb-8">
              AI synthesizes all inputs to generate final weight recommendations with justifications.
            </p>
            <p className="text-sm text-muted-foreground">
              (Layer 5 - Coming soon. Click Next to continue.)
            </p>
          </div>
        );
      case 6:
        return (
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Approval & Activation</h1>
            <p className="text-muted-foreground mb-8">
              Review final weights and approve for activation.
            </p>
            <p className="text-sm text-muted-foreground">
              (Layer 6 - Coming soon. Click Complete to finish.)
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    switch (currentLayer) {
      case 1:
        return !questionnaireData?.stakeholder_priority;
      case 2:
        return !ahpWeights;
      default:
        return false;
    }
  };

  return (
    <WeightingWizardLayout
      currentLayer={currentLayer}
      sessionTitle={`Weighting Session v${session.version}`}
      layerCompleted={layerCompleted}
      onNext={handleNext}
      onBack={handleBack}
      isNextDisabled={isNextDisabled()}
      isProcessing={isProcessing || updateSession.isPending}
    >
      {renderLayerContent()}
    </WeightingWizardLayout>
  );
}
