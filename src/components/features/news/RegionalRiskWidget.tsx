import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Cloud,
  ExternalLink,
  X,
  ChevronDown,
  MapPin,
  Clock,
  TrendingUp,
  Newspaper,
  Settings,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useNewsFeed, useNewsDismissals, useDismissNewsItem, useRefreshNewsFeed, NewsItem, WeatherAlert } from "@/hooks/useNewsFeed";
import { useHazards } from "@/hooks/useHazards";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return "border-l-4 border-red-600 bg-red-50 dark:bg-red-950/30";
    case "high":
      return "border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30";
    case "medium":
      return "border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30";
    default:
      return "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30";
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "high":
      return <Badge className="bg-orange-500">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500 text-black">Medium</Badge>;
    default:
      return <Badge variant="secondary">Low</Badge>;
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "weather":
      return <Cloud className="h-4 w-4" />;
    case "cybersecurity":
      return <AlertTriangle className="h-4 w-4" />;
    case "health":
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Newspaper className="h-4 w-4" />;
  }
}

interface AlertItemProps {
  item: WeatherAlert | NewsItem;
  onDismiss: () => void;
  isDismissing: boolean;
  matchedHazards: string[];
}

function AlertItem({ item, onDismiss, isDismissing, matchedHazards }: AlertItemProps) {
  const isWeather = "hash" in item;
  const id = isWeather ? (item as WeatherAlert).hash : (item as NewsItem).id;
  const title = item.title;
  const description = item.description;
  const link = isWeather ? (item as WeatherAlert).link : (item as NewsItem).url;
  const date = isWeather ? (item as WeatherAlert).pubDate : (item as NewsItem).published_at;
  const severity = item.severity;
  const category = item.category;

  return (
    <div className={`p-3 rounded-lg ${getSeverityStyles(severity)} transition-all`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{getCategoryIcon(category)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium line-clamp-2">{title}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
              onClick={onDismiss}
              disabled={isDismissing}
            >
              {isDismissing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
            <span className="text-xs text-muted-foreground">• {item.source}</span>
            {getSeverityBadge(severity)}
          </div>
          {matchedHazards.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <TrendingUp className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-blue-600">Related:</span>
              {matchedHazards.slice(0, 2).map((hazard, idx) => (
                <Badge key={idx} variant="outline" className="text-xs py-0">
                  {hazard}
                </Badge>
              ))}
              {matchedHazards.length > 2 && (
                <Badge variant="outline" className="text-xs py-0">
                  +{matchedHazards.length - 2}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {link && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  View Details <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegionalRiskWidget() {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState({ alerts: true, news: true });

  const { data: org, isLoading: orgLoading } = useOrganization();
  const { data: newsFeed, isLoading: feedLoading } = useNewsFeed();
  const { data: dismissals } = useNewsDismissals();
  const { data: hazards } = useHazards();
  const dismissItem = useDismissNewsItem();
  const refreshFeed = useRefreshNewsFeed();

  const newsEnabled = org?.news_settings?.enabled ?? false;
  const primaryLocation = org?.primary_location;

  // Match news to hazards (simple keyword matching)
  const matchNewsToHazards = (item: WeatherAlert | NewsItem): string[] => {
    if (!hazards) return [];
    const text = (item.title + " " + item.description).toLowerCase();
    
    const matches: string[] = [];
    for (const hazard of hazards) {
      const hazardsList = hazard.hazards_list as string[];
      for (const hazardName of hazardsList) {
        if (text.includes(hazardName.toLowerCase())) {
          matches.push(hazardName);
          break; // Only add each hazard category once
        }
      }
    }
    return matches;
  };

  // Filter out dismissed items
  const weatherAlerts = (newsFeed?.feed_data?.weather_alerts || []).filter(
    (alert) => !dismissals?.has(alert.hash)
  );

  const newsItems = (newsFeed?.feed_data?.news_items || []).filter(
    (item) => !dismissals?.has(item.id)
  );

  const handleDismiss = (itemHash: string) => {
    dismissItem.mutate(itemHash, {
      onSuccess: () => {
        toast({ title: "Item dismissed", description: "This item will no longer appear" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to dismiss item", variant: "destructive" });
      },
    });
  };

  const handleRefresh = () => {
    refreshFeed.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Feed refreshed", description: "Latest alerts and news fetched" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to refresh feed", variant: "destructive" });
      },
    });
  };

  // Loading state
  if (orgLoading || feedLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Regional Risk Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not enabled or no location configured
  if (!newsEnabled || !primaryLocation) {
    return (
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            Regional Risk Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enable location-based alerts and news by configuring your organization's
            location and preferences.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile">
              <Settings className="h-4 w-4 mr-2" />
              Configure Location Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = weatherAlerts.length + newsItems.length;
  const locationParts = primaryLocation.split(",");
  const cityName = locationParts[0]?.trim() || "Your Location";
  const provinceName = locationParts[1]?.trim() || "";

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Regional Risk Intelligence
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalAlerts}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshFeed.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${refreshFeed.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>{cityName}, {provinceName}</span>
          {newsFeed?.feed_data?.fetched_at && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(new Date(newsFeed.feed_data.fetched_at), { addSuffix: true })}
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {totalAlerts === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-sm">No active alerts</p>
            <p className="text-xs text-muted-foreground">
              Monitoring {cityName}, {provinceName}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Weather Alerts Section */}
            {weatherAlerts.length > 0 && (
              <Collapsible
                open={expandedSections.alerts}
                onOpenChange={(open) =>
                  setExpandedSections((prev) => ({ ...prev, alerts: open }))
                }
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-sm">Weather Alerts</span>
                      <Badge variant="destructive" className="text-xs">
                        {weatherAlerts.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.alerts ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2 pt-2">
                      {weatherAlerts.map((alert) => (
                        <AlertItem
                          key={alert.hash}
                          item={alert}
                          onDismiss={() => handleDismiss(alert.hash)}
                          isDismissing={dismissItem.isPending}
                          matchedHazards={matchNewsToHazards(alert)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* News Section */}
            {newsItems.length > 0 && (
              <Collapsible
                open={expandedSections.news}
                onOpenChange={(open) =>
                  setExpandedSections((prev) => ({ ...prev, news: open }))
                }
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Regional News</span>
                      <Badge variant="secondary" className="text-xs">
                        {newsItems.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.news ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2 pt-2">
                      {newsItems.map((item) => (
                        <AlertItem
                          key={item.id}
                          item={item}
                          onDismiss={() => handleDismiss(item.id)}
                          isDismissing={dismissItem.isPending}
                          matchedHazards={matchNewsToHazards(item)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
