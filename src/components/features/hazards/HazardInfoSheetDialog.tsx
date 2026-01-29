import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  AlertTriangle,
  Eye,
  Zap,
  ExternalLink,
  BookOpen,
  Download,
  Edit,
  Send,
  Loader2,
} from "lucide-react";
import { useHazardInfoSheet, ExternalResource } from "@/hooks/useHazardInfoSheets";
import { useRequestHazardInfoSheet } from "@/hooks/useHazardInfoRequests";

interface HazardInfoSheetDialogProps {
  hazardName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HazardInfoSheetDialog({
  hazardName,
  open,
  onOpenChange,
}: HazardInfoSheetDialogProps) {
  const { data: infoSheet, isLoading } = useHazardInfoSheet(hazardName);
  const requestInfoSheet = useRequestHazardInfoSheet();

  const handleRequestInfoSheet = () => {
    if (hazardName) {
      requestInfoSheet.mutate({ hazardName });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            {hazardName || "Hazard Information"}
          </DialogTitle>
          {infoSheet && (
            <DialogDescription>
              Category: {infoSheet.hazard_category}
              {infoSheet.is_system_provided && (
                <Badge variant="secondary" className="ml-2">System</Badge>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : infoSheet ? (
            <div className="space-y-6 pb-4">
              {/* Definition */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Definition
                </h3>
                <p className="text-foreground leading-relaxed">{infoSheet.definition}</p>
              </section>

              <Separator />

              {/* Common Causes */}
              {infoSheet.common_causes && infoSheet.common_causes.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Common Causes
                  </h3>
                  <ul className="space-y-2">
                    {infoSheet.common_causes.map((cause, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Warning Signs */}
              {infoSheet.warning_signs && infoSheet.warning_signs.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-yellow-500" />
                    Warning Signs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {infoSheet.warning_signs.map((sign, idx) => (
                      <Badge key={idx} variant="outline" className="py-1.5">
                        <Eye className="h-3 w-3 mr-1 text-yellow-500" />
                        {sign}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Response Actions */}
              {infoSheet.response_actions && infoSheet.response_actions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    First Response Actions
                  </h3>
                  <ol className="space-y-2">
                    {infoSheet.response_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* External Resources */}
              {infoSheet.external_resources && infoSheet.external_resources.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Learn More
                  </h3>
                  <div className="space-y-2">
                    {infoSheet.external_resources.map((resource: ExternalResource, idx: number) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <ExternalLink className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">{resource.name}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No information sheet available</p>
              <p className="text-sm text-muted-foreground mb-4">
                This hazard doesn't have detailed information yet.
              </p>
              <Button 
                variant="outline" 
                onClick={handleRequestInfoSheet}
                disabled={requestInfoSheet.isPending}
              >
                {requestInfoSheet.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Request Info Sheet
              </Button>
            </div>
          )}
        </ScrollArea>

        <Separator className="my-2" />

        <div className="flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Edit className="h-4 w-4 mr-2" />
            Customize for My Org
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
