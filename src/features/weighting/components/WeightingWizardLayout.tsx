import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WIZARD_LAYERS } from "../types";

interface WeightingWizardLayoutProps {
  children: ReactNode;
  currentLayer: number;
  sessionTitle: string;
  layerCompleted: boolean[];
  onNext?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  isNextDisabled?: boolean;
  isProcessing?: boolean;
  nextLabel?: string;
}

export function WeightingWizardLayout({
  children,
  currentLayer,
  sessionTitle,
  layerCompleted,
  onNext,
  onBack,
  onCancel,
  isNextDisabled = false,
  isProcessing = false,
  nextLabel,
}: WeightingWizardLayoutProps) {
  const navigate = useNavigate();
  const progress = (layerCompleted.filter(Boolean).length / WIZARD_LAYERS.length) * 100;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/settings/weights");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">HIRA Pro</span>
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="font-medium">{sessionTitle}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Layer {currentLayer} of {WIZARD_LAYERS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Layer Indicators */}
          <div className="flex items-center justify-between mt-4 gap-2">
            {WIZARD_LAYERS.map((layer, idx) => (
              <div
                key={layer.id}
                className={cn(
                  "flex-1 text-center",
                  idx < WIZARD_LAYERS.length - 1 && "relative"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentLayer === layer.id && "bg-primary text-primary-foreground",
                    layerCompleted[idx] && currentLayer !== layer.id && "bg-green-500 text-white",
                    !layerCompleted[idx] && currentLayer !== layer.id && "bg-muted text-muted-foreground"
                  )}
                >
                  {layerCompleted[idx] && currentLayer !== layer.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    layer.id
                  )}
                </div>
                <p className="text-xs mt-1 font-medium hidden md:block">
                  {layer.title}
                </p>
                <p className="text-xs text-muted-foreground hidden lg:block">
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        {children}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={currentLayer === 1 || isProcessing}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous Layer
          </Button>

          <div className="text-sm text-muted-foreground">
            {WIZARD_LAYERS[currentLayer - 1]?.title}
          </div>

          <Button
            onClick={onNext}
            disabled={isNextDisabled || isProcessing}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : currentLayer === WIZARD_LAYERS.length ? (
              <>Complete & Activate</>
            ) : (
              <>
                {nextLabel || "Next Layer"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
