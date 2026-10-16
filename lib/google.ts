import {createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {db} from './supabase';
import {ga4MatchesBrand,gscMatchesBrand} from './google-domain';
import {hostname} from './grounding';
import {matchingStreams,realtimeRequests,type GA4WebStream,type GoogleLive} from './google-live';
export const googleScopes=['https://www.googleapis.com/auth/webmasters.readonly','https://www.googleapis.com/auth/analytics.readonly'];
export {callbackURL as googleCallback} from './app-origin';
import {callbackURL as googleCallback} from './app-origin';
export type GoogleConnection={brand_id:string;scopes:string[];gsc_site:string|null;ga4_property:string|null;connected_at:string;last_sync_at:string|null;last_error:string|null;enabled:boolean;brand_domain?:string;encrypted_token?:string};
export function googleConfigured(){return !!(process.env.APP_URL&&process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_TOKEN_KEY&&process.env.CRON_SECRET);}
function encryptionKey(){const k=process.env.GOOGLE_TOKEN_KEY;if(!k||!/^[a-f\d]{64}$/i.test(k))throw new Error('Google 토큰 암호화 설정이 필요합니다.');return Buffer.from(k,'hex');}
export function seal(value:unknown){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',encryptionKey(),iv);const encrypted=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return [iv,c.getAuthTag(),encrypted].map(b=>b.toString('base64url')).join('.');}
export function unseal<T>(value:string):T{const [iv,tag,content]=value.split('.').map(v=>Buffer.from(v,'base64url'));const c=createDecipheriv('aes-256-gcm',encryptionKey(),iv);c.setAuthTag(tag);return JSON.parse(Buffer.concat([c.update(content),c.final()]).toString('utf8'));}
export function equalToken(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export type OAuthState={nonce:string;userId:string;brandId:string;verifier:string;expires:number};
export function oauthStart(userId:string,brandId:string){if(!googleConfigured())throw new Error('Google OAuth 클라이언트 설정이 필요합니다. 연결 안내를 확인하세요.');const state:OAuthState={nonce:randomBytes(32).toString('base64url'),userId,brandId,verifier:randomBytes(32).toString('base64url'),expires:Date.now()+600000};const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,redirect_uri:googleCallback(),response_type:'code',scope:googleScopes.join(' '),access_type:'offline',prompt:'consent',state:state.nonce,code_challenge:createHash('sha256').update(state.verifier).digest('base64url'),code_challenge_method:'S256'}).toString();return {url:url.href,cookie:seal(state)};}
export async function worker(action:string,brandId:string|null,data:Record<string,unknown>={}){if(!process.env.CRON_SECRET)throw new Error('서버 수집 설정이 없습니다.');const r=await db().rpc('seo_google_worker',{p_secret:process.env.CRON_SECRET,p_action:action,p_brand:brandId,p_data:data});if(r.error)throw new Error('Google 연결 정보 저장소 오류');return r.data;}
async function tokenRequest(params:Record<string,string>){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!}),signal:AbortSignal.timeout(12000),cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error==='invalid_grant'?'Google 인증이 만료되었습니다. 다시 연결하세요.':'Google 인증 요청 실패. OAuth 클라이언트 설정을 확인하세요.');return data as {access_token:string;refresh_token?:string;scope?:string};}
export async function completeGoogle(code:string,state:OAuthState){const token=await tokenRequest({grant_type:'authorization_code',code,redirect_uri:googleCallback(),code_verifier:state.verifier});const scopes=(token.scope||'').split(' ');if(!googleScopes.some(s=>scopes.includes(s)))throw new Error('읽기 권한이 부여되지 않았습니다.');if(!token.refresh_token)throw new Error('지속 수집 권한을 받지 못했습니다. Google 계정의 기존 앱 연결을 확인하고 다시 연결하세요.');await worker('connect',state.brandId,{user_id:state.userId,scopes,encrypted_token:seal({refresh_token:token.refresh_token})});}
export async function googleAccess(brandId:string){const connection=await worker('read',brandId) as GoogleConnection|null;if(!connection?.encrypted_token)throw new Error('먼저 Google 계정을 연결하세요.');const {refresh_token}=unseal<{refresh_token:string}>(connection.encrypted_token);const tokens=await tokenRequest({grant_type:'refresh_token',refresh_token});return {connection,access:tokens.access_token};}
async function googleAPI(url:string,access:string,body?:unknown){const r=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});const result=await r.json();if(!r.ok)throw new Error(`Google API ${r.status}: 권한·API 활성화·할당량을 확인하세요.`);return result;}
export async function listGoogleProperties(access:string,scopes:string[]){const sites:{siteUrl:string;permissionLevel:string}[]=[],properties:{property:string;displayName:string;account:string}[]=[],errors:string[]=[];
 if(scopes.includes(googleScopes[0])){try{const r=await googleAPI('https://www.googleapis.com/webmasters/v3/sites',access);sites.push(...(r.siteEntry||[]));}catch(e){errors.push('Search Console '+(e as Error).message);}}
 if(scopes.includes(googleScopes[1])){try{let next='';let pages=0;do{const r=await googleAPI('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200'+(next?'&pageToken='+encodeURIComponent(next):''),access);for(const a of r.accountSummaries||[])for(const p of a.propertySummaries||[])properties.push({...p,account:a.displayName});next=r.nextPageToken||'';if(++pages>10)throw new Error('계정 목록이 10페이지를 초과했습니다.');}while(next);}catch(e){errors.push('GA4 '+(e as Error).message);}}
 return {sites,properties,errors};
}
export function googleWindow(now=new Date()){const end=new Date(now.getTime()-3*86400000),start=new Date(end.getTime()-27*86400000);return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};}
export async function ga4Streams(access:string,property:string){
 return (await ga4WebStreams(access,property)).map(s=>s.url);
}
async function ga4WebStreams(access:string,property:string){
 if(!/^properties\/\d+$/.test(property))throw new Error('GA4 속성 형식 오류');
 const streams:GA4WebStream[]=[];let token='';let pages=0;
 do{const result=await googleAPI(`https://analyticsadmin.googleapis.com/v1beta/${property}/dataStreams?pageSize=200${token?'&pageToken='+encodeURIComponent(token):''}`,access);for(const s of result.dataStreams??[])if(s.webStreamData?.defaultUri)streams.push({id:String(s.name).split('/').at(-1)!,url:s.webStreamData.defaultUri,measurementId:s.webStreamData.measurementId??''});token=result.nextPageToken??'';if(++pages>10)throw new Error('GA4 스트림 목록 한도 초과');}while(token);
 return streams;
}
export async function liveGoogle(brandId:string):Promise<GoogleLive>{
 const {connection:c,access}=await googleAccess(brandId);
 if(!c.ga4_property||!c.brand_domain)throw new Error('GA4 속성을 먼저 연결하세요.');
 const streams=matchingStreams(await ga4WebStreams(access,c.ga4_property),c.brand_domain);
 const [totals,events]=await Promise.all(realtimeRequests(streams).map(body=>googleAPI(`https://analyticsdata.googleapis.com/v1beta/${c.ga4_property}:runRealtimeReport`,access,body)));
 // Verify the connection is still current before exposing an in-flight result.
 const current=await worker('read',brandId) as GoogleConnection|null;
 if(!current||current.ga4_property!==c.ga4_property||current.brand_domain!==c.brand_domain)throw new Error('Google 연결이 변경되었습니다. 다시 확인하세요.');
 const values=totals.rows?.[0]?.metricValues;
 return {property:c.ga4_property,checkedAt:new Date().toISOString(),windowMinutes:30,streams,activeUsers:Number(values?.[0]?.value??0),pageViews:Number(values?.[1]?.value??0),events:(events.rows??[]).map((r:{dimensionValues:{value:string}[];metricValues:{value:string}[]})=>({name:r.dimensionValues[0].value,count:Number(r.metricValues[0].value)}))};
}
export async function syncGoogle(brandId:string){const {connection:c,access}=await googleAccess(brandId);const {start,end}=googleWindow();const counts:Record<string,number>={};const errors:string[]=[];
 if(!c.gsc_site&&!c.ga4_property)throw new Error('수집할 속성을 먼저 선택하세요.');
 if(c.gsc_site){try{if(!c.brand_domain||!gscMatchesBrand(c.gsc_site,c.brand_domain))throw new Error('Search Console 속성이 브랜드 도메인과 다릅니다.');const rows=[];for(const grain of ['daily','query']){const result=await googleAPI(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(c.gsc_site)}/searchAnalytics/query`,access,{startDate:start,endDate:end,dimensions:grain==='daily'?['date']:['date','query'],type:'web',dataState:'final',rowLimit:25000});if((result.rows?.length||0)>=25000)throw new Error('검색어 25,000행 한도에 도달했습니다. 불완전한 결과는 저장하지 않았습니다.');for(const r of result.rows||[])rows.push({grain,date:r.keys[0],dimension:grain==='query'?r.keys[1]:'',metrics:{clicks:r.clicks,impressions:r.impressions,ctr:r.ctr,position:r.position}});}
 await worker('metrics',brandId,{provider:'gsc',start,end,property:c.gsc_site,rows});counts.gsc=rows.length;}catch(e){errors.push('GSC: '+(e as Error).message);}}
 if(c.ga4_property){try{if(!c.brand_domain)throw new Error('브랜드 도메인 확인이 필요합니다.');if(!ga4MatchesBrand(await ga4Streams(access,c.ga4_property),c.brand_domain))throw new Error('GA4 웹 스트림 도메인이 브랜드와 다릅니다.');if(!/^properties\/\d+$/.test(c.ga4_property))throw new Error('GA4 속성 형식 오류');const names=['sessions','activeUsers','screenPageViews','keyEvents'];const result=await googleAPI(`https://analyticsdata.googleapis.com/v1beta/${c.ga4_property}:runReport`,access,{dateRanges:[{startDate:start,endDate:end}],dimensions:[{name:'date'}],dimensionFilter:{filter:{fieldName:'hostName',inListFilter:{values:[hostname(c.brand_domain),'www.'+hostname(c.brand_domain)]}}},metrics:names.map(name=>({name})),limit:100,keepEmptyRows:true});const rows=(result.rows||[]).map((r:{dimensionValues:{value:string}[];metricValues:{value:string}[]})=>({grain:'daily',date:r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'),dimension:'',metrics:Object.fromEntries(names.map((n,i)=>[n,Number(r.metricValues[i]?.value||0)]))}));await worker('metrics',brandId,{provider:'ga4',start,end,property:c.ga4_property,rows});counts.ga4=rows.length;}catch(e){errors.push('GA4: '+(e as Error).message);}}
 await worker('status',brandId,{error:errors.join(' / ')});return {counts,errors,start,end};
}
