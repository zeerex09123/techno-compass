import { supabase, isSupabaseConfigured } from "../database/supabase.js";

export async function signIn(provider) {
  if (!isSupabaseConfigured) throw new Error("Сначала настройте Supabase в файле .env.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Keep the repository subpath: GitHub Pages project sites live under /<repo>/.
      redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    }
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
