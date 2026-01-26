import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { useAssessments } from "@/hooks/useAssessments";
import { useDeleteAssessment } from "@/hooks/useDeleteAssessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  Plus,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  LogOut,
  User,
  Building2,
  Loader2,
  History,
  Scale,
  Trash2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: assessments, isLoading: assessmentsLoading } = useAssessments();
  const deleteAssessment = useDeleteAssessment();

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; assessment: { id: string; title: string } | null }>({
    open: false,
    assessment: null,
  });

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

  // Generate real risk trend data from assessments
  const generateRiskTrendData = () => {
    if (!assessments || assessments.length === 0) {
      return [
        { month: "Jan", risk: 0 },
        { month: "Feb", risk: 0 },
        { month: "Mar", risk: 0 },
        { month: "Apr", risk: 0 },
        { month: "May", risk: 0 },
        { month: "Jun", risk: 0 },
      ];
    }

    const monthlyData: Record<string, { risks: number[]; count: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    assessments.forEach(assessment => {
      if (assessment.total_risk && assessment.total_risk > 0) {
        const date = new Date(assessment.created_at);
        const monthKey = monthNames[date.getMonth()];
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { risks: [], count: 0 };
        }
        
        monthlyData[monthKey].risks.push(assessment.total_risk);
        monthlyData[monthKey].count++;
      }
    });

    const now = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return monthNames[date.getMonth()];
    });

    return last6Months.map(month => ({
      month,
      risk: monthlyData[month]?.risks.length > 0
        ? Math.round(monthlyData[month].risks.reduce((sum, r) => sum + r, 0) / monthlyData[month].risks.length)
        : 0
    }));
  };

  const riskTrendData = generateRiskTrendData();
  const recentAssessments = assessments?.slice(0, 5) || [];
  const totalAssessments = assessments?.length || 0;
  const draftAssessments = assessments?.filter(a => a.status === "draft").length || 0;
  const completedAssessments = assessments?.filter(a => a.status === "completed").length || 0;
  const highRiskItems = assessments?.filter(a => a.total_risk > 70).length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">HIRA Pro</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{organization.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back{profile?.role_title ? `, ${profile.role_title}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Manage your hazard assessments and track organizational risk
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assessments</p>
                  <p className="text-2xl font-bold">{totalAssessments}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{draftAssessments}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedAssessments}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Risk Items</p>
                  <p className="text-2xl font-bold">{highRiskItems}</p>
                </div>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risk Trend</CardTitle>
              <CardDescription>Average organizational risk score over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="risk"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your risk assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start bg-primary hover:bg-primary/90" 
                asChild
              >
                <Link to="/assessment/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Assessment
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/hazards">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  View Hazard Library
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/documents">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Documents
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/assessments/history">
                  <History className="mr-2 h-4 w-4" />
                  View Past Assessments
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/settings/weights">
                  <Scale className="mr-2 h-4 w-4" />
                  View Consequence Weights
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assessments */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Your latest hazard identification activities</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/assessments/history">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {assessmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentAssessments.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No assessments yet</p>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  asChild
                >
                  <Link to="/assessment/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Assessment
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAssessments.map((assessment) => (
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
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {assessment.total_risk > 0 && (
                        <span className="text-sm font-medium">
                          Risk: {assessment.total_risk.toFixed(1)}
                        </span>
                      )}
                      {getStatusBadge(assessment.status)}
                      {assessment.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteClick(e, { id: assessment.id, title: assessment.title })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
