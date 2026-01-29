import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  AlertTriangle,
  Shield,
  ChevronDown,
  Sparkles,
  Users,
  Scale,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { Hazard } from "@/hooks/useHazards";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useHazardRecommendations,
  useLogComplianceOverride,
  getOrderedHazards,
  getDefaultSelectedHazards,
  HazardScore,
} from "@/hooks/useHazardRecommendations";
import { RegulatoryWarningDialog } from "@/components/features/assessment/RegulatoryWarningDialog";
import { HazardInfoSheetDialog } from "@/components/features/hazards/HazardInfoSheetDialog";
import { toast } from "sonner";

interface HazardSelectionStepProps {
  hazards: Hazard[];
  selectedHazards: string[];
  onSelectionChange: (hazards: string[]) => void;
  assessmentId?: string;
}

const TIER_CONFIG = {
  high: {
    label: "Highly Relevant",
    emoji: "🟢",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    description: "Mandatory compliance or high relevance to your organization",
    defaultOpen: true,
  },
  medium: {
    label: "Potentially Relevant",
    emoji: "🟡",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    description: "May affect some operations - review recommended",
    defaultOpen: false,
  },
  low: {
    label: "Likely Irrelevant",
    emoji: "🔴",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    description: "Low probability of affecting your organization",
    defaultOpen: false,
  },
};

