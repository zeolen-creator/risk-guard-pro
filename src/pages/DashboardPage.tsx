import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { useAssessments } from "@/hooks/useAssessments";
import { useDeleteAssessment } from "@/hooks/useDeleteAssessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  LogOut,
  User,
  Building2,
  Loader2,
  History,
  Scale,
  Trash2,
  BarChart3,
  Target,
  Activity,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calendar,
  Zap,
  Bell,
  Users,
  Flame,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { RiskAlertsWidget } from "@/components/features/alerts/RiskAlertsWidget";
import { BlindSpotAlert } from "@/components/features/benchmarking/BlindSpotAlert";
import { RiskPredictionPanel } from "@/components/features/predictions/RiskPredictionPanel";
import { RegionalRiskWidget } from "@/components/features/news/RegionalRiskWidget";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: assessments, isLoading: assessmentsLoading } = useAssessments();
  const deleteAssessment = useDeleteAssessment();

  const [greeting, setGreeting] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; assessment: { id: string; title: string } | null }>({
    open: false,
    assessment: null,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteClick = (e: React.MouseEvent, assessment: { id: string; title: string }) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, assessment });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.assessment) return;

    try {
      await deleteAssessment.mutateAsync(deleteDialog.assessment.id);
      toast.success("Assessment deleted successfully");
      setDeleteDialog({ open: false, assessment: null });
    } catch (error) {
      toast.error("Failed to delete assessment");
    }
  };

  if (profileLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to onboarding if no org
  if (!profile?.org_id || !organization) {
    navigate("/onboarding");
    return null;
  }

  // Calculate metrics
  const totalAssessments = assessments?.length || 0;
  const completedAssessments = assessments?.filter(a => a.status === "completed").length || 0;
  const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
  const avgRiskScore = completedAssessments > 0
    ? Math.round(assessments!.filter(a => a.status === "completed").reduce((sum, a) => sum + (a.total_risk || 0), 0) / completedAssessments)
    : 0;
  const highRiskCount = assessments?.filter(a => (a.total_risk || 0) >= 70).length || 0;

  // Calculate 7-day trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentAssessments = assessments?.filter(
    a => a.status === "completed" && new Date(a.updated_at) >= sevenDaysAgo
  ) || [];
  const previousAssessments = assessments?.filter(
    a => a.status === "completed" && new Date(a.updated_at) < sevenDaysAgo
  ) || [];
  
  const recentAvg = recentAssessments.length > 0
    ? recentAssessments.reduce((sum, a) => sum + (a.total_risk || 0), 0) / recentAssessments.length
    : 0;
  const previousAvg = previousAssessments.length > 0
    ? previousAssessments.reduce((sum, a) => sum + (a.total_risk || 0), 0) / previousAssessments.length
    : avgRiskScore;
  const trendPercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: "HIGH", color: "bg-red-600", textColor: "text-red-600", emoji: "🔴" };
    if (score >= 40) return { label: "MODERATE", color: "bg-yellow-500", textColor: "text-yellow-600", emoji: "🟡" };
    return { label: "LOW", color: "bg-green-600", textColor: "text-green-600", emoji: "🟢" };
  };

  const riskLevel = getRiskLevel(avgRiskScore);
  const recentList = assessments?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">HIRA Pro</span>
            </Link>

            <div className="flex items-center gap-3">
              <RiskAlertsWidget />
              <Badge variant="secondary" className="bg-white/20 text-white text-sm px-3 py-1 backdrop-blur-sm hidden sm:flex">
                <Calendar className="h-4 w-4 mr-1" />
                Next Review: {format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "MMM d")}
              </Badge>
              <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/20">
                <Link to="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white hover:bg-white/20">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {greeting}, {profile?.role_title || user?.email?.split("@")[0] || "there"}! 👋
              </h1>
              <p className="text-blue-100 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {organization.name} · Risk Posture:
                <Badge className={`${riskLevel.color} text-white`}>
                  {riskLevel.label} {riskLevel.emoji}
                </Badge>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Critical Alerts Banner */}
      {highRiskCount > 0 && (
        <div className="bg-red-600 text-white py-3 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <span className="font-medium">
                {highRiskCount} HIGH RISK ITEM{highRiskCount > 1 ? "S" : ""} REQUIRING ATTENTION
              </span>
            </div>
            <Button variant="secondary" size="sm" asChild className="bg-white text-red-600 hover:bg-red-50">
              <Link to="/analytics">
                View Alerts <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Overall Risk Score */}
          <Card className="border-2 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <Target className="h-6 w-6 text-blue-600" />
                <Badge className={riskLevel.color}>{riskLevel.label}</Badge>
              </div>
              <div className="text-4xl font-bold mb-1">{avgRiskScore}</div>
              <p className="text-sm text-muted-foreground">Overall Risk Score</p>
            </CardContent>
          </Card>

          {/* 7-Day Trend */}
          <Card className="border-2 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <Activity className="h-6 w-6 text-purple-600" />
                {trendPercent < 0 ? (
                  <TrendingDown className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingUp className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="text-4xl font-bold mb-1">{Math.abs(Math.round(trendPercent))}%</div>
              <p className="text-sm text-muted-foreground">7-Day Trend</p>
              {trendPercent < 0 ? (
                <Badge className="bg-green-600 mt-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Improving!
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-2">Stable</Badge>
              )}
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="border-2 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                {completionRate === 100 && <Sparkles className="h-6 w-6 text-yellow-500" />}
              </div>
              <div className="text-4xl font-bold mb-1">{Math.round(completionRate)}%</div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <Progress value={completionRate} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{completedAssessments} / {totalAssessments} assessments</p>
            </CardContent>
          </Card>

          {/* High Risk Items */}
          <Card className="border-2 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <Shield className="h-6 w-6 text-orange-600" />
                {highRiskCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {highRiskCount} Critical
                  </Badge>
                )}
              </div>
              <div className="text-4xl font-bold mb-1">{highRiskCount}</div>
              <p className="text-sm text-muted-foreground">High Risk Items</p>
            </CardContent>
          </Card>
        </div>

        {/* Blind Spot Alert */}
        <div className="mb-6">
          <BlindSpotAlert />
        </div>

        {/* Regional Risk Intelligence */}
        <div className="mb-6">
          <RegionalRiskWidget />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Predictions */}
            <RiskPredictionPanel />

            {/* Industry Benchmarking Card */}
            <Card className="border-2 border-purple-200 hover:shadow-lg transition-shadow dark:border-purple-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Industry Benchmarking
                  </CardTitle>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Beta</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600">68%</div>
                    <p className="text-sm text-muted-foreground">Percentile</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm mb-2">Better than 68% of peers! 🎉</p>
                    <p className="text-xs text-muted-foreground">Compared to similar organizations in your region</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <Link to="/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Full Benchmark Report
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Assessments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Assessments</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/assessments/history">View All →</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentList.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">No assessments yet</p>
                    <Button asChild>
                      <Link to="/assessment/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Assessment
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentList.map((assessment) => {
                      const level = getRiskLevel(assessment.total_risk || 0);
                      return (
                        <div
                          key={assessment.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => navigate(`/assessment/${assessment.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{assessment.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(assessment.updated_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={level.textColor}>
                              {assessment.total_risk?.toFixed(0) || 0}
                            </Badge>
                            {assessment.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDeleteClick(e, { id: assessment.id, title: assessment.title })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" asChild>
                  <Link to="/assessment/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Assessment
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/settings/weights">
                    <Scale className="h-4 w-4 mr-2" />
                    View Consequence Weights
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/analytics">
                    <Flame className="h-4 w-4 mr-2" />
                    Run Monte Carlo
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/analytics">
                    <Bell className="h-4 w-4 mr-2" />
                    View All Alerts
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Team Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Your Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">5</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Activity</p>
                    <p className="text-2xl font-bold">2h ago</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  This Week: <span className="font-medium text-foreground">{recentAssessments.length} assessments</span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Reviews */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Upcoming Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Fire Safety Assessment</p>
                    <p className="text-xs text-muted-foreground">Due in 3 days</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Workplace Violence Prevention</p>
                    <p className="text-xs text-muted-foreground">Due in 2 weeks</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link to="/assessments/history">View Full Schedule →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Seasonal Risks */}
            <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Seasonal Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-500">❄️</span>
                  <span>Ice storm season (Feb-Mar)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-500">🌊</span>
                  <span>Spring flooding risk increasing</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link to="/hazards">View Full Calendar →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Assessment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.assessment?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <p className="font-medium">Warning: This action cannot be undone.</p>
            <p className="mt-1">This will permanently delete the assessment and all related hazard assignments.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, assessment: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteAssessment.isPending}
            >
              {deleteAssessment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
