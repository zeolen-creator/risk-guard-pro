import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Province-to-RSS mapping for Environment Canada weather warnings
const PROVINCE_WEATHER_RSS: Record<string, string> = {
  AB: "https://weather.gc.ca/rss/warning/ab-52_e.xml",
  BC: "https://weather.gc.ca/rss/warning/bc-74_e.xml",
  MB: "https://weather.gc.ca/rss/warning/mb-38_e.xml",
  NB: "https://weather.gc.ca/rss/warning/nb-36_e.xml",
  NL: "https://weather.gc.ca/rss/warning/nl-24_e.xml",
  NS: "https://weather.gc.ca/rss/warning/ns-19_e.xml",
  ON: "https://weather.gc.ca/rss/warning/on-143_e.xml",
  PE: "https://weather.gc.ca/rss/warning/pe-5_e.xml",
  QC: "https://weather.gc.ca/rss/warning/qc-133_e.xml",
  SK: "https://weather.gc.ca/rss/warning/sk-32_e.xml",
  NT: "https://weather.gc.ca/rss/warning/nt-24_e.xml",
  NU: "https://weather.gc.ca/rss/warning/nu-16_e.xml",
  YT: "https://weather.gc.ca/rss/warning/yt-16_e.xml",
};

// National and regional news RSS feeds
const NATIONAL_NEWS_FEEDS = [
  // National feeds
  { name: "CBC Top Stories", url: "https://www.cbc.ca/webfeed/rss/rss-topstories" },
  { name: "CBC Canada", url: "https://www.cbc.ca/webfeed/rss/rss-canada" },
  { name: "Global News Canada", url: "https://globalnews.ca/canada/feed/" },
  { name: "Global News", url: "https://globalnews.ca/feed/" },
  // Toronto-specific
  { name: "CBC Toronto", url: "https://www.cbc.ca/webfeed/rss/rss-canada-toronto" },
  { name: "Global News Toronto", url: "https://globalnews.ca/toronto/feed/" },
  // Weather-specific
  { name: "CBC Weather", url: "https://www.cbc.ca/webfeed/rss/rss-weather" },
];

// Industry-specific keyword mapping
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Healthcare: [
    "hospital", "patient", "clinic", "healthcare", "medical", "doctor",
    "nurse", "outbreak", "disease", "pandemic", "health system", "emergency room",
  ],
  "Financial Services": [
    "bank", "banking", "financial", "credit", "loan", "atm",
    "fraud", "fintech", "mortgage", "investment", "market",
  ],
  Manufacturing: [
    "factory", "plant", "production", "supply chain", "manufacturing",
    "assembly", "warehouse", "logistics", "industrial",
  ],
  Technology: [
    "tech", "software", "hardware", "data center", "cloud", "cyber", "IT",
    "digital", "platform", "ransomware", "breach",
  ],
  Education: [
    "school", "university", "college", "student", "education", "campus",
    "academic", "teacher",
  ],
  Government: [
    "government", "municipal", "federal", "provincial", "public service",
    "ministry", "department",
  ],
  Retail: ["store", "retail", "shopping", "consumer", "sales", "merchandise", "mall"],
  Transportation: [
    "transit", "transport", "airline", "rail", "shipping", "logistics",
    "freight",
  ],
  "Energy & Utilities": [
    "power", "electricity", "gas", "utility", "energy", "grid",
    "outage", "hydro",
  ],
  Construction: [
    "construction", "building", "contractor", "site", "development",
    "infrastructure",
  ],
};

// Province code to full name mapping
const PROVINCE_NAMES: Record<string, string> = {
  AB: "alberta",
  BC: "british columbia",
  MB: "manitoba",
  NB: "new brunswick",
  NL: "newfoundland",
  NS: "nova scotia",
  ON: "ontario",
  PE: "prince edward island",
  QC: "quebec",
  SK: "saskatchewan",
  NT: "northwest territories",
  NU: "nunavut",
  YT: "yukon",
};

// Simple hash function for deduplication
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Parse RSS XML manually (simple approach without external XML parser)
function parseRSSItems(xmlText: string, sourceName: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const getTagContent = (tag: string): string => {
      const tagRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const tagMatch = itemContent.match(tagRegex);
      if (tagMatch) {
        return (tagMatch[1] || tagMatch[2] || "").trim();
      }
      return "";
    };

    const title = getTagContent("title");
    const description = getTagContent("description");
    const link = getTagContent("link");
    const pubDate = getTagContent("pubDate");

    if (title) {
      items.push({
        title,
        description: description.replace(/<[^>]*>/g, "").substring(0, 500), // Strip HTML, limit length
        link,
        pubDate: pubDate || new Date().toISOString(),
        source: sourceName,
        hash: hashString(title + sourceName),
      });
    }
  }

  return items;
}

