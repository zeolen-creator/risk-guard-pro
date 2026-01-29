import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle, Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { useRiskAppetite, useUpdateRiskAppetite, RiskAppetiteConfig, getRiskLevel } from "@/hooks/useRiskAppetite";

export function RiskAppetiteSettings() {
  const { data: config, isLoading } = useRiskAppetite();
  const updateConfig = useUpdateRiskAppetite();
  
  const [formData, setFormData] = useState<RiskAppetiteConfig>({
    low_threshold: 5,
    medium_threshold: 12,
    high_threshold: 15,
    extreme_threshold: 18,
    acceptance_policy: "",
    requires_approval: ["high", "extreme"],
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate(formData);
  };

  const toggleApprovalLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      requires_approval: prev.requires_approval.includes(level)
        ? prev.requires_approval.filter(l => l !== level)
        : [...prev.requires_approval, level],
    }));
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "extreme": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return <ShieldCheck className="h-4 w-4" />;
      case "medium": return <Shield className="h-4 w-4" />;
      case "high": return <ShieldAlert className="h-4 w-4" />;
      case "extreme": return <ShieldX className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Risk Threshold Configuration
          </CardTitle>
          <CardDescription>
            Define the score boundaries for each risk level. Risks scoring above these thresholds will be categorized accordingly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {/* Visual threshold display */}
            <div className="relative h-12 bg-gradient-to-r from-green-500/30 via-yellow-500/30 via-orange-500/30 to-red-500/30 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-medium">
                <span className="text-green-400">0</span>
                <span className="text-green-400">{formData.low_threshold}</span>
                <span className="text-yellow-400">{formData.medium_threshold}</span>
                <span className="text-orange-400">{formData.high_threshold}</span>
                <span className="text-red-400">{formData.extreme_threshold}</span>
                <span className="text-red-400">20</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge className={getRiskColor("low")}>Low</Badge>
                  Maximum Score
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.low_threshold]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, low_threshold: value }))}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.low_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, low_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-16"
                    min={0}
                    max={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge className={getRiskColor("medium")}>Medium</Badge>
                  Maximum Score
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.medium_threshold]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, medium_threshold: value }))}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.medium_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, medium_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-16"
                    min={0}
                    max={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge className={getRiskColor("high")}>High</Badge>
                  Maximum Score
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.high_threshold]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, high_threshold: value }))}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.high_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, high_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-16"
                    min={0}
                    max={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge className={getRiskColor("extreme")}>Extreme</Badge>
                  Threshold
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.extreme_threshold]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, extreme_threshold: value }))}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.extreme_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, extreme_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-16"
                    min={0}
                    max={20}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Approval Requirements</CardTitle>
          <CardDescription>
            Select which risk levels require management approval before acceptance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {["low", "medium", "high", "extreme"].map((level) => (
              <div
                key={level}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.requires_approval.includes(level)
                    ? getRiskColor(level) + " border-2"
                    : "bg-muted/30 border-border/50 opacity-60"
                }`}
                onClick={() => toggleApprovalLevel(level)}
              >
                <Checkbox
                  checked={formData.requires_approval.includes(level)}
                  onCheckedChange={() => toggleApprovalLevel(level)}
                />
                {getRiskIcon(level)}
                <span className="capitalize font-medium">{level}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Risk Acceptance Policy</CardTitle>
          <CardDescription>
            Define your organization's policy for accepting risks at different levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.acceptance_policy}
            onChange={(e) => setFormData(prev => ({ ...prev, acceptance_policy: e.target.value }))}
            placeholder="e.g., Low risks are accepted with routine monitoring. Medium risks require documented mitigation plans. High and Extreme risks require executive approval and compensating controls."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
