import { questions } from "./questions.js";
import { supabase } from "../database/supabase.js";

export async function saveAnswers(userId, answers) {
  const structuredAnswers = answers.map((answer_code, question_index) => ({
    question_index,
    answer_code
  }));
  const { error } = await supabase.from("survey_responses").upsert({
    user_id: userId,
    answers: structuredAnswers,
    completed_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export { questions };
