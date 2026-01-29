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

// News RSS feeds organized by category and region for province-specific filtering
const NEWS_FEEDS_BY_REGION: Record<string, { name: string; url: string; category: string }[]> = {
  // Ontario-specific feeds
  ON: [
    { name: "CBC Toronto", url: "https://www.cbc.ca/webfeed/rss/rss-canada-toronto", category: "general" },
    { name: "Global News Toronto", url: "https://globalnews.ca/toronto/feed/", category: "general" },
  ],
  // British Columbia
  BC: [
    { name: "CBC British Columbia", url: "https://www.cbc.ca/webfeed/rss/rss-canada-britishcolumbia", category: "general" },
    { name: "Global News BC", url: "https://globalnews.ca/bc/feed/", category: "general" },
  ],
  // Alberta
  AB: [
    { name: "CBC Edmonton", url: "https://www.cbc.ca/webfeed/rss/rss-canada-edmonton", category: "general" },
    { name: "CBC Calgary", url: "https://www.cbc.ca/webfeed/rss/rss-canada-calgary", category: "general" },
    { name: "Global News Edmonton", url: "https://globalnews.ca/edmonton/feed/", category: "general" },
    { name: "Global News Calgary", url: "https://globalnews.ca/calgary/feed/", category: "general" },
  ],
  // Quebec
  QC: [
    { name: "CBC Montreal", url: "https://www.cbc.ca/webfeed/rss/rss-canada-montreal", category: "general" },
    { name: "Global News Montreal", url: "https://globalnews.ca/montreal/feed/", category: "general" },
  ],
  // Manitoba
  MB: [
    { name: "CBC Manitoba", url: "https://www.cbc.ca/webfeed/rss/rss-canada-manitoba", category: "general" },
    { name: "Global News Winnipeg", url: "https://globalnews.ca/winnipeg/feed/", category: "general" },
  ],
  // Saskatchewan
  SK: [
    { name: "CBC Saskatchewan", url: "https://www.cbc.ca/webfeed/rss/rss-canada-saskatchewan", category: "general" },
    { name: "Global News Saskatoon", url: "https://globalnews.ca/saskatoon/feed/", category: "general" },
    { name: "Global News Regina", url: "https://globalnews.ca/regina/feed/", category: "general" },
  ],
  // Nova Scotia
  NS: [
    { name: "CBC Nova Scotia", url: "https://www.cbc.ca/webfeed/rss/rss-canada-novascotia", category: "general" },
    { name: "Global News Halifax", url: "https://globalnews.ca/halifax/feed/", category: "general" },
  ],
  // New Brunswick
  NB: [
    { name: "CBC New Brunswick", url: "https://www.cbc.ca/webfeed/rss/rss-canada-newbrunswick", category: "general" },
    { name: "Global News New Brunswick", url: "https://globalnews.ca/new-brunswick/feed/", category: "general" },
  ],
};

// Category-specific feeds (apply to all regions)
const CATEGORY_FEEDS = {
  business: [
    { name: "CBC Business", url: "https://www.cbc.ca/webfeed/rss/rss-business", category: "financial" },
    { name: "Global News Money", url: "https://globalnews.ca/money/feed/", category: "financial" },
  ],
  health: [
    { name: "CBC Health", url: "https://www.cbc.ca/webfeed/rss/rss-health", category: "health" },
    { name: "Global News Health", url: "https://globalnews.ca/health/feed/", category: "health" },
  ],
  technology: [
    { name: "CBC Technology", url: "https://www.cbc.ca/webfeed/rss/rss-technology", category: "security" },
  ],
  politics: [
    { name: "CBC Politics", url: "https://www.cbc.ca/webfeed/rss/rss-politics", category: "general" },
    { name: "Global News Politics", url: "https://globalnews.ca/politics/feed/", category: "general" },
  ],
};

