import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useWeightingSynthesis } from "@/hooks/useWeightingSynthesis";
import { Loader2, CheckCircle2, Clock, UserCheck, AlertTriangle } from "lucide-react";

interface Layer6ApprovalWorkflowProps {
  sessionId: string;
  onComplete?: () => void;
  onBack?: () => void;
}

export function Layer6ApprovalWorkflow({ sessionId, onComplete, onBack }: Layer6ApprovalWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const synthesis = useWeightingSynthesis(sessionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const handleApprove = async () => {
    if (!isAdmin || !synthesis.data?.accepted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: version, error } = await supabase.rpc("approve_weighting_session", {
        p_session_id: sessionId,
        p_expected_weights: synthesis.data.weights,
        p_notes: approvalNotes,
      });
      if (error) throw error;
      await Promise.all(["consequence-weights", "organization", "weighting-sessions", "weighting-session", "weighting-synthesis"]
        .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast({ title: "Weights Approved", description: `Version ${version} saved. New assessments use the currently active weights.` });
      onComplete?.();
    } catch (error) {
      toast({ title: "Approval failed", description: error instanceof Error ? error.message : "Reload and review the latest recommendations, then try again.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (synthesis.isLoading || roleLoading) return <p>Loading saved recommendations...</p>;
  if (synthesis.error || !synthesis.data) return <div className="space-y-3">
    <p role="alert">{synthesis.error?.message || "Generate and accept a synthesis before approval."}</p>
    <Button variant="outline" onClick={() => synthesis.refetch()}>Retry</Button>
    <Button onClick={onBack}>Back to Synthesis</Button>
  </div>;
  const weights = synthesis.data.weights;
  const sessionStatus = synthesis.data.approved ? "approved" : "pending_approval";
  const sortedWeights = Object.entries(weights).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Layer 6: Approval Workflow
          </CardTitle>
          <CardDescription>
            Review and approve the AI-synthesized consequence weights for activation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {sessionStatus === 'approved' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">{synthesis.data.isActive ? "Weights Approved & Active" : "Approved — Superseded"}</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-amber-600 font-medium">Pending Approval</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weights to Approve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sortedWeights.map(([name, weight]) => (
              <div key={name} className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold">{weight.toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground">
                  {name.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold">
                {Object.values(weights).reduce((sum, w) => sum + w, 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Notes */}
      {sessionStatus !== 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Notes (Optional)</CardTitle>
            <CardDescription>
              Add any notes for the audit trail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Reviewed by Risk Committee on [date]. Approved for FY2026 assessments."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-700 dark:text-amber-400">
                Activating New Weights
              </h4>
              <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                Once approved, these weights will be used for all new risk assessments.
                Existing completed assessments will retain their original weights.
                Previous weight versions will be archived for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isAdmin && !synthesis.data.approved && <p>Only an organization administrator can approve weights.</p>}
      {!synthesis.data.accepted && <p>Accept the saved synthesis before approval.</p>}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Synthesis
        </Button>
        {sessionStatus !== 'approved' ? (
          <Button onClick={handleApprove} disabled={isSubmitting || !isAdmin || !synthesis.data.accepted}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve & Activate Weights
              </>
            )}
          </Button>
        ) : (
          <Button onClick={onComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
