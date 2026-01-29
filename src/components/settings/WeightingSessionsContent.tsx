import { useNavigate } from "react-router-dom";
import { useWeightingSessions, useCreateWeightingSession } from "@/hooks/useWeightingSessions";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";

export default function WeightingSessionsContent() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: sessionsLoading } = useWeightingSessions();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const createSession = useCreateWeightingSession();

  const handleStartNewSession = async () => {
    try {
      const session = await createSession.mutateAsync();
      navigate(`/settings/weights/wizard/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "pending_approval":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Approval</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getLayerProgress = (session: typeof sessions[0]) => {
    const layers = [
      session.layer1_completed,
      session.layer2_completed,
      session.layer3_completed,
      session.layer4_completed,
      session.layer5_completed,
      session.status === "approved",
    ];
    return layers.filter(Boolean).length;
  };

  if (sessionsLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status !== "approved");
  const completedSessions = sessions.filter(s => s.status === "approved");

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-muted-foreground">
        Use our 6-layer AI-powered process to scientifically determine how to weight consequence types 
        in your risk assessments. Generate defensible, audit-ready weights.
      </p>

      {/* Start New Session */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Start New Weighting Session</h3>
              <p className="text-sm text-muted-foreground">
                Complete the 6-layer wizard to generate scientifically justified consequence weights.
              </p>
            </div>
            <Button onClick={handleStartNewSession} disabled={createSession.isPending}>
              {createSession.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Continue where you left off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">{getLayerProgress(session)}/6</span>
                    </div>
                    <div>
                      <p className="font-medium">Version {session.version}</p>
                      <p className="text-sm text-muted-foreground">
                        Started {session.created_at ? format(new Date(session.created_at), "MMM d, yyyy") : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(session.status)}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/settings/weights/wizard/${session.id}`)}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Completed Sessions
            </CardTitle>
            <CardDescription>
              Previously completed weighting sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {completedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Version {session.version}</p>
                        <p className="text-sm text-muted-foreground">
                          Approved {session.approved_at ? format(new Date(session.approved_at), "MMM d, yyyy") : "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(session.status)}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/settings/weights/wizard/${session.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Weighting Sessions Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start your first session to generate scientifically justified consequence weights.
            </p>
            {isAdmin && (
              <Button onClick={handleStartNewSession} disabled={createSession.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Start First Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Layer 1-2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Organization context questionnaire and AHP pairwise comparisons for executive judgment.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Layer 3-4</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Scenario validation testing and AI-powered regulatory research analysis.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Layer 5-6</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              AI synthesis of all inputs with justification reports and approval workflow.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
