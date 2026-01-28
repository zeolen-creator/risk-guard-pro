export const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const;

export const INDUSTRY_TYPES = [
  "Acute Care Hospital",
  "Long-Term Care",
  "Community Health Center",
  "Mental Health Facility",
  "Rehabilitation Center",
  "Pediatric Hospital",
  "Research Hospital",
  "Ambulatory Care",
  "Home Health Services",
  "Emergency Services",
  "Pharmaceutical Manufacturing",
  "Medical Device Manufacturing",
  "Biotechnology",
  "Health Insurance",
  "Telehealth Services",
  "Other Healthcare",
] as const;

export const ALERT_CATEGORIES = [
  { id: "weather", label: "Weather Alerts", description: "Severe weather, storms, temperature extremes" },
  { id: "health", label: "Public Health", description: "Disease outbreaks, health advisories" },
  { id: "infrastructure", label: "Infrastructure", description: "Power outages, water issues, road closures" },
  { id: "cybersecurity", label: "Cybersecurity", description: "Cyber threats, data breaches" },
  { id: "regulatory", label: "Regulatory", description: "Policy changes, compliance updates" },
  { id: "financial", label: "Financial", description: "Economic impacts, market changes" },
  { id: "security", label: "Security", description: "Civil unrest, safety threats" },
] as const;

export type ProvinceCode = typeof CANADIAN_PROVINCES[number]["code"];
export type IndustryType = typeof INDUSTRY_TYPES[number];
export type AlertCategoryId = typeof ALERT_CATEGORIES[number]["id"];

export interface NewsSettings {
  enabled: boolean;
  monitoring_radius_km: number;
  categories: Record<AlertCategoryId, boolean>;
  custom_keywords: string[];
  alert_severity: ("critical" | "high" | "medium" | "low")[];
  notify_high_priority: boolean;
}

export const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  enabled: false,
  monitoring_radius_km: 100,
  categories: {
    weather: true,
    health: true,
    infrastructure: true,
    cybersecurity: true,
    regulatory: false,
    financial: false,
    security: false,
  },
  custom_keywords: [],
  alert_severity: ["critical", "high", "medium"],
  notify_high_priority: true,
};
