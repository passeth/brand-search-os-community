import {authorize,apiError} from '@/lib/auth';
import {collectObservation} from '@/lib/observe';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request) {
 try {
  const {client}=await authorize(request);
  const {brandId,prompt:inputPrompt,promptId}=await request.json();
  let prompt=inputPrompt;
  if(promptId){
   const saved=await client.from('seo_prompts').select('prompt').eq('id',promptId).eq('brand_id',brandId).eq('active',true).single();
   if(saved.error||!saved.data)throw new Error('활성 질문을 찾을 수 없습니다.');
   prompt=saved.data.prompt;
  }
  if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>1500)throw new Error('질문을 5~1,500자로 입력하세요.');
  const {data:brand}=await client.from('seo_brands').select('*').eq('id',brandId).single();
  if(!brand)throw new Error('브랜드를 찾을 수 없습니다.');
  const quota=await client.rpc('seo_reserve_audit');
  if(quota.error||!quota.data)return Response.json({error:'시간당 진단·AI 실행 한도(20회)를 확인하세요.'},{status:429});
  const result=await collectObservation(brand,prompt,promptId);
  const {data,error}=await client.from('seo_observations').insert(result).select().single();
  if(error)throw new Error('응답 저장 실패');
  return Response.json({observation:data});
 } catch(e) {return apiError(e);}
}
