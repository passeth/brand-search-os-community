import type {Brand} from './types';

export type SearchSource={index:number;url:string;title:string;resolvedUrl:string|null;domain:string|null};
export type CitationSupport={text:string;start:number|null;end:number|null;sourceIndices:number[]};
export type Grounding={provider:string;queries:string[];sources:SearchSource[];supports:CitationSupport[];citationMetadata:boolean;searchEntryPoint:string|null};
type Dict=Record<string,unknown>;
const object=(v:unknown):Dict=>v&&typeof v==='object'&&!Array.isArray(v)?v as Dict:{};
export function httpsURL(value:unknown):string|null {try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function hostname(value:string){try{return new URL(value.includes('://')?value:'https://'+value).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}}
export function domainMatches(url:string,domain:string){const host=hostname(url),expected=hostname(domain);return !!expected&&(host===expected||host.endsWith('.'+expected));}
export function comparisonKey(brand:Pick<Brand,'name'|'competitors'|'domain'|'competitor_domains'>){return JSON.stringify([brand.name,...brand.competitors,hostname(brand.domain),Object.entries(brand.competitor_domains??{}).sort().map(([name,domains])=>[name,domains.map(hostname).sort()])]);}
export function entityDomains(brand:Brand,name:string){return name===brand.name?[hostname(brand.domain)]:(brand.competitor_domains?.[name]??[]).map(hostname).filter(Boolean);}
export function sourceBelongs(source:SearchSource,domains:string[]){return !!source.resolvedUrl&&domains.some(d=>domainMatches(source.resolvedUrl!,d));}

// Provider metadata is evidence. URLs written by the model itself are never citations.
export function parseGrounding(metadata:unknown):Grounding {
 const root=object(metadata),provider=['google','googleVertex','vertex'].find(k=>object(root[k]).groundingMetadata!=null)??'unknown';
 const g=object(object(root[provider]).groundingMetadata);
 const chunks=Array.isArray(g.groundingChunks)?g.groundingChunks:[];
 const sources=chunks.flatMap((chunk,index)=>{const web=object(object(chunk).web),url=httpsURL(web.uri);if(!url)return [];const redirect=hostname(url)==='vertexaisearch.cloud.google.com';return [{index,url,title:typeof web.title==='string'?web.title:'출처',resolvedUrl:redirect?null:url,domain:redirect?null:hostname(url)}];});
 const indices=new Set(sources.map(s=>s.index));
 const supports=(Array.isArray(g.groundingSupports)?g.groundingSupports:[]).flatMap(s=>{const raw=object(s),segment=object(raw.segment),refs=Array.isArray(raw.groundingChunkIndices)?raw.groundingChunkIndices.filter((i):i is number=>Number.isInteger(i)&&indices.has(i as number)):[];if(!refs.length)return [];return [{text:typeof segment.text==='string'?segment.text:'',start:typeof segment.startIndex==='number'?segment.startIndex:null,end:typeof segment.endIndex==='number'?segment.endIndex:null,sourceIndices:[...new Set(refs)]}];});
 return {provider,queries:Array.isArray(g.webSearchQueries)?g.webSearchQueries.filter((q):q is string=>typeof q==='string'):[],sources,supports,citationMetadata:Array.isArray(g.groundingSupports),searchEntryPoint:typeof object(g.searchEntryPoint).renderedContent==='string'?object(g.searchEntryPoint).renderedContent as string:null};
}

// Only contact Google's known redirect service; never fetch the destination page.
// Unresolved redirects remain unknown, never attributed from an untrusted title.
export async function resolveGrounding(grounding:Grounding):Promise<Grounding>{
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(6,grounding.sources.length)},async()=>{while(cursor<grounding.sources.length){const source=grounding.sources[cursor++];if(source.resolvedUrl)continue;try{const u=new URL(source.url);if(u.hostname!=='vertexaisearch.cloud.google.com'||!u.pathname.startsWith('/grounding-api-redirect/'))continue;const response=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(4000)});const location=httpsURL(response.headers.get('location'));await response.body?.cancel();if(response.status>=300&&response.status<400&&location&&hostname(location)!==u.hostname){source.resolvedUrl=location;source.domain=hostname(location);}}catch{/* original URL remains available */}}}));
 return grounding;
}

export function assertCompleteAnswer(text:string,finishReason:string) {
 if(!text.trim()||finishReason==='length'||finishReason==='error'||finishReason==='content-filter'||/[ \t]{100,}/.test(text))throw new Error('AI 답변이 완성되지 않아 지표에 반영하지 않았습니다. 다시 측정해 주세요.');
}
