import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WIZARD_STEPS } from "../types";

interface WizardProgressProps {
  currentStep: number;
  completedSteps: number[];
}

export function WizardProgress({ currentStep, completedSteps }: WizardProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isLast = index === WIZARD_STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    isCompleted
                      ? "bg-success text-success-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <div className="mt-2 text-center hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2",
                    isCompleted ? "bg-success" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
