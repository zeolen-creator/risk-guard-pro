import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface MultiExecutiveProgressProps {
  sessionId: string;
  organizationId: string;
}

interface ExecutiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  completedAt: string | null;
  ahpWeights: Record<string, number> | null;
}

export function MultiExecutiveProgress({
  sessionId,
  organizationId,
}: MultiExecutiveProgressProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ExecutiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregatedWeights, setAggregatedWeights] = useState<Record<string, number> | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);
      try {
        // Get all sessions for this org
        const { data: sessionData } = await supabase
          .from('weighting_sessions')
          .select('id, created_by, status, layer2_completed')
          .eq('org_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (sessionData && sessionData.length > 0) {
          // Get user profiles
          const userIds = sessionData.map(s => s.created_by).filter(Boolean) as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

          // Get AHP weights for each session
          const sessionIds = sessionData.map(s => s.id);
          const { data: ahpData } = await supabase
            .from('weighting_ahp_matrix')
            .select('session_id, normalized_weights')
            .in('session_id', sessionIds);

          const ahpMap = new Map(ahpData?.map(a => [a.session_id, a.normalized_weights]));

          const executiveSessions: ExecutiveSession[] = sessionData.map(s => {
            const profile = profileMap.get(s.created_by);
            return {
              id: s.id,
              userId: s.created_by,
              userName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
              userEmail: profile?.email || '',
              status: s.layer2_completed ? 'completed' : s.status,
              completedAt: null,
              ahpWeights: ahpMap.get(s.id) as Record<string, number> | null,
            };
          });

          setSessions(executiveSessions);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSessions();
  }, [organizationId]);

  const completedSessions = sessions.filter(s => s.status === 'completed' && s.ahpWeights);
  const completionRate = sessions.length > 0 
    ? (completedSessions.length / sessions.length) * 100 
    : 0;

  const aggregateWeights = async () => {
    if (completedSessions.length < 2) {
      toast({
        title: "Not Enough Data",
        description: "Need at least 2 completed sessions to aggregate",
        variant: "destructive",
      });
      return;
    }

    setIsAggregating(true);
    try {
      // Calculate geometric mean for each consequence
      const consequences = Object.keys(completedSessions[0].ahpWeights!);
      const aggregated: Record<string, number> = {};

      for (const consequence of consequences) {
        const weights = completedSessions.map(s => s.ahpWeights![consequence] || 1);
        // Geometric mean
        const product = weights.reduce((acc, w) => acc * w, 1);
        const geoMean = Math.pow(product, 1 / weights.length);
        aggregated[consequence] = geoMean;
      }

      // Normalize to 100
      const total = Object.values(aggregated).reduce((sum, w) => sum + w, 0);
      for (const key of Object.keys(aggregated)) {
        aggregated[key] = (aggregated[key] / total) * 100;
      }

      setAggregatedWeights(aggregated);

      toast({
        title: "Weights Aggregated",
        description: `Calculated group consensus from ${completedSessions.length} executives`,
      });
    } catch (error) {
      console.error('Aggregation error:', error);
      toast({
        title: "Error",
        description: "Failed to aggregate weights",
        variant: "destructive",
      });
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Executive Progress
          </CardTitle>
          <CardDescription>
            Track completion status for group weight calibration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{completedSessions.length} of {sessions.length} completed</span>
                  <span className="font-medium">{completionRate.toFixed(0)}%</span>
                </div>
                <Progress value={completionRate} />
              </div>

              {/* Executive List */}
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {session.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{session.userName}</p>
                        <p className="text-xs text-muted-foreground">{session.userEmail}</p>
                      </div>
                    </div>
                    <Badge
                      variant={session.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {session.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Aggregate Button */}
              {completedSessions.length >= 2 && (
                <Button onClick={aggregateWeights} disabled={isAggregating} className="w-full">
                  {isAggregating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aggregating...
                    </>
                  ) : (
                    'Calculate Group Consensus (Geometric Mean)'
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregated Results */}
      {aggregatedWeights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group Consensus Weights</CardTitle>
            <CardDescription>
              Calculated using geometric mean across {completedSessions.length} executives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(aggregatedWeights)
                .sort(([, a], [, b]) => b - a)
                .map(([name, weight]) => (
                  <div key={name} className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{weight.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {name.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
