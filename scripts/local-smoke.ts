/** Real local Supabase Auth/PostgREST + Next API; synthetic fixtures, no paid provider calls. */
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';import {parseEnv} from 'node:util';import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';import {inspectHTML} from '../lib/analyze';
const env=parseEnv(readFileSync('.env.supabase.local','utf8'));
const app=parseEnv(readFileSync('.env.local','utf8'));
const api=new URL(env.API_URL!),origin=new URL(app.APP_URL!);
for(const url of [api,origin])assert.ok(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname),'Only local disposable endpoints permitted');
assert.equal(app.NEXT_PUBLIC_SUPABASE_URL,api.origin);
for(const key of ['AI_GATEWAY_API_KEY','VERCEL_OIDC_TOKEN','OPENAI_API_KEY','GOOGLE_GENERATIVE_AI_API_KEY'])assert.ok(!app[key]&&!process.env[key],'Provider credentials must be absent in this isolated smoke test');
const admin=createClient(api.origin,env.SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const userClient=()=>createClient(api.origin,env.ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const users:string[]=[];let brandId:string|undefined;
function check<T extends {error:unknown}>(r:T):T {if(r.error)throw new Error('Local Supabase operation failed: '+JSON.stringify(r.error));return r;}
const total=check(await admin.from('seo_brands').select('id',{head:true,count:'exact'})).count;
assert.equal(total,0,'Use a fresh test database, not an existing workspace');
async function makeUser(){const email=`beta-${randomBytes(6).toString('hex')}@example.test`,password=randomBytes(24).toString('base64url');const r=check(await admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(r.data.user!.id);const client=userClient();const signed=check(await client.auth.signInWithPassword({email,password}));return {client,id:r.data.user!.id,token:signed.data.session!.access_token};}
try{
 const member=await makeUser(),other=await makeUser();
 check(await admin.from('seo_members').insert({user_id:member.id}));
 const brand=check(await member.client.from('seo_brands').insert({name:'Local beta fixture',language:'en',domain:'https://example.com',keywords:['sample topic'],competitors:['Comparison fixture']}).select().single()).data;
 brandId=brand.id;
 assert.equal(check(await member.client.from('seo_keywords').select('*').eq('brand_id',brandId!)).data!.length,1);
 assert.equal(check(await other.client.from('seo_brands').select('*')).data!.length,0);
 assert.ok((await other.client.from('seo_members').insert({user_id:other.id})).error,'Self enrollment must fail');
 assert.ok((await member.client.from('seo_google_tokens').select('*')).error,'Token table must be inaccessible');
 async function post(path:string,body:unknown,token=member.token){return fetch(origin.origin+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});}
 assert.equal((await post('strategy',{brandId},'')).status,401);
 assert.equal((await post('strategy',{brandId},other.token)).status,403);
 assert.equal((await post('strategy',{brandId})).status,400,'Strategy requires an audit');
 // A synthetic stored report tests workflow persistence, not external website crawling.
 const page=inspectHTML('<html><head><title>Test fixture</title></head><body><h1>Fixture</h1><p>Local test only</p></body></html>','https://example.com',200,'');
 const report={version:'1.0',startedAt:new Date().toISOString(),pages:[page],errors:[],robots:'fixture',sitemap:'fixture',seo:0,aeo:0,limitations:['Synthetic local test, not a real site audit']};
 check(await member.client.from('seo_audits').insert({brand_id:brandId,seo_score:0,aeo_score:0,report,created_by:member.id}));
 const strategy=await post('strategy',{brandId});assert.equal(strategy.status,200,await strategy.text());
 assert.equal(check(await member.client.from('seo_strategies').select('*').eq('brand_id',brandId!)).data!.length,1);
 const optimization=await post('optimize',{brandId,text:'# Fixture\nThis is local synthetic test content.'});assert.equal(optimization.status,200,await optimization.text());
 check(await member.client.from('seo_tasks').insert({brand_id:brandId,title:'Fixture task',detail:'Test',priority:'P1',category:'SEO',evidence:'Synthetic'}));
 check(await member.client.from('seo_tasks').update({status:'done'}).eq('brand_id',brandId!));
 const content=check(await member.client.from('seo_contents').insert({brand_id:brandId,title:'Fixture',body:'Old',status:'approved'}).select().single()).data;
 check(await member.client.from('seo_contents').update({body:'New'}).eq('id',content.id));
 const revised=check(await member.client.from('seo_contents').select('*').eq('id',content.id).single()).data;
 assert.equal(revised.revision,2);assert.equal(revised.status,'review');
 assert.equal(check(await member.client.from('seo_content_versions').select('*').eq('content_id',content.id)).data!.length,1);
 check(await admin.from('seo_monitor_credentials').insert({singleton:true,secret_hash:createHash('sha256').update(app.CRON_SECRET!).digest('hex')}));
 // Eligible work exists, but a server started without Gateway credentials must not claim it.
 const prompt=check(await member.client.from('seo_prompts').insert({brand_id:brandId,prompt:'Synthetic English question for preflight?',intent:'compare'}).select().single()).data;
 assert.equal(prompt.language,'en','Prompt language must inherit the explicit site language');
 check(await member.client.from('seo_schedules').insert({brand_id:brandId,enabled:true,cadence:'daily',prompt_limit:1}));
 const stale=check(await admin.from('seo_monitor_runs').insert({brand_id:brandId,prompt_id:prompt.id,slot_date:new Date(Date.now()-86400000).toISOString().slice(0,10),prompt:prompt.prompt,brand_snapshot:brand,model:'google/gemini-2.5-flash-lite',protocol:'google-search-v1',started_at:new Date(Date.now()-16*60000).toISOString()}).select().single()).data;
 const jobsBefore=check(await admin.from('seo_monitor_runs').select('id').eq('brand_id',brandId!)).data!;
 assert.equal((await fetch(origin.origin+'/api/cron/monitor')).status,401);
 assert.equal(check(await admin.from('seo_monitor_runs').select('status').eq('id',stale.id).single()).data!.status,'running','Unauthorized HTTP must not reap');
 assert.ok((await userClient().rpc('seo_reap_monitor_runs',{p_secret:'wrong'})).error,'Wrong cleanup credential must fail');
 const monitor=await fetch(origin.origin+'/api/cron/monitor',{headers:{Authorization:`Bearer ${app.CRON_SECRET}`}});
 assert.equal(monitor.status,503,'Unconfigured Gateway must fail closed, not claim or generate');
 const result=await monitor.json();assert.equal(result.code,'credits_unavailable');assert.equal(result.claimed,0);assert.equal(result.reaped,1);
 const jobsAfter=check(await admin.from('seo_monitor_runs').select('id,status,finished_at').eq('brand_id',brandId!)).data!;
 assert.deepEqual(jobsAfter.map(r=>r.id).sort(),jobsBefore.map(r=>r.id).sort(),'Preflight failure must not create jobs');
 assert.equal(jobsAfter.find(r=>r.id===stale.id)?.status,'failed');assert.ok(jobsAfter.find(r=>r.id===stale.id)?.finished_at);
 assert.equal(check(await admin.from('seo_observations').select('id',{head:true,count:'exact'}).eq('brand_id',brandId!)).count,0,'Cleanup must not create observations');
 assert.equal(check(await userClient().rpc('seo_reap_monitor_runs',{p_secret:app.CRON_SECRET})).data,0,'Cleanup-only RPC remains idempotent');
 assert.equal((await fetch(origin.origin+'/api/cron/google')).status,401);
 const google=await fetch(origin.origin+'/api/cron/google',{headers:{Authorization:`Bearer ${app.CRON_SECRET}`}});assert.equal(google.status,200,await google.text());
 console.log('PASS real local Auth sign-in, membership/RLS, brand keywords, Next API authorization, fixture-backed strategy, optimization, task/content persistence, versions, missing-credit fail-closed worker, no new claims, authenticated stale cleanup and empty Google worker.');
 console.log('Not tested: external AI/Google, live site crawl, browser login, remote deployment or time-triggered scheduling.');
}finally{
 if(brandId){
  await admin.from('seo_observations').delete().eq('brand_id',brandId);
  await admin.from('seo_monitor_runs').delete().eq('brand_id',brandId);
  await admin.from('seo_schedules').delete().eq('brand_id',brandId);
  await admin.from('seo_prompts').delete().eq('brand_id',brandId);
  await admin.from('seo_brands').delete().eq('id',brandId);
 }
 await admin.from('seo_monitor_credentials').delete().eq('singleton',true);
 for(const id of users){await admin.from('seo_members').delete().eq('user_id',id);await admin.auth.admin.deleteUser(id);}
}
