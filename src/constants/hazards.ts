export const PROBABILITY_SCORES = [
  { score: 1, category: "Rare", description: "Occurs every 100 years or more", percentChance: "Less than 1% chance of occurrence in any year" },
  { score: 2, category: "Very Unlikely", description: "Occurs every 50 - 99 years", percentChance: "Between 1 - 2% chance of occurrence in any year" },
  { score: 3, category: "Unlikely", description: "Occurs every 20 - 49 years", percentChance: "Between 2 - 5% chance of occurrence in any year" },
  { score: 4, category: "Probable", description: "Occurs every 5 - 19 years", percentChance: "Between 5 - 20% chance of occurrence in any year" },
  { score: 5, category: "Likely", description: "Occurs <5 years", percentChance: "Over 20% chance of occurrence in any year" },
  { score: 6, category: "Certain", description: "The hazard will occur annually", percentChance: "100% chance of occurrence in any year" },
] as const;

export const IMPACT_SCORES = [
  { score: 0, label: "None", description: "No impact" },
  { score: 1, label: "Low", description: "Minor impact, easily managed" },
  { score: 2, label: "Medium", description: "Moderate impact, requires attention" },
  { score: 3, label: "High", description: "Severe impact, significant consequences" },
] as const;

export const SECTOR_OPTIONS = [
  "Healthcare",
  "Finance & Banking",
  "Energy & Utilities",
  "Manufacturing",
  "Government",
  "Education",
  "Technology",
  "Retail & Consumer",
  "Transportation & Logistics",
  "Real Estate & Construction",
  "Agriculture",
  "Mining & Resources",
  "Telecommunications",
  "Hospitality & Tourism",
  "Non-Profit & NGO",
  "Other",
] as const;

export const REGION_OPTIONS = [
  "North America - USA",
  "North America - Canada",
  "Europe - UK",
  "Europe - EU",
  "Asia Pacific - Australia",
  "Asia Pacific - Southeast Asia",
  "Asia Pacific - East Asia",
  "Middle East",
  "Africa",
  "South America",
  "Central America & Caribbean",
  "Other",
] as const;

export const SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
] as const;
