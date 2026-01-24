import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, AlertTriangle } from "lucide-react";
import { Hazard } from "@/hooks/useHazards";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HazardSelectionStepProps {
  hazards: Hazard[];
  selectedHazards: string[];
  onSelectionChange: (hazards: string[]) => void;
}

export function HazardSelectionStep({
  hazards,
  selectedHazards,
  onSelectionChange,
}: HazardSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHazards = hazards.filter(
    (h) =>
      h.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.hazards_list.some((item) =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const toggleHazard = (hazardId: string) => {
    if (selectedHazards.includes(hazardId)) {
      onSelectionChange(selectedHazards.filter((id) => id !== hazardId));
    } else {
      onSelectionChange([...selectedHazards, hazardId]);
    }
  };

  const toggleCategory = (category: Hazard) => {
    const categoryHazardIds = [category.id];
    const allSelected = categoryHazardIds.every((id) =>
      selectedHazards.includes(id)
    );

    if (allSelected) {
      onSelectionChange(
        selectedHazards.filter((id) => !categoryHazardIds.includes(id))
      );
    } else {
      onSelectionChange([
        ...new Set([...selectedHazards, ...categoryHazardIds]),
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Hazards</h3>
          <p className="text-sm text-muted-foreground">
            Choose the hazards relevant to your assessment
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {selectedHazards.length} selected
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hazards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[400px] md:h-[500px]">
        <Accordion type="multiple" className="w-full space-y-2">
          {filteredHazards.map((hazard) => (
            <AccordionItem
              key={hazard.id}
              value={hazard.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 w-full">
                  <Checkbox
                    checked={selectedHazards.includes(hazard.id)}
                    onCheckedChange={() => toggleCategory(hazard)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-medium text-left">
                      {hazard.category_number}. {hazard.category}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {hazard.hazards_list.length} items
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-8 space-y-2 pb-2">
                  {hazard.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {hazard.description}
                    </p>
                  )}
                  <div className="grid gap-1">
                    {hazard.hazards_list.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary">•</span>
                        {item}
                      </div>
                    ))}
                  </div>
                  {hazard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hazard.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>

      {selectedHazards.length === 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm text-warning">
              Please select at least one hazard to continue
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
