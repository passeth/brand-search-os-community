# 독립 설치 가이드

## 0. 처음 시작할 때: 세 단계로 나누세요

**기본 설치**는 GitHub 사본 + Supabase + 이메일 로그인 + 브랜드 등록 + 사이트 진단입니다. AI나 Google 계정이 아직 없어도 여기까지 먼저 진행할 수 있습니다. 다음으로 **AI 연결**, 마지막으로 **Google 연결과 예약 수집**을 확인합니다. 기능을 선택하지 않았거나 승인을 기다리는 상태는 오류나 완료로 표시하지 않습니다.

GitHub에서 Use this template → Create a new repository를 선택하고 본인 계정의 **Private** 저장소를 만드세요. 공개 저장소의 Fork는 공개 이력을 공유하므로 설치용 비공개 사본이 필요하면 템플릿을 사용하세요. 에이전트는 새 저장소 소유 계정과 이름을 확인한 뒤 작업합니다.

```bash
git clone https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
node --version
npm ci
cp .env.example .env.local
```

Node.js 24를 권장합니다(최소 22.6). Windows PowerShell에서는 복사 명령에 `Copy-Item .env.example .env.local`을 사용하세요. Supabase 프로젝트 생성 화면의 Project URL과 API Keys → Publishable key를 자신의 `.env.local`에 입력합니다. Secret/service_role 키를 공개 변수에 넣지 마세요.

```bash
npm run setup:check
npm run dev
```

설정이 없거나 예시 값 그대로이면 브라우저에 **첫 설치 설정이 필요합니다**가 표시됩니다. 설정 수정 후 서버를 재시작하세요. 이 화면으로 빌드가 성공해도 실제 설치 완료는 아닙니다. `setup:check` 통과 후 로그인과 DB 접근을 따로 확인해야 합니다.

## 1. 설치 정보 준비

| 입력 | 의미 | 예시(실제 운영값 아님) |
|---|---|---|
| 도구 주소 | 이 앱이 실행되는 주소 / APP_URL | https://insights.example.com |
| 분석 대상 | 브랜드 추가에서 입력할 공식 홈페이지 | https://www.example.com |
| Supabase | 설치 팀만 사용하는 새 프로젝트 | 직접 생성 |
| 최초 관리자 | Supabase Auth 이메일 사용자 | 본인 이메일 |
| Google 속성 | 분석 대상에 대한 GSC·GA4 접근권한 | 본인 속성 |

다른 팀의 Supabase, OAuth 클라이언트, Vercel 프로젝트를 재사용하지 않습니다. 초기 설치는 무료 API 사용 여부나 결제 승인을 대신하지 않습니다.

## 2. Supabase와 최초 회원

새 프로젝트의 SQL Editor에서 `supabase/migrations/` 파일을 **파일명 오름차순**(001~008 다음 타임스탬프 파일 포함)으로 각각 실행하세요. 기존 회사 테이블을 전제하지 않으며 브랜드·회원 데이터도 자동 생성하지 않습니다. 이미 적용한 파일은 다시 실행하지 않습니다. 실행 전 대상 프로젝트를 확인하세요.

초기 SQL은 `extensions` 스키마에 `pgcrypto`를 준비합니다. 기존 다른 앱 DB에 설치하면 확장 위치·동명 테이블이 충돌할 수 있으므로 새 프로젝트를 권장합니다.

1. Supabase Authentication → Users에서 본인 이메일 사용자와 비밀번호를 생성합니다. 관리자 생성 화면에서 이메일 확인 상태도 완료하세요(또는 확인 메일 절차를 마칩니다). 미확인 이메일은 로그인에서 거절될 수 있습니다. 이 앱에는 공개 회원가입 화면이 없습니다.
2. Users 화면에서 사용자 UUID를 복사합니다.
3. 아래 SQL의 값을 바꾸어 실행합니다. 이 작업은 설치 관리자만 수행합니다.

```sql
insert into public.seo_members(user_id)
values ('YOUR_AUTH_USER_UUID'::uuid)
on conflict do nothing;
```

