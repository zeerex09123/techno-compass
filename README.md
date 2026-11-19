# Techno Compass

Techno Compass is a Russian-language hardware preference survey built with Vite, vanilla JavaScript and Supabase.

## Stack
- Vite frontend
- Supabase Auth (Google and GitHub OAuth)
- Supabase PostgreSQL with row-level security
- Aggregated statistics RPC; raw survey rows are not publicly readable

## Local setup
1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env`.
4. Create a Supabase project and set `VITE_SUPABASE_URL` and the Supabase publishable/anon key in `.env`.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. In Supabase Authentication, enable Google and GitHub providers and configure their provider credentials.
7. Add your local and production site URLs to Supabase Auth URL Configuration.
8. Start the app: `npm run dev`.

## OAuth callback
Configure the OAuth provider callback URL shown by Supabase. Do not put OAuth client secrets, Supabase secret keys, or service-role keys in frontend code or Git.

## Data and privacy
- OAuth is used only to authenticate participants.
- Survey answers are associated with the Supabase auth user ID; names and email addresses are not copied into the survey table or displayed in statistics.
- Participants can read and update only their own response.
- Public statistics are exposed through an aggregate-only database function.
- Demo statistics are synthetic and labeled separately from real participant responses.

## Important
The included 28-question set is an initial editable draft. Review the wording and privacy notice before sharing the survey with participants.
