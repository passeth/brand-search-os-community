#!/usr/bin/env bash
# Disposable local PostgreSQL only. Never connects to a cloud database.
set -euo pipefail
bin="$(pg_config --bindir)"
tmp="$(mktemp -d /tmp/search-os-db.XXXXXX)"
cleanup() { "$bin/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
"$bin/initdb" -D "$tmp/data" -A trust --no-locale >/dev/null
"$bin/pg_ctl" -D "$tmp/data" -l "$tmp/log" -o "-k $tmp -p 55439 -c listen_addresses=''" start >/dev/null
psql_cmd=("$bin/psql" -h "$tmp" -p 55439 -d postgres -v ON_ERROR_STOP=1)
"${psql_cmd[@]}" -q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
SQL
for file in supabase/migrations/*.sql; do "${psql_cmd[@]}" -q -f "$file"; done
"${psql_cmd[@]}" -q <<'SQL'
do $$begin
 if (select count(*) from public.seo_brands) <> 0 then raise exception 'Unexpected seed brand'; end if;
 if (select count(*) from public.seo_members) <> 0 then raise exception 'Unexpected member'; end if;
 if has_table_privilege('authenticated','public.seo_google_tokens','SELECT') then raise exception 'Token table exposed'; end if;
end$$;
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.seo_members(user_id) values('00000000-0000-0000-0000-000000000001');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.seo_brands(name,domain) values('Sample','https://example.com');
do $$begin if (select count(*) from public.seo_brands) <> 1 then raise exception 'Member access failed'; end if; end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 if (select count(*) from public.seo_brands) <> 0 then raise exception 'Nonmember read allowed'; end if;
 if public.seo_reserve_audit() then raise exception 'Nonmember quota allowed'; end if;
 begin
  insert into public.seo_members(user_id) values(auth.uid());
  raise exception 'Self enrollment allowed';
 exception when insufficient_privilege then null;
 end;
end$$;
reset role;
SQL
printf 'Fresh migrations and member isolation passed.\n'
