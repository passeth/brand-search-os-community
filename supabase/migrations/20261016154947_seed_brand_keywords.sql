-- New installations have no seed brands. Populate tracked keywords at brand creation.
-- Security invoker: the caller must pass the existing member RLS policies.
create function public.seo_seed_brand_keywords() returns trigger
language plpgsql set search_path='' as $$
begin
 insert into public.seo_keywords(brand_id,keyword)
 select new.id,trim(k) from unnest(new.keywords) k where length(trim(k))>0
 on conflict(brand_id,keyword) do nothing;
 return new;
end;$$;
revoke all on function public.seo_seed_brand_keywords() from public,anon,authenticated;
create trigger seo_brand_keywords after insert or update of keywords on public.seo_brands
for each row execute function public.seo_seed_brand_keywords();
-- Backfill existing valid inputs without reactivating paused or overwriting edited keywords.
insert into public.seo_keywords(brand_id,keyword)
select b.id,trim(k) from public.seo_brands b cross join lateral unnest(b.keywords) k
where length(trim(k)) between 1 and 200
on conflict(brand_id,keyword) do nothing;
