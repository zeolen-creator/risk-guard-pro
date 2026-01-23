import { useState } from "react";
import { Link } from "react-router-dom";
import { useHazards } from "@/hooks/useHazards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Shield,
  Search,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function HazardsLibraryPage() {
  const { data: hazards, isLoading } = useHazards();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHazards = hazards?.filter((category) => {
    const matchesCategory = category.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHazards = category.hazards_list.some((h) =>
      h.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCategory || matchesHazards;
  });

  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-accent/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Hazard Library</h1>
          <p className="text-muted-foreground">
            Comprehensive catalog of 24 hazard categories across all industries
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hazards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHazards?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No hazards found matching "{searchQuery}"</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {filteredHazards?.map((category) => (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border rounded-lg bg-card shadow-sm"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <AlertTriangle className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {category.category_number}. {highlightMatch(category.category)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {category.hazards_list.length} hazards
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-4 pl-11">
                          {category.description}
                        </p>
                      )}
                      <div className="pl-11 flex flex-wrap gap-2">
                        {category.hazards_list.map((hazard, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-sm font-normal"
                          >
                            {highlightMatch(hazard)}
                          </Badge>
                        ))}
                      </div>
                      {category.tags.length > 0 && (
                        <div className="pl-11 mt-4 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Tags:</span>
                          {category.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}

        {/* Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Library Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">{hazards?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">
                  {hazards?.reduce((acc, h) => acc + h.hazards_list.length, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Hazards</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">10</p>
                <p className="text-sm text-muted-foreground">Consequence Types</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">6</p>
                <p className="text-sm text-muted-foreground">Probability Levels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
