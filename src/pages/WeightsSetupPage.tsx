import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useConsequences } from "@/hooks/useHazards";
import { useSaveConsequenceWeights, useConsequenceWeightsMap } from "@/hooks/useConsequenceWeights";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, AlertCircle, Loader2, Check, Scale, Lock, Edit, Save, Eye } from "lucide-react";
import { toast } from "sonner";

export default function WeightsSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: consequences = [], isLoading: consequencesLoading } = useConsequences();
  const { data: existingWeights = {}, isLoading: weightsLoading } = useConsequenceWeightsMap();
  const { data: organization } = useOrganization();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const saveWeights = useSaveConsequenceWeights();

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const isFirstTimeSetup = !organization?.weights_configured;

  // Initialize weights from existing or default
  useEffect(() => {
    if (consequences.length === 0) return;

    if (Object.keys(existingWeights).length > 0) {
      setWeights(existingWeights);
    } else {
      // Default equal distribution
      const defaultWeight = Math.floor(100 / consequences.length);
      const remainder = 100 - defaultWeight * consequences.length;
      const initialWeights: Record<string, number> = {};
      consequences.forEach((c, idx) => {
        initialWeights[c.id] = defaultWeight + (idx === 0 ? remainder : 0);
      });
      setWeights(initialWeights);
    }
  }, [consequences, existingWeights]);

  // Auto-enable edit mode for first time setup
  useEffect(() => {
    if (isFirstTimeSetup) {
      setIsEditMode(true);
    }
  }, [isFirstTimeSetup]);

  const handleWeightChange = (consequenceId: string, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [consequenceId]: Math.min(100, Math.max(0, value)),
    }));
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  const isValidWeight = totalWeight === 100;

  const handleEditClick = () => {
    if (!isAdmin) {
      toast.error("Only administrators can edit weights");
      return;
    }
    setShowPasswordDialog(true);
  };

  const handleVerifyAndEdit = async () => {
    if (!user?.email || !password) return;

    setIsVerifying(true);
    try {
      // Re-authenticate with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        toast.error("Incorrect password. Please try again.");
        return;
      }

      setIsEditMode(true);
      setShowPasswordDialog(false);
      setPassword("");
      toast.success("Password verified. You can now edit weights.");
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    if (!isValidWeight) {
      toast.error("Weights must sum to exactly 100%");
      return;
    }

    // If updating existing weights, show confirmation
    if (!isFirstTimeSetup) {
      setShowConfirmDialog(true);
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    try {
      await saveWeights.mutateAsync({ weights });
      toast.success("Consequence weights saved successfully!");
      setIsEditMode(false);
      if (isFirstTimeSetup) {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to save weights");
    }
  };

  const handleCancel = () => {
    // Reset to existing weights
    if (Object.keys(existingWeights).length > 0) {
      setWeights(existingWeights);
    }
    setIsEditMode(false);
  };

  if (consequencesLoading || weightsLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          {!isFirstTimeSetup && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isFirstTimeSetup ? "Configure Consequence Weights" : "Consequence Weights"}
          </h1>
          <p className="text-muted-foreground">
            {isFirstTimeSetup
              ? "Before creating assessments, set how important each consequence type is to your organization. These weights will apply to all future risk assessments."
              : isEditMode
              ? "Update how your organization weighs each consequence type. Changes will apply to future assessments only."
              : "View how your organization weighs each consequence type in risk assessments."}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {isEditMode ? (
                    <Edit className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Consequence Weights
                </CardTitle>
                <CardDescription>
                  {isEditMode ? "Distribute 100% across all consequences" : "Current weight distribution"}
                </CardDescription>
              </div>
              <Badge
                variant={isValidWeight ? "default" : "destructive"}
                className="text-sm"
              >
                Total: {totalWeight}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {consequences.map((consequence) => (
                  <div
                    key={consequence.id}
                    className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">
                        {consequence.category_number}. {consequence.category}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {consequence.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditMode ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={weights[consequence.id] || 0}
                          onChange={(e) =>
                            handleWeightChange(
                              consequence.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 text-center"
                        />
                      ) : (
                        <div className="w-20 h-9 flex items-center justify-center bg-background rounded-md border text-sm font-medium">
                          {weights[consequence.id] || 0}
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground w-4">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {isEditMode && !isValidWeight && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  Weights must sum to exactly 100% (currently {totalWeight}%)
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-4 border-t">
            {isEditMode ? (
              <>
                {!isFirstTimeSetup && (
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!isValidWeight || saveWeights.isPending}
                >
                  {saveWeights.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isFirstTimeSetup ? "Save & Continue" : "Save Weights"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
                {isAdmin && (
                  <Button onClick={handleEditClick}>
                    <Lock className="mr-2 h-4 w-4" />
                    Edit Weights
                  </Button>
                )}
              </>
            )}
          </CardFooter>
        </Card>

        {!isAdmin && !isFirstTimeSetup && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Only administrators can modify consequence weights.
          </p>
        )}
      </main>

      {/* Password Verification Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Verify Your Identity
            </DialogTitle>
            <DialogDescription>
              Please re-enter your password to confirm you want to edit the consequence weights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === "Enter" && handleVerifyAndEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleVerifyAndEdit} disabled={!password || isVerifying}>
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Verify & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Consequence Weights?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing consequence weights will affect all future risk assessments.
              Existing completed assessments will not be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSave}>
              Yes, Update Weights
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
