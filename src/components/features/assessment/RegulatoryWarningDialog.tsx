import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Scale, ExternalLink } from "lucide-react";
import { RegulatoryRequirement } from "@/hooks/useHazardRecommendations";

interface RegulatoryWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: RegulatoryRequirement;
  hazardName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RegulatoryWarningDialog({
  open,
  onOpenChange,
  requirement,
  hazardName,
  onConfirm,
  onCancel,
}: RegulatoryWarningDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    onCancel();
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Regulatory Compliance Warning
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left">
            <p>
              You are about to exclude <strong>"{hazardName}"</strong> from your
              assessment. This hazard is mandated by regulatory requirements.
            </p>

            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div className="flex items-start gap-2">
                <Scale className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    {requirement.regulation_name}
                  </p>
                  {requirement.regulation_section && (
                    <p className="text-sm text-muted-foreground">
                      {requirement.regulation_section}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm">{requirement.requirement_description}</p>

              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Consequences of Non-Compliance:
                </p>
                <p className="text-sm mt-1">
                  {requirement.non_compliance_consequences}
                </p>
              </div>

              {requirement.source_url && (
                <a
                  href={requirement.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Regulation
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-foreground">
                Reason for Exclusion (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this regulatory hazard does not apply to your organization..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This will be logged for audit purposes.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Keep Hazard Selected
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            I Understand, Exclude Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
