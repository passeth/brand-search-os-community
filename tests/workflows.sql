-- Synthetic fixtures in a disposable local database; never production observations.
begin;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.seo_brands(id,name,domain,keywords) values('10000000-0000-0000-0000-000000000001','Fixture brand','https://example.com',array['first topic',' first topic ','second topic']);
do $$begin
 if (select count(*) from public.seo_keywords where brand_id='10000000-0000-0000-0000-000000000001')<>2 then raise exception 'Brand keywords missing or duplicated'; end if;
end$$;
update public.seo_keywords set active=false,cluster='edited' where keyword='first topic';
update public.seo_brands set keywords=array['first topic','third topic'] where id='10000000-0000-0000-0000-000000000001';
do $$begin
 if not exists(select 1 from public.seo_keywords where keyword='first topic' and not active and cluster='edited') then raise exception 'Keyword edit overwritten'; end if;
end$$;
insert into public.seo_prompts(id,brand_id,prompt,intent) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','A synthetic comparison question?','compare'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','A synthetic failure question?','recommend');
insert into public.seo_schedules(brand_id,enabled,cadence,prompt_limit) values('10000000-0000-0000-0000-000000000001',true,'daily',2);
insert into public.seo_contents(id,brand_id,title,body,status) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Fixture draft','old body','approved');
update public.seo_contents set body='new body' where id='30000000-0000-0000-0000-000000000001';
do $$begin
 if not exists(select 1 from public.seo_contents where id='30000000-0000-0000-0000-000000000001' and revision=2 and status='review') then raise exception 'Approval not invalidated'; end if;
 if not exists(select 1 from public.seo_content_versions where body='old body') then raise exception 'Version not saved'; end if;
end$$;
reset role;
insert into public.seo_monitor_credentials(singleton,secret_hash) values(true,encode(extensions.digest(repeat('test-fixture',4),'sha256'),'hex'));
set role anon;
do $$declare n integer; r uuid; begin
 begin perform public.seo_claim_monitor_runs('wrong');raise exception 'Wrong credential accepted'; exception when raise_exception then if sqlerrm<>'UNAUTHORIZED' then raise; end if;end;
 select count(*) into n from public.seo_claim_monitor_runs(repeat('test-fixture',4));
 if n<>2 then raise exception 'Expected two claims, got %',n; end if;
 select count(*) into n from public.seo_claim_monitor_runs(repeat('test-fixture',4));
 if n<>0 then raise exception 'Duplicate claims allowed'; end if;
end$$;
reset role;
-- IDs are read by test harness owner, not by anonymous callers.
select set_config('test.success_run',(select id::text from public.seo_monitor_runs where prompt_id='20000000-0000-0000-0000-000000000001'),true);
select set_config('test.failed_run',(select id::text from public.seo_monitor_runs where prompt_id='20000000-0000-0000-0000-000000000002'),true);
set role anon;
do $$declare ok boolean; begin
 ok=public.seo_finish_monitor_run(repeat('test-fixture',4),current_setting('test.success_run')::uuid,'Synthetic test answer','{"protocol":"google-search-v1","mentioned":false,"fixture":true}'::jsonb,'{}');
 if not ok then raise exception 'Finish failed'; end if;
 if public.seo_finish_monitor_run(repeat('test-fixture',4),current_setting('test.success_run')::uuid,'duplicate','{"protocol":"google-search-v1"}'::jsonb) then raise exception 'Duplicate finish allowed'; end if;
 perform public.seo_finish_monitor_run(repeat('test-fixture',4),current_setting('test.failed_run')::uuid,p_error=>'Synthetic provider failure');
 perform public.seo_google_worker(repeat('test-fixture',4),'connect','10000000-0000-0000-0000-000000000001','{"user_id":"00000000-0000-0000-0000-000000000001","scopes":[],"encrypted_token":"fixture-not-real-token"}');
 perform public.seo_google_worker(repeat('test-fixture',4),'select','10000000-0000-0000-0000-000000000001','{"gsc_site":"https://example.com/","ga4_property":"properties/123"}');
 perform public.seo_google_worker(repeat('test-fixture',4),'metrics','10000000-0000-0000-0000-000000000001','{"provider":"ga4","property":"properties/123","start":"2026-01-01","end":"2026-01-01","rows":[{"grain":"daily","date":"2026-01-01","metrics":{"sessions":1}}]}');
 perform public.seo_google_worker(repeat('test-fixture',4),'select','10000000-0000-0000-0000-000000000001','{"ga4_property":"properties/456"}');
 begin
  perform public.seo_google_worker(repeat('test-fixture',4),'metrics','10000000-0000-0000-0000-000000000001','{"provider":"ga4","property":"properties/123","start":"2026-01-01","end":"2026-01-01","rows":[]}');
  raise exception 'Stale property accepted';
 exception when raise_exception then if sqlerrm<>'STALE_GOOGLE_PROPERTY' then raise;end if;end;
 perform public.seo_google_worker(repeat('test-fixture',4),'disconnect','10000000-0000-0000-0000-000000000001');
end$$;
reset role;
do $$begin
 if (select count(*) from public.seo_observations where brand_id='10000000-0000-0000-0000-000000000001')<>1 then raise exception 'Failure became observation or duplicate saved';end if;
 if exists(select 1 from public.seo_google_tokens) then raise exception 'Disconnect retained token';end if;
 if exists(select 1 from public.seo_metrics) then raise exception 'Changed property retained stale metrics';end if;
end$$;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.seo_tasks(brand_id,title,detail,priority,category,evidence) values('10000000-0000-0000-0000-000000000001','Fixture task','Test only','P1','SEO','Fixture evidence');
update public.seo_tasks set status='done' where title='Fixture task';
insert into public.seo_strategies(brand_id,content) values('10000000-0000-0000-0000-000000000001','Fixture strategy');
do $$declare i integer;begin
 for i in 1..20 loop if not public.seo_reserve_audit() then raise exception 'Quota rejected early';end if;end loop;
 if public.seo_reserve_audit() then raise exception 'Quota overflow allowed';end if;
end$$;
reset role;
rollback;
