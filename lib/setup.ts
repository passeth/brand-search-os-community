import {appOrigin} from './app-origin';
type Env = Record<string, string | undefined>;
export function publicSetupIssues(env: Env): string[] {
 const issues:string[]=[];
 try {
  const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'');
  if(url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash || ['your-project.supabase.co','example.supabase.co'].includes(url.hostname)) throw new Error();
 } catch { issues.push('NEXT_PUBLIC_SUPABASE_URL에 자신의 Supabase HTTPS 프로젝트 주소를 입력하세요.'); }
 const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
 let anon=false;
 try { anon=JSON.parse(atob(key.split('.')[1])).role==='anon'; } catch {}
 if(!(/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)||anon)) issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY에 publishable 키 또는 기존 anon 키를 입력하세요. secret/service_role 키는 금지합니다.');
 return issues;
}
export function googleSetupIssues(env: Env):string[] {
 const issues:string[]=[];
 try{appOrigin(env.APP_URL||'');}catch{issues.push('APP_URL을 이 도구의 HTTPS 주소로 지정하세요. 로컬 개발은 http://localhost:3000을 허용합니다.');}
 if(!env.GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')) issues.push('Google 웹 OAuth 클라이언트 ID를 설정하세요.');
 if(!env.GOOGLE_CLIENT_SECRET?.trim()) issues.push('GOOGLE_CLIENT_SECRET을 설정하세요.');
 if(!/^[a-f\d]{64}$/i.test(env.GOOGLE_TOKEN_KEY||'')) issues.push('GOOGLE_TOKEN_KEY는 무작위 32바이트의 64자리 hex여야 합니다.');
 if((env.CRON_SECRET?.length||0)<32) issues.push('CRON_SECRET은 32자 이상의 무작위 값이어야 합니다. DB에는 같은 값의 SHA-256 해시를 등록하세요.');
 return issues;
}
