import type {Observation} from '@/lib/types';
export function ObservationEvidence({observation:o}:{observation:Observation}){
 const g=o.measurement?.grounding;
 return <div className="observation-evidence">{o.measurement?.quality==='incomplete'&&<p className="notice">미완성 응답 · 통계 제외. 원문은 확인용으로 보존했습니다.</p>}<pre className="answer">{o.answer}</pre>{g?<>
  <div className="chips"><span>언급 M: {o.measurement!.entities.filter(e=>e.count).map(e=>e.name.split('|')[0]).join(', ')||'없음'}</span><span>검색 출처 S: {g.sources.length}</span><span>인용 출처 C: {o.measurement?.citations===null?'메타데이터 없음':o.measurement?.citations?.length??0}</span></div>
  <p className="method-note">이름 언급, 검색 자료, 답변 문장과 연결된 인용을 구분합니다. 공식 도메인 귀속은 확인된 URL로만 판정하며, 미해결 URL은 미확인으로 남깁니다.</p>
  <details><summary>검색어 {g.queries.length}개</summary><ul>{g.queries.map((q,i)=><li key={i}>{q}</li>)}</ul></details>
  <details open><summary>출처 URL과 인용 문장</summary>{g.sources.map(s=><article className="source-evidence" key={s.index}><b>[{s.index+1}] {o.measurement?.citations?.includes(s.index)?'인용 C':'검색 자료 S'} · {s.domain||'도메인 미확인'}</b><a href={s.resolvedUrl||s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.resolvedUrl||'Google 리다이렉트 원본 보존'}</small>{g.supports.filter(c=>c.sourceIndices.includes(s.index)).map((c,i)=><blockquote key={i}>{c.text||'제공자가 문장 텍스트를 반환하지 않았습니다.'}</blockquote>)}</article>)}</details>
  {g.searchEntryPoint&&<iframe className="search-attribution" title="Google 검색 추천" sandbox="allow-popups" srcDoc={'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data: https:;">'+g.searchEntryPoint}/>}
 </>:<p className="method-note">이 관찰은 웹 검색 출처를 수집하지 않았습니다. 과거 기록은 검색 수집 지표에 합산하지 않습니다.</p>}</div>;
}
