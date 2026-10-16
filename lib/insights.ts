import type {Brand,Observation,Report} from './types';
import {summarizeObservations} from './monitoring';
import {strategy} from './analyze';

export function improvementOpportunities(rows:Observation[],brand:Brand){
 return summarizeObservations(rows,brand).eligible.filter(o=>!o.mentioned).map(o=>({
  observation:o,competitors:o.measurement!.entities.slice(1).filter(e=>e.count>0).map(e=>e.name),
  citations:o.measurement?.grounding?.sources.filter(s=>o.measurement?.citations?.includes(s.index))??[],
 })).sort((a,b)=>b.competitors.length-a.competitors.length).slice(0,5);
}
export function evidenceStrategy(brand:Brand,report:Report,rows:Observation[],now=new Date()){
 const recent=rows.filter(o=>new Date(o.observed_at).getTime()>=now.getTime()-28*86400000&&new Date(o.observed_at)<=now);
 const named=summarizeObservations(recent,brand,'branded');
 const summary=summarizeObservations(recent,brand),gaps=improvementOpportunities(recent,brand);
 return strategy(brand.name,brand.audience,report)+[
 '\n## 실제 AI 검색 관찰 · 최근 28일',
 `고정 모델 · Google 검색 프로토콜 · 추적 브랜드명이 없는 질문 ${summary.total}개 (질문별 최신 응답).`,
 ...summary.entities.map(e=>`- ${e.name}: 언급 ${e.slots}/${e.total} · 공식 도메인 인용 ${e.citationRate===null?'미측정':`${e.cited}/${e.citationTotal}`} · 도메인 ${e.domains.join(', ')||'미등록'}`),
 `출처 도메인 확인 실패 ${summary.unresolved}개. 확인되지 않은 도메인은 인용으로 귀속하지 않았습니다.`,
 '\n## 브랜드 지정 비교 · 별도 표본',
 `브랜드를 지정한 질문 ${named.total}개. 이 응답은 자연 발견률에 합산하지 않습니다.`,
 ...named.entities.map(e=>`- ${e.name}: 언급 ${e.slots}/${e.total} · 공식 도메인 인용 ${e.citationRate===null?'미측정':`${e.cited}/${e.citationTotal}`}`),
 ...named.eligible.map(o=>`- 비교 근거 ${o.id}: ${o.prompt} · ${o.observed_at}`),
 '\n## 우선순위 · 질문의 빈틈을 콘텐츠로',
 ...(gaps.length?gaps.map((g,i)=>[
 `### ${i+1}. ${g.observation.prompt}`,
 `우선순위: ${g.competitors.length?'P1 · 경쟁사만 언급':'P2 · 추적 브랜드 모두 미언급'}`,
 `관찰 ID: ${g.observation.id} · ${g.observation.observed_at}`,
 `관찰된 경쟁사: ${g.competitors.join(', ')||'없음'}`,
 '담당: 마케팅 초안 → 연구·영업 사실 확인 → 웹 담당 게시',
 '작업: 현재 답변이 사용하는 선정 기준을 정리하고, 자사에 적용되는 확인된 조건·절차·근거 문서를 준비합니다. 답변 첫 문단, 비교 기준표, 조건별 FAQ를 작성합니다.',
 `자사 검토 페이지: ${report.pages.map(p=>p.url).join(', ')}`,
 'AI가 실제 인용한 참고 자료:',
 ...g.citations.slice(0,5).map(s=>`- ${s.title}: ${s.resolvedUrl||s.url}`),
 '검증: 게시 URL과 변경일을 기록하고 같은 질문·모델·비교군으로 최소 2주 반복 측정합니다. 인용 증가의 인과관계는 별도 검토합니다.',
 '주의: 경쟁사 주장이나 AI 답변을 우리 회사의 인증·효능·MOQ·납기 근거로 사용하지 않습니다.',
 ].join('\n')):['- 비교 가능한 검색 응답을 먼저 수집하세요.']),
 '\n## 아직 확보하지 못한 측정',
 '- 검색량·SERP 순위·Google AI Overview는 별도 공급자 연결 전까지 미측정입니다.',
 '- GSC/GA4는 해당 홈페이지의 속성을 확인하고 데이터가 수신되어야 판단할 수 있습니다.',
 '- 소비자 ChatGPT·Perplexity와 Gemini API의 응답은 같은 결과가 아닙니다.',
 ].join('\n');
}
