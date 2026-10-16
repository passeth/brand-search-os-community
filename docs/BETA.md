# 베타 설치 검증과 제한

대상: `0.1.0-beta.1`. 단일 팀의 자체 설치용 베타이며 고객별 격리가 필요한 SaaS가 아닙니다.

## 검증 방법

- `npm ci`: 잠금 파일로 의존성 설치
- `npm test`: URL/SSRF, 인증, OAuth 암호화, 집계, 환경변수 등 34개 테스트
- `npm run build`와 `npm run typecheck`: 설정 없는 첫 설치 화면을 포함한 production 빌드
- `npm run test:db`: 로컬 PostgreSQL의 임시 DB에 전체 마이그레이션을 적용하고 RLS, 키워드 동기화, 작업 중복 방지, 콘텐츠 버전, Google 동기화 규칙을 검사합니다. `pg_config`, `initdb`, `pg_ctl`, `psql`이 필요합니다. 임시 디렉터리의 DB만 종료·삭제합니다.
- GitHub Actions `Beta installation checks`: 새 체크아웃에서 임시 로컬 Supabase와 Next 서버를 실행하고 실제 Auth 로그인, 회원/비회원 권한, API 인증, 전략·최적화·과제·콘텐츠 저장, Cron 인증과 빈 작업 실행을 검사합니다. 실행 결과는 Actions에서 확인하세요.

DB/API 검사의 문서와 분석 결과는 **테스트용 합성 데이터**입니다. 실제 사이트 크롤링·AI 응답의 품질을 증명하지 않습니다.

## Docker가 있는 컴퓨터에서 재현

[Supabase 로컬 개발 안내](https://supabase.com/docs/guides/local-development/cli/getting-started)에 따라 Docker 엔진과 Supabase CLI 2.116.0을 준비하세요. 기존 설치 폴더 대신 새 임시 사본을 사용합니다. 아래 검사는 회사 운영 DB나 클라우드 프로젝트를 사용하지 않습니다.

```sh
git clone https://github.com/passeth/brand-search-os-community.git brand-search-os-local-test
cd brand-search-os-local-test
npm ci
npm test
supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor,mailpit
umask 077
supabase status -o env > .env.supabase.local
node scripts/prepare-local-test.mjs
npm run setup:check
npm run build
npm run typecheck
npm run start
```

서버를 켜 둔 채 같은 폴더의 다른 터미널에서 `npm run test:local`을 실행하세요. 성공하면 PASS를 출력합니다. 초기 브랜드가 있으면 실행을 거절합니다. 준비 스크립트는 기존 `.env.local`을 덮어쓰지 않습니다. 두 `.env` 파일은 로컬 테스트 키를 포함하므로 공유하거나 커밋하지 마세요.

검사 후 서버를 Ctrl+C로 종료하고 이 임시 사본에서 `supabase stop --no-backup`을 실행합니다. 이는 테스트 DB를 보존하지 않습니다. 운영 설치에서 실행하지 마세요.

## 설치별 최종 확인

아래 항목은 자동 로컬 검사와 별도로 본인 계정·배포에서 확인해야 합니다.

- 브라우저 로그인 → 브랜드 등록 → 실제 사이트 진단 → 결과 저장
- AI Gateway 권한·잔액 확인 → 질문 1개 실제 응답과 출처 저장 → 경쟁사 근거 확인
- Google OAuth 승인 → 정확한 Search Console/GA4 속성 선택 → 실제 수신 데이터 확인
- Vercel 배포 후 로그인·권한 확인 → 예약 시각이 지난 뒤 실행 기록과 로그 확인

수동 Cron 호출 성공은 시간에 따른 예약 실행 성공이 아닙니다. API 로그인 검사는 브라우저 화면 검사가 아닙니다. 외부 AI/Google 호출, 원격 배포, 실제 방문 수신, 시간에 따른 예약 실행은 이 베타의 로컬 검증에 포함되지 않습니다.

## 이번 보완

- 새 브랜드의 키워드가 추적 키워드에 자동 등록됩니다. 중복은 합쳐지고 기존 편집·중지 상태는 보존됩니다.
- 키워드당 200자 제한을 등록 화면에서 안내합니다.
- 로컬 Supabase의 HTTP loopback 주소를 허용하며 외부 HTTP 주소는 거절합니다.
- 전체 마이그레이션과 실제 로컬 인증·API 저장 검사를 재현할 스크립트 및 CI를 제공합니다.

문제 제보 시 Node/OS 버전, 실패한 단계, 비밀값을 지운 오류, 재현 방법을 GitHub Issue에 남겨 주세요. 환경 파일·토큰·개인정보는 첨부하지 마세요.
