import {publicSetupIssues,googleSetupIssues} from '../lib/setup';
try{process.loadEnvFile('.env.local');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('.env.local 파일을 읽지 못했습니다.');}
const issues=publicSetupIssues(process.env);
if(process.argv.includes('--google'))issues.push(...googleSetupIssues(process.env));
if(process.argv.includes('--ai')&&!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)issues.push('AI Gateway 키 또는 Vercel OIDC 인증이 필요합니다.');
for(const issue of issues)console.error(`설정 필요: ${issue}`);
console.log('이 검사는 값의 형식만 점검합니다. 계정 권한, DB 마이그레이션, Cron 해시 일치, 모델 잔액, 실제 수신은 별도 확인하세요.');
if(!process.argv.includes('--google'))console.log('Google 연결을 준비할 때: npm run setup:check -- --google');
if(!process.argv.includes('--ai'))console.log('AI 연결을 준비할 때: npm run setup:check -- --ai');
if(!issues.length)console.log('요청한 설정의 형식 검사를 통과했습니다. 비밀 값은 출력하지 않았습니다.');
process.exitCode=issues.length?1:0;
