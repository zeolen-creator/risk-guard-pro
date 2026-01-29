import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  DollarSign,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calculator,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import {
  useMitigationStrategies,
  useOrganizationMitigations,
  useCreateMitigation,
  useUpdateMitigation,
  type MitigationStrategy,
} from "@/hooks/useMitigationStrategies";
import { toast } from "sonner";

interface MitigationLibraryPanelProps {
  assessmentId?: string;
  hazardId?: string;
  hazardCategory?: string;
  riskScore?: number;
}

export function MitigationLibraryPanel({
  assessmentId,
  hazardId,
  hazardCategory,
  riskScore = 10,
}: MitigationLibraryPanelProps) {
  const { data: strategies, isLoading: strategiesLoading } = useMitigationStrategies(hazardCategory);
  const { data: mitigations, isLoading: mitigationsLoading } = useOrganizationMitigations(assessmentId);
  const createMitigation = useCreateMitigation();
  const updateMitigation = useUpdateMitigation();

  const [proposalDialog, setProposalDialog] = useState<{
    open: boolean;
    strategy: MitigationStrategy | null;
  }>({ open: false, strategy: null });

  const [proposalForm, setProposalForm] = useState({
    estimated_cost: "",
    expected_risk_reduction_percent: "",
    annual_loss_estimate: "",
    notes: "",
  });

  const calculateROI = () => {
    const cost = parseFloat(proposalForm.estimated_cost);
    const reduction = parseFloat(proposalForm.expected_risk_reduction_percent);
    const loss = parseFloat(proposalForm.annual_loss_estimate);

    if (!cost || !reduction) return null;

    if (loss) {
      const riskReductionValue = (loss * reduction) / 100;
      return (riskReductionValue / cost).toFixed(2);
    }

    // Use risk score proxy
    const riskPointValue = 10000;
    const riskPointsReduced = (riskScore * reduction) / 100;
    return ((riskPointsReduced * riskPointValue) / cost).toFixed(2);
  };

  const calculateRiskValue = () => {
    const reduction = parseFloat(proposalForm.expected_risk_reduction_percent);
    const loss = parseFloat(proposalForm.annual_loss_estimate);

    if (!reduction) return 0;

    if (loss) {
      return (loss * reduction) / 100;
    }

    const riskPointValue = 10000;
    return (riskScore * reduction / 100) * riskPointValue;
  };

  const handlePropose = async () => {
    if (!proposalDialog.strategy) return;

    try {
      await createMitigation.mutateAsync({
        assessment_id: assessmentId,
        hazard_id: hazardId,
        mitigation_strategy_id: proposalDialog.strategy.id,
        estimated_cost: proposalForm.estimated_cost ? parseFloat(proposalForm.estimated_cost) : undefined,
        expected_risk_reduction_percent: proposalForm.expected_risk_reduction_percent
          ? parseInt(proposalForm.expected_risk_reduction_percent)
          : undefined,
        annual_loss_estimate: proposalForm.annual_loss_estimate
          ? parseFloat(proposalForm.annual_loss_estimate)
          : undefined,
        notes: proposalForm.notes || undefined,
      });

      toast.success("Mitigation strategy proposed!");
      setProposalDialog({ open: false, strategy: null });
      setProposalForm({
        estimated_cost: "",
        expected_risk_reduction_percent: "",
        annual_loss_estimate: "",
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to propose mitigation");
    }
  };

  const handleStatusChange = async (mitigationId: string, newStatus: string) => {
    try {
      await updateMitigation.mutateAsync({
        id: mitigationId,
        status: newStatus as "proposed" | "approved" | "in_progress" | "completed" | "rejected",
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getComplexityColor = (complexity: string | null) => {
    switch (complexity) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "proposed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "approved": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const sortedMitigations = [...(mitigations || [])].sort((a, b) => {
    if (a.roi_score === null) return 1;
    if (b.roi_score === null) return -1;
    return (b.roi_score || 0) - (a.roi_score || 0);
  });

  const roi = calculateROI();

  return (
    <div className="space-y-6">
      {/* Risk Context */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Mitigation Strategy Library
          </CardTitle>
          <CardDescription>
            Select and propose strategies to reduce risk. ROI is calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{riskScore}</p>
              <p className="text-xs text-muted-foreground">Current Risk Score</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-orange-600">{(mitigations || []).filter(m => m.status === 'proposed').length}</p>
              <p className="text-xs text-muted-foreground">Proposed</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-600">{(mitigations || []).filter(m => m.status === 'completed').length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Strategies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Available Strategies</CardTitle>
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-1" />
              Add Custom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {strategiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {strategies?.map((strategy) => {
                const alreadyProposed = mitigations?.some(
                  m => m.mitigation_strategy_id === strategy.id
                );

                return (
                  <div
                    key={strategy.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{strategy.strategy_name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {strategy.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className={getComplexityColor(strategy.implementation_complexity)}>
                            {strategy.implementation_complexity || "N/A"} complexity
                          </Badge>
                          {strategy.typical_timeframe_days_min && strategy.typical_timeframe_days_max && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {strategy.typical_timeframe_days_min}-{strategy.typical_timeframe_days_max} days
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={alreadyProposed}
                        onClick={() => setProposalDialog({ open: true, strategy })}
                      >
                        {alreadyProposed ? "Proposed" : "Propose"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposed Mitigations */}
      {sortedMitigations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Proposed Mitigations (Ranked by ROI)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedMitigations.map((mitigation, idx) => (
                <div
                  key={mitigation.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {mitigation.strategy?.strategy_name || "Custom Strategy"}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {mitigation.estimated_cost && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${mitigation.estimated_cost.toLocaleString()}
                            </span>
                          )}
                          {mitigation.expected_risk_reduction_percent && (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {mitigation.expected_risk_reduction_percent}% reduction
                            </span>
                          )}
                          {mitigation.roi_score && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <Calculator className="h-3 w-3" />
                              ROI: {mitigation.roi_score.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Select
                      value={mitigation.status}
                      onValueChange={(value) => handleStatusChange(mitigation.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposed">Proposed</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposal Dialog */}
      <Dialog open={proposalDialog.open} onOpenChange={(open) => setProposalDialog({ open, strategy: open ? proposalDialog.strategy : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Mitigation Strategy</DialogTitle>
            <DialogDescription>
              Provide cost and effectiveness estimates for ROI calculation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">{proposalDialog.strategy?.strategy_name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {proposalDialog.strategy?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Implementation Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="50000"
                value={proposalForm.estimated_cost}
                onChange={(e) => setProposalForm({ ...proposalForm, estimated_cost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reduction">Expected Risk Reduction (%)</Label>
              <Input
                id="reduction"
                type="number"
                min="0"
                max="100"
                placeholder="25"
                value={proposalForm.expected_risk_reduction_percent}
                onChange={(e) => setProposalForm({ ...proposalForm, expected_risk_reduction_percent: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                How much will this reduce the risk? 100% = completely eliminates the hazard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loss">Annual Loss Estimate ($ optional)</Label>
              <Input
                id="loss"
                type="number"
                placeholder="200000"
                value={proposalForm.annual_loss_estimate}
                onChange={(e) => setProposalForm({ ...proposalForm, annual_loss_estimate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Expected annual loss if hazard occurs. Used for more accurate ROI.
              </p>
            </div>

            {proposalForm.estimated_cost && proposalForm.expected_risk_reduction_percent && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Projected ROI</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Risk Reduction Value:</p>
                    <p className="font-medium">${calculateRiskValue().toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROI Score:</p>
                    <p className="font-bold text-green-600">{roi}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional context or justification..."
                value={proposalForm.notes}
                onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialog({ open: false, strategy: null })}>
              Cancel
            </Button>
            <Button onClick={handlePropose} disabled={createMitigation.isPending}>
              {createMitigation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