export function HazardSelectionStep({
  hazards,
  selectedHazards,
  onSelectionChange,
  assessmentId,
}: HazardSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingUncheck, setPendingUncheck] = useState<{
    hazard: Hazard;
    score: HazardScore;
  } | null>(null);
  const [tierStates, setTierStates] = useState({
    high: true,
    medium: false,
    low: false,
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [infoSheetHazard, setInfoSheetHazard] = useState<string | null>(null);

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    refetch,
  } = useHazardRecommendations(hazards);
  const logOverride = useLogComplianceOverride();

  const scores = recommendations?.scores || [];
  const stats = recommendations?.stats;

  // Auto-select high-tier hazards on first load
  useEffect(() => {
    if (!hasInitialized && scores.length > 0 && selectedHazards.length === 0) {
      const defaultSelected = getDefaultSelectedHazards(scores);
      if (defaultSelected.length > 0) {
        onSelectionChange(defaultSelected);
        setHasInitialized(true);
        toast.success(
          `${defaultSelected.length} recommended hazards pre-selected`,
          {
            description: "Review and adjust as needed for your assessment",
          }
        );
      }
    }
  }, [scores, selectedHazards.length, hasInitialized, onSelectionChange]);

  // Create ordered hazards with scores
  const orderedHazards = useMemo(
    () => getOrderedHazards(hazards, scores),
    [hazards, scores]
  );

  // Filter by search
  const filteredHazards = useMemo(() => {
    if (!searchTerm) return orderedHazards;
    const term = searchTerm.toLowerCase();
    return orderedHazards.filter(
      ({ hazard }) =>
        hazard.category.toLowerCase().includes(term) ||
        hazard.hazards_list.some((item) => item.toLowerCase().includes(term))
    );
  }, [orderedHazards, searchTerm]);

  // Group by tier
  const tierGroups = useMemo(() => {
    const groups: Record<string, typeof filteredHazards> = {
      high: [],
      medium: [],
      low: [],
    };

    filteredHazards.forEach((item) => {
      const tier = item.score?.tier || "medium";
      groups[tier].push(item);
    });

    return groups;
  }, [filteredHazards]);

  const handleToggleHazard = (hazard: Hazard, score: HazardScore | null) => {
    const isSelected = selectedHazards.includes(hazard.id);

    if (isSelected && score?.is_mandatory && score.regulatory_requirement) {
      // Show warning dialog for mandatory hazards
      setPendingUncheck({ hazard, score });
      setWarningDialogOpen(true);
      return;
    }

    if (isSelected) {
      onSelectionChange(selectedHazards.filter((id) => id !== hazard.id));
    } else {
      onSelectionChange([...selectedHazards, hazard.id]);
    }
  };

  const handleConfirmUncheck = async (reason: string) => {
    if (!pendingUncheck) return;

    const { hazard, score } = pendingUncheck;

    // Log the compliance override
    try {
      await logOverride.mutateAsync({
        hazard_id: hazard.id,
        regulatory_requirement_id: score.regulatory_requirement?.id,
        regulation_name:
          score.regulatory_requirement?.regulation_name || "Unknown",
        action: "unchecked",
        reason,
        assessment_id: assessmentId,
      });
    } catch (error) {
      console.error("Failed to log compliance override:", error);
    }

    onSelectionChange(selectedHazards.filter((id) => id !== hazard.id));
    setWarningDialogOpen(false);
    setPendingUncheck(null);

    toast.warning("Regulatory hazard excluded", {
      description: "This decision has been logged for audit purposes",
    });
  };

  const handleCancelUncheck = () => {
    setWarningDialogOpen(false);
    setPendingUncheck(null);
  };

  const renderHazardItem = (
    hazard: Hazard,
    score: HazardScore | null,
    tier: "high" | "medium" | "low"
  ) => {
    const isSelected = selectedHazards.includes(hazard.id);
    const config = TIER_CONFIG[tier];

    return (
      <AccordionItem
        key={hazard.id}
        value={hazard.id}
        className={`border rounded-lg px-4 ${
          score?.is_mandatory ? "border-l-4 border-l-primary" : ""
        }`}
      >
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center gap-3 w-full">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleToggleHazard(hazard, score)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {score?.is_mandatory ? (
                <Scale className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <AlertTriangle className={`h-4 w-4 ${config.color} shrink-0`} />
              )}
              <span className="font-medium text-left truncate">
                {hazard.category_number}. {hazard.category}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {score?.is_mandatory && (
                <Badge
                  variant="outline"
                  className="text-xs border-primary text-primary"
                >
                  Mandatory
                </Badge>
              )}
              {score?.peer_adoption_rate && score.peer_adoption_rate > 50 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {Math.round(score.peer_adoption_rate)}%
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {hazard.hazards_list.length} items
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pl-8 space-y-2 pb-2">
            {score?.ai_reasoning && (
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{score.ai_reasoning}</p>
              </div>
            )}
            {hazard.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {hazard.description}
              </p>
            )}
            <div className="grid gap-1">
              {hazard.hazards_list.map((item, idx) => (
                <div
                  key={idx}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary">•</span>
                  {item}
                </div>
              ))}
            </div>
            {hazard.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hazard.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setInfoSheetHazard(hazard.category);
              }}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Learn More
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const renderTierSection = (tier: "high" | "medium" | "low") => {
    const items = tierGroups[tier];
    const config = TIER_CONFIG[tier];
    const selectedInTier = items.filter(({ hazard }) =>
      selectedHazards.includes(hazard.id)
    ).length;

    if (items.length === 0) return null;

    return (
      <Collapsible
        key={tier}
        open={tierStates[tier]}
        onOpenChange={(open) =>
          setTierStates((prev) => ({ ...prev, [tier]: open }))
        }
        className="space-y-2"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between p-4 h-auto ${config.bgColor} ${config.borderColor} border rounded-lg hover:${config.bgColor}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{config.emoji}</span>
              <div className="text-left">
                <p className={`font-semibold ${config.color}`}>
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground font-normal">
                  {config.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {selectedInTier}/{items.length} selected
              </Badge>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  tierStates[tier] ? "rotate-180" : ""
                }`}
              />
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <Accordion type="multiple" className="space-y-2">
            {items.map(({ hazard, score }) =>
              renderHazardItem(hazard, score, tier)
            )}
          </Accordion>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Select Hazards
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations based on your organization profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={recommendationsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${
                recommendationsLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Badge variant="outline" className="text-sm">
            {selectedHazards.length} selected
          </Badge>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap gap-2 text-xs">
          {stats.mandatory > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Scale className="h-3 w-3" />
              {stats.mandatory} mandatory
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            🟢 {stats.high_tier} high relevance
          </Badge>
          <Badge variant="secondary" className="gap-1">
            🟡 {stats.medium_tier} medium
          </Badge>
          <Badge variant="secondary" className="gap-1">
            🔴 {stats.low_tier} low
          </Badge>
          {stats.ai_scored > 0 && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {stats.ai_scored} AI-scored
            </Badge>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hazards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {recommendationsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[400px] md:h-[500px]">
          <div className="space-y-4 pr-4">
            {renderTierSection("high")}
            {renderTierSection("medium")}
            {renderTierSection("low")}
          </div>
        </ScrollArea>
      )}

      {selectedHazards.length === 0 && !recommendationsLoading && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/50 bg-warning/5">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning">
            Please select at least one hazard to continue
          </p>
        </div>
      )}

      {/* Regulatory Warning Dialog */}
      {pendingUncheck?.score.regulatory_requirement && (
        <RegulatoryWarningDialog
          open={warningDialogOpen}
          onOpenChange={setWarningDialogOpen}
          requirement={pendingUncheck.score.regulatory_requirement}
          hazardName={pendingUncheck.hazard.category}
          onConfirm={handleConfirmUncheck}
          onCancel={handleCancelUncheck}
        />
      )}

      {/* Hazard Info Sheet Dialog */}
      <HazardInfoSheetDialog
        open={!!infoSheetHazard}
        onOpenChange={(open) => !open && setInfoSheetHazard(null)}
        hazardName={infoSheetHazard}
      />
    </div>
  );
}
