import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Users, Send, CheckCircle, Clock, XCircle, MessageSquare, UserPlus } from "lucide-react";
import { useStakeholders, useCreateStakeholder, useStakeholderReviews, useSendForReview, Stakeholder, StakeholderReview } from "@/hooks/useStakeholders";

interface StakeholderPanelProps {
  assessmentId: string;
}

export function StakeholderPanel({ assessmentId }: StakeholderPanelProps) {
  const { data: stakeholders, isLoading: loadingStakeholders } = useStakeholders();
  const { data: reviews, isLoading: loadingReviews } = useStakeholderReviews(assessmentId);
  const createStakeholder = useCreateStakeholder();
  const sendForReview = useSendForReview();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    role: "",
    department: "",
    email: "",
    phone: "",
  });

  const handleAddStakeholder = async () => {
    await createStakeholder.mutateAsync(newStakeholder);
    setNewStakeholder({ name: "", role: "", department: "", email: "", phone: "" });
    setIsAddDialogOpen(false);
  };

  const handleSendForReview = async () => {
    await sendForReview.mutateAsync({
      assessmentId,
      stakeholderIds: selectedStakeholders,
    });
    setSelectedStakeholders([]);
    setIsSendDialogOpen(false);
  };

  const toggleStakeholder = (id: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getStatusIcon = (status: StakeholderReview["status"]) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "changes_requested": return <MessageSquare className="h-4 w-4 text-yellow-400" />;
      case "declined": return <XCircle className="h-4 w-4 text-red-400" />;
      case "in_review": return <Clock className="h-4 w-4 text-blue-400" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: StakeholderReview["status"]) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-400";
      case "changes_requested": return "bg-yellow-500/20 text-yellow-400";
      case "declined": return "bg-red-500/20 text-red-400";
      case "in_review": return "bg-blue-500/20 text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isLoading = loadingStakeholders || loadingReviews;

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Stakeholder Reviews
              </CardTitle>
              <CardDescription>
                Track review status and approvals from stakeholders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Stakeholder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Stakeholder</DialogTitle>
                    <DialogDescription>
                      Add a stakeholder who can review and approve assessments.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newStakeholder.name}
                        onChange={(e) => setNewStakeholder(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={newStakeholder.role}
                          onChange={(e) => setNewStakeholder(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="Director"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={newStakeholder.department}
                          onChange={(e) => setNewStakeholder(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="Operations"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newStakeholder.email}
                        onChange={(e) => setNewStakeholder(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddStakeholder} disabled={!newStakeholder.name || createStakeholder.isPending}>
                      {createStakeholder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Stakeholder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Request Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send for Review</DialogTitle>
                    <DialogDescription>
                      Select stakeholders to request review from.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2 py-4">
                      {stakeholders?.map((stakeholder) => {
                        const alreadyRequested = reviews?.some(r => r.stakeholder_id === stakeholder.id);
                        return (
                          <div
                            key={stakeholder.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              alreadyRequested ? "opacity-50" : "cursor-pointer hover:bg-muted/50"
                            }`}
                            onClick={() => !alreadyRequested && toggleStakeholder(stakeholder.id)}
                          >
                            <Checkbox
                              checked={selectedStakeholders.includes(stakeholder.id)}
                              disabled={alreadyRequested}
                              onCheckedChange={() => toggleStakeholder(stakeholder.id)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{stakeholder.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {[stakeholder.role, stakeholder.department].filter(Boolean).join(" • ")}
                              </div>
                            </div>
                            {alreadyRequested && (
                              <Badge variant="secondary" className="text-xs">Already requested</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendForReview} disabled={selectedStakeholders.length === 0 || sendForReview.isPending}>
                      {sendForReview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send to {selectedStakeholders.length} Stakeholder(s)
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !reviews?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No review requests sent yet.</p>
              <p className="text-sm">Click "Request Review" to get stakeholder feedback.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(review.status)}
                    <div>
                      <div className="font-medium">{review.stakeholder?.name || "Unknown"}</div>
                      <div className="text-sm text-muted-foreground">
                        {review.stakeholder?.role} • Sent {new Date(review.sent_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(review.status)}>
                    {review.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
