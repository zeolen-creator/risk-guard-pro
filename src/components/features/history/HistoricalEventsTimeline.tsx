import { useState } from "react";
import { format } from "date-fns";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Plus,
  Calendar,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  useHistoricalEvents,
  useHistoricalEventStats,
  useCreateHistoricalEvent,
  type HistoricalEvent,
} from "@/hooks/useHistoricalEvents";
import { toast } from "sonner";

interface HistoricalEventsTimelineProps {
  hazardName: string;
  hazardCategory: string;
}

export function HistoricalEventsTimeline({
  hazardName,
  hazardCategory,
}: HistoricalEventsTimelineProps) {
  const { data: events, isLoading } = useHistoricalEvents(hazardName);
  const stats = useHistoricalEventStats(hazardName);
  const createEvent = useCreateHistoricalEvent();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [eventForm, setEventForm] = useState({
    event_title: "",
    event_date: "",
    location: "",
    description: "",
    financial_impact: "",
    downtime_hours: "",
    people_affected: "",
    injuries: "0",
    fatalities: "0",
    response_effectiveness: "" as HistoricalEvent["response_effectiveness"] | "",
    lessons_learned: "",
    improvements_implemented: "",
  });

  const handleSubmit = async () => {
    if (!eventForm.event_title || !eventForm.event_date) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createEvent.mutateAsync({
        hazard_name: hazardName,
        hazard_category: hazardCategory,
        event_title: eventForm.event_title,
        event_date: eventForm.event_date,
        location: eventForm.location || null,
        description: eventForm.description || null,
        financial_impact: eventForm.financial_impact ? parseFloat(eventForm.financial_impact) : null,
        downtime_hours: eventForm.downtime_hours ? parseInt(eventForm.downtime_hours) : null,
        people_affected: eventForm.people_affected ? parseInt(eventForm.people_affected) : null,
        injuries: parseInt(eventForm.injuries) || 0,
        fatalities: parseInt(eventForm.fatalities) || 0,
        response_effectiveness: eventForm.response_effectiveness || null,
        lessons_learned: eventForm.lessons_learned || null,
        improvements_implemented: eventForm.improvements_implemented
          ? eventForm.improvements_implemented.split("\n").filter(Boolean)
          : null,
        incident_report_url: null,
        photos: [],
      });

      toast.success("Historical event logged!");
      setShowAddDialog(false);
      setEventForm({
        event_title: "",
        event_date: "",
        location: "",
        description: "",
        financial_impact: "",
        downtime_hours: "",
        people_affected: "",
        injuries: "0",
        fatalities: "0",
        response_effectiveness: "",
        lessons_learned: "",
        improvements_implemented: "",
      });
    } catch (error) {
      toast.error("Failed to log event");
    }
  };

  const getEffectivenessColor = (effectiveness: string | null) => {
    switch (effectiveness) {
      case "excellent": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "good": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "fair": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "poor": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historical Events - {hazardName}
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Log New Event
            </Button>
          </div>
          <CardDescription>
            Track past incidents to improve probability estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.calculatedProbability !== null
                  ? `${stats.calculatedProbability.toFixed(1)}%`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Calculated Frequency</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-red-600">
                ${stats.avgFinancialImpact > 0 ? stats.avgFinancialImpact.toLocaleString() : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Financial Impact</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.totalDowntime}h</p>
              <p className="text-xs text-muted-foreground">Total Downtime</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {events.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{event.event_title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "MMM d, yyyy")}
                              {event.location && (
                                <>
                                  <span>•</span>
                                  <span>{event.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {event.response_effectiveness && (
                            <Badge className={getEffectivenessColor(event.response_effectiveness)}>
                              Response: {event.response_effectiveness}
                            </Badge>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-3">{event.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                          {event.financial_impact && (
                            <div className="flex items-center gap-1 text-red-600">
                              <DollarSign className="h-4 w-4" />
                              ${event.financial_impact.toLocaleString()}
                            </div>
                          )}
                          {event.downtime_hours && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Clock className="h-4 w-4" />
                              {event.downtime_hours}h downtime
                            </div>
                          )}
                          {event.people_affected && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Users className="h-4 w-4" />
                              {event.people_affected} affected
                            </div>
                          )}
                        </div>

                        {event.lessons_learned && (
                          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Lessons Learned:
                            </p>
                            <p className="text-sm mt-1">{event.lessons_learned}</p>
                          </div>
                        )}

                        {event.improvements_implemented && event.improvements_implemented.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Improvements Made:
                            </p>
                            <ul className="text-sm space-y-1">
                              {event.improvements_implemented.map((imp, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-600">✓</span>
                                  {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No historical events recorded yet</p>
              <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Event
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Log Historical Event</DialogTitle>
            <DialogDescription>
              Document a past incident for {hazardName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={eventForm.event_title}
                    onChange={(e) => setEventForm({ ...eventForm, event_title: e.target.value })}
                    placeholder="e.g., Power outage incident"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="e.g., Main Office, Building A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="What happened? How was it discovered?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="financial">Financial Impact ($)</Label>
                  <Input
                    id="financial"
                    type="number"
                    value={eventForm.financial_impact}
                    onChange={(e) => setEventForm({ ...eventForm, financial_impact: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downtime">Downtime (hours)</Label>
                  <Input
                    id="downtime"
                    type="number"
                    value={eventForm.downtime_hours}
                    onChange={(e) => setEventForm({ ...eventForm, downtime_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affected">People Affected</Label>
                  <Input
                    id="affected"
                    type="number"
                    value={eventForm.people_affected}
                    onChange={(e) => setEventForm({ ...eventForm, people_affected: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="injuries">Injuries</Label>
                  <Input
                    id="injuries"
                    type="number"
                    value={eventForm.injuries}
                    onChange={(e) => setEventForm({ ...eventForm, injuries: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatalities">Fatalities</Label>
                  <Input
                    id="fatalities"
                    type="number"
                    value={eventForm.fatalities}
                    onChange={(e) => setEventForm({ ...eventForm, fatalities: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveness">Response Effectiveness</Label>
                <Select
                  value={eventForm.response_effectiveness}
                  onValueChange={(value) => setEventForm({ ...eventForm, response_effectiveness: value as HistoricalEvent["response_effectiveness"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How well did we respond?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poor">Poor - Major issues in response</SelectItem>
                    <SelectItem value="fair">Fair - Some issues, room for improvement</SelectItem>
                    <SelectItem value="good">Good - Effective with minor issues</SelectItem>
                    <SelectItem value="excellent">Excellent - Textbook response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lessons">Lessons Learned</Label>
                <Textarea
                  id="lessons"
                  value={eventForm.lessons_learned}
                  onChange={(e) => setEventForm({ ...eventForm, lessons_learned: e.target.value })}
                  placeholder="What did we learn from this incident?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="improvements">Improvements Implemented</Label>
                <Textarea
                  id="improvements"
                  value={eventForm.improvements_implemented}
                  onChange={(e) => setEventForm({ ...eventForm, improvements_implemented: e.target.value })}
                  placeholder="Enter each improvement on a new line"
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createEvent.isPending}>
              {createEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
