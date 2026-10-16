import {timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/supabase';
import {collectObservation} from '@/lib/observe';
import {observationProtocol,observationModel} from '@/lib/model-config';
import type {MonitorRun} from '@/lib/monitoring';

export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';

export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  const received=Buffer.from(request.headers.get('authorization')??'');
  const expected=Buffer.from(`Bearer ${secret??''}`);
  if(!secret||received.length!==expected.length||!timingSafeEqual(received,expected))return Response.json({error:'Unauthorized'},{status:401});
  const client=db();
  const claim=await client.rpc('seo_claim_monitor_runs',{p_secret:secret});
  if(claim.error)return Response.json({error:'수집 작업을 예약하지 못했습니다.'},{status:500});
  const jobs=(claim.data??[]) as MonitorRun[];
  let succeeded=0,failed=0,unrecorded=0,cursor=0;
  // At most 20/day; four workers × five bounded calls fits the 300s route budget.
  await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
    while(cursor<jobs.length) {
      const job=jobs[cursor++];
      try {
        if(job.model!==observationModel||job.protocol!==observationProtocol)throw new Error('수집 프로토콜 불일치');
        const result=await collectObservation(job.brand_snapshot,job.prompt,job.prompt_id);
        const saved=await client.rpc('seo_finish_monitor_run',{p_secret:secret,p_run_id:job.id,p_answer:result.answer,p_measurement:result.measurement,p_usage:result.usage});
        if(saved.error||saved.data!==true){unrecorded++;continue;}
        succeeded++;
      } catch {
        const saved=await client.rpc('seo_finish_monitor_run',{p_secret:secret,p_run_id:job.id,p_error:'모델 응답을 수집하지 못했습니다. AI 연결·사용량 한도 또는 시간 초과를 확인하세요.'});
        if(saved.error||saved.data!==true)unrecorded++;
        failed++;
      }
    }
  }));
  return Response.json({claimed:jobs.length,succeeded,failed,unrecorded},{status:unrecorded?500:failed?502:200});
}
