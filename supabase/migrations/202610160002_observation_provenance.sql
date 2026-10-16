alter table public.seo_observations add column source_kind text not null default 'manual' check(source_kind in ('manual','model_api'));
alter table public.seo_observations add column model text;
alter table public.seo_observations add column usage jsonb;
