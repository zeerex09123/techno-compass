-- Run this in Supabase SQL Editor.
-- Raw answers are private to their owner. Public clients can only call the aggregate RPC.
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  answers jsonb not null check (
    jsonb_typeof(answers) = 'array'
    and jsonb_array_length(answers) in (28, 50)
  ),
  completed_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

drop policy if exists "Users can read own response" on public.survey_responses;
create policy "Users can read own response"
  on public.survey_responses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own response" on public.survey_responses;
create policy "Users can insert own response"
  on public.survey_responses for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own response" on public.survey_responses;
create policy "Users can update own response"
  on public.survey_responses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.survey_responses from anon, authenticated;
grant select, insert, update on public.survey_responses to authenticated;

-- Aggregate each question separately. No user IDs or raw survey rows are exposed.
create or replace function public.get_public_survey_stats()
returns table(question_index integer, answer_code text, response_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select item.ordinality::integer as question_index,
         item.value ->> 'answer_code' as answer_code,
         count(*) as response_count
  from public.survey_responses r
  cross join lateral jsonb_array_elements(r.answers)
    with ordinality as item(value, ordinality)
  where jsonb_typeof(item.value) = 'object'
    and item.value ? 'answer_code'
  group by item.ordinality, item.value ->> 'answer_code'
  order by item.ordinality, count(*) desc;
$$;

revoke all on function public.get_public_survey_stats() from public;
grant execute on function public.get_public_survey_stats() to anon, authenticated;
