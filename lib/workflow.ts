export type Keyword={id:string;brand_id:string;keyword:string;cluster:string;intent:string;target_url:string;active:boolean};
export type Persona={id:string;brand_id:string;name:string;role:string;tone:string;instructions:string;sample:string};
export type Knowledge={id:string;brand_id:string;title:string;kind:'product'|'topic'|'claim'|'source';content:string;source_url:string;status:'draft'|'approved'|'archived'};
export type Content={id:string;brand_id:string;title:string;keyword:string;format:string;body:string;status:'draft'|'review'|'approved';published_url:string;evidence:Record<string,unknown>;revision:number;created_at:string;updated_at:string};
export type Metric={brand_id:string;provider:'gsc'|'ga4';grain:'daily'|'query';date:string;dimension:string;metrics:Record<string,number>;source_property:string;collected_at:string};

export function optimizeText(text:string){
 const lines=text.split('\n').filter(l=>l.trim()),first=lines.slice(0,5).join(' ');
 const tests:[string,string,number,boolean,string][]=[
  ['answer','도입부 답변',15,first.length>=80&&first.length<=1000,'첫 문단에서 고객 질문에 직접 답하는지 사람이 확인하세요. 길이만으로 의미를 판정할 수 없습니다.'],
  ['evidence','수치·기준 단서',10,/\d+\s*(%|개|원|일|주|개월|년|ml|g|kg)/i.test(text),'검증 가능한 수치와 단위, 조사 조건·근거를 제시하세요. 숫자의 진위는 별도 검토입니다.'],
  ['sources','출처 링크',15,/https:\/\/[^\s)]+/.test(text),'주장과 연결된 공개 출처를 첨부하세요. 링크의 신뢰성은 별도 검토입니다.'],
  ['sections','소제목 구조',15,(text.match(/^#{1,3}\s+.+/gm)||[]).length>=3,'Markdown 소제목으로 질문·답변 단위를 3개 이상 나누세요.'],
  ['faq','질문과 답변',10,/FAQ|자주 묻|자주 하는|Q[.:]\s|질문\s*[:：]/i.test(text),'실제 고객 질문과 구체적인 답변을 넣으세요.'],
  ['summary','요약',10,/요약|핵심 정리|핵심 요점|한눈에/.test(text),'핵심 결론을 짧게 요약하세요.'],
  ['lists','표 또는 목록',10,/^\s*([-*]|\d+\.)\s+|^\|.+\|/m.test(text),'비교 기준이나 실행 순서는 표·목록으로 표현하세요.'],
  ['date','기준 시점',5,/(?:20\d{2})[년./-]/.test(text),'정보의 기준 날짜를 밝혀 주세요.'],
  ['updated','수정 이력',5,/업데이트|수정일|검토일|최종 검토/.test(text),'최종 검토일과 변경 내용을 표시하세요.'],
  ['author','담당자',5,/작성자|검토자|담당자|저자/.test(text),'내용에 책임지는 실제 작성·검토 담당자를 표시하세요.'],
 ];
 const checks=tests.map(([id,name,weight,passed,action])=>({id,name,weight,passed,action}));
 return {version:'content-structure-v1',score:checks.reduce((n,c)=>n+(c.passed?c.weight:0),0),checks,characters:text.length,limitation:'텍스트 패턴을 검사하는 100점 구조 체크리스트입니다. 내용의 정확성·효능·검색 순위·AI 인용 가능성을 검증한 점수가 아닙니다.'};
}
export function csvCell(value:unknown){const s=typeof value==='object'?JSON.stringify(value):String(value??'');const safe=/^[\s]*[=+@-]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"';}
export function toCSV(rows:Record<string,unknown>[]){const columns=[...new Set(rows.flatMap(Object.keys))];return '\uFEFF'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n');}
export function contentHTML(content:Pick<Content,'title'|'body'>){const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${escape(content.title)}</title><style>body{max-width:760px;margin:48px auto;padding:24px;font:18px/1.8 system-ui}pre{white-space:pre-wrap;font:inherit}</style><h1>${escape(content.title)}</h1><pre>${escape(content.body)}</pre></html>`;}
export function metricSummary(rows:Metric[],provider:'gsc'|'ga4'){
 const daily=rows.filter(r=>r.provider===provider&&r.grain==='daily');const sum=(key:string)=>daily.reduce((n,r)=>n+(r.metrics[key]||0),0);
 return {days:daily.length,clicks:sum('clicks'),impressions:sum('impressions'),ctr:sum('impressions')?sum('clicks')/sum('impressions'):null,position:sum('impressions')?daily.reduce((n,r)=>n+(r.metrics.position||0)*(r.metrics.impressions||0),0)/sum('impressions'):null,sessions:sum('sessions'),views:sum('screenPageViews'),keyEvents:sum('keyEvents')};
}