4. 추가 팀원도 Auth 사용자 생성과 위 회원 등록을 모두 거쳐야 합니다. Auth 계정만으로는 데이터에 접근할 수 없습니다.
5. 새 프로젝트의 Auth Site URL을 도구의 운영 주소로 지정하고 공개 가입은 비활성화합니다. 비밀번호 재설정·메일 확인 기능을 쓸 경우 해당 Auth 흐름을 별도로 구성하세요. 이 앱은 이메일+비밀번호 로그인만 제공합니다.

모든 회원은 같은 워크스페이스 데이터를 공유합니다. 고객별 권한 분리는 구현돼 있지 않습니다.

## 3. 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 본인 값을 설정합니다. Vercel에도 같은 이름을 설정하되 APP_URL은 배포 주소로 바꿉니다.

| 변수 | 범위 | 필요 시점 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 브라우저 공개 | 항상, 자신의 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 브라우저 공개 | 항상, publishable key. service role 키 금지 |
| APP_URL | 서버 | Google 연결 시. 도구 주소만, 경로·쿼리 없이. 로컬은 http://localhost:3000 |
| AI_GATEWAY_API_KEY | 서버 비밀 | 로컬 AI 호출 또는 Gateway 키 인증을 사용할 때 |
| CRON_SECRET | 서버 비밀 | 예약 수집 및 Google 연결 저장. 32자 이상 무작위 값 |
| GOOGLE_CLIENT_ID | 서버 | Google OAuth 연결 |
| GOOGLE_CLIENT_SECRET | 서버 비밀 | Google OAuth 연결 |
| GOOGLE_TOKEN_KEY | 서버 비밀 | Google refresh token 암호화. 무작위 32바이트의 64자리 hex |

Vercel AI Gateway의 OIDC가 구성된 배포에서는 해당 인증을 사용할 수 있습니다. 로컬에서는 자신의 Gateway API 키를 준비하세요. `lib/model-config.ts`의 기본 모델은 `google/gemini-2.5-flash-lite`이며 계정의 모델 접근권한·검색 도구 지원·잔액을 확인해야 합니다.

AI 연결 준비 후 `npm run setup:check -- --ai`, Google 연결 준비 후 `npm run setup:check -- --google`을 실행하세요. 외부 요청 없이 필수 값의 형식을 확인하며 값 자체는 출력하지 않습니다. 실제 권한·잔액·DB 해시 일치 여부까지 검증하는 명령은 아닙니다.

Google/예약 수집용 비밀키는 다음 명령으로 만드세요. `.env.local`의 빈 CRON_SECRET·GOOGLE_TOKEN_KEY만 생성하고 기존 값은 유지합니다. 파일에는 비밀값을 저장하지만 콘솔에는 Cron 해시만 출력합니다.

```bash
npm run setup:secrets
```

GOOGLE_TOKEN_KEY는 연결한 토큰이 존재하는 동안 유지해야 합니다. 분실·변경 시 다시 Google 인증해야 합니다. 비밀 값에 `NEXT_PUBLIC_`를 붙이지 않습니다. 키를 공개 이슈·채팅·README에 붙이지 않습니다.

## 4. 예약 수집 인증 등록

CRON_SECRET은 서버 환경변수와 DB 검사에 함께 사용합니다. DB에는 **SHA-256 해시만** 저장합니다. 로컬에서 비밀관리 도구 등으로 준비한 동일한 값의 해시를 구한 후 다음 SQL에 넣으세요. 원문 비밀키를 SQL 이력에 붙이지 않는 것을 권장합니다.

```sql
insert into public.seo_monitor_credentials(singleton, secret_hash)
values (true, 'YOUR_CRON_SECRET_SHA256_HEX')
on conflict (singleton) do update set secret_hash = excluded.secret_hash;
```

위 생성 명령은 이미 해시를 출력합니다. 나중에 다시 계산할 때는 `.env.local`을 명시적으로 로드하세요(Node.js 24):

```bash
node --env-file=.env.local -e "console.log(require('node:crypto').createHash('sha256').update(process.env.CRON_SECRET).digest('hex'))"
```

해시와 환경변수가 다르면 예약·Google 연결이 실패합니다. 평문 키를 로그에 출력하지 마세요.

## 5. 첫 사이트 등록

`npm ci`, `npm run dev` 실행 → 이메일 로그인 → **브랜드 추가**.

