import {test} from 'node:test';import assert from 'node:assert/strict';
import {optimizeText,contentHTML,toCSV,metricSummary,type Metric} from '../lib/workflow';
import {seal,unseal,equalToken,googleWindow,oauthStart} from '../lib/google';
test('exported content cannot execute HTML or spreadsheet formulas',()=>{
 const html=contentHTML({title:'<img src=x onerror=alert(1)>',body:'</pre><script>alert(1)</script>'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));
 const csv=toCSV([{query:'=HYPERLINK("evil")',body:'line1\nline2'}]);assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));assert.ok(csv.includes('line1\nline2'));
});
test('GSC totals exclude query rows and weight position by impressions',()=>{
 const rows=[{provider:'gsc',grain:'daily',metrics:{clicks:1,impressions:10,position:2}},{provider:'gsc',grain:'daily',metrics:{clicks:9,impressions:90,position:10}},{provider:'gsc',grain:'query',metrics:{clicks:999,impressions:999,position:1}}].map(r=>({...r,brand_id:'test',date:'2026-10-01',dimension:'',source_property:'https://example.com',collected_at:'2026-10-16'})) as Metric[];
 const s=metricSummary(rows,'gsc');assert.equal(s.clicks,10);assert.equal(s.ctr,.1);assert.equal(s.position,9.2);assert.equal(metricSummary([],'gsc').position,null);
});
test('content score is bounded and empty evidence does not receive points',()=>{assert.equal(optimizeText('').score,0);const r=optimizeText('## 가이드\n## FAQ\n## 요약\n- 목록\n2026-10-16 업데이트 작성자\n출처 https://example.com\n10개');assert.ok(r.score<=100);assert.ok(r.checks.find(c=>c.id==='sources')?.passed);assert.ok(r.limitation.includes('정확성'));});
test('Google tokens and OAuth state reject tampering and use fixed callback plus PKCE',()=>{
 process.env.APP_URL='https://analytics.example.com';process.env.GOOGLE_TOKEN_KEY='a'.repeat(64);process.env.GOOGLE_CLIENT_ID='test';process.env.GOOGLE_CLIENT_SECRET='test';process.env.CRON_SECRET='test';const sealed=seal({refresh_token:'private'});assert.ok(!sealed.includes('private'));assert.deepEqual(unseal(sealed),{refresh_token:'private'});const parts=sealed.split('.');parts[1]='b'.repeat(parts[1].length);assert.throws(()=>unseal(parts.join('.')));assert.equal(equalToken('abc','abcd'),false);
 const r=oauthStart('user','brand'),url=new URL(r.url);assert.equal(url.searchParams.get('redirect_uri'),'https://analytics.example.com/api/google/callback');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(!url.href.includes('client_secret'));assert.ok(!r.cookie.includes('user'));
});
test('Google reporting window excludes last three days and spans 28 days',()=>{assert.deepEqual(googleWindow(new Date('2026-10-16T06:00:00Z')),{start:'2026-09-16',end:'2026-10-13'});});
