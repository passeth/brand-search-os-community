import {appOrigin} from '@/lib/app-origin';
import {cookies} from 'next/headers';import {unseal,equalToken,completeGoogle,type OAuthState} from '@/lib/google';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request){const jar=await cookies();const cookie=jar.get('brand_google_oauth')?.value;jar.set('brand_google_oauth','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/google',maxAge:0});const u=new URL(request.url);let message='';let brandId='';
 try{if(u.searchParams.has('error'))throw new Error('Google 연결을 취소했거나 권한이 승인되지 않았습니다.');if(!cookie)throw new Error('연결 세션이 만료되었습니다. 앱에서 다시 시작하세요.');const s=unseal<OAuthState>(cookie);if(s.expires<Date.now()||!equalToken(s.nonce,u.searchParams.get('state')||''))throw new Error('연결 세션을 확인할 수 없습니다.');const code=u.searchParams.get('code');if(!code)throw new Error('인증 코드를 받지 못했습니다.');await completeGoogle(code,s);brandId=s.brandId;message='Google 인증 완료. 모니터링 대시보드에서 수집할 속성을 선택하세요.';}catch(e){message=e instanceof Error?e.message:'Google 연결 실패';}
 const target=new URL(appOrigin());target.searchParams.set('view','monitoring');if(brandId)target.searchParams.set('brand',brandId);target.searchParams.set('google',message);return new Response(null,{status:303,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
