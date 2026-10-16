create or replace function public.seo_google_worker(p_secret text,p_action text,p_brand uuid,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; selected_property text; begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'FORBIDDEN'; end if;
 -- Serialize property selection, ingestion, and disconnect for this brand.
 if p_action in ('select','metrics','status','disconnect') then
  perform 1 from public.seo_google_connections where brand_id=p_brand for update;
 end if;
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
  -- Discard an in-flight response if its property was changed or disconnected.
  select case p_data->>'provider' when 'gsc' then gsc_site when 'ga4' then ga4_property end into selected_property from public.seo_google_connections where brand_id=p_brand and enabled;
  if selected_property is null or selected_property is distinct from p_data->>'property' then raise exception 'STALE_GOOGLE_PROPERTY'; end if;
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
