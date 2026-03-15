create table public.generation_signals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brand_templates(id) on delete cascade,
  user_id uuid not null,
  prompt_mode text not null,
  channel text not null,
  image_style text,
  accepted boolean default false,
  regenerated boolean default false,
  edited_background boolean default false,
  edited_text boolean default false,
  switched_mode boolean default false,
  time_to_accept_ms integer,
  created_at timestamptz default now()
);

alter table public.generation_signals enable row level security;

create policy "Users can insert own signals"
  on public.generation_signals for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own signals"
  on public.generation_signals for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own signals"
  on public.generation_signals for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);