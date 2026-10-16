create table public.seo_prompts (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null references public.seo_brands(id) on delete cascade,
 prompt text not null check(length(prompt) between 5 and 1500),
 intent text not null check(intent in ('compare','recommend','action','concept','solve','qualify')),
 keyword text not null default '',
 stage text not null default 'consideration' check(stage in ('awareness','consideration','action')),
 active boolean not null default true,
 source text not null default 'manual',
 created_at timestamptz not null default now(),
 unique(brand_id,prompt), unique(id,brand_id)
);
alter table public.seo_prompts enable row level security;
create policy "Members manage prompts" on public.seo_prompts for all to authenticated
 using(exists(select 1 from public.seo_members where user_id=(select auth.uid())))
 with check(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create index seo_prompts_brand on public.seo_prompts(brand_id,created_at);

create table public.seo_schedules (
 brand_id uuid primary key references public.seo_brands(id) on delete cascade,
 enabled boolean not null default false,
 cadence text not null default 'mwf' check(cadence in ('mwf','daily','weekly')),
 prompt_limit integer not null default 10 check(prompt_limit between 1 and 10),
 updated_at timestamptz not null default now()
);
alter table public.seo_schedules enable row level security;
create policy "Members manage schedules" on public.seo_schedules for all to authenticated
 using(exists(select 1 from public.seo_members where user_id=(select auth.uid())))
 with check(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create function public.seo_check_schedule_budget() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(746283);
 if new.enabled and new.prompt_limit + coalesce((select sum(prompt_limit) from public.seo_schedules where enabled and brand_id<>new.brand_id),0)>20 then
  raise exception '자동 수집은 워크스페이스 전체 하루 최대 20질문입니다. 다른 브랜드의 질문 수를 줄여 주세요.';
 end if;
 new.updated_at=now(); return new;
end;$$;
revoke all on function public.seo_check_schedule_budget() from public,anon,authenticated;
create trigger seo_schedule_budget before insert or update on public.seo_schedules for each row execute function public.seo_check_schedule_budget();

create table public.seo_monitor_runs (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null references public.seo_brands(id) on delete cascade,
 prompt_id uuid not null references public.seo_prompts(id) on delete restrict,
 slot_date date not null,
 prompt text not null,
 brand_snapshot jsonb not null,
 model text not null,
 status text not null default 'running' check(status in ('running','succeeded','failed')),
 error text,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(prompt_id,slot_date,model)
);
alter table public.seo_monitor_runs enable row level security;
create policy "Members read runs" on public.seo_monitor_runs for select to authenticated
 using(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create index seo_monitor_runs_brand on public.seo_monitor_runs(brand_id,started_at desc);
alter table public.seo_observations add column prompt_id uuid;
alter table public.seo_observations add constraint seo_observation_prompt_brand foreign key(prompt_id,brand_id) references public.seo_prompts(id,brand_id) on delete restrict;
alter table public.seo_observations add column run_id uuid unique references public.seo_monitor_runs(id);
alter table public.seo_observations add column measurement jsonb;
create index seo_observations_prompt_time on public.seo_observations(prompt_id,observed_at desc);

-- Only a one-way digest of the worker credential is kept in the database.
create table public.seo_monitor_credentials (
 singleton boolean primary key default true check(singleton),
 secret_hash text not null check(length(secret_hash)=64)
);
alter table public.seo_monitor_credentials enable row level security;
revoke all on public.seo_monitor_credentials from anon,authenticated;
create function public.seo_monitor_authorized(p_secret text) returns boolean
 language sql security definer stable set search_path='' as $$
 select length(p_secret)>=32 and exists(select 1 from public.seo_monitor_credentials where secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex'));
$$;
revoke all on function public.seo_monitor_authorized(text) from public,anon,authenticated;

-- Atomic claims and a daily unique key prevent duplicate model requests.
create function public.seo_claim_monitor_runs(p_secret text) returns setof public.seo_monitor_runs
 language plpgsql security definer set search_path='' as $$
declare d date:=(now() at time zone 'Asia/Seoul')::date; dow integer; remaining integer;
begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'UNAUTHORIZED'; end if;
 perform pg_advisory_xact_lock(746284);
 update public.seo_monitor_runs set status='failed',error='실행 시간이 초과되었습니다. 수동으로 재측정할 수 있습니다.',finished_at=now()
 where status='running' and started_at<now()-interval '15 minutes';
 dow:=extract(isodow from d);
 select 20-count(*) into remaining from public.seo_monitor_runs where slot_date=d;
 if remaining<=0 then return; end if;
 return query
 insert into public.seo_monitor_runs(brand_id,prompt_id,slot_date,prompt,brand_snapshot,model)
 select b.id,p.id,d,p.prompt,jsonb_build_object('id',b.id,'name',b.name,'domain',b.domain,'competitors',b.competitors),'google/gemini-2.5-flash-lite'
 from public.seo_schedules s join public.seo_brands b on b.id=s.brand_id
 cross join lateral (
  select q.* from public.seo_prompts q where q.brand_id=s.brand_id and q.active
  order by q.created_at,q.id limit s.prompt_limit
 ) p
 where s.enabled and (s.cadence='daily' or (s.cadence='mwf' and dow in (1,3,5)) or (s.cadence='weekly' and dow=1))
 and not exists(select 1 from public.seo_monitor_runs r where r.prompt_id=p.id and r.slot_date=d and r.model='google/gemini-2.5-flash-lite')
 order by b.created_at,p.created_at,p.id limit remaining
 on conflict(prompt_id,slot_date,model) do nothing returning *;
end;$$;
revoke all on function public.seo_claim_monitor_runs(text) from public,authenticated;
grant execute on function public.seo_claim_monitor_runs(text) to anon;

create function public.seo_finish_monitor_run(p_secret text,p_run_id uuid,p_answer text default null,p_measurement jsonb default null,p_usage jsonb default null,p_error text default null) returns boolean
 language plpgsql security definer set search_path='' as $$
declare r public.seo_monitor_runs;
begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'UNAUTHORIZED'; end if;
 select * into r from public.seo_monitor_runs where id=p_run_id for update;
 if not found or r.status<>'running' then return false; end if;
 if p_error is not null then
  update public.seo_monitor_runs set status='failed',error=left(p_error,500),finished_at=now() where id=r.id; return true;
 end if;
 if p_answer is null or length(trim(p_answer))=0 or length(p_answer)>100000 or p_measurement is null then raise exception 'INVALID_RESULT'; end if;
 insert into public.seo_observations(brand_id,prompt_id,run_id,prompt,platform,answer,source_url,mentioned,source_kind,model,usage,measurement)
 values(r.brand_id,r.prompt_id,r.id,r.prompt,'Gemini API · 웹 검색 미사용',p_answer,'',coalesce((p_measurement->>'mentioned')::boolean,false),'model_api',r.model,p_usage,p_measurement);
 update public.seo_monitor_runs set status='succeeded',finished_at=now() where id=r.id;
 return true;
end;$$;
revoke all on function public.seo_finish_monitor_run(text,uuid,text,jsonb,jsonb,text) from public,authenticated;
grant execute on function public.seo_finish_monitor_run(text,uuid,text,jsonb,jsonb,text) to anon;
