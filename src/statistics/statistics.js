import { supabase } from "../database/supabase.js";
import { questions } from "../quiz/questions.js";

// Демонстрационные значения синтетические и всегда показываются отдельно.
export const demoStats = [
  { label: "AMD", value: 46 },
  { label: "NVIDIA", value: 39 },
  { label: "Intel", value: 15 }
];

export async function loadRealStats() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_survey_stats");
  if (error) throw error;
  return (data ?? []).map(row => {
    const question = questions[row.question_index - 1];
    const option = question?.options.find(([code]) => code === row.answer_code);
    const questionName = question?.category ?? `Вопрос ${row.question_index}`;
    const answerName = option?.[1] ?? row.answer_code;
    return {
      answer_label: `${questionName} · ${answerName}`,
      response_count: Number(row.response_count)
    };
  });
}
