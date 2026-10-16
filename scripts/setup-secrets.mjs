import {readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
// Explicit opt-in command. Existing keys are preserved, never rotated.
let text;
try{text=readFileSync('.env.local','utf8');}catch{throw new Error('먼저 .env.example을 .env.local로 복사하세요.');}
const env=parseEnv(text);
for(const name of ['CRON_SECRET','GOOGLE_TOKEN_KEY']) {
 const lines=text.split('\n').filter(line=>new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line));
 if(lines.length>1)throw new Error(`${name} 중복 선언을 먼저 정리하세요.`);
 if(env[name])continue;
 const value=randomBytes(32).toString('hex');
 const pattern=new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`,'m');
 text=pattern.test(text)?text.replace(pattern,`${name}=${value}`):`${text}\n${name}=${value}\n`;
 env[name]=value;
}
writeFileSync('.env.local',text,{mode:0o600});chmodSync('.env.local',0o600);
console.log('빈 비밀키 항목만 .env.local에 생성했습니다. 기존 키는 유지했습니다.');
console.log('다음 해시만 설치 가이드의 DB 등록 SQL에 사용하세요:');
console.log(createHash('sha256').update(env.CRON_SECRET).digest('hex'));
