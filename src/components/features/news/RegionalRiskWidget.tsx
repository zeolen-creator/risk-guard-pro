import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cloud,
  ExternalLink,
  X,
  MapPin,
  Clock,
  TrendingUp,
  Newspaper,
  Settings,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Shield,
  Heart,
  Zap,
  DollarSign,
  Building2,
  Globe,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useNewsFeed, useNewsDismissals, useDismissNewsItem, useRefreshNewsFeed, NewsItem, WeatherAlert } from "@/hooks/useNewsFeed";
import { useHazards } from "@/hooks/useHazards";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Category = "weather" | "security" | "health" | "infrastructure" | "financial" | "general";

const CATEGORY_CONFIG: Record<Category, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  weather: { icon: Cloud, label: "Weather & Environment", color: "text-sky-600", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
  security: { icon: Shield, label: "Security & Safety", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  health: { icon: Heart, label: "Health & Public Safety", color: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  infrastructure: { icon: Zap, label: "Infrastructure & Transit", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  financial: { icon: DollarSign, label: "Business & Financial", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  general: { icon: Globe, label: "General News", color: "text-slate-600", bgColor: "bg-slate-50 dark:bg-slate-950/30" },
};

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return "border-l-4 border-l-red-600";
    case "high":
      return "border-l-4 border-l-orange-500";
    case "medium":
      return "border-l-4 border-l-yellow-500";
    default:
      return "border-l-4 border-l-blue-400";
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive" className="text-xs">Critical</Badge>;
    case "high":
      return <Badge className="bg-orange-500 text-xs">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500 text-black text-xs">Medium</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Low</Badge>;
  }
}

interface NewsCardProps {
  item: WeatherAlert | NewsItem;
  onDismiss: () => void;
  isDismissing: boolean;
  matchedHazards: string[];
  category: Category;
}

function NewsCard({ item, onDismiss, isDismissing, matchedHazards, category }: NewsCardProps) {
  const isWeather = "hash" in item;
  const title = item.title;
  const description = item.description;
  const link = isWeather ? (item as WeatherAlert).link : (item as NewsItem).url;
  const date = isWeather ? (item as WeatherAlert).pubDate : (item as NewsItem).published_at;
  const severity = item.severity;

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bgColor} ${getSeverityStyles(severity)} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold line-clamp-2 text-foreground">{title}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1 hover:bg-destructive/10"
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
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
          
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
            <span className="text-xs text-muted-foreground">• {item.source}</span>
            {getSeverityBadge(severity)}
          </div>

          {matchedHazards.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary font-medium">Related:</span>
              {matchedHazards.slice(0, 2).map((hazard, idx) => (
                <Badge key={idx} variant="outline" className="text-xs py-0 border-primary/30">
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

          {link && (
            <div className="mt-3">
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Read Full Article <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  items: (WeatherAlert | NewsItem)[];
  category: Category;
  onDismiss: (hash: string) => void;
  isDismissing: boolean;
  matchNewsToHazards: (item: WeatherAlert | NewsItem) => string[];
}

function CategorySection({ items, category, onDismiss, isDismissing, matchNewsToHazards }: CategorySectionProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No {config.label.toLowerCase()} updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const id = "hash" in item ? item.hash : item.id;
        return (
          <NewsCard
            key={id}
            item={item}
            category={category}
            onDismiss={() => onDismiss(id)}
            isDismissing={isDismissing}
            matchedHazards={matchNewsToHazards(item)}
          />
        );
      })}
    </div>
  );
}

export function RegionalRiskWidget() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");

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
          break;
        }
      }
    }
    return matches;
  };

  // Filter out dismissed items and deduplicate by URL
  const { weatherAlerts, newsItems, categorizedNews } = useMemo(() => {
    const alerts = (newsFeed?.feed_data?.weather_alerts || []).filter(
      (alert) => !dismissals?.has(alert.hash)
    );

    const allNews = (newsFeed?.feed_data?.news_items || []).filter(
      (item) => !dismissals?.has(item.id)
    );

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueNews = allNews.filter((item) => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // Categorize news
    const categorized: Record<Category, NewsItem[]> = {
      weather: [],
      security: [],
      health: [],
      infrastructure: [],
      financial: [],
      general: [],
    };

    uniqueNews.forEach((item) => {
      const cat = (item.category as Category) || "general";
      if (categorized[cat]) {
        categorized[cat].push(item);
      } else {
        categorized.general.push(item);
      }
    });

    return {
      weatherAlerts: alerts,
      newsItems: uniqueNews,
      categorizedNews: categorized,
    };
  }, [newsFeed, dismissals]);

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
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Regional Risk Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not enabled or no location configured
  if (!newsEnabled || !primaryLocation) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
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

  // Count items per category
  const categoryCounts = {
    all: totalAlerts,
    weather: weatherAlerts.length + categorizedNews.weather.length,
    security: categorizedNews.security.length,
    health: categorizedNews.health.length,
    infrastructure: categorizedNews.infrastructure.length,
    financial: categorizedNews.financial.length,
    general: categorizedNews.general.length,
  };

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Regional Risk Intelligence
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {totalAlerts}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
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
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={refreshFeed.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${refreshFeed.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {totalAlerts === 0 ? (
          <div className="text-center py-8 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-semibold text-green-700 dark:text-green-400">No Active Alerts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoring {cityName}, {provinceName}
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="flex-1 min-w-[80px] text-xs">
                <Newspaper className="h-3 w-3 mr-1" />
                All ({categoryCounts.all})
              </TabsTrigger>
              {categoryCounts.weather > 0 && (
                <TabsTrigger value="weather" className="flex-1 min-w-[80px] text-xs">
                  <Cloud className="h-3 w-3 mr-1" />
                  Weather ({categoryCounts.weather})
                </TabsTrigger>
              )}
              {categoryCounts.security > 0 && (
                <TabsTrigger value="security" className="flex-1 min-w-[80px] text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Security ({categoryCounts.security})
                </TabsTrigger>
              )}
              {categoryCounts.infrastructure > 0 && (
                <TabsTrigger value="infrastructure" className="flex-1 min-w-[80px] text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Transit ({categoryCounts.infrastructure})
                </TabsTrigger>
              )}
              {categoryCounts.financial > 0 && (
                <TabsTrigger value="financial" className="flex-1 min-w-[80px] text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Business ({categoryCounts.financial})
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-2">
              <TabsContent value="all" className="mt-0 space-y-3">
                {/* Weather Alerts first (priority) */}
                {weatherAlerts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Active Weather Alerts
                    </div>
                    {weatherAlerts.map((alert) => (
                      <NewsCard
                        key={alert.hash}
                        item={alert}
                        category="weather"
                        onDismiss={() => handleDismiss(alert.hash)}
                        isDismissing={dismissItem.isPending}
                        matchedHazards={matchNewsToHazards(alert)}
                      />
                    ))}
                  </div>
                )}
                
                {/* All news sorted by relevance */}
                {newsItems.map((item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    category={(item.category as Category) || "general"}
                    onDismiss={() => handleDismiss(item.id)}
                    isDismissing={dismissItem.isPending}
                    matchedHazards={matchNewsToHazards(item)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="weather" className="mt-0">
                <div className="space-y-3">
                  {weatherAlerts.map((alert) => (
                    <NewsCard
                      key={alert.hash}
                      item={alert}
                      category="weather"
                      onDismiss={() => handleDismiss(alert.hash)}
                      isDismissing={dismissItem.isPending}
                      matchedHazards={matchNewsToHazards(alert)}
                    />
                  ))}
                  <CategorySection
                    items={categorizedNews.weather}
                    category="weather"
                    onDismiss={handleDismiss}
                    isDismissing={dismissItem.isPending}
                    matchNewsToHazards={matchNewsToHazards}
                  />
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <CategorySection
                  items={categorizedNews.security}
                  category="security"
                  onDismiss={handleDismiss}
                  isDismissing={dismissItem.isPending}
                  matchNewsToHazards={matchNewsToHazards}
                />
              </TabsContent>

              <TabsContent value="infrastructure" className="mt-0">
                <CategorySection
                  items={categorizedNews.infrastructure}
                  category="infrastructure"
                  onDismiss={handleDismiss}
                  isDismissing={dismissItem.isPending}
                  matchNewsToHazards={matchNewsToHazards}
                />
              </TabsContent>

              <TabsContent value="financial" className="mt-0">
                <CategorySection
                  items={categorizedNews.financial}
                  category="financial"
                  onDismiss={handleDismiss}
                  isDismissing={dismissItem.isPending}
                  matchNewsToHazards={matchNewsToHazards}
                />
              </TabsContent>

              <TabsContent value="general" className="mt-0">
                <CategorySection
                  items={categorizedNews.general}
                  category="general"
                  onDismiss={handleDismiss}
                  isDismissing={dismissItem.isPending}
                  matchNewsToHazards={matchNewsToHazards}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
