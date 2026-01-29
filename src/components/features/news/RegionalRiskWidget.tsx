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
  Scale,
  ShieldAlert,
  Package,
  Leaf,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useNewsFeed, useNewsDismissals, useDismissNewsItem, useRefreshNewsFeed, NewsItem, WeatherAlert } from "@/hooks/useNewsFeed";
import { useHazards } from "@/hooks/useHazards";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { NewsImage } from "./NewsImage";
import { getIndustryCategoryConfig, NewsCategory, CATEGORY_DISPLAY_CONFIG } from "@/constants/industryCategoryMappings";

// Icon mapping for dynamic rendering
const ICON_MAP: Record<string, React.ElementType> = {
  Cloud,
  Shield,
  Heart,
  Zap,
  DollarSign,
  Globe,
  Scale,
  ShieldAlert,
  Package,
  Leaf,
  Building2,
};

type Category = "weather" | "security" | "health" | "infrastructure" | "financial" | "regulatory" | "cyber" | "supply_chain" | "environmental" | "general";

const CATEGORY_CONFIG: Record<Category, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  weather: { icon: Cloud, label: "Weather & Environment", color: "text-sky-600", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
  security: { icon: Shield, label: "Security & Safety", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  health: { icon: Heart, label: "Health & Medical", color: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  infrastructure: { icon: Zap, label: "Infrastructure", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  financial: { icon: DollarSign, label: "Business & Economic", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  regulatory: { icon: Scale, label: "Regulatory", color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  cyber: { icon: ShieldAlert, label: "Cybersecurity", color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  supply_chain: { icon: Package, label: "Supply Chain", color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  environmental: { icon: Leaf, label: "Environmental", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
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
  const imageUrl = !isWeather ? (item as NewsItem).image_url : null;

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;

  return (
    <div className={`p-3 rounded-lg ${config.bgColor} ${getSeverityStyles(severity)} transition-all hover:shadow-md`}>
      <div className="flex gap-3">
        {/* Thumbnail Image */}
        <NewsImage 
          imageUrl={imageUrl} 
          category={category} 
          title={title}
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold line-clamp-2 text-foreground leading-tight">{title}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 -mt-0.5 -mr-1 hover:bg-destructive/10"
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
          
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{description}</p>
          
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
            <span className="text-xs text-muted-foreground">• {item.source}</span>
            {getSeverityBadge(severity)}
          </div>

          {matchedHazards.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <TrendingUp className="h-3 w-3 text-primary" />
              {matchedHazards.slice(0, 2).map((hazard, idx) => (
                <Badge key={idx} variant="outline" className="text-xs py-0 h-5 border-primary/30">
                  {hazard}
                </Badge>
              ))}
              {matchedHazards.length > 2 && (
                <Badge variant="outline" className="text-xs py-0 h-5">
                  +{matchedHazards.length - 2}
                </Badge>
              )}
            </div>
          )}

          {link && (
            <div className="mt-2">
              <Button variant="link" size="sm" className="h-5 p-0 text-xs text-primary" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Read more <ExternalLink className="ml-1 h-3 w-3" />
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

  // Get industry-specific category configuration
  const industryCategoryConfig = useMemo(() => {
    return getIndustryCategoryConfig(org?.industry_type, org?.sector);
  }, [org?.industry_type, org?.sector]);

  // Match news to hazards (enhanced with industry keywords)
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
    
    // Also check industry keywords for relevance boost
    const industryKeywords = industryCategoryConfig.keywords;
    for (const keyword of industryKeywords) {
      if (text.includes(keyword.toLowerCase()) && !matches.includes(keyword)) {
        // Don't add as a match, but this item is more relevant
      }
    }
    
    return matches;
  };

  // Filter and categorize news with industry relevance
  const { weatherAlerts, newsItems, categorizedNews, relevantCategories } = useMemo(() => {
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

    // Score and boost news items by industry relevance
    const scoredNews = uniqueNews.map(item => {
      const text = (item.title + " " + item.description).toLowerCase();
      let relevanceBoost = 0;
      
      // Boost items matching industry keywords
      for (const keyword of industryCategoryConfig.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          relevanceBoost += 20;
        }
      }
      
      return {
        ...item,
        relevance_score: (item.relevance_score || 0) + relevanceBoost,
      };
    });

    // Sort by boosted relevance
    const sortedNews = scoredNews.sort((a, b) => b.relevance_score - a.relevance_score);

    // Categorize news - map to industry-relevant categories
    const categorized: Record<Category, NewsItem[]> = {
      weather: [],
      security: [],
      health: [],
      infrastructure: [],
      financial: [],
      regulatory: [],
      cyber: [],
      supply_chain: [],
      environmental: [],
      general: [],
    };

    sortedNews.forEach((item) => {
      // Try to map item category to our categories
      let cat = (item.category as Category) || "general";
      
      // Map any unrecognized categories to general
      if (!categorized[cat]) {
        cat = "general";
      }
      
      categorized[cat].push(item);
    });

    // Determine which categories to show based on industry config
    const industryCategories = industryCategoryConfig.categories;
    const relevantCats: Category[] = ["weather", ...industryCategories.filter(c => c !== "weather")] as Category[];

    return {
      weatherAlerts: alerts,
      newsItems: sortedNews,
      categorizedNews: categorized,
      relevantCategories: relevantCats,
    };
  }, [newsFeed, dismissals, industryCategoryConfig]);

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

  // Calculate counts for industry-relevant categories
  const categoryCounts: Record<string, number> = {
    all: totalAlerts,
    weather: weatherAlerts.length + categorizedNews.weather.length,
  };
  
  relevantCategories.forEach(cat => {
    if (cat !== "weather") {
      categoryCounts[cat] = categorizedNews[cat]?.length || 0;
    }
  });

  // Get display label for industry
  const industryLabel = org?.industry_type || org?.sector || "Organization";

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
                {industryLabel} Risk Intelligence
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {totalAlerts}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{cityName}, {provinceName}</span>
                {industryCategoryConfig.globalScope && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs py-0">
                      <Globe className="h-3 w-3 mr-1" />
                      Global Alerts
                    </Badge>
                  </>
                )}
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
              Monitoring {industryLabel.toLowerCase()} risks for {cityName}, {provinceName}
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="flex-1 min-w-[80px] text-xs">
                <Newspaper className="h-3 w-3 mr-1" />
                All ({categoryCounts.all})
              </TabsTrigger>
              
              {/* Dynamic industry-specific tabs */}
              {relevantCategories.map(cat => {
                const count = categoryCounts[cat] || 0;
                if (count === 0 && cat !== "health") return null; // Always show health for healthcare
                
                const config = CATEGORY_CONFIG[cat];
                if (!config) return null;
                
                const Icon = config.icon;
                return (
                  <TabsTrigger key={cat} value={cat} className="flex-1 min-w-[80px] text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label.split(" ")[0]} ({count})
                  </TabsTrigger>
                );
              })}
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

              {/* Dynamic category content */}
              {relevantCategories.map(cat => (
                <TabsContent key={cat} value={cat} className="mt-0">
                  {cat === "weather" ? (
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
                  ) : (
                    <CategorySection
                      items={categorizedNews[cat] || []}
                      category={cat}
                      onDismiss={handleDismiss}
                      isDismissing={dismissItem.isPending}
                      matchNewsToHazards={matchNewsToHazards}
                    />
                  )}
                </TabsContent>
              ))}

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
