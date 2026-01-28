import { useState } from "react";
import { format } from "date-fns";
import { Plus, FileText, Download, Eye, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useExecutiveReports, useGenerateReport, useApproveReport, ExecutiveReport } from "@/hooks/useExecutiveReports";
import { toast } from "sonner";

const reportTypeLabels = {
  quarterly: "Quarterly Report",
  annual: "Annual Report",
  ad_hoc: "Ad-hoc Report",
  board: "Board Report",
};

export function ExecutiveReportsPanel() {
  const { data: reports = [], isLoading } = useExecutiveReports();
  const generateReport = useGenerateReport();
  const approveReport = useApproveReport();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExecutiveReport | null>(null);

  const [newReport, setNewReport] = useState({
    report_type: "quarterly" as ExecutiveReport["report_type"],
    title: "",
    period_start: "",
    period_end: new Date().toISOString().split("T")[0],
  });

  const handleGenerate = async () => {
    if (!newReport.title || !newReport.period_start || !newReport.period_end) {
      toast.error("All fields are required");
      return;
    }

    try {
      await generateReport.mutateAsync(newReport);
      toast.success("Report generated successfully");
      setShowGenerateDialog(false);
      setNewReport({
        report_type: "quarterly",
        title: "",
        period_start: "",
        period_end: new Date().toISOString().split("T")[0],
      });
    } catch {
      toast.error("Failed to generate report");
    }
  };

  const handleApprove = async (reportId: string) => {
    try {
      await approveReport.mutateAsync(reportId);
      toast.success("Report approved");
    } catch {
      toast.error("Failed to approve report");
    }
  };

  const handlePreview = (report: ExecutiveReport) => {
    setSelectedReport(report);
    setShowPreviewDialog(true);
  };

  const getTrendBadge = (trend?: string) => {
    switch (trend) {
      case "improving":
        return <Badge className="bg-green-100 text-green-800">Improving</Badge>;
      case "declining":
        return <Badge className="bg-red-100 text-red-800">Declining</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Stable</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Executive Reports</CardTitle>
            <CardDescription>Generate and manage risk summary reports</CardDescription>
          </div>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No reports generated yet</p>
            <Button className="mt-4" onClick={() => setShowGenerateDialog(true)}>
              Generate Your First Report
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(report.period_start), "MMM d, yyyy")} -{" "}
                        {format(new Date(report.period_end), "MMM d, yyyy")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">{reportTypeLabels[report.report_type]}</Badge>
                        {getTrendBadge(report.summary.trend)}
                        {report.approved_at && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{report.summary.total_assessments} assessments</span>
                        <span>Avg Risk: {report.summary.avg_risk_score}</span>
                        <span>{report.summary.high_risk_count} high risk</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handlePreview(report)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    {!report.approved_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(report.id)}
                        disabled={approveReport.isPending}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Report Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Executive Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Report Title *</Label>
                <Input
                  id="title"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  placeholder="Q1 2026 Risk Summary"
                />
              </div>
              <div>
                <Label htmlFor="type">Report Type *</Label>
                <Select
                  value={newReport.report_type}
                  onValueChange={(value) =>
                    setNewReport({ ...newReport, report_type: value as ExecutiveReport["report_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly Report</SelectItem>
                    <SelectItem value="annual">Annual Report</SelectItem>
                    <SelectItem value="ad_hoc">Ad-hoc Report</SelectItem>
                    <SelectItem value="board">Board Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Period Start *</Label>
                  <Input
                    id="start"
                    type="date"
                    value={newReport.period_start}
                    onChange={(e) => setNewReport({ ...newReport, period_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end">Period End *</Label>
                  <Input
                    id="end"
                    type="date"
                    value={newReport.period_end}
                    onChange={(e) => setNewReport({ ...newReport, period_end: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generateReport.isPending}>
                {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReport?.title}</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Assessments</p>
                      <p className="text-xl font-bold">{selectedReport.summary.total_assessments}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Avg Risk</p>
                      <p className="text-xl font-bold">{selectedReport.summary.avg_risk_score}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">High Risk</p>
                      <p className="text-xl font-bold">{selectedReport.summary.high_risk_count}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Trend</p>
                      {getTrendBadge(selectedReport.summary.trend)}
                    </div>
                  </div>
                </div>

                {selectedReport.key_findings.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Key Findings</h3>
                      <div className="space-y-2">
                        {selectedReport.key_findings.map((finding, idx) => (
                          <div key={idx} className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{finding.title}</p>
                              {finding.severity && (
                                <Badge variant={finding.severity === "high" ? "destructive" : "secondary"}>
                                  {finding.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{finding.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedReport.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Recommendations</h3>
                      <div className="space-y-2">
                        {selectedReport.recommendations.map((rec, idx) => (
                          <div key={idx} className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{rec.title}</p>
                              {rec.priority && (
                                <Badge variant={rec.priority === "high" ? "destructive" : "secondary"}>
                                  {rec.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
