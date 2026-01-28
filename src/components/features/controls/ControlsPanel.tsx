import { useState } from "react";
import { format } from "date-fns";
import { Plus, Shield, Search, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useControls, useCreateControl, useUpdateControl, Control } from "@/hooks/useControls";
import { toast } from "sonner";

const typeColors = {
  preventive: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  detective: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  corrective: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  administrative: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
};

const statusIcons = {
  planned: <Clock className="h-4 w-4 text-gray-500" />,
  in_progress: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  implemented: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  verified: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

export function ControlsPanel() {
  const { data: controls = [], isLoading } = useControls();
  const createControl = useCreateControl();
  const updateControl = useUpdateControl();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [newControl, setNewControl] = useState({
    name: "",
    description: "",
    control_type: "preventive" as Control["control_type"],
    responsible_party: "",
    cost_to_implement: "",
    next_review_date: "",
  });

  const filteredControls = controls.filter((control) => {
    const matchesSearch =
      control.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || control.control_type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate stats
  const implementedCount = controls.filter((c) => c.implementation_status === "implemented" || c.implementation_status === "verified").length;
  const avgEffectiveness = controls.filter((c) => c.effectiveness_rating).reduce((sum, c) => sum + (c.effectiveness_rating || 0), 0) / (controls.filter((c) => c.effectiveness_rating).length || 1);

  const handleCreate = async () => {
    if (!newControl.name || !newControl.control_type) {
      toast.error("Name and type are required");
      return;
    }

    try {
      await createControl.mutateAsync({
        ...newControl,
        cost_to_implement: newControl.cost_to_implement ? parseFloat(newControl.cost_to_implement) : undefined,
      });
      toast.success("Control created successfully");
      setShowAddDialog(false);
      setNewControl({
        name: "",
        description: "",
        control_type: "preventive",
        responsible_party: "",
        cost_to_implement: "",
        next_review_date: "",
      });
    } catch {
      toast.error("Failed to create control");
    }
  };

  const handleStatusChange = async (control: Control, newStatus: Control["implementation_status"]) => {
    try {
      await updateControl.mutateAsync({
        id: control.id,
        implementation_status: newStatus,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Control Effectiveness</CardTitle>
            <CardDescription>Manage and track risk controls</CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Control
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Controls</p>
            <p className="text-2xl font-bold">{controls.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Implemented</p>
            <p className="text-2xl font-bold">{implementedCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Avg Effectiveness</p>
            <p className="text-2xl font-bold">{Math.round(avgEffectiveness)}%</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Coverage</p>
            <p className="text-2xl font-bold">
              {controls.length > 0 ? Math.round((implementedCount / controls.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search controls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="detective">Detective</SelectItem>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="administrative">Administrative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Controls List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredControls.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No controls found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredControls.map((control) => (
              <div
                key={control.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {statusIcons[control.implementation_status]}
                    <div className="flex-1">
                      <p className="font-medium">{control.name}</p>
                      {control.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {control.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={typeColors[control.control_type]}>
                          {control.control_type}
                        </Badge>
                        {control.responsible_party && (
                          <span className="text-xs text-muted-foreground">
                            👤 {control.responsible_party}
                          </span>
                        )}
                        {control.next_review_date && (
                          <span className="text-xs text-muted-foreground">
                            📅 Review: {format(new Date(control.next_review_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {control.effectiveness_rating !== null && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Effectiveness</span>
                            <span>{control.effectiveness_rating}%</span>
                          </div>
                          <Progress value={control.effectiveness_rating} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Select
                    value={control.implementation_status}
                    onValueChange={(value) =>
                      handleStatusChange(control, value as Control["implementation_status"])
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Control Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Control</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newControl.name}
                  onChange={(e) => setNewControl({ ...newControl, name: e.target.value })}
                  placeholder="Control name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  placeholder="How does this control mitigate risk?"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="type">Control Type *</Label>
                <Select
                  value={newControl.control_type}
                  onValueChange={(value: Control["control_type"]) =>
                    setNewControl({ ...newControl, control_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="detective">Detective</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="responsible">Responsible Party</Label>
                <Input
                  id="responsible"
                  value={newControl.responsible_party}
                  onChange={(e) => setNewControl({ ...newControl, responsible_party: e.target.value })}
                  placeholder="Who is responsible?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={newControl.cost_to_implement}
                    onChange={(e) => setNewControl({ ...newControl, cost_to_implement: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="review">Next Review</Label>
                  <Input
                    id="review"
                    type="date"
                    value={newControl.next_review_date}
                    onChange={(e) => setNewControl({ ...newControl, next_review_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createControl.isPending}>
                {createControl.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Control
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
