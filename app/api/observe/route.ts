import {authorize,apiError} from '@/lib/auth';
import {collectObservation} from '@/lib/observe';
import {preflightCollectorCredits,classifyCollectorError} from '@/lib/collector-health';
import {isObservationEngine} from '@/lib/model-config';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request) {
 try {
  const {client}=await authorize(request);
  const {brandId,prompt:inputPrompt,promptId,engine='gemini'}=await request.json();
  if(!isObservationEngine(engine))throw new Error('지원하지 않는 엔진입니다.');
  let prompt=inputPrompt;let promptLanguage:string|undefined;
  if(promptId){
   const saved=await client.from('seo_prompts').select('prompt,language').eq('id',promptId).eq('brand_id',brandId).eq('active',true).single();
   if(saved.error||!saved.data)throw new Error('활성 질문을 찾을 수 없습니다.');
   prompt=saved.data.prompt;promptLanguage=saved.data.language;
  }
  if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>1500)throw new Error('질문을 5~1,500자로 입력하세요.');
  const {data:brand}=await client.from('seo_brands').select('*').eq('id',brandId).single();
  if(!brand)throw new Error('브랜드를 찾을 수 없습니다.');
  if(!brand.language||brand.language==='und'||(promptId&&promptLanguage!==brand.language))throw new Error('사이트 언어와 질문 언어를 확인하세요. 기존 질문은 검토 후 수정 저장해야 합니다.');
  const credits=await preflightCollectorCredits();
  if(!credits.ok)return Response.json({error:credits.error.message,code:credits.error.code},{status:credits.error.status});
  const quota=await client.rpc('seo_reserve_audit');
  if(quota.error||!quota.data)return Response.json({error:'시간당 진단·AI 실행 한도(20회)를 확인하세요.'},{status:429});
  let result;try{result=await collectObservation(brand,prompt,promptId,engine);}catch(e){const safe=classifyCollectorError(e);return Response.json({error:safe.message,code:safe.code},{status:safe.status});}
  const {data,error}=await client.from('seo_observations').insert(result).select().single();
  if(error)throw new Error('응답 저장 실패');
  return Response.json({observation:data});
 } catch(e) {return apiError(e);}
}