// GLOBAL NEWS SOURCES - For industries that need international monitoring
const GLOBAL_FEEDS: Record<string, { name: string; url: string; category: string }[]> = {
  // Healthcare: Disease outbreaks, WHO alerts, medical recalls
  healthcare: [
    { name: "WHO Disease Outbreak News", url: "https://www.who.int/feeds/entity/csr/don/en/rss.xml", category: "health" },
    { name: "CDC Health Alert Network", url: "https://tools.cdc.gov/api/v2/resources/media/rss/health_advisory.rss", category: "health" },
    { name: "Reuters Health", url: "https://www.reutersagency.com/feed/?best-topics=health&post_type=best", category: "health" },
    { name: "Health Canada Recalls", url: "https://recalls-rappels.canada.ca/en/feed/recent/health-products", category: "health" },
    { name: "FDA Recalls", url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-device-recalls/rss.xml", category: "health" },
  ],
  // Financial Services: Global economic news, market alerts
  financial: [
    { name: "Reuters Business", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", category: "financial" },
    { name: "Financial Times World", url: "https://www.ft.com/world?format=rss", category: "financial" },
    { name: "Bank of Canada", url: "https://www.bankofcanada.ca/rss/press-releases/", category: "regulatory" },
    { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", category: "financial" },
  ],
  // Manufacturing: Supply chain, industrial safety, global trade
  manufacturing: [
    { name: "Reuters Supply Chain", url: "https://www.reutersagency.com/feed/?best-topics=supply-chain&post_type=best", category: "supply_chain" },
    { name: "Industry Week", url: "https://www.industryweek.com/rss.xml", category: "supply_chain" },
  ],
  // Technology/Cyber: Global cyber threats, data breaches
  technology: [
    { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "cyber" },
    { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "cyber" },
    { name: "CISA Alerts", url: "https://www.cisa.gov/uscert/ncas/alerts.xml", category: "cyber" },
  ],
  // Energy: Global energy markets, infrastructure
  energy: [
    { name: "Reuters Energy", url: "https://www.reutersagency.com/feed/?best-topics=energy&post_type=best", category: "infrastructure" },
    { name: "Oil Price", url: "https://oilprice.com/rss/main", category: "financial" },
  ],
};

// Industry type to global feed category mapping
const INDUSTRY_GLOBAL_MAPPING: Record<string, string[]> = {
  // Healthcare industries
  "Acute Care Hospital": ["healthcare", "technology"],
  "Pediatric Hospital": ["healthcare", "technology"],
  "Long-Term Care": ["healthcare"],
  "Community Health Center": ["healthcare"],
  "Mental Health Facility": ["healthcare"],
  "Research Hospital": ["healthcare", "technology"],
  "Emergency Services": ["healthcare"],
  "Pharmaceutical Manufacturing": ["healthcare", "manufacturing"],
  "Medical Device Manufacturing": ["healthcare", "manufacturing", "technology"],
  // Financial industries
  "Banking": ["financial", "technology"],
  "Insurance": ["financial"],
  // Manufacturing
  "Chemical Manufacturing": ["manufacturing"],
  "Food Processing": ["healthcare", "manufacturing"],
  // Energy
  "Electric Utility": ["energy", "technology"],
  "Oil & Gas": ["energy"],
  "Water Utility": ["energy"],
  // Default sector mappings (used as fallback when industry_type doesn't match)
  "Healthcare": ["healthcare", "technology"],
  "Financial Services": ["financial", "technology"],
  "Manufacturing": ["manufacturing"],
  "Energy": ["energy"],
  "Technology": ["technology"],
  "Government": ["technology"],
  "Education": ["technology"],
};

// Industry-specific keyword mapping (enhanced)
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Healthcare: [
    "hospital", "patient", "clinic", "healthcare", "medical", "doctor",
    "nurse", "outbreak", "disease", "pandemic", "health system", "emergency room",
    "virus", "infection", "epidemic", "vaccination", "vaccine", "drug recall",
    "medication", "FDA", "Health Canada", "WHO", "CDC", "ventilator", "ICU",
    "pediatric", "children", "infant", "RSV", "measles", "flu", "influenza",
  ],
  "Financial Services": [
    "bank", "banking", "financial", "credit", "loan", "atm",
    "fraud", "fintech", "mortgage", "investment", "market", "stock",
    "interest rate", "inflation", "recession", "central bank", "OSFI",
    "cyber attack", "data breach", "ransomware",
  ],
  Manufacturing: [
    "factory", "plant", "production", "supply chain", "manufacturing",
    "assembly", "warehouse", "logistics", "industrial", "OSHA", "workplace safety",
    "recall", "contamination", "quality control", "tariff", "trade",
  ],
  Technology: [
    "tech", "software", "hardware", "data center", "cloud", "cyber", "IT",
    "digital", "platform", "ransomware", "breach", "vulnerability", "zero-day",
    "phishing", "malware", "DDoS", "encryption",
  ],
  Education: [
    "school", "university", "college", "student", "education", "campus",
    "academic", "teacher", "lockdown", "threat",
  ],
  Government: [
    "government", "municipal", "federal", "provincial", "public service",
    "ministry", "department", "policy", "regulation", "legislation",
  ],
  Retail: ["store", "retail", "shopping", "consumer", "sales", "merchandise", "mall", "theft", "shoplifting"],
  Transportation: [
    "transit", "transport", "airline", "rail", "shipping", "logistics",
    "freight", "FAA", "Transport Canada",
  ],
  "Energy & Utilities": [
    "power", "electricity", "gas", "utility", "energy", "grid",
    "outage", "hydro", "pipeline", "refinery", "NERC",
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

// Extract image URL from RSS item or scrape OpenGraph from article
async function extractImageUrl(item: any, articleUrl: string): Promise<string | null> {
  // 1. Try RSS feed enclosure (common for media)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  // 2. Try media:content tag (common in news RSS)
  if (item.mediaContent) {
    return item.mediaContent;
  }
  
  // 3. Try media:thumbnail tag
  if (item.mediaThumbnail) {
    return item.mediaThumbnail;
  }
  
  // 4. Scrape OpenGraph from article page (with timeout and error handling)
  if (!articleUrl) return null;
  
  try {
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'HIRA-Pro/1.0 Regional Risk Intelligence Bot',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout for OG scraping
    });

    if (!response.ok) return null;

    const html = await response.text();
    
    // Extract og:image meta tag
    const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
    if (ogImageMatch?.[1]) {
      return ogImageMatch[1];
    }
    
    // Fallback: twitter:image
    const twitterImageMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i);
    if (twitterImageMatch?.[1]) {
      return twitterImageMatch[1];
    }
    
    return null;
  } catch (error) {
    // Silent fail - OG scraping is optional
    console.warn(`Failed to extract OG image from ${articleUrl}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
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

    // Extract enclosure URL (for media attachments)
    const getEnclosure = (): { url?: string; type?: string } | null => {
      const enclosureMatch = itemContent.match(/<enclosure\s+[^>]*url=["']([^"']+)["'][^>]*type=["']([^"']+)["'][^>]*\/?>/i) ||
                            itemContent.match(/<enclosure\s+[^>]*type=["']([^"']+)["'][^>]*url=["']([^"']+)["'][^>]*\/?>/i);
      if (enclosureMatch) {
        return { url: enclosureMatch[1], type: enclosureMatch[2] };
      }
      return null;
    };
    
    // Extract media:content or media:thumbnail
    const getMediaUrl = (): string | null => {
      // media:content
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*\/?>/i);
      if (mediaContentMatch?.[1]) return mediaContentMatch[1];
      
      // media:thumbnail
      const mediaThumbnailMatch = itemContent.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*\/?>/i);
      if (mediaThumbnailMatch?.[1]) return mediaThumbnailMatch[1];
      
      return null;
    };

    const title = getTagContent("title");
    const description = getTagContent("description");
    const link = getTagContent("link");
    const pubDate = getTagContent("pubDate");
    const enclosure = getEnclosure();
    const mediaUrl = getMediaUrl();

    if (title) {
      items.push({
        title,
        description: description.replace(/<[^>]*>/g, "").substring(0, 500), // Strip HTML, limit length
        link,
        pubDate: pubDate || new Date().toISOString(),
        source: sourceName,
        hash: hashString(title + sourceName),
        enclosure,
        mediaContent: mediaUrl,
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
  const isGlobalItem = item.isGlobal === true;

  // For global items, start with a base score so they don't get filtered out
  if (isGlobalItem) {
    score += 30; // Base score for global industry-relevant items
  }

  // Check city match (high priority for local news)
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

  // Check Canada-wide relevance
  if (text.includes("canada") || text.includes("canadian")) {
    score += 20;
  }

  // Check industry keywords (HIGHER PRIORITY - this is the key fix)
  const industryKeywords = INDUSTRY_KEYWORDS[org.industry_type] || INDUSTRY_KEYWORDS[org.sector] || [];
  let industryMatchCount = 0;
  industryKeywords.forEach((keyword) => {
    if (text.includes(keyword.toLowerCase())) {
      score += 15; // Increased from 10
      industryMatchCount++;
    }
  });
  
  // Bonus for multiple industry keyword matches
  if (industryMatchCount >= 3) {
    score += 25;
  } else if (industryMatchCount >= 2) {
    score += 15;
  }

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
    "outbreak", "pandemic", "epidemic", "virus", "infection", // Health emergencies
    "vulnerability", "exploit", "zero-day", "ransomware", // Cyber threats
    "supply chain", "shortage", "disruption", // Supply chain
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

// Determine alert category from content - improved classification
function detectCategory(text: string, feedCategory?: string): string {
  const lowerText = text.toLowerCase();
  
  // Weather & Environment (check first - highest priority for matching)
  if (/weather|storm|flood|tornado|hurricane|blizzard|ice\s|snow|rain|wind|heat wave|cold\s|freeze|freezing|earthquake|wildfire|climate|temperature/i.test(lowerText)) {
    return "weather";
  }
  
  // Security (Cybersecurity + Physical Security)
  if (/cyber|ransomware|breach|hack|phishing|malware|data leak|crime|theft|fraud|scam|terror|attack|security threat|armed|robbery/i.test(lowerText)) {
    return "security";
  }
  
  // Health & Public Safety
  if (/outbreak|disease|covid|flu|virus|health\s|hospital|medical|patient|vaccination|epidemic|pandemic|emergency room|healthcare|illness|infection/i.test(lowerText)) {
    return "health";
  }
  
  // Infrastructure & Transit
  if (/power outage|electricity|gas leak|water main|infrastructure|transit|ttc|subway|train|highway|road closure|bridge|construction|delay|cancelled|suspended|airport|traffic|collision|crash|accident|derailment/i.test(lowerText)) {
    return "infrastructure";
  }
  
  // Business & Financial
  if (/market|stock|financial|bank\s|economy|inflation|recession|layoff|job loss|employment|business|company|earnings|profit|invest|trade|tariff|interest rate/i.test(lowerText)) {
    return "financial";
  }
  
  // If feed has a category hint, use that
  if (feedCategory && feedCategory !== "general") {
    return feedCategory;
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
      .select("id, name, primary_location, industry_type, sector, news_settings, region")
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

        // 2. Fetch news from province-specific feeds + category feeds + GLOBAL feeds
        const allNewsItems: any[] = [];
        const enabledCategories = org.news_settings?.categories || {};
        
        // Get province-specific feeds (if available)
        const regionFeeds = provinceCode ? (NEWS_FEEDS_BY_REGION[provinceCode] || []) : [];
        
        // Determine which global feeds to include based on industry
        const industryType = org.industry_type || "";
        const sector = org.sector || "";
        const globalFeedCategories = INDUSTRY_GLOBAL_MAPPING[industryType] || INDUSTRY_GLOBAL_MAPPING[sector] || [];
        
        // Collect global feeds for this industry
        const globalFeeds: { name: string; url: string; category: string }[] = [];
        for (const feedCategory of globalFeedCategories) {
          const feeds = GLOBAL_FEEDS[feedCategory] || [];
          globalFeeds.push(...feeds);
        }
        
        console.log(`Industry: ${industryType || sector || 'unknown'} - Including ${globalFeeds.length} global feeds`);
        
        // Combine province-specific feeds with category feeds AND global feeds
        const allFeeds = [
          ...regionFeeds,
          ...CATEGORY_FEEDS.business,
          ...CATEGORY_FEEDS.health,
          ...CATEGORY_FEEDS.technology,
          ...CATEGORY_FEEDS.politics,
          ...globalFeeds, // Add global feeds for industry-specific monitoring
        ];
        
        console.log(`Using ${regionFeeds.length} province feeds + ${globalFeeds.length} global feeds for ${provinceCode || 'unknown province'}`);

        for (const feed of allFeeds) {
          try {
            const newsItems = await fetchRSS(feed.url, feed.name);
            // Attach feed category hint and global flag to items
            newsItems.forEach(item => {
              item.feedCategory = feed.category;
              item.isGlobal = globalFeeds.some(gf => gf.url === feed.url);
            });
            allNewsItems.push(...newsItems);
          } catch (feedError) {
            console.warn(`Failed to fetch feed ${feed.name}: ${feedError instanceof Error ? feedError.message : 'Unknown error'}`);
          }
        }

        console.log(`Fetched ${allNewsItems.length} total news items`);

        // 3. Filter, deduplicate, and rank by relevance
        const seenUrls = new Set<string>();
        const relevantNews = allNewsItems
          .filter((item) => {
            // Deduplicate by URL
            if (seenUrls.has(item.link)) return false;
            seenUrls.add(item.link);
            return true;
          })
          .map((item) => {
            const category = detectCategory(item.title + " " + item.description, item.feedCategory);
            return {
              ...item,
              relevance_score: calculateRelevance(item, org),
              category,
              severity: detectSeverity(item.title + " " + item.description, item.source),
            };
          })
          .filter((item) => {
            // Keep items with minimal relevance
            if (item.relevance_score < 10) return false;
            
            // Filter by enabled categories
            if (enabledCategories[item.category] === false) return false;
            
            return true;
          })
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 30); // Top 30 most relevant

        // 4. Extract images for top news items (async, with concurrency limit)
        console.log(`Extracting images for ${relevantNews.length} news items...`);
        
        // Process in batches of 5 to avoid overwhelming servers
        const batchSize = 5;
        const newsWithImages: any[] = [];
        
        for (let i = 0; i < relevantNews.length; i += batchSize) {
          const batch = relevantNews.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              const imageUrl = await extractImageUrl(item, item.link);
              return {
                id: item.hash,
                title: item.title,
                description: item.description,
                url: item.link,
                source: item.source,
                published_at: item.pubDate,
                relevance_score: item.relevance_score,
                category: item.category,
                severity: item.severity,
                image_url: imageUrl,
              };
            })
          );
          newsWithImages.push(...batchResults);
        }
        
        feedData.news_items = newsWithImages;

        const imagesFound = newsWithImages.filter(item => item.image_url).length;
        console.log(`Filtered to ${feedData.news_items.length} relevant news items (${imagesFound} with images)`);

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
