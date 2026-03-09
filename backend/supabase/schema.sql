-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: teams
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: votes
create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null, -- references auth.users(id) on delete cascade (DISABLED FOR BYPASS TESTING)
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one vote per user at the DB level (Secondary Defense)
  constraint votes_user_id_key unique (user_id)
);

-- Enable Realtime for the 'votes' table so the Admin view can listen to it
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.teams;

-- RLS (Row Level Security) Policies
alter table public.teams enable row level security;
alter table public.votes enable row level security;

-- Teams: Anyone can read (for the voter app list)
create policy "Teams are viewable by everyone." on public.teams
  for select using (true);

-- Votes: 
-- Users can insert their own vote (if not going entirely through backend bypass)
-- Actually, since the backend uses the Service Role key, it bypasses RLS.
-- But for safety, we restrict direct client writes:
create policy "Direct client inserts blocked. Must use API." on public.votes
  for insert with check (false);

-- Only Admins (or anyone if projector is unauthenticated internal) can view votes
create policy "Votes viewable by admins." on public.votes
  for select using (true); -- In production, restrict this to admin roles only

-- View: Leaderboard Rollup (optional, useful for initial load before Realtime events stream)
create or replace view public.leaderboard as
select 
  t.id as team_id,
  t.name,
  count(v.id) as vote_count
from public.teams t
left join public.votes v on t.id = v.team_id
group by t.id, t.name
order by vote_count desc, t.name asc;
