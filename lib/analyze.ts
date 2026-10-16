import * as cheerio from 'cheerio';
import type {Check,PageReport,Report} from './types';
export function inspectHTML(html:string,url:string,status=200,xrobots=''):PageReport{
 const $=cheerio.load(html);const title=$('title').first().text().trim(),description=$('meta[name="description" i]').attr('content')?.trim()||'',h1=$('h1').map((_,e)=>$(e).text().trim()).get();
 const robots=[$('meta[name="robots" i]').attr('content'),xrobots].join(' ');const canonical=$('link[rel="canonical"]').attr('href')||'';
 const schemas:unknown[]=[];let invalid=0;$('script[type="application/ld+json"]').each((_,e)=>{try{schemas.push(JSON.parse($(e).text()));}catch{invalid++;}});
 const types:string[]=[];function walk(v:unknown){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){for(const [k,val] of Object.entries(v)){if(k==='@type')types.push(...(Array.isArray(val)?val.map(String):[String(val)]));else walk(val);}}}schemas.forEach(walk);
 const missingAlt=$('img').filter((_,e)=>$(e).attr('alt')===undefined).length,totalImages=$('img').length;
 const headings=$('h2,h3').map((_,e)=>$(e).text().trim()).get();$('script,style,nav,footer,header,noscript').remove();const body=$('body').text().replace(/\s+/g,' ').trim();
 const checks:Check[]=[];const add=(id:string,name:string,category:Check['category'],passed:boolean,weight:number,evidence:string,action:string,priority:Check['priority']='P1')=>checks.push({id,name,category,passed,weight,evidence,action,priority});
 add('http','정상 HTTP 응답','SEO',status===200,15,`HTTP ${status}`,'페이지가 200 상태로 응답하도록 서버와 리다이렉트를 확인하세요.','P0');
 add('indexable','색인 차단 지시 확인','SEO',!(/\bnoindex\b|\bnone\b/i.test(robots)),20,robots.trim()||'noindex 지시 없음 (색인 여부는 Search Console 확인 필요)','검색 대상 페이지의 noindex 지시를 검토하세요.','P0');
 add('title','페이지 제목','SEO',title.length>=10&&title.length<=65,20,`${title||'없음'} · ${title.length}자`,'검색 의도와 브랜드명을 담은 고유 제목을 10~65자 권장 범위로 작성하세요.');
 add('description','메타 설명','SEO',description.length>=40&&description.length<=180,15,`${description||'없음'} · ${description.length}자`,'핵심 답변과 페이지의 가치를 담은 40~180자 설명을 작성하세요.');
 let canonicalOK=false;try{canonicalOK=new URL(canonical,url).protocol==='https:'&&!!canonical;}catch{}
 add('canonical','대표 URL','SEO',canonicalOK,10,canonical||'canonical 태그 없음','중복 URL을 정리하고 실제 대표 페이지로 canonical을 지정하세요.');
 add('h1','주제 제목 H1','SEO',h1.length===1,10,`${h1.length}개: ${h1.join(' / ')}`,'페이지 주제를 설명하는 H1을 명확히 구성하세요.');
 add('alt','이미지 대체 텍스트','SEO',missingAlt===0,10,`이미지 ${totalImages}개 중 alt 누락 ${missingAlt}개`,'정보성 이미지에는 설명을, 장식용 이미지에는 빈 alt를 지정하세요.','P2');
 add('schema','구조화 데이터 문법','AEO',schemas.length>0&&invalid===0,20,`유효 JSON ${schemas.length}개 / 파싱 실패 ${invalid}개`,'실제 페이지 내용에 맞는 JSON-LD를 추가하고 Rich Results Test로 검증하세요.');
 add('entity','브랜드·조직 엔터티','AEO',types.some(t=>['Organization','Corporation','LocalBusiness','Brand'].includes(t)),20,`발견 유형: ${types.join(', ')||'없음'}`,'공식 명칭, URL, 로고, 검증된 sameAs를 Organization 또는 Brand 데이터로 연결하세요.');
 add('answer','질문형 정보 구조','AEO',headings.some(h=>/[?？]|방법|무엇|어떻게|왜|FAQ|자주|how|what|why/i.test(h)),20,`소제목 ${headings.length}개: ${headings.slice(0,6).join(' / ')||'없음'}`,'실제 고객 질문을 소제목으로 쓰고 바로 다음 문단에 간결한 답변과 근거를 제공하세요.');
 add('content','크롤러가 읽을 수 있는 본문','AEO',body.length>=500,20,`정적 HTML 본문 ${body.length}자`,'핵심 제품·서비스 설명을 서버가 반환하는 HTML에 포함하세요.');
 add('trust','문의·회사 정보 단서','AEO',/문의|연락|회사|사업자|contact|about/i.test(body),10,'본문 내 회사·문의 관련 단어 존재 여부 (신뢰성 검증 아님)','담당 조직, 문의처와 출처를 쉽게 찾을 수 있게 제공하세요.','P2');
 add('lang','언어 정보','AEO',!!$('html').attr('lang'),10,$('html').attr('lang')||'lang 없음','페이지 언어에 맞는 html lang을 지정하세요.','P2');
 return {url,title,description,h1,status,checks,textExcerpt:body.slice(0,1800)};
}
export function score(pages:PageReport[],category:Check['category']){const c=pages.flatMap(p=>p.checks.filter(c=>c.category===category));return c.length?Math.round(c.reduce((n,c)=>n+(c.passed?c.weight:0),0)/c.reduce((n,c)=>n+c.weight,0)*100):0;}
export function strategy(name:string,audience:string,report:Report){const failures=report.pages.flatMap(p=>p.checks.filter(c=>!c.passed).map(c=>({...c,url:p.url})));const groups=[...new Map(failures.map(c=>[c.id,c])).values()].sort((a,b)=>a.priority.localeCompare(b.priority));return `# ${name} 검색 개선 실행안\n\n대상 고객: ${audience||'미입력'}\n근거: ${report.startedAt} · 실제 검사 ${report.pages.length}페이지\nSEO ${report.seo}/100 · AEO 준비도 ${report.aeo}/100\n\n## 1주차 · 접근과 검색 의도\n${groups.filter(c=>c.category==='SEO').map(c=>`- [${c.priority}] ${c.name}: ${c.action}\n  근거: ${c.evidence} (${c.url})`).join('\n')||'- 탐지된 SEO 실패 항목 없음. Search Console의 색인 상태와 실제 검색 유입을 확인하세요.'}\n\n## 2주차 · 답변과 신뢰 근거\n${groups.filter(c=>c.category==='AEO').map(c=>`- [${c.priority}] ${c.name}: ${c.action}\n  근거: ${c.evidence} (${c.url})`).join('\n')||'- 질문별 답변 품질과 출처를 수동 검토하세요.'}\n\n## 3~4주차 · 효과 검증\n- 수정 후 동일 URL을 재진단하고 이전 점수·근거를 비교합니다.\n- 같은 질문·플랫폼·언어로 실제 AI 답변을 관찰하여 원문과 출처를 기록합니다.\n- 검색 순위·검색량은 별도 데이터가 필요합니다. 준비도 점수를 노출 성과로 해석하지 않습니다.\n\n## 콘텐츠 브리프\n- 고객 질문 → 한 문단의 직접 답변 → 조건 및 예외 → 검증된 출처 → 다음 행동 순서로 작성합니다.\n- 제품 효능·인증·제조 역량은 확인된 사내 자료만 사용합니다.\n- 내부 점검 규칙 기반 실행안이며 LLM 생성 결과가 아닙니다.\n`;}
