import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brandMention,measureAnswer,parsePromptDrafts,summarizeObservations,weeklyReport} from '../lib/monitoring';
import type {Brand,Observation} from '../lib/types';
const brand:Brand={id:'b',name:'ACME · 샘플사',domain:'https://acme.example',keywords:['화장품 OEM'],competitors:['비교사 | RIVAL'],audience:'브랜드 창업자'};
function observation(prompt:string,answer:string,time:string):Observation{return {id:time,brand_id:'b',prompt,answer,platform:'Gemini API',source_url:'',mentioned:brandMention(answer,brand.name),source_kind:'model_api',model:'google/gemini-2.5-flash-lite',observed_at:time,measurement:measureAnswer(answer,prompt,brand)};}
test('name matching does not mistake English substrings for a brand and handles Korean particles',()=>{
 assert.equal(brandMention('acmeology',brand.name),false);assert.equal(brandMention('샘플사의 제조 공정',brand.name),true);assert.equal(brandMention('ACME is listed.',brand.name),true);
});
test('comparison uses text order only and marks named questions as prompted',()=>{
 const m=measureAnswer('비교사 다음 샘플사. 샘플사를 확인하세요.','샘플사와 비교사 비교',brand);
 assert.equal(m.scope,'branded');assert.equal(m.entities[0].count,2);assert.equal(m.entities[0].order,2);assert.equal(m.entities[1].order,1);assert.equal(m.citations,null);
});
test('unbranded rates exclude prompted questions, manual observations and obsolete competitor groups',()=>{
 const a=observation('어떤 제조사가 있나요?','비교사','2026-10-16T00:00:00Z');
 const b=observation('샘플사는 어떤가요?','샘플사','2026-10-16T01:00:00Z');
 const c={...a,id:'manual',source_kind:'manual' as const};
 const d={...a,id:'obsolete',measurement:measureAnswer('샘플사',a.prompt,{name:brand.name,competitors:[]})};
 const s=summarizeObservations([a,b,c,d],brand,'discovery','text-only');assert.equal(s.total,1);assert.equal(s.entities[0].rate,0);assert.equal(s.entities[1].rate,1);
 assert.equal(summarizeObservations([],brand,'discovery','text-only').entities[0].rate,null);
});
test('weekly deltas require the same question and model in both periods',()=>{
 const now=new Date('2026-10-16T00:00:00Z');
 assert.equal(weeklyReport([observation('추천 업체는?','샘플사','2026-10-15T00:00:00Z')],brand,now,'text-only').delta,null);
 const r=weeklyReport([observation('추천 업체는?','샘플사','2026-10-15T00:00:00Z'),observation('추천 업체는?','비교사','2026-10-05T00:00:00Z'),observation('다른 질문인가요?','샘플사','2026-10-06T00:00:00Z')],brand,now,'text-only');
 assert.equal(r.delta,100);assert.equal(r.previous.total,1);
});
test('malformed, duplicate and incomplete generated questions cannot be stored',()=>{
 assert.throws(()=>parsePromptDrafts('[]'));assert.throws(()=>parsePromptDrafts('not json'));
 const questions=Array.from({length:10},(_,i)=>({prompt:`질문 ${i}을 설명해 주세요`,intent:'recommend',keyword:'제조사',stage:'consideration'}));
 assert.equal(parsePromptDrafts(JSON.stringify(questions)).length,10);
 questions[1].prompt=questions[0].prompt;assert.throws(()=>parsePromptDrafts(JSON.stringify(questions)));
});
