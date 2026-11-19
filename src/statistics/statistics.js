import { supabase } from "../database/supabase.js";
import { questions } from "../quiz/questions.js";

export async function loadRealStats() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_survey_stats");
  if (error) throw error;
  return (data ?? []).map(row => {
    const questionIndex = Number(row.question_index);
    const question = questions[questionIndex - 1];
    const option = question?.options.find(([code]) => code === row.answer_code);
    return {
      question_index: questionIndex,
      question_title: question?.title ?? `Вопрос ${questionIndex}`,
      answer_code: row.answer_code,
      answer_label: option?.[1] ?? row.answer_code ?? "Неизвестный вариант",
      response_count: Number(row.response_count) || 0
    };
  }).filter(row => Number.isInteger(row.question_index) && row.question_index >= 1 && row.question_index <= questions.length);
}
