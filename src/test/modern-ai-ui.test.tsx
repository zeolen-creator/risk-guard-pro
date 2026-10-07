import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AIResearchPanel } from "@/features/assessment/components/AIResearchPanel";
import { ClimateRiskWidget } from "@/components/features/climate/ClimateRiskWidget";
const mocks=vi.hoisted(()=>({research:vi.fn(),climate:vi.fn()}));
vi.mock("@/hooks/useAIResearch",()=>({useAIResearch:()=>({research:mocks.research,isLoading:false,getCachedResult:()=>null,hasOrganizationContext:true,contextKey:"org-v1"})}));
vi.mock("@/hooks/useClimateRisk",()=>({isClimateRelated:()=>true,useClimateRiskAdjustment:()=>({data:mocks.climate(),isLoading:false,error:null}),useFetchClimateAnalysis:()=>({mutate:vi.fn(),isPending:false})}));
beforeEach(()=>vi.clearAllMocks());
it("does not offer an Apply action for missing probability evidence or show numerical confidence",async()=>{
 mocks.research.mockResolvedValue({success:true,data:{suggested_value:null,confidence_level:null,data_quality:"limited",explanation:"Insufficient local evidence",sources:[],conflicting_data:false,location_specific:false,industry_specific:false}});
 const apply=vi.fn();render(<AIResearchPanel hazardId="h" hazardName="Flood" hazardCategory="Flood" researchType="probability" onApplyValue={apply}/>);
 fireEvent.click(screen.getByRole("button",{name:"AI Research"}));
 fireEvent.click(await screen.findByRole("button",{name:"View Explanation"}));
 expect(await screen.findByText("Insufficient local evidence")).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:/Apply/})).not.toBeInTheDocument();expect(screen.queryByText(/% Confidence/)).not.toBeInTheDocument();expect(apply).not.toHaveBeenCalled();
});
it("shows climate scope and uncertainty without multiplying the HIRA score",()=>{
 mocks.climate.mockReturnValue({direction:"uncertain",summary_text:"Local evidence gap",findings:[],projections:[],limitations:["No local scenario dataset"],data_sources:[{id:"W1",title:"NOAA",url:"https://www.noaa.gov/"}],last_updated:"2026-10-06"});
 render(<ClimateRiskWidget hazardCategory="Flood" location="Ontario" currentScore={12}/>);
 expect(screen.getByText("No sufficiently specified numerical projections were extracted.")).toBeInTheDocument();
 expect(screen.getByRole("link",{name:"W1: NOAA"})).toHaveAttribute("href","https://www.noaa.gov/");
 expect(screen.queryByText(/Score: 12/)).not.toBeInTheDocument();
});
