// Industry-to-Category mapping for Regional Risk Intelligence
// This determines which news categories are shown prominently based on organization industry

export type NewsCategory = "weather" | "security" | "health" | "infrastructure" | "financial" | "regulatory" | "cyber" | "supply_chain" | "environmental" | "general";

export interface IndustryCategoryConfig {
  categories: NewsCategory[];
  keywords: string[];
  globalScope?: boolean; // If true, also show global news (not just local)
}

// Industry category mappings - determines which categories are relevant for each industry
export const INDUSTRY_CATEGORY_MAPPINGS: Record<string, IndustryCategoryConfig> = {
  // Healthcare industries
  "Acute Care Hospital": {
    categories: ["health", "infrastructure", "supply_chain", "regulatory", "cyber", "weather"],
    keywords: ["hospital", "patient", "medical", "healthcare", "disease", "outbreak", "epidemic", "pandemic", "medication", "drug recall", "ventilator", "ICU", "emergency room", "nursing", "physician", "clinical", "FDA", "Health Canada", "WHO"],
    globalScope: true, // Healthcare needs global disease alerts
  },
  "Pediatric Hospital": {
    categories: ["health", "infrastructure", "supply_chain", "regulatory", "cyber", "weather"],
    keywords: ["pediatric", "children", "child health", "infant", "neonatal", "RSV", "measles", "vaccination", "immunization", "hospital", "patient safety", "medication error", "drug recall", "PICU", "emergency", "outbreak"],
    globalScope: true,
  },
  "Long-Term Care": {
    categories: ["health", "regulatory", "infrastructure", "weather", "supply_chain"],
    keywords: ["long-term care", "nursing home", "elderly", "seniors", "infection control", "flu", "outbreak", "staffing", "personal support worker", "PSW", "dementia", "palliative"],
    globalScope: false,
  },
  "Community Health Center": {
    categories: ["health", "regulatory", "infrastructure", "weather"],
    keywords: ["community health", "primary care", "public health", "vaccination", "screening", "prevention", "chronic disease", "diabetes", "hypertension"],
    globalScope: false,
  },
  "Mental Health Facility": {
    categories: ["health", "regulatory", "security", "infrastructure"],
    keywords: ["mental health", "psychiatric", "crisis", "suicide prevention", "addiction", "opioid", "substance abuse", "counseling"],
    globalScope: false,
  },
  "Research Hospital": {
    categories: ["health", "regulatory", "cyber", "supply_chain", "infrastructure"],
    keywords: ["clinical trial", "research", "laboratory", "biobank", "FDA", "Health Canada", "ethics", "IRB", "data breach", "HIPAA", "PHIPA"],
    globalScope: true,
  },
  "Emergency Services": {
    categories: ["weather", "security", "infrastructure", "health"],
    keywords: ["emergency", "911", "paramedic", "ambulance", "first responder", "trauma", "mass casualty", "disaster response", "triage"],
    globalScope: false,
  },
  "Pharmaceutical Manufacturing": {
    categories: ["regulatory", "supply_chain", "cyber", "environmental", "health"],
    keywords: ["pharmaceutical", "drug manufacturing", "GMP", "FDA warning", "recall", "contamination", "quality control", "supply chain", "API", "excipient"],
    globalScope: true,
  },
  "Medical Device Manufacturing": {
    categories: ["regulatory", "supply_chain", "cyber", "health"],
    keywords: ["medical device", "FDA clearance", "recall", "quality", "ISO 13485", "CE marking", "cybersecurity", "software", "implant"],
    globalScope: true,
  },
  
  // Government / Public Sector
  "Municipal Government": {
    categories: ["infrastructure", "weather", "security", "financial", "regulatory"],
    keywords: ["municipal", "city", "council", "bylaw", "public works", "water", "sewage", "roads", "transit", "property tax", "zoning", "emergency management"],
    globalScope: false,
  },
  "Provincial Government": {
    categories: ["regulatory", "infrastructure", "financial", "security", "weather"],
    keywords: ["provincial", "legislature", "ministry", "regulation", "policy", "public service", "budget", "election"],
    globalScope: false,
  },
  "Federal Government": {
    categories: ["regulatory", "security", "cyber", "financial", "infrastructure"],
    keywords: ["federal", "parliament", "cabinet", "national security", "border", "immigration", "trade", "tariff", "defense"],
    globalScope: true,
  },
  
  // Education
  "K-12 School": {
    categories: ["security", "health", "weather", "infrastructure", "regulatory"],
    keywords: ["school", "student", "teacher", "education", "lockdown", "evacuation", "bus", "playground", "bullying", "special education"],
    globalScope: false,
  },
  "University/College": {
    categories: ["security", "cyber", "health", "infrastructure", "regulatory"],
    keywords: ["university", "college", "campus", "student", "faculty", "research", "dormitory", "residence", "athletics", "international student"],
    globalScope: false,
  },
  
  // Manufacturing & Industrial
  "Manufacturing": {
    categories: ["supply_chain", "regulatory", "environmental", "infrastructure", "cyber", "weather"],
    keywords: ["manufacturing", "factory", "production", "supply chain", "logistics", "OSHA", "workplace safety", "industrial accident", "machinery", "automation"],
    globalScope: true,
  },
  "Chemical Manufacturing": {
    categories: ["environmental", "regulatory", "supply_chain", "security", "weather"],
    keywords: ["chemical", "hazardous material", "HAZMAT", "spill", "EPA", "Environment Canada", "toxic", "explosion", "fire", "containment"],
    globalScope: true,
  },
  "Food Processing": {
    categories: ["health", "regulatory", "supply_chain", "environmental"],
    keywords: ["food safety", "recall", "contamination", "E. coli", "salmonella", "listeria", "CFIA", "FDA", "HACCP", "allergen"],
    globalScope: true,
  },
  
  // Energy & Utilities
  "Electric Utility": {
    categories: ["infrastructure", "weather", "cyber", "regulatory", "environmental"],
    keywords: ["power", "electricity", "outage", "blackout", "grid", "transmission", "substation", "storm damage", "NERC", "reliability"],
    globalScope: false,
  },
  "Oil & Gas": {
    categories: ["environmental", "regulatory", "infrastructure", "security", "financial"],
    keywords: ["oil", "gas", "pipeline", "drilling", "refinery", "spill", "explosion", "OSHA", "environmental", "carbon", "emissions"],
    globalScope: true,
  },
  "Water Utility": {
    categories: ["infrastructure", "environmental", "regulatory", "weather", "health"],
    keywords: ["water", "treatment", "contamination", "boil water", "sewage", "flood", "drought", "infrastructure", "pipe", "main break"],
    globalScope: false,
  },
  
  // Financial Services
  "Banking": {
    categories: ["cyber", "regulatory", "financial", "security"],
    keywords: ["bank", "financial", "fraud", "cyber", "data breach", "interest rate", "OSFI", "anti-money laundering", "fintech"],
    globalScope: true,
  },
  "Insurance": {
    categories: ["regulatory", "financial", "cyber", "weather"],
    keywords: ["insurance", "claims", "underwriting", "catastrophe", "storm", "flood", "wildfire", "reinsurance", "actuarial"],
    globalScope: true,
  },
  
  // Retail & Hospitality
  "Retail": {
    categories: ["supply_chain", "cyber", "security", "financial", "regulatory"],
    keywords: ["retail", "store", "shoplifting", "theft", "supply chain", "inventory", "e-commerce", "PCI", "consumer"],
    globalScope: false,
  },
  "Hospitality": {
    categories: ["health", "security", "weather", "infrastructure", "regulatory"],
    keywords: ["hotel", "restaurant", "food safety", "guest safety", "fire", "bed bug", "tourism", "event"],
    globalScope: false,
  },
  
  // Transportation
  "Aviation": {
    categories: ["security", "regulatory", "weather", "infrastructure", "cyber"],
    keywords: ["aviation", "airport", "airline", "FAA", "Transport Canada", "flight", "runway", "TSA", "CATSA", "turbulence"],
    globalScope: true,
  },
  "Trucking & Logistics": {
    categories: ["infrastructure", "weather", "regulatory", "supply_chain", "security"],
    keywords: ["trucking", "logistics", "freight", "highway", "driver", "hours of service", "cargo", "warehouse"],
    globalScope: false,
  },
  
  // Default / Other
  "Other": {
    categories: ["weather", "security", "infrastructure", "financial", "health", "general"],
    keywords: [],
    globalScope: false,
  },
};