// Fetch and parse RSS feed
async function fetchRSS(url: string, sourceName: string): Promise<any[]> {
  try {
    console.log(`Fetching RSS from: ${url}`);
    const response = await fetch(url, {
      headers: { "User-Agent": "HIRA-Pro/1.0 Regional Risk Intelligence" },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      console.error(`RSS fetch failed for ${url}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    return parseRSSItems(xmlText, sourceName);
  } catch (error) {
    console.error(`Failed to fetch RSS from ${url}:`, error);
    return [];
  }
}

// Calculate relevance score for a news item
function calculateRelevance(
  item: any,
  org: any
): number {
  let score = 0;
  const text = (item.title + " " + item.description).toLowerCase();

  // Check city match (high priority)
  const city = org.primary_location?.split(",")[0]?.trim()?.toLowerCase();
  if (city && text.includes(city)) {
    score += 50;
  }

  // Check province match
  const provinceCode = getProvinceCode(org.primary_location);
  const provinceName = provinceCode ? PROVINCE_NAMES[provinceCode] : null;
  if (provinceName && text.includes(provinceName)) {
    score += 30;
  }

  // Check industry keywords
  const industryKeywords = INDUSTRY_KEYWORDS[org.industry_type] || [];
  industryKeywords.forEach((keyword) => {
    if (text.includes(keyword.toLowerCase())) score += 10;
  });

  // Check custom keywords (highest priority for custom matches)
  const customKeywords = org.news_settings?.custom_keywords || [];
  customKeywords.forEach((keyword: string) => {
    if (text.includes(keyword.toLowerCase())) score += 25;
  });

  // Check for risk-related keywords (expanded list)
  const riskKeywords = [
    "warning", "alert", "emergency", "evacuate", "flood", "fire", "storm",
    "power outage", "cyber attack", "data breach", "recall", "shutdown",
    "strike", "protest", "closure", "disruption", "explosion", "hazard",
    "snow", "snowstorm", "blizzard", "freezing", "ice", "cold", "weather",
    "extreme", "dangerous", "critical", "severe", "major", "breaking",
    "transit", "delay", "cancelled", "suspended", "road", "highway",
    "accident", "crash", "incident", "crisis", "blackout", "outage",
  ];
  riskKeywords.forEach((keyword) => {
    if (text.includes(keyword)) score += 15;
  });

  // Boost weather-related content during winter months (Nov-Mar)
  const currentMonth = new Date().getMonth();
  if ([0, 1, 2, 10, 11].includes(currentMonth)) {
    const winterKeywords = ["snow", "ice", "cold", "freeze", "blizzard", "winter", "storm"];
    winterKeywords.forEach((keyword) => {
      if (text.includes(keyword)) score += 20;
    });
  }

  return score;
}

// Extract province code from primary_location string
function getProvinceCode(primaryLocation: string | null): string | null {
  if (!primaryLocation) return null;
  
  // Format: "City, Province, Canada"
  const parts = primaryLocation.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const provincePart = parts[1].toLowerCase();
    
    // Check for province code
    for (const [code, name] of Object.entries(PROVINCE_NAMES)) {
      if (provincePart === code.toLowerCase() || provincePart === name) {
        return code;
      }
    }
    
    // Check common names
    if (provincePart.includes("ontario")) return "ON";
    if (provincePart.includes("british columbia")) return "BC";
    if (provincePart.includes("quebec")) return "QC";
    if (provincePart.includes("alberta")) return "AB";
    if (provincePart.includes("manitoba")) return "MB";
    if (provincePart.includes("saskatchewan")) return "SK";
    if (provincePart.includes("nova scotia")) return "NS";
    if (provincePart.includes("new brunswick")) return "NB";
    if (provincePart.includes("newfoundland")) return "NL";
    if (provincePart.includes("prince edward")) return "PE";
    if (provincePart.includes("northwest")) return "NT";
    if (provincePart.includes("nunavut")) return "NU";
    if (provincePart.includes("yukon")) return "YT";
  }
  
  return null;
}

// Determine alert category from content
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/weather|storm|flood|tornado|hurricane|blizzard|ice|snow|rain|wind|heat|cold|freeze/i.test(lowerText)) {
    return "weather";
  }
  if (/cyber|ransomware|breach|hack|phishing|malware|security/i.test(lowerText)) {
    return "cybersecurity";
  }
  if (/outbreak|disease|covid|flu|virus|health|hospital|medical|patient/i.test(lowerText)) {
    return "health";
  }
  if (/power|outage|electricity|gas|water|infrastructure|transit|road|bridge/i.test(lowerText)) {
    return "infrastructure";
  }
  if (/market|stock|financial|bank|economy|inflation|recession/i.test(lowerText)) {
    return "financial";
  }
  if (/regulation|law|compliance|legislation|policy|government/i.test(lowerText)) {
    return "regulatory";
  }
  if (/crime|theft|violence|protest|unrest|terrorism/i.test(lowerText)) {
    return "security";
  }
  
  return "general";
}

// Determine severity from content
function detectSeverity(text: string, source: string): string {
  const lowerText = text.toLowerCase();
  
  // Environment Canada warnings are high priority
  if (source === "Environment Canada") {
    if (/warning|emergency|extreme/i.test(lowerText)) return "critical";
    if (/watch|advisory/i.test(lowerText)) return "high";
    return "medium";
  }
  
  if (/emergency|critical|evacuate|immediate|extreme|breaking/i.test(lowerText)) {
    return "critical";
  }
  if (/warning|alert|urgent|serious/i.test(lowerText)) {
    return "high";
  }
  if (/advisory|caution|update/i.test(lowerText)) {
    return "medium";
  }
  
  return "low";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting fetch-regional-news function");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all organizations with news enabled and Canadian region
    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, primary_location, industry_type, news_settings, region")
      .ilike("region", "%canada%");

    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    console.log(`Found ${orgs?.length || 0} Canadian organizations`);

    const results: any[] = [];

    for (const org of orgs || []) {
      try {
        // Check if news is enabled for this org
        const newsEnabled = org.news_settings?.enabled ?? false;
        if (!newsEnabled) {
          console.log(`Skipping org ${org.id} - news disabled`);
          continue;
        }

        console.log(`Processing org: ${org.name} (${org.id})`);

        const feedData: any = {
          weather_alerts: [],
          news_items: [],
          fetched_at: new Date().toISOString(),
        };

        // 1. Fetch weather alerts for the organization's province
        const provinceCode = getProvinceCode(org.primary_location);
        if (provinceCode && PROVINCE_WEATHER_RSS[provinceCode]) {
          console.log(`Fetching weather for province: ${provinceCode}`);
          const weatherItems = await fetchRSS(
            PROVINCE_WEATHER_RSS[provinceCode],
            "Environment Canada"
          );

          feedData.weather_alerts = weatherItems.map((item) => ({
            ...item,
            severity: detectSeverity(item.title + " " + item.description, "Environment Canada"),
            category: "weather",
          }));

          console.log(`Found ${feedData.weather_alerts.length} weather alerts`);
        }

        // 2. Fetch news from national feeds
        const allNewsItems: any[] = [];
        const enabledCategories = org.news_settings?.categories || {};

        for (const feed of NATIONAL_NEWS_FEEDS) {
          const newsItems = await fetchRSS(feed.url, feed.name);
          allNewsItems.push(...newsItems);
        }

        console.log(`Fetched ${allNewsItems.length} total news items`);

        // 3. Filter and rank by relevance
        const relevantNews = allNewsItems
          .map((item) => {
            const category = detectCategory(item.title + " " + item.description);
            return {
              ...item,
              relevance_score: calculateRelevance(item, org),
              category,
              severity: detectSeverity(item.title + " " + item.description, item.source),
            };
          })
          .filter((item) => {
            // Keep items with minimal relevance (lowered threshold to catch more)
            if (item.relevance_score < 10) return false;
            
            // Filter by enabled categories
            if (enabledCategories[item.category] === false) return false;
            
            return true;
          })
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 25); // Top 25 most relevant

        feedData.news_items = relevantNews.map((item) => ({
          id: item.hash,
          title: item.title,
          description: item.description,
          url: item.link,
          source: item.source,
          published_at: item.pubDate,
          relevance_score: item.relevance_score,
          category: item.category,
          severity: item.severity,
        }));

        console.log(`Filtered to ${feedData.news_items.length} relevant news items`);

        // 4. Store in database (upsert)
        const { error: upsertError } = await supabase
          .from("org_news_feed")
          .upsert(
            {
              org_id: org.id,
              feed_data: feedData,
              fetched_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            },
            { onConflict: "org_id" }
          );

        if (upsertError) {
          console.error(`Failed to store feed for org ${org.id}:`, upsertError);
        } else {
          console.log(`Successfully stored feed for org ${org.id}`);
          results.push({
            org_id: org.id,
            weather_alerts: feedData.weather_alerts.length,
            news_items: feedData.news_items.length,
          });
        }
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError);
      }
    }

    console.log("Fetch-regional-news completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
