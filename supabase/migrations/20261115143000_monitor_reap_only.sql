-- Cleanup is separate from claims so unfunded collectors still close abandoned runs.
create function public.seo_reap_monitor_runs(p_secret text) returns integer
 language plpgsql security definer set search_path='' as $$
declare reaped integer;
begin
 if not public.seo_monitor_authorized(p_secret) then raise exception 'UNAUTHORIZED'; end if;
 perform pg_advisory_xact_lock(746284);
 update public.seo_monitor_runs
 set status='failed',
     error=coalesce(nullif(error,''),'실행 기록이 15분 이상 완료되지 않아 실패로 정리했습니다. 수집 결과와 제공자 사용량은 확인되지 않았습니다. 실행 기록과 Gateway 사용 내역을 확인하세요.'),
     finished_at=now()
 where status='running' and started_at<now()-interval '15 minutes';
 get diagnostics reaped = row_count;
 return reaped;
end;$$;
revoke all on function public.seo_reap_monitor_runs(text) from public,authenticated;
grant execute on function public.seo_reap_monitor_runs(text) to anon;