// Fallback industry mappings for broader categories
export const SECTOR_CATEGORY_MAPPINGS: Record<string, IndustryCategoryConfig> = {
  "Healthcare": {
    categories: ["health", "infrastructure", "supply_chain", "regulatory", "cyber", "weather"],
    keywords: ["hospital", "patient", "medical", "healthcare", "disease", "outbreak", "medication", "drug recall", "emergency"],
    globalScope: true,
  },
  "Government": {
    categories: ["security", "infrastructure", "regulatory", "weather", "cyber", "financial"],
    keywords: ["government", "public", "policy", "regulation", "emergency management", "public safety"],
    globalScope: false,
  },
  "Education": {
    categories: ["security", "health", "infrastructure", "weather", "cyber", "regulatory"],
    keywords: ["school", "student", "campus", "education", "teacher", "lockdown"],
    globalScope: false,
  },
  "Manufacturing": {
    categories: ["supply_chain", "regulatory", "environmental", "infrastructure", "cyber", "weather"],
    keywords: ["manufacturing", "factory", "production", "supply chain", "workplace safety", "industrial"],
    globalScope: true,
  },
  "Energy": {
    categories: ["infrastructure", "environmental", "regulatory", "weather", "cyber", "security"],
    keywords: ["power", "energy", "utility", "grid", "outage", "pipeline", "renewable"],
    globalScope: false,
  },
  "Financial Services": {
    categories: ["cyber", "regulatory", "financial", "security"],
    keywords: ["financial", "bank", "fraud", "cyber", "market", "regulation"],
    globalScope: true,
  },
  "Retail": {
    categories: ["supply_chain", "cyber", "security", "financial", "regulatory"],
    keywords: ["retail", "store", "consumer", "e-commerce", "supply chain"],
    globalScope: false,
  },
  "Transportation": {
    categories: ["infrastructure", "weather", "regulatory", "security", "supply_chain"],
    keywords: ["transportation", "transit", "traffic", "highway", "road closure"],
    globalScope: false,
  },
};

