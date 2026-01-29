import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RegulationRequest {
  session_id?: string;
  industry: string;
  jurisdiction: string;
  org_context?: {
    size?: string;
    public_facing?: boolean;
    critical_infrastructure?: boolean;
  };
}

// Consequence types that need to be analyzed
const CONSEQUENCE_TYPES = [
  "Fatalities",
  "Injuries_Illness", 
  "Displacement",
  "Psychosocial",
  "Support_Systems",
  "Property_Damage",
  "Infrastructure",
  "Environmental",
  "Economic_Impact",
  "Reputational"
];

// Industry-specific source mappings for comprehensive research
const INDUSTRY_SOURCES: Record<string, string[]> = {
  healthcare: [
    "WHO (World Health Organization) Guidelines",
    "CDC (Centers for Disease Control) Standards",
    "Health Canada Regulations",
    "OSHA Healthcare Standards",
    "Joint Commission (JCAHO) Standards",
    "CMS (Centers for Medicare & Medicaid) Conditions of Participation",
    "Provincial/State Health Acts",
    "PubMed/MEDLINE research literature",
    "Cochrane Library systematic reviews",
    "ISO 31000 Risk Management",
    "ISO 22301 Business Continuity"
  ],
  manufacturing: [
    "OSHA General Industry Standards (29 CFR 1910)",
    "ISO 45001 Occupational Health & Safety",
    "ISO 14001 Environmental Management",
    "NFPA Fire Safety Codes",
    "EPA Environmental Regulations",
    "CSA Group Standards",
    "ILO (International Labour Organization) Guidelines",
    "ANSI Safety Standards"
  ],
  construction: [
    "OSHA Construction Standards (29 CFR 1926)",
    "CSA Z1000 OHS Management",
    "Provincial OH&S Acts",
    "Building Codes (National/Provincial)",
    "NFPA Construction Safety",
    "ILO Construction Safety Guidelines",
    "ISO 45001"
  ],
  education: [
    "Education Department Safety Guidelines",
    "Child Protection Laws",
    "Accessibility Standards (ADA/AODA)",
    "Emergency Management Guidelines",
    "Public Health Guidelines",
    "Fire Marshal Requirements"
  ],
  finance: [
    "Financial Services Regulatory Frameworks",
    "Business Continuity Regulations (OSFI, SEC)",
    "Data Protection Laws (PIPEDA, GDPR)",
    "Anti-Money Laundering Requirements",
    "Operational Risk Management Standards (Basel)",
    "ISO 27001 Information Security"
  ],
  energy: [
    "NERC Reliability Standards",
    "EPA Environmental Regulations",
    "DOE Guidelines",
    "Nuclear Regulatory Commission (if applicable)",
    "Pipeline Safety Regulations",
    "ISO 14001 Environmental",
    "Process Safety Management (PSM) Standards"
  ],
  transportation: [
    "Transport Canada Regulations",
    "DOT/FMCSA Regulations",
    "ICAO Aviation Safety Standards",
    "IMO Maritime Safety",
    "Railway Safety Acts",
    "Dangerous Goods Transportation Regulations"
  ],
  government: [
    "Treasury Board Guidelines",
    "Emergency Management Frameworks",
    "Public Service OH&S",
    "National Security Guidelines",
    "ISO 31000 Risk Management",
    "Business Continuity Standards"
  ],
  general: [
    "ISO 31000 Risk Management",
    "ISO 45001 Occupational Health & Safety",
    "ISO 14001 Environmental Management",
    "ISO 22301 Business Continuity",
    "OSHA General Industry Standards",
    "EPA Environmental Regulations",
    "Provincial/State OH&S Acts",
    "NFPA Fire Codes",
    "ILO International Labour Standards",
    "UN Global Compact Principles",
    "WHO Occupational Health Guidelines"
  ]
};

