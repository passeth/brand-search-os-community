# Brand Search OS Community

자신이 분석할 사이트를 등록하고 **사이트 진단 → AI 검색 관찰 → 경쟁사 비교 → 개선 과제 → 콘텐츠 작성 → 재측정**을 운영하는 한국어 전략 워크스페이스입니다.

이 저장소는 독립 설치용 공개 템플릿입니다. 실제 회사의 브랜드·고객·수집 기록·계정·배포 환경·기존 Git 이력은 포함하지 않습니다. 처음 설치하면 빈 워크스페이스로 시작합니다. 특정 사이트용 소스 수정 없이 **브랜드 추가**에서 분석 대상을 입력할 수 있습니다.

## 먼저 알아둘 것

- **도구 주소**와 **분석 대상 주소**는 다릅니다. 예: 도구 `https://insights.example.com`, 분석 대상 `https://www.example.com`.
- 설치 한 개는 **하나의 팀**을 위한 것입니다. 등록 멤버가 모든 브랜드 데이터를 공유합니다. 고객마다 격리가 필요하면 별도 Supabase 프로젝트와 배포를 사용하세요. 공개 가입형 다중 고객 SaaS가 아닙니다.
- 사이트 진단은 공개 HTTPS 페이지 대상으로 동작합니다. GSC·GA4는 해당 사이트에 접근 권한이 있는 Google 계정이 필요합니다.
- 점수는 자체 체크리스트입니다. Google 순위나 시장 전체 AI 노출률을 뜻하지 않습니다. 미수집·오류를 0점으로 취급하지 않습니다.
- 모델 호출에는 자신의 AI Gateway 사용량과 비용이 발생합니다. 유료 모델·크레딧 구매를 자동으로 진행하지 않습니다.

## 가이드

| 대상 | 문서 |
|---|---|
| 처음 설치하는 운영자 | [설치·환경변수·회원·Google·배포](docs/SETUP.md) |
| 사이트를 분석하는 사용자 | [사이트 등록부터 주간 개선까지](docs/USER-GUIDE.md) |
| Codex 등 개발 에이전트 | [AGENTS.md](AGENTS.md) 및 [설치·수정 작업 절차](docs/AGENT-GUIDE.md) |
| 유지보수 담당자 | [검증 범위](docs/VALIDATION.md), [보안 안내](SECURITY.md) |
| UI 수정 담당자 | [디자인 시스템](docs/DESIGN-SYSTEM.md) |

## 빠른 시작

1. GitHub의 **Use this template** 또는 **Fork**로 본인 저장소를 만듭니다.
2. 본인 저장소를 내려받고 Node.js 24를 준비합니다.
3. 새 Supabase 프로젝트에 `supabase/migrations/`의 SQL 001~008을 순서대로 실행합니다.
4. Supabase Auth에서 이메일·비밀번호 사용자를 만들고 `seo_members`에 해당 사용자 UUID를 등록합니다.
5. 아래 명령으로 실행하고 이메일로 로그인합니다. 자세한 값은 [설치 가이드](docs/SETUP.md)를 따르세요.

```bash
npm ci
cp .env.example .env.local
# .env.local에 자신의 Supabase 주소와 publishable key를 입력
npm run dev
```

6. **브랜드 추가 → 공식 홈페이지·고객·키워드·경쟁사 등록 → 진단 실행**.
7. AI를 사용할 때 AI Gateway를 연결하고, 검색·방문 성과가 필요하면 Google OAuth를 설정합니다.
8. 자신의 Vercel 프로젝트로 배포합니다. 원본 운영 환경이나 다른 사람의 계정을 연결하지 않습니다.

## 제공 기능

| 영역 | 메뉴와 역할 |
|---|---|
| 요약 | 대시보드: 수집 근거와 현재 개선 항목 |
| 검색 분석 | 키워드 현황·키워드 분석: 키워드 관리와 확보된 지표의 비교 |
| AI 분석 | 프롬프트 현황·분석: 질문 생성, 반복 관찰, 경쟁사 언급·출처·인용 구분 |
| 전략 | 전략맵·사이트 진단·개선 과제·4주 실행안 |
| 실행 | 콘텐츠 제작소·최적화·내보내기: 자료 기반 초안, 구조 검사, 파일 출력 |
| 관찰 | 모니터링·주간 리포트: 예약 실행 이력, Google 성과, GA4 실시간 수신 |
| 근거 | 페르소나·자료실·Raw 데이터: 작성 기준, 승인 자료, 응답 원문 |
| 운영 | 브랜드 관리·운영 방법 |

정적 크롤링, Gemini API의 Google 검색 도구, GSC와 GA4를 사용합니다. 소비자용 ChatGPT·Perplexity 화면을 자동 수집하지 않습니다. 별도 SERP 공급자 기반 검색 순위·검색량·Google AI Overview 추적, JS 렌더링 크롤링, Core Web Vitals 측정, 자동 홈페이지 게시·이메일 발송은 제공하지 않습니다.

## 개발·검증

```bash
npm test
npm run build
npm run typecheck
# 선택: 로컬 PostgreSQL의 initdb/pg_ctl/psql이 설치되어 있을 때
bash scripts/check-migrations.sh
```

빌드에도 Supabase 공개 환경변수가 필요합니다. 테스트용 예시 값은 빌드 확인에만 사용할 수 있으며 실제 로그인을 제공하지 않습니다. 로컬 DB 검사는 임시 PostgreSQL에만 연결하고 종료 시 삭제합니다. 원격 DB에 연결하지 않습니다.

Next.js 및 AI SDK API는 설치된 패키지 문서를 먼저 읽습니다. 의존성 버전 재현에는 `package-lock.json`과 `npm ci`를 사용하세요.

공개 저장소 전환은 실행 중인 앱의 데이터를 공개하는 설정이 아닙니다. 앱은 Auth와 RLS를 계속 사용합니다. 환경변수·Google 토큰·운영 데이터를 커밋하지 마세요.

## 공유와 재사용

[MIT License](LICENSE)로 사용할 수 있습니다. 각 외부 서비스의 이용약관과 비용, 의존성의 라이선스는 별도로 확인하세요. GitHub의 Fork 또는 Use this template으로 자신의 사본을 만들고 회사 정보는 자신의 비공개 환경에만 저장하세요.