// Get category configuration for an organization
export function getIndustryCategoryConfig(industryType?: string | null, sector?: string | null): IndustryCategoryConfig {
  // Try specific industry first
  if (industryType && INDUSTRY_CATEGORY_MAPPINGS[industryType]) {
    return INDUSTRY_CATEGORY_MAPPINGS[industryType];
  }
  
  // Fall back to sector
  if (sector && SECTOR_CATEGORY_MAPPINGS[sector]) {
    return SECTOR_CATEGORY_MAPPINGS[sector];
  }
  
  // Default configuration
  return {
    categories: ["weather", "security", "infrastructure", "health", "financial", "general"],
    keywords: [],
    globalScope: false,
  };
}

// Map internal categories to display configuration
export const CATEGORY_DISPLAY_CONFIG: Record<NewsCategory, { 
  icon: string; 
  label: string; 
  description: string;
  color: string; 
  bgColor: string;
}> = {
  weather: { 
    icon: "Cloud", 
    label: "Weather & Environment", 
    description: "Severe weather, storms, temperature extremes, environmental conditions",
    color: "text-sky-600", 
    bgColor: "bg-sky-50 dark:bg-sky-950/30" 
  },
  security: { 
    icon: "Shield", 
    label: "Security & Safety", 
    description: "Security threats, civil unrest, crime, public safety incidents",
    color: "text-red-600", 
    bgColor: "bg-red-50 dark:bg-red-950/30" 
  },
  health: { 
    icon: "Heart", 
    label: "Health & Medical", 
    description: "Disease outbreaks, public health alerts, medical recalls, patient safety",
    color: "text-pink-600", 
    bgColor: "bg-pink-50 dark:bg-pink-950/30" 
  },
  infrastructure: { 
    icon: "Zap", 
    label: "Infrastructure", 
    description: "Power outages, water issues, road closures, facility impacts",
    color: "text-amber-600", 
    bgColor: "bg-amber-50 dark:bg-amber-950/30" 
  },
  financial: { 
    icon: "DollarSign", 
    label: "Business & Economic", 
    description: "Economic impacts, market changes, business disruptions",
    color: "text-emerald-600", 
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30" 
  },
  regulatory: { 
    icon: "Scale", 
    label: "Regulatory & Compliance", 
    description: "Policy changes, compliance updates, legal requirements",
    color: "text-purple-600", 
    bgColor: "bg-purple-50 dark:bg-purple-950/30" 
  },
  cyber: { 
    icon: "ShieldAlert", 
    label: "Cybersecurity", 
    description: "Cyber threats, data breaches, IT security incidents",
    color: "text-indigo-600", 
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30" 
  },
  supply_chain: { 
    icon: "Package", 
    label: "Supply Chain", 
    description: "Supply disruptions, logistics issues, vendor problems",
    color: "text-orange-600", 
    bgColor: "bg-orange-50 dark:bg-orange-950/30" 
  },
  environmental: { 
    icon: "Leaf", 
    label: "Environmental", 
    description: "Spills, contamination, environmental incidents, emissions",
    color: "text-green-600", 
    bgColor: "bg-green-50 dark:bg-green-950/30" 
  },
  general: { 
    icon: "Globe", 
    label: "General News", 
    description: "Other relevant news and developments",
    color: "text-slate-600", 
    bgColor: "bg-slate-50 dark:bg-slate-950/30" 
  },
};
