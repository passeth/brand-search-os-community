import {cohortKey} from './cohort';
import {observationEngines,type ObservationEngine} from './model-config';
import type {Brand,Observation} from './types';
export function pageURL(value:string,brand:Brand){const u=new URL(value),site=new URL(brand.domain);if(u.protocol!=='https:'||u.username||u.password||u.origin!==site.origin||!(u.pathname===site.pathname.replace(/\/$/,'')||u.pathname.startsWith(site.pathname.replace(/\/$/,'')+'/')))throw new Error('현재 사이트 범위의 HTTPS 페이지를 입력하세요.');u.search='';u.hash='';return u.href;}
export function samePage(a:string,b:string){try{const x=new URL(a),y=new URL(b);return x.origin===y.origin&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'');}catch{return false;}}
export function pageCitations(rows:Observation[],brand:Brand,url:string,engine:ObservationEngine,start:string,end:string){const c=observationEngines[engine];const matches=rows.filter(o=>o.brand_id===brand.id&&o.source_kind==='model_api'&&o.model===c.model&&o.measurement?.protocol===c.protocol&&o.measurement?.cohort===cohortKey(brand)&&o.measurement.quality==='complete'&&o.observed_at.slice(0,10)>=start&&o.observed_at.slice(0,10)<=end);const latest=[...new Map(matches.sort((a,b)=>a.observed_at.localeCompare(b.observed_at)).map(o=>[o.prompt,o])).values()];const eligible=latest.filter(o=>o.measurement?.grounding?.citationMetadata);return {samples:eligible.length,cited:eligible.filter(o=>o.measurement!.grounding!.sources.some(s=>s.resolvedUrl&&samePage(s.resolvedUrl,url)&&o.measurement!.citations?.includes(s.index))).length,unknown:latest.length-eligible.length};}
export function pageEventRequest(url:string,start:string,end:string,event:'consultation_click'|'generate_lead'){const u=new URL(url);const p=u.pathname.replace(/\/$/,'')||'/';return {dateRanges:[{startDate:start,endDate:end}],metrics:[{name:'eventCount'}],dimensionFilter:{andGroup:{expressions:[{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:u.hostname}}},{filter:{fieldName:'pagePath',inListFilter:{values:p==='/'?['/']:[p,p+'/']}}},{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:event,caseSensitive:true}}}]}},limit:1};}
export function eventCount(report:{rows?:{metricValues:{value:string}[]}[]}){const n=Number(report.rows?.[0]?.metricValues[0]?.value??0);if(!Number.isFinite(n)||n<0)throw new Error('Invalid metric');return n;}

/** A server row cap can truncate a successful response; never infer completeness from length alone. */
export function completePageObservations<T>(data:T[]|null,count:unknown):T[] {
 if(typeof count!=='number'||!Number.isSafeInteger(count)||count<0)throw new Error('관찰 전체 건수를 확인하지 못해 집계를 표시하지 않았습니다.');
 if(count>1000)throw new Error('1,000행 초과: 불완전한 집계를 표시하지 않았습니다.');
 if(!Array.isArray(data)||data.length!==count)throw new Error('관찰 일부가 누락되어 집계를 표시하지 않았습니다.');
 return data;
}
