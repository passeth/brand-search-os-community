-- No seeded sites. Unknown legacy languages are deliberately not inferred from text.
alter table public.seo_brands add column language text not null default 'und' check(language in ('ko','en','und'));
alter table public.seo_prompts add column language text not null default 'und' check(language in ('ko','en','und'));
create function public.seo_prompt_language() returns trigger language plpgsql set search_path='' as $$
begin
 select language into new.language from public.seo_brands where id=new.brand_id;
 return new;
end;$$;
create trigger seo_prompt_language before insert or update of prompt,brand_id on public.seo_prompts for each row execute function public.seo_prompt_language();

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
 where s.enabled and b.language in ('ko','en') and p.language=b.language and (s.cadence='daily' or (s.cadence='mwf' and dow in (1,3,5)) or (s.cadence='weekly' and dow=1))
 and not exists(select 1 from public.seo_monitor_runs r where r.prompt_id=p.id and r.slot_date=d and r.model='google/gemini-2.5-flash-lite' and r.protocol='google-search-v1')
 order by b.created_at,p.created_at,p.id limit remaining
 on conflict(prompt_id,slot_date,model,protocol) do nothing returning *;
end;$$;

