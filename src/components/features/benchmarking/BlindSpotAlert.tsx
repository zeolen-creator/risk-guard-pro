import { AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAssessments } from "@/hooks/useAssessments";
import { useHazards } from "@/hooks/useHazards";

export function BlindSpotAlert() {
  const { data: assessments } = useAssessments();
  const { data: hazards } = useHazards();

  // Find hazard categories that haven't been assessed
  const assessedHazardIds = new Set(
    assessments?.flatMap(a => a.selected_hazards as string[] || []) || []
  );
  
  const unassessedHazards = hazards?.filter(h => !assessedHazardIds.has(h.id)) || [];
  const blindSpotCount = unassessedHazards.length;

  if (blindSpotCount === 0) return null;

  const topBlindSpots = unassessedHazards.slice(0, 3);

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
            <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">Risk Blind Spots Detected</h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                {blindSpotCount} categories
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              These hazard categories haven't been assessed yet and may pose unidentified risks:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {topBlindSpots.map((hazard) => (
                <Badge key={hazard.id} variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {hazard.category}
                </Badge>
              ))}
              {blindSpotCount > 3 && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                  +{blindSpotCount - 3} more
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900">
              <Link to="/assessment/new">
                Start Assessment
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
