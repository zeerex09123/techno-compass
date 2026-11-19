import { supabase } from "../database/supabase.js";
import { questions } from "../quiz/questions.js";

// Условная выборка для наглядности статистики до накопления реальных ответов.
// На каждый вопрос приходится одинаковое число синтетических анкет.
const SYNTHETIC_SAMPLE_SIZE = 128;

function createSyntheticStats() {
  return questions.flatMap((question, questionIndex) => {
    const weights = question.options.map((_, optionIndex) =>
      10 + ((questionIndex * 17 + optionIndex * 11 + (questionIndex * optionIndex) % 7) % 19)
    );
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    const counts = weights.map(weight => Math.floor(weight / weightTotal * SYNTHETIC_SAMPLE_SIZE));
    let remainder = SYNTHETIC_SAMPLE_SIZE - counts.reduce((sum, count) => sum + count, 0);
    for (let i = 0; remainder > 0; i = (i + 1) % counts.length, remainder--) counts[i]++;
    return question.options.map(([answer_code], optionIndex) => ({
      question_index: questionIndex + 1,
      answer_code,
      response_count: counts[optionIndex]
    }));
  });
}

export const syntheticStats = createSyntheticStats();

export async function loadRealStats() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_survey_stats");
  if (error) throw error;
  return data ?? [];
}
