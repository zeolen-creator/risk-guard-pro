import { Link, useNavigate } from "react-router-dom";
import { useAssessments } from "@/hooks/useAssessments";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  FileText,
  ArrowLeft,
  Loader2,
  Search,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export default function AssessmentHistoryPage() {
  const navigate = useNavigate();
  const { data: assessments, isLoading } = useAssessments();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");

  const completedAssessments = assessments?.filter(a => a.status === "completed") || [];
  
  const filteredAssessments = completedAssessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskLevel = (risk: number) => {
    if (risk >= 70) return { label: "High", variant: "destructive" as const };
    if (risk >= 40) return { label: "Medium", variant: "secondary" as const };
    return { label: "Low", variant: "default" as const };
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
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Assessment History</h1>
          <p className="text-muted-foreground">
            View all completed risk assessments for your organization
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedAssessments.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {completedAssessments.filter(a => a.total_risk >= 70).length}
                  </p>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {completedAssessments.length > 0
                      ? new Date(completedAssessments[0]?.created_at).toLocaleDateString("en-US", { month: "short" })
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Latest</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed Assessments</CardTitle>
            <CardDescription>
              {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No assessments match your search" : "No completed assessments yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssessments.map((assessment) => {
                  const riskInfo = getRiskLevel(assessment.total_risk);
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
                            Completed {new Date(assessment.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Risk Score: {assessment.total_risk.toFixed(1)}
                          </p>
                          <Badge variant={riskInfo.variant} className="text-xs">
                            {riskInfo.label} Risk
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
