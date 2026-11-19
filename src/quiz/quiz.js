import { questions } from "./questions.js";
import { supabase } from "../database/supabase.js";

export async function saveAnswers(userId, answers) {
  const { error } = await supabase.from("survey_responses").upsert({
    user_id: userId,
    answers,
    completed_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export { questions };
