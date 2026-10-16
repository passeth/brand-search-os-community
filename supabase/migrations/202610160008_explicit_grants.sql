-- Fresh projects must not depend on inherited default table privileges.
grant usage on schema public to anon, authenticated;
do $$ declare t text; begin
 foreach t in array array['seo_members','seo_brands','seo_audits','seo_tasks','seo_observations','seo_strategies','seo_prompts','seo_schedules','seo_monitor_runs','seo_keywords','seo_personas','seo_knowledge','seo_contents','seo_content_versions','seo_optimizations','seo_google_connections','seo_metrics'] loop
  if to_regclass('public.' || t) is not null then
   execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  end if;
 end loop;
end $$;
-- RLS still decides which operations are permitted. No member self-enrollment policy exists.
revoke all on public.seo_google_tokens, public.seo_monitor_credentials, public.seo_rate_limits from anon, authenticated;
