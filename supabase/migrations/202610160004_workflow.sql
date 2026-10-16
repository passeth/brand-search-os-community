create table public.seo_keywords (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade,
 keyword text not null check(length(keyword) between 1 and 200), cluster text not null default '미분류', intent text not null default '정보',
 target_url text not null default '', active boolean not null default true, created_at timestamptz not null default now(), unique(brand_id,keyword)
);
create table public.seo_personas (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), role text not null default '', tone text not null default '',
 instructions text not null default '' check(length(instructions)<=10000), sample text not null default '' check(length(sample)<=10000), created_at timestamptz not null default now()
);
create table public.seo_knowledge (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade,
 title text not null check(length(title) between 1 and 200), kind text not null check(kind in ('product','topic','claim','source')),
 content text not null check(length(content) between 1 and 20000), source_url text not null default '', status text not null default 'draft' check(status in ('draft','approved','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.seo_contents (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade,
 title text not null check(length(title) between 1 and 200), keyword text not null default '', format text not null default 'guide',
 body text not null default '' check(length(body)<=100000), status text not null default 'draft' check(status in ('draft','review','approved')),
 published_url text not null default '', evidence jsonb not null default '{}', revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.seo_content_versions (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.seo_contents(id) on delete cascade,
 brand_id uuid not null references public.seo_brands(id) on delete cascade, revision integer not null, title text not null, body text not null, evidence jsonb not null,
 created_at timestamptz not null default now()
);
create function public.seo_version_content() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if old.body is distinct from new.body or old.title is distinct from new.title then
   insert into public.seo_content_versions(content_id,brand_id,revision,title,body,evidence) values(old.id,old.brand_id,old.revision,old.title,old.body,old.evidence);
   new.revision:=old.revision+1;
   if new.status='approved' then new.status:='review'; end if;
  else new.revision:=old.revision; end if;
 end if;
 new.updated_at:=now(); return new;
end $$;
revoke all on function public.seo_version_content() from public,anon,authenticated;
create trigger seo_content_version before update on public.seo_contents for each row execute function public.seo_version_content();
create table public.seo_optimizations (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.seo_brands(id) on delete cascade,
 source_url text not null default '', content text not null check(length(content) between 1 and 100000), result jsonb not null, created_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['seo_keywords','seo_personas','seo_knowledge','seo_contents','seo_optimizations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy "Members only" on public.%I for all to authenticated using (exists(select 1 from public.seo_members where user_id=(select auth.uid()))) with check (exists(select 1 from public.seo_members where user_id=(select auth.uid())))',t);
 execute format('create index on public.%I(brand_id,created_at desc)',t);
end loop; end $$;
alter table public.seo_content_versions enable row level security;
create policy "Read versions" on public.seo_content_versions for select to authenticated using(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create index on public.seo_content_versions(content_id,created_at desc);
insert into public.seo_keywords(brand_id,keyword) select id,unnest(keywords) from public.seo_brands on conflict do nothing;

create table public.seo_google_connections (
 brand_id uuid primary key references public.seo_brands(id) on delete cascade, connected_by uuid not null references auth.users(id),
 scopes text[] not null, gsc_site text, ga4_property text, connected_at timestamptz not null default now(), last_sync_at timestamptz, last_error text, enabled boolean not null default true
);
alter table public.seo_google_connections enable row level security;
create policy "Read connection status" on public.seo_google_connections for select to authenticated using(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create table public.seo_google_tokens (brand_id uuid primary key references public.seo_google_connections(brand_id) on delete cascade, encrypted_token text not null);
alter table public.seo_google_tokens enable row level security;
revoke all on public.seo_google_tokens from anon,authenticated;
create table public.seo_metrics (
 brand_id uuid not null references public.seo_brands(id) on delete cascade, provider text not null check(provider in ('gsc','ga4')),
 grain text not null check(grain in ('daily','query')), date date not null, dimension text not null default '',
 metrics jsonb not null, source_property text not null, collected_at timestamptz not null default now(), primary key(brand_id,provider,grain,date,dimension)
);
alter table public.seo_metrics enable row level security;
create policy "Read metrics" on public.seo_metrics for select to authenticated using(exists(select 1 from public.seo_members where user_id=(select auth.uid())));
create index on public.seo_metrics(brand_id,date desc);
create function public.seo_google_worker(p_secret text,p_action text,p_brand uuid,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'FORBIDDEN'; end if;
 if p_action='connect' then
  if not exists(select 1 from public.seo_members where user_id=(p_data->>'user_id')::uuid) then raise exception 'FORBIDDEN'; end if;
  insert into public.seo_google_connections(brand_id,connected_by,scopes) values(p_brand,(p_data->>'user_id')::uuid,array(select jsonb_array_elements_text(p_data->'scopes')))
  on conflict(brand_id) do update set connected_by=excluded.connected_by,scopes=excluded.scopes,connected_at=now(),last_error=null,enabled=true;
  insert into public.seo_google_tokens values(p_brand,p_data->>'encrypted_token') on conflict(brand_id) do update set encrypted_token=excluded.encrypted_token;
 elsif p_action='read' then
  select to_jsonb(c)||jsonb_build_object('encrypted_token',t.encrypted_token) into v from public.seo_google_connections c join public.seo_google_tokens t using(brand_id) where c.brand_id=p_brand and c.enabled;
  return v;
 elsif p_action='list' then
  return (select coalesce(jsonb_agg(brand_id),'[]') from public.seo_google_connections where enabled and (gsc_site is not null or ga4_property is not null));
 elsif p_action='select' then
  delete from public.seo_metrics where brand_id=p_brand and ((provider='gsc' and source_property is distinct from p_data->>'gsc_site') or (provider='ga4' and source_property is distinct from p_data->>'ga4_property'));
  update public.seo_google_connections set gsc_site=nullif(p_data->>'gsc_site',''),ga4_property=nullif(p_data->>'ga4_property',''),last_sync_at=null,last_error=null where brand_id=p_brand;
 elsif p_action='metrics' then
  -- Atomically replace the fetched interval, including days removed by Google corrections.
  delete from public.seo_metrics where brand_id=p_brand and provider=p_data->>'provider' and date between (p_data->>'start')::date and (p_data->>'end')::date;
  insert into public.seo_metrics(brand_id,provider,grain,date,dimension,metrics,source_property)
   select p_brand,p_data->>'provider',r->>'grain',(r->>'date')::date,coalesce(r->>'dimension',''),r->'metrics',p_data->>'property' from jsonb_array_elements(p_data->'rows') r;
 elsif p_action='status' then
  update public.seo_google_connections set last_error=nullif(p_data->>'error',''),last_sync_at=case when nullif(p_data->>'error','') is null then now() else last_sync_at end where brand_id=p_brand;
 elsif p_action='disconnect' then
  delete from public.seo_google_tokens where brand_id=p_brand;
  update public.seo_google_connections set enabled=false where brand_id=p_brand;
 else raise exception 'Unknown operation'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.seo_google_worker(text,text,uuid,jsonb) from public,authenticated;
grant execute on function public.seo_google_worker(text,text,uuid,jsonb) to anon;
