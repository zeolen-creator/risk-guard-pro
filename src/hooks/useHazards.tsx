import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Hazard {
  id: string;
  category: string;
  category_number: number;
  description: string | null;
  hazards_list: string[];
  tags: string[];
  created_at: string;
}

export interface Consequence {
  id: string;
  category: string;
  category_number: number;
  description: string;
  created_at: string;
}

export function useHazards() {
  return useQuery({
    queryKey: ["hazards"],
    queryFn: async (): Promise<Hazard[]> => {
      const { data, error } = await supabase
        .from("hazards")
        .select("*")
        .order("category_number");

      if (error) throw error;
      
      return data.map(h => ({
        ...h,
        hazards_list: Array.isArray(h.hazards_list) ? h.hazards_list : JSON.parse(h.hazards_list as string),
        tags: h.tags || [],
      }));
    },
  });
}

export function useConsequences() {
  return useQuery({
    queryKey: ["consequences"],
    queryFn: async (): Promise<Consequence[]> => {
      const { data, error } = await supabase
        .from("consequences")
        .select("*")
        .order("category_number");

      if (error) throw error;
      return data;
    },
  });
}