- 브랜드명: 실제로 관찰할 명칭. 별칭 표기는 분석 방식에 맞게 일관되게 유지합니다.
- 공식 홈페이지: 외부에서 접근 가능한 HTTPS 주소. 최종 리디렉션 주소를 확인합니다.
- 대상 고객: 누구의 어떤 문제를 해결하는지.
- 키워드: 고객이 검색할 표현, 쉼표로 구분.
- 비교 브랜드: 같은 고객 문제의 대안인 업체명, 쉼표로 구분.

저장한 뒤 **진단 실행**으로 첫 근거를 만듭니다. 경쟁사 공식 도메인은 프롬프트 분석의 비교 대상 설정에서 추가합니다. 데이터가 없을 때 임의 점수로 채우지 않습니다.

## 6. Google Search Console·GA4

분석할 사이트 소유자 또는 정당한 접근권한이 있는 계정으로 준비합니다.

1. Search Console에서 대상 사이트의 소유권을 검증합니다. URL 접두어는 HTTPS, www 유무까지 맞추세요. 도메인 속성을 사용할 수도 있습니다.
2. GA4 속성과 대상 도메인의 웹 스트림을 준비하고 **분석 대상 홈페이지**에 태그를 설치합니다. 이 분석 도구에 태그를 넣는 것으로 대상 사이트 방문이 수집되지는 않습니다.
3. 본인 Google Cloud 프로젝트에서 Search Console API, Google Analytics Data API, Google Analytics Admin API를 활성화합니다.
4. OAuth 동의 화면을 구성합니다. 테스트 상태에서는 사용할 Google 계정을 테스트 사용자에 등록합니다.
5. 웹 애플리케이션 OAuth 클라이언트를 만듭니다. 승인된 리디렉션 URI는 `APP_URL/api/google/callback`입니다. 예: `https://insights.example.com/api/google/callback`. 로컬 시험이면 `http://localhost:3000/api/google/callback`도 등록합니다.
6. 읽기 범위 `https://www.googleapis.com/auth/webmasters.readonly`, `https://www.googleapis.com/auth/analytics.readonly`를 사용합니다.
7. 위 환경변수와 Cron 해시를 준비하고 서버를 재시작/재배포합니다.
8. 앱에서 브랜드 선택 → 모니터링 대시보드 → Google 계정 연결. **같은 탭**에서 승인 후 복귀합니다.
9. 연결 가능한 속성 찾기 → 대상 도메인의 GSC·GA4 선택 → GA4 측정 도메인 확인 → 선택한 속성 저장 → 지금 동기화.

연결한 성과는 이 설치의 모든 팀원이 볼 수 있습니다. OAuth 앱이 테스트 상태이면 refresh token이 만료될 수 있으므로 장기 운영 전에 Google의 게시·검증 요건을 확인하세요. 도구 주소를 바꾸면 APP_URL과 승인된 URI를 함께 변경해야 합니다.

### GA4 실제 수신 확인

일반 브라우저에서 대상 홈페이지를 열고 공개 페이지를 이동한 다음 GA4 실시간 화면과 앱의 **실시간 수신 확인**을 비교합니다. 태그 설치 감지, OAuth 인증 완료, 실제 page_view 수신은 서로 다른 검증 단계입니다.

실시간은 최근 30분이며 일별 합계에 더하지 않습니다. 일별 동기화는 처리 지연을 고려해 최근 3일을 제외한 28일입니다. 새로 설치한 태그는 과거 방문을 복구하지 않습니다.

0건이면 태그 ID, 실제 운영 도메인, CSP의 Google 태그 허용 여부, 광고차단·동의 설정·데이터 필터를 확인하세요. 자동 page_view와 직접 전송을 동시에 켜면 중복될 수 있습니다. **향상 측정 전체를 무조건 끄지 마세요.** 대상 사이트의 실제 전송 방식에 맞춰 중복 여부를 확인한 뒤 설정합니다.

## 7. Vercel 배포

Vercel CLI 설치를 강력히 권장합니다. 환경변수 가져오기, 배포, 로그 확인을 같은 프로젝트에서 수행할 수 있습니다.

```bash
npm i -g vercel
vercel login
vercel link
# 본인의 신규 프로젝트를 선택하고 프로젝트명을 확인
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
# 필요한 서버 변수도 같은 방식으로 추가
# production과 development 환경은 별도입니다. 로컬 파일을 덮어쓰지 않습니다.
vercel env pull .env.vercel.production --environment=production
vercel deploy --prod
```

