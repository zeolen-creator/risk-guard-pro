import { useState } from "react";
import { format } from "date-fns";
import { Plus, AlertTriangle, Clock, CheckCircle2, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useIncidents, useCreateIncident, useUpdateIncident, Incident } from "@/hooks/useIncidents";
import { toast } from "sonner";

const severityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const statusIcons = {
  open: <AlertTriangle className="h-4 w-4 text-red-500" />,
  investigating: <Clock className="h-4 w-4 text-yellow-500" />,
  resolved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  closed: <CheckCircle2 className="h-4 w-4 text-gray-500" />,
};

export function IncidentLogPanel() {
  const { data: incidents = [], isLoading } = useIncidents();
  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [newIncident, setNewIncident] = useState<{
    title: string;
    description: string;
    incident_date: string;
    severity: "low" | "medium" | "high" | "critical";
    location: string;
    estimated_cost: string;
  }>({
    title: "",
    description: "",
    incident_date: new Date().toISOString().split("T")[0],
    severity: "medium",
    location: "",
    estimated_cost: "",
  });

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || incident.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newIncident.title || !newIncident.incident_date) {
      toast.error("Title and date are required");
      return;
    }

    try {
      await createIncident.mutateAsync({
        ...newIncident,
        estimated_cost: newIncident.estimated_cost ? parseFloat(newIncident.estimated_cost) : undefined,
      });
      toast.success("Incident reported successfully");
      setShowAddDialog(false);
      setNewIncident({
        title: "",
        description: "",
        incident_date: new Date().toISOString().split("T")[0],
        severity: "medium",
        location: "",
        estimated_cost: "",
      });
    } catch {
      toast.error("Failed to report incident");
    }
  };

  const handleStatusChange = async (incident: Incident, newStatus: Incident["status"]) => {
    try {
      await updateIncident.mutateAsync({
        id: incident.id,
        status: newStatus,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Incident Log</CardTitle>
            <CardDescription>Track and manage safety incidents</CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incidents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {statusIcons[incident.status]}
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {incident.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={severityColors[incident.severity]}>
                          {incident.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(incident.incident_date), "MMM d, yyyy")}
                        </span>
                        {incident.location && (
                          <span className="text-xs text-muted-foreground">
                            📍 {incident.location}
                          </span>
                        )}
                        {incident.estimated_cost && (
                          <span className="text-xs text-muted-foreground">
                            💰 ${incident.estimated_cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select
                    value={incident.status}
                    onValueChange={(value) =>
                      handleStatusChange(incident, value as Incident["status"])
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Incident Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="Brief description of incident"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detailed description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newIncident.incident_date}
                    onChange={(e) => setNewIncident({ ...newIncident, incident_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="severity">Severity *</Label>
                  <Select
                    value={newIncident.severity}
                    onValueChange={(value: string) =>
                      setNewIncident({ ...newIncident, severity: value as "low" | "medium" | "high" | "critical" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                  placeholder="Where did it occur?"
                />
              </div>
              <div>
                <Label htmlFor="cost">Estimated Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={newIncident.estimated_cost}
                  onChange={(e) => setNewIncident({ ...newIncident, estimated_cost: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createIncident.isPending}>
                {createIncident.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Report Incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
