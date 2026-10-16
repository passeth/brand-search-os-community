import {test} from 'node:test';import assert from 'node:assert/strict';
import {publicSetupIssues,googleSetupIssues} from '../lib/setup';
const publicEnv={NEXT_PUBLIC_SUPABASE_URL:'https://sample-project.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'x'.repeat(24)};
test('first install rejects missing and template configuration without echoing values',()=>{
 assert.equal(publicSetupIssues({}).length,2);
 assert.equal(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_URL:'https://your-project.supabase.co'}).length,1);
 const secret='sb_secret_'+'x'.repeat(24);const errors=publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:secret});assert.equal(errors.length,1);assert.ok(!errors.join().includes(secret));
});
test('public config accepts publishable and legacy anon, rejects service-role JWT',()=>{
 assert.deepEqual(publicSetupIssues(publicEnv),[]);
 const jwt=(role:string)=>'eyJ.'+Buffer.from(JSON.stringify({role})).toString('base64')+'.signature';
 assert.deepEqual(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}),[]);
 assert.equal(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}).length,1);
});
test('Google setup is an optional independent stage and rejects short cron secrets',()=>{
 assert.equal(googleSetupIssues({}).length,5);
 const env={APP_URL:'https://analytics.example.com',GOOGLE_CLIENT_ID:'sample.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test',GOOGLE_TOKEN_KEY:'a'.repeat(64),CRON_SECRET:'b'.repeat(64)};
 assert.deepEqual(googleSetupIssues(env),[]);assert.equal(googleSetupIssues({...env,CRON_SECRET:'short'}).length,1);
});

import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {parseEnv} from 'node:util';
test('secret helper creates keys without printing them and preserves both keys on rerun',()=>{
 const dir=mkdtempSync(join(tmpdir(),'search-setup-test-'));
 try{
  writeFileSync(join(dir,'.env.local'),'CRON_SECRET=\nGOOGLE_TOKEN_KEY=\n');
  const script=resolve('scripts/setup-secrets.mjs');
  const result=spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const content=readFileSync(join(dir,'.env.local'),'utf8'),env=parseEnv(content);
  for(const name of ['CRON_SECRET','GOOGLE_TOKEN_KEY']){assert.match(env[name]!,/^[a-f0-9]{64}$/);assert.ok(!result.stdout.includes(env[name]!));}
  assert.ok(result.stdout.includes(createHash('sha256').update(env.CRON_SECRET!).digest('hex')));
  assert.equal(spawnSync(process.execPath,[script],{cwd:dir}).status,0);
  assert.equal(readFileSync(join(dir,'.env.local'),'utf8'),content);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('local Supabase is allowed only on loopback HTTP addresses',()=>{
 assert.deepEqual(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'}),[]);
 assert.equal(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_URL:'http://remote.example.com'}).length,1);
 assert.equal(publicSetupIssues({...publicEnv,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1.attacker.test'}).length,1);
});
