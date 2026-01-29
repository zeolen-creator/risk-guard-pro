import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock, UserCheck, History, AlertTriangle } from "lucide-react";

interface Layer6ApprovalWorkflowProps {
  sessionId: string;
  organizationId: string;
  userId: string;
  weights: Record<string, number>;
  onComplete: () => void;
  onBack: () => void;
}

export function Layer6ApprovalWorkflow({
  sessionId,
  organizationId,
  userId,
  weights,
  onComplete,
  onBack,
}: Layer6ApprovalWorkflowProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('pending_approval');

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from('weighting_sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (data) {
        setSessionStatus(data.status);
      }
    }
    loadSession();
  }, [sessionId]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // Get the next version number
      const { data: existingVersions } = await supabase
        .from('weighting_final_weights')
        .select('version')
        .eq('org_id', organizationId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version || 0) + 1;

      // Insert final weights
      const { error: insertError } = await supabase
        .from('weighting_final_weights')
        .insert({
          org_id: organizationId,
          session_id: sessionId,
          version: nextVersion,
          fatalities_weight: weights.Fatalities || 10,
          injuries_weight: weights.Injuries || 10,
          displacement_weight: weights.Displacement || 10,
          psychosocial_weight: weights.Psychosocial_Impact || 10,
          support_system_weight: weights.Support_System_Impact || 10,
          property_damage_weight: weights.Property_Damage || 10,
          infrastructure_weight: weights.Infrastructure_Impact || 10,
          environmental_weight: weights.Environmental_Damage || 10,
          economic_impact_weight: weights.Economic_Impact || 10,
          reputational_weight: weights.Reputational_Impact || 10,
          weights_json: weights,
          is_active: false,
          set_by: userId,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
        });

      if (insertError) throw insertError;

      // Activate the new weights using database function
      const { error: activateError } = await supabase.rpc('activate_weighting_weights', {
        p_org_id: organizationId,
        p_new_version: nextVersion,
      });

      if (activateError) {
        console.warn('Activation function error (may not exist):', activateError);
        // Fallback: manually activate
        await supabase
          .from('weighting_final_weights')
          .update({ is_active: false })
          .eq('org_id', organizationId)
          .neq('version', nextVersion);

        await supabase
          .from('weighting_final_weights')
          .update({ is_active: true })
          .eq('org_id', organizationId)
          .eq('version', nextVersion);
      }

      // Update session status
      await supabase
        .from('weighting_sessions')
        .update({
          status: 'approved',
          layer6_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Update organization weights_configured flag
      await supabase
        .from('organizations')
        .update({ weights_configured: true })
        .eq('id', organizationId);

      toast({
        title: "Weights Approved & Activated",
        description: `Version ${nextVersion} is now active for all assessments`,
      });

      onComplete();
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Error",
        description: "Failed to approve weights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <span className="text-green-600 font-medium">Weights Approved & Active</span>
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
                <div className="text-xl font-bold">{weight.toFixed(1)}%</div>
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
                {Object.values(weights).reduce((sum, w) => sum + w, 0).toFixed(1)}%
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

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Synthesis
        </Button>
        {sessionStatus !== 'approved' ? (
          <Button onClick={handleApprove} disabled={isSubmitting}>
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