// Get industry-specific sources or default to general
function getIndustrySources(industry: string): string[] {
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '');
  
  // Match industry to source category
  if (normalizedIndustry.includes('health') || normalizedIndustry.includes('hospital') || normalizedIndustry.includes('medical') || normalizedIndustry.includes('clinic') || normalizedIndustry.includes('pharma')) {
    return INDUSTRY_SOURCES.healthcare;
  }
  if (normalizedIndustry.includes('manufactur') || normalizedIndustry.includes('factory') || normalizedIndustry.includes('industrial')) {
    return INDUSTRY_SOURCES.manufacturing;
  }
  if (normalizedIndustry.includes('construct') || normalizedIndustry.includes('building')) {
    return INDUSTRY_SOURCES.construction;
  }
  if (normalizedIndustry.includes('school') || normalizedIndustry.includes('university') || normalizedIndustry.includes('college') || normalizedIndustry.includes('education')) {
    return INDUSTRY_SOURCES.education;
  }
  if (normalizedIndustry.includes('bank') || normalizedIndustry.includes('financ') || normalizedIndustry.includes('insurance')) {
    return INDUSTRY_SOURCES.finance;
  }
  if (normalizedIndustry.includes('energy') || normalizedIndustry.includes('oil') || normalizedIndustry.includes('gas') || normalizedIndustry.includes('power') || normalizedIndustry.includes('utility')) {
    return INDUSTRY_SOURCES.energy;
  }
  if (normalizedIndustry.includes('transport') || normalizedIndustry.includes('logistics') || normalizedIndustry.includes('aviation') || normalizedIndustry.includes('shipping')) {
    return INDUSTRY_SOURCES.transportation;
  }
  if (normalizedIndustry.includes('government') || normalizedIndustry.includes('municipal') || normalizedIndustry.includes('public sector')) {
    return INDUSTRY_SOURCES.government;
  }
  
  return INDUSTRY_SOURCES.general;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { industry, jurisdiction, org_context } = await req.json() as RegulationRequest;

    console.log(`Researching regulations for ${industry} in ${jurisdiction}`);

    const industrySources = getIndustrySources(industry);
    const sourcesListString = industrySources.join('\n    - ');

    // Comprehensive research prompt
    const researchPrompt = `You are an expert regulatory compliance researcher with extensive knowledge of international and regional regulations across ALL industries. Your task is to conduct COMPREHENSIVE research on regulatory requirements that affect how organizations should weight consequence types in risk assessments.

## RESEARCH CONTEXT
- **Industry/Sector**: ${industry}
- **Jurisdiction**: ${jurisdiction}
- **Organization Size**: ${org_context?.size || 'Medium (default)'}
- **Public-Facing Operations**: ${org_context?.public_facing ? 'Yes' : 'No'}
- **Critical Infrastructure**: ${org_context?.critical_infrastructure ? 'Yes' : 'No'}

## CONSEQUENCE TYPES TO ANALYZE
For each of these 10 consequence categories, determine the regulatory emphasis (0-100 score):
1. **Fatalities** - Loss of life
2. **Injuries_Illness** - Physical harm, occupational disease
3. **Displacement** - Evacuation, relocation of people
4. **Psychosocial** - Mental health, trauma, stress
5. **Support_Systems** - Essential services disruption
6. **Property_Damage** - Physical asset destruction
7. **Infrastructure** - Critical systems failure
8. **Environmental** - Ecological damage, pollution
9. **Economic_Impact** - Financial losses, business interruption
10. **Reputational** - Public trust, brand damage

## MANDATORY RESEARCH SOURCES TO CONSULT
You MUST draw from these authoritative sources for the ${industry} industry:
    - ${sourcesListString}

## ADDITIONAL UNIVERSAL SOURCES (Always Include)
- **International**: WHO guidelines, ILO conventions, UN Global Compact, ISO standards (31000, 45001, 14001, 22301)
- **Academic/Research**: PubMed, Cochrane Library, peer-reviewed risk management journals
- **Industry Bodies**: Relevant professional associations and accreditation bodies
- **Case Law**: Notable legal precedents affecting liability and duty of care
- **Government**: Federal, provincial/state, and municipal regulations

## RESEARCH REQUIREMENTS
1. **Be Specific**: Cite actual regulation names, sections, and requirements
2. **Quantify Impact**: Provide regulatory emphasis scores (0-100) for each consequence type
3. **Include Penalties**: Note fines, sanctions, license revocations, criminal liability
4. **Cross-Reference**: Show when multiple regulations reinforce the same priority
5. **Regional Variations**: Note differences between federal and provincial/state requirements

## OUTPUT FORMAT (JSON)
{
  "consequence_analysis": {
    "Fatalities": {
      "regulatory_emphasis": 95,
      "key_regulations": ["Regulation 1 (Section X)", "Regulation 2 (Part Y)"],
      "penalty_examples": ["Up to $X fine", "Criminal charges possible"],
      "compliance_notes": "Primary duty of care requirement..."
    },
    "Injuries_Illness": {
      "regulatory_emphasis": 90,
      "key_regulations": [...],
      "penalty_examples": [...],
      "compliance_notes": "..."
    }
    // ... continue for ALL 10 consequence types
  },
  "top_regulated_consequences": ["Fatalities", "Injuries_Illness", "Environmental"],
  "regulations_found": [
    {
      "name": "Full Regulation Name",
      "citation": "Official citation",
      "authority": "Issuing body",
      "jurisdiction": "Federal/Provincial",
      "consequence_emphasis": ["Fatalities", "Injuries_Illness"],
      "weight_implications": "Life safety must be prioritized above property",
      "penalties": "Up to $X per violation, potential criminal liability",
      "source_type": "Government Regulation"
    }
  ],
  "international_standards": [
    {
      "standard": "ISO 45001:2018",
      "relevance": "Occupational Health & Safety Management",
      "weight_guidance": "Emphasizes hierarchy of controls with elimination of hazards as priority"
    }
  ],
  "research_quality": {
    "confidence_level": "high",
    "sources_consulted": ["List of actual sources"],
    "data_gaps": ["Any areas with limited regulatory guidance"],
    "last_updated_consideration": "Most regulations reviewed as of 2024"
  },
  "recommended_minimum_weights": {
    "Fatalities": { "min": 15, "max": 35, "rationale": "Legal duty of care, criminal liability" },
    "Injuries_Illness": { "min": 10, "max": 25, "rationale": "OHS legislation requirements" }
  },
  "compliance_summary": "Executive summary of regulatory landscape for this industry/jurisdiction"
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting
- Provide data for ALL 10 consequence types
- Be comprehensive - this research drives legally defensible weight decisions
- If regulations are unclear for a consequence type, still provide your expert assessment with lower confidence`;

    // Call AI Gateway with Gemini Pro for complex research task
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Use Pro model for better research quality
        messages: [
          {
            role: "system",
            content: `You are a regulatory compliance expert with deep knowledge of:
- International standards (ISO, WHO, ILO, UN)
- North American regulations (OSHA, EPA, Health Canada, Transport Canada)
- European frameworks (EU Directives, CE marking)
- Industry-specific standards and accreditation requirements
- Academic research on risk assessment methodologies

Always provide comprehensive, well-sourced analysis. Return valid JSON only.`
          },
          {
            role: "user",
            content: researchPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for more factual responses
        max_tokens: 8000 // Increased for comprehensive output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status}`, errorText);
      
      // Handle rate limits
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again in a moment."
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({
          success: false,
          error: "AI service quota exceeded."
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content || "{}";
    
    // Parse AI response
    let regulatoryData;
    try {
      // Clean up response if it has markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      regulatoryData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content:", content.substring(0, 500));
      
      // Return fallback structure with the raw content for debugging
      regulatoryData = {
        consequence_analysis: CONSEQUENCE_TYPES.reduce((acc, type) => ({
          ...acc,
          [type]: {
            regulatory_emphasis: 50,
            key_regulations: [],
            penalty_examples: [],
            compliance_notes: "Unable to parse AI research - using default values"
          }
        }), {}),
        top_regulated_consequences: ["Fatalities", "Injuries_Illness", "Environmental"],
        regulations_found: [],
        research_quality: {
          confidence_level: "low",
          sources_consulted: [],
          data_gaps: ["AI response parsing failed"]
        },
        compliance_summary: "Research parsing failed. Default regulatory priorities applied."
      };
    }

    const regulationsCount = regulatoryData.regulations_found?.length || 0;
    const consequenceCount = Object.keys(regulatoryData.consequence_analysis || {}).length;
    console.log(`Found ${regulationsCount} regulations, analyzed ${consequenceCount} consequence types`);

    return new Response(JSON.stringify({
      success: true,
      ...regulatoryData, // Spread the regulatory data directly for component compatibility
      metadata: {
        industry,
        jurisdiction,
        sources_used: industrySources,
        researched_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Regulation research error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
