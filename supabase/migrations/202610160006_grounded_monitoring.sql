-- Grounded observations form a separate cohort from historical text-only runs.
alter table public.seo_brands add column competitor_domains jsonb not null default '{}'::jsonb check(jsonb_typeof(competitor_domains)='object');
alter table public.seo_monitor_runs add column protocol text not null default 'text-only';
alter table public.seo_monitor_runs drop constraint seo_monitor_runs_prompt_id_slot_date_model_key;
alter table public.seo_monitor_runs add unique(prompt_id,slot_date,model,protocol);

create or replace function public.seo_claim_monitor_runs(p_secret text) returns setof public.seo_monitor_runs
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
 insert into public.seo_monitor_runs(brand_id,prompt_id,slot_date,prompt,brand_snapshot,model,protocol)
 select b.id,p.id,d,p.prompt,to_jsonb(b),'google/gemini-2.5-flash-lite','google-search-v1'
 from public.seo_schedules s join public.seo_brands b on b.id=s.brand_id
 cross join lateral (select q.* from public.seo_prompts q where q.brand_id=s.brand_id and q.active order by q.created_at,q.id limit s.prompt_limit) p
 where s.enabled and (s.cadence='daily' or (s.cadence='mwf' and dow in (1,3,5)) or (s.cadence='weekly' and dow=1))
 and not exists(select 1 from public.seo_monitor_runs r where r.prompt_id=p.id and r.slot_date=d and r.model='google/gemini-2.5-flash-lite' and r.protocol='google-search-v1')
 order by b.created_at,p.created_at,p.id limit remaining
 on conflict(prompt_id,slot_date,model,protocol) do nothing returning *;
end;$$;

create or replace function public.seo_finish_monitor_run(p_secret text,p_run_id uuid,p_answer text default null,p_measurement jsonb default null,p_usage jsonb default null,p_error text default null) returns boolean
 language plpgsql security definer set search_path='' as $$
declare r public.seo_monitor_runs;
begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'UNAUTHORIZED'; end if;
 select * into r from public.seo_monitor_runs where id=p_run_id for update;
 if not found or r.status<>'running' then return false; end if;
 if p_error is not null then
  update public.seo_monitor_runs set status='failed',error=left(p_error,500),finished_at=now() where id=r.id; return true;
 end if;
 if p_answer is null or length(trim(p_answer))=0 or length(p_answer)>100000 or p_measurement is null or coalesce(p_measurement->>'protocol','text-only')<>r.protocol then raise exception 'INVALID_RESULT'; end if;
 insert into public.seo_observations(brand_id,prompt_id,run_id,prompt,platform,answer,source_url,mentioned,source_kind,model,usage,measurement)
 values(r.brand_id,r.prompt_id,r.id,r.prompt,case when r.protocol='google-search-v1' then 'Gemini API · Google 검색' else 'Gemini API · 웹 검색 미사용' end,p_answer,'',coalesce((p_measurement->>'mentioned')::boolean,false),'model_api',r.model,p_usage,p_measurement);
 update public.seo_monitor_runs set status='succeeded',finished_at=now() where id=r.id;
 return true;
end;$$;

-- Idempotent conversion from an observation to a task, without overwriting team edits.
alter table public.seo_tasks add column source_observation_id uuid references public.seo_observations(id);
create unique index seo_tasks_observation on public.seo_tasks(brand_id,source_observation_id) where source_observation_id is not null;
