import { supabase } from "../database/supabase.js";

// Демо-значения намеренно отделены от реальных ответов.
export const demoStats = [
  { label: "AMD", value: 46 },
  { label: "NVIDIA", value: 39 },
  { label: "Intel", value: 15 }
];

export async function loadRealStats() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_survey_stats");
  if (error) throw error;
  return data ?? [];
}