처음 도메인이 정해지면 APP_URL을 그 도메인으로 설정하고 다시 배포합니다. 공개 Supabase 변수는 빌드에 포함되므로 변경 후 재배포해야 합니다. 로컬 `.env.local`은 APP_URL=http://localhost:3000을 유지하세요. Production에는 HTTPS 운영 주소를 넣고 Google 승인 URI에도 각각 등록하세요. 환경변수 가져오기 결과에 비공개 변수의 대체 문자열이 들어갔다면 그것을 실제 키로 사용하지 마세요.

GitHub Import를 사용할 수도 있습니다. 배포한 Vercel 프로젝트가 **본인 저장소와 본인 Supabase**에 연결됐는지 확인하세요. `.vercel/`과 `.env.local`은 Git에 올리지 않습니다.

`vercel.json`은 UTC 기준으로 AI 수집 00:00(한국 09시), Google 동기화 01:00(한국 10시)를 요청합니다. 실제 실행 시각의 정밀도는 플랜에 따라 달라집니다. AI 브랜드 기본 주기는 월·수·금이며 UI에서 매일/매주로 변경할 수 있습니다. 질문 수는 1~10, 모든 브랜드 하루 예약 한도는 20입니다. 질문 순서대로 처리하며 자동 순환하지 않습니다. Vercel Cron 등록·로그와 앱의 실행 기록을 함께 확인해야 예약 실행을 검증한 것입니다.

## 8. 완료 확인과 문제 해결

| 확인/증상 | 조치 |
|---|---|
| 로그인은 되지만 사용 권한 없음 | 해당 Auth UUID를 seo_members에 등록했는지 확인 |
| 첫 설치 설정 화면 | 예시 값을 본인 Supabase URL·publishable key로 교체 → setup:check → 서버 재시작/재배포 |
| 이메일 미확인 오류 | Auth 사용자 이메일 확인 절차 또는 관리자 생성 시 확인 상태 점검 |
| 첫 화면에 브랜드 없음 | 정상 초기 상태. 브랜드 추가 |
| Google 설정 미완료 | APP_URL, OAuth 변수, 토큰 키, Cron 비밀키와 DB 해시 확인 |
| redirect_uri_mismatch | 도구 APP_URL과 Google 승인 URI 정확히 일치시키기 |
| 연결 세션 만료 | 앱의 연결 버튼부터 같은 탭에서 다시 진행 |
| 도메인 불일치 | 분석 대상·GSC 속성·GA4 웹 스트림 맞추기 |
| GA4 실시간 있음/일별 없음 | 최근 3일 제외 및 신규 태그의 데이터 생성 시점 확인 |
| AI 실패 | Gateway 인증·잔액·모델 권한·검색 도구 지원·실행 기록 확인 |
| 예약 실행 안 됨 | Vercel Cron 등록, CRON_SECRET 해시, 브랜드 체크박스, 요일, 질문 활성 상태 확인 |
| 시간당 한도 | 수동 진단/Google 확인 한도를 넘었는지 확인 후 다음 시간대 재시도 |

배포 전에 테스트·빌드를 실행하세요. 배포 후 로그인, 빈 상태 브랜드 등록, 진단 저장, 비회원 차단, 수집 원문, OAuth 복귀, 실제 방문 수신을 확인합니다. 성공하지 않은 항목은 미검증으로 남깁니다.

## 로컬 설치 회귀 검사

클라우드 프로젝트 없이 검증하려면 [로컬 베타 검사](BETA.md)를 따르세요. 실제 운영 설치 절차와 분리된 임시 DB를 사용합니다.

기존 설치를 업데이트할 때에는 적용하지 않은 마이그레이션만 적용하세요. `20261016154947_seed_brand_keywords.sql`은 브랜드의 키워드를 추적 목록에 등록하고, 기존에 편집하거나 중지한 항목은 유지합니다.

Vercel CLI가 없는 환경에서는 `npm i -g vercel` 설치를 권장합니다. 배포 단계에서 환경변수 가져오기, 배포, 로그 확인을 에이전트가 수행할 수 있습니다. 로컬 검사만 할 때는 설치하지 않아도 됩니다.
