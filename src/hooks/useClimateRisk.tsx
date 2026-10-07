import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
export interface ClimateRiskAdjustment {
 hazard_category:string;location_region:string;summary_text:string;direction:string;limitations:string[];
 findings:Array<{finding:string;source_ids:string[]}>;
 projections:Array<{metric:string;unit:string;baseline_period:string;future_period:string;scenario:string;geography:string;lower:number|null;central:number;upper:number|null;applicability:string;source_ids:string[]}>;
 data_sources:Array<{id:string;title:string;url:string}>;last_updated:string;method_version:string;
}
const CLIMATE_CATEGORIES=["natural","climate","flood","wildfire","drought","heat","cold","hurricane","tornado","storm","precipitation","sea level","erosion","permafrost","blizzard","weather"];
export const isClimateRelated=(category:string)=>CLIMATE_CATEGORIES.some(c=>category.toLowerCase().includes(c));
export function useClimateRiskAdjustment(hazardCategory:string,location:string){
 const {data:profile}=useProfile();
 return useQuery({
  queryKey:["climate-evidence-v2",profile?.org_id,hazardCategory,location],enabled:!!profile?.org_id&&!!location&&!!hazardCategory,
  queryFn:async()=>{
   const {data,error}=await supabase.from("ai_tool_runs").select("output").eq("org_id",profile!.org_id!).eq("kind","climate-analysis").eq("status","completed").eq("method_version","hira-evidence-v2").order("created_at",{ascending:false}).limit(30);
   if(error)throw new Error("Climate evidence history unavailable. Apply the AI tools migration.");
   return (data.map(r=>r.output as unknown as ClimateRiskAdjustment).find(r=>r.hazard_category===hazardCategory&&r.location_region===location))||null;
  },staleTime:60000,
 });
}
export function useFetchClimateAnalysis(){
 const client=useQueryClient();const {data:profile}=useProfile();
 return useMutation({
  mutationFn:async({hazardCategory,location}:{hazardCategory:string;location:string})=>{
   const {data,error}=await supabase.functions.invoke("climate-risk-analysis",{body:{hazard_category:hazardCategory,location}});
   if(error){let message=error.message;try{if(error.context instanceof Response)message=(await error.context.json()).error||message;}catch{}throw new Error(message);}
   if(data?.method_version!=="hira-evidence-v2")throw new Error("Deploy the updated climate function first.");
   return data as ClimateRiskAdjustment;
  },
  onSuccess:(data,v)=>{client.setQueryData(["climate-evidence-v2",profile?.org_id,v.hazardCategory,v.location],data);toast.success("Climate evidence ready for review");},
  onError:(error)=>toast.error(error.message),
 });
}

