# 에이전트용 설치·개발 절차

## 입력을 먼저 구분

사용자에게 필요한 정보는 새 저장소/배포 대상, 팀용 Supabase 프로젝트, 분석 대상 사이트, 최초 관리자 이메일, Google 데이터 연결 여부입니다. 이미 제공된 값은 반복해서 묻지 않습니다. 비밀번호·클라이언트 비밀키를 대화에 요구하지 말고 비밀 환경변수 입력 절차를 이용합니다.

도구 배포 주소는 APP_URL, 분석 대상은 seo_brands.domain입니다. Google 속성은 분석 대상에 속해야 합니다. GitHub 공개 저장소에는 운영 데이터가 없어야 합니다.

## 안전한 실행 순서

1. 로컬 AGENTS.md와 설치 문서, Git 상태, 원격 저장소, Vercel 연결 프로젝트를 확인합니다.
2. `.env.example`의 이름만 읽고 비밀값은 출력하지 않습니다. 회사 운영 체크아웃이나 다른 설치의 `.vercel`을 복사하지 않습니다.
3. 빈 Supabase에 SQL 001~008을 순서대로 적용합니다. 기존 DB라면 테이블·마이그레이션 상태부터 확인하고 파괴적 초기화를 하지 않습니다.
4. 최초 사용자 생성은 사용자/관리자 절차로 완료하고 승인된 UUID만 seo_members에 추가합니다. 계정만 있거나 비회원이면 데이터 접근을 거절해야 합니다.
5. 기본 로그인과 빈 브랜드 상태를 확인합니다. 사용자가 제공한 사이트를 UI로 추가하고 실제 진단을 실행합니다.
6. AI 연결은 자신의 Gateway 접근·비용을 확인한 후 소량 실행합니다. 실패를 성공이나 미언급 0점으로 저장하지 않습니다.
7. Google 연결은 SETUP.md의 API·OAuth·APP_URL·Cron 해시 순서대로 진행합니다. OAuth 승인, 도메인 매칭, 데이터 조회, 실제 방문 수신을 각각 검증합니다.
8. Vercel 배포 대상과 서버 환경변수를 확인하고 배포합니다. Cron 로그와 앱의 실행 기록에서 실제 예약 실행을 확인합니다. 미래의 실행은 검증 완료로 표현하지 않습니다.
9. 사용자에게 저장소, 배포 URL, 사용 순서, 검증 결과, 미검증 항목을 전달합니다. 키·토큰은 포함하지 않습니다.

## 코드 지도

| 위치 | 역할 |
|---|---|
| app/page.tsx | 로그인 상태, 회원 검사, 브랜드 CRUD, 전체 화면 |
| app/login-card.tsx / lib/login-identity.ts | 이메일 로그인, 특정 회사 관리자 별칭 없음 |
| lib/app-origin.ts | 설치별 OAuth origin 검증 |
| lib/auth.ts / lib/supabase.ts | 요청 인증, publishable client |
| lib/safe-fetch.ts / crawl.ts / analyze.ts | SSRF 방어, 공개 페이지 수집·진단 |
| lib/model-config.ts / observe.ts / grounding.ts | AI 모델, 검색 도구, 출처 근거 |
| lib/monitoring.ts | 질문별 지표와 비교군 |
| lib/google.ts / google-domain.ts / google-live.ts | OAuth, 도메인 확인, Google 집계·실시간 |
| app/api/cron/* | 예약 실행 진입점 |
| supabase/migrations/* | 테이블, RLS, atomic claim, 비밀키 검사 |
| tests/* | 데이터·보안 경계 테스트 |
| scripts/check-migrations.sh | 임시 로컬 PostgreSQL 설치·권한 검사 |

## 수정 완료 기준

- `npm test`, `npm run build`, `npm run typecheck` 및 관련 경계 테스트 통과.
- 스키마 변경은 임시 DB 검증. 이미 쓰는 설치에서는 기존 마이그레이션을 수정하지 말고 새 파일을 추가.
- OAuth 변경은 사용자별 APP_URL, PKCE/state, 암호화, 도메인 불일치 거절 확인.
- 권한 변경은 비회원 읽기/쓰기 거절, 자기 회원 등록 거절, Google token 테이블 접근 거절 확인.
- 화면 변경은 실제 브라우저 검증. HTML 문자열이나 빌드 성공을 화면 검증이라고 부르지 않음.
- 외부 호출 없이 실행한 단위 테스트를 실제 Google/Supabase/AI 수신 성공이라고 보고하지 않음.
- 공개 커밋 전 회사명, 이메일, 배포 ID, 프로젝트 ID, 실제 데이터, 비밀키, 스크린샷을 검사. 테스트 예시는 예약 도메인 `example.com` 또는 `.example` 사용.

## 지속 유지보수

다른 비공개 저장소와 자동 미러링하지 않습니다. 필요한 변경만 검토해 수동으로 이식하고 공개 가능한지 다시 검사합니다. 오류 로그에는 토큰을 제거하고, 자료실의 고객 자료를 Git 이슈에 그대로 게시하지 않습니다. 사용자 사이트 수정·유료 서비스 구독·게시 등 별도 목적지의 작업은 사용자의 승인 범위를 확인합니다.
