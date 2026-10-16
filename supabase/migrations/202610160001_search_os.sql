create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table public.seo_members (user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
alter table public.seo_members enable row level security;
create policy "Read own membership" on public.seo_members for select to authenticated using (user_id = (select auth.uid()));
create table public.seo_brands (id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 120), domain text not null check (length(domain) between 1 and 500), audience text not null default '', keywords text[] not null default '{}', competitors text[] not null default '{}', created_at timestamptz not null default now());
create table public.seo_audits (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade, seo_score integer not null check(seo_score between 0 and 100), aeo_score integer not null check(aeo_score between 0 and 100), report jsonb not null, created_by uuid references auth.users(id), created_at timestamptz not null default now());
create index seo_audits_brand_created on public.seo_audits(brand_id,created_at desc);
create table public.seo_tasks (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade, audit_id uuid references public.seo_audits(id), title text not null, detail text not null, priority text not null check(priority in ('P0','P1','P2')), status text not null default 'todo' check(status in ('todo','doing','done')), category text not null, evidence text not null, created_at timestamptz not null default now());
create index seo_tasks_brand on public.seo_tasks(brand_id);
create table public.seo_observations (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade, prompt text not null, platform text not null, answer text not null, source_url text not null default '', mentioned boolean not null default false, observed_at timestamptz not null default now(), created_at timestamptz not null default now());
create index seo_observations_brand on public.seo_observations(brand_id);
create table public.seo_strategies (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade, content text not null, created_at timestamptz not null default now());
create index seo_strategies_brand on public.seo_strategies(brand_id);
create table public.seo_rate_limits (user_id uuid not null references auth.users(id), bucket timestamptz not null, requests integer not null default 0, primary key(user_id,bucket));
alter table public.seo_rate_limits enable row level security;
create function public.seo_reserve_audit() returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer; begin
if not exists(select 1 from public.seo_members where user_id = auth.uid()) then return false; end if;
insert into public.seo_rate_limits(user_id,bucket,requests) values(auth.uid(),date_trunc('hour',now()),1) on conflict(user_id,bucket) do update set requests = public.seo_rate_limits.requests + 1 returning requests into n;
return n <= 20; end; $$;
revoke all on function public.seo_reserve_audit() from public,anon;
grant execute on function public.seo_reserve_audit() to authenticated;
do $$ declare t text; begin foreach t in array array['seo_brands','seo_audits','seo_tasks','seo_observations','seo_strategies'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy "Members only" on public.%I for all to authenticated using (exists(select 1 from public.seo_members where user_id = (select auth.uid()))) with check (exists(select 1 from public.seo_members where user_id = (select auth.uid())))',t);
end loop; end $$;
