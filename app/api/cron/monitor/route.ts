import {timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/supabase';
import {collectObservation} from '@/lib/observe';
import {observationProtocol,observationModel} from '@/lib/model-config';
import type {MonitorRun} from '@/lib/monitoring';

import {preflightCollectorCredits,classifyCollectorError} from '@/lib/collector-health';
export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';

export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  const received=Buffer.from(request.headers.get('authorization')??'');
  const expected=Buffer.from(`Bearer ${secret??''}`);
  if(!secret||received.length!==expected.length||!timingSafeEqual(received,expected))return Response.json({error:'Unauthorized'},{status:401});
  const client=db();
  const reaped=await client.rpc('seo_reap_monitor_runs',{p_secret:secret});
  if(reaped.error)return Response.json({error:'정리 작업 실패'},{status:500});
  const credits=await preflightCollectorCredits();
  if(!credits.ok)return Response.json({claimed:0,reaped:reaped.data,error:credits.error.message,code:credits.error.code},{status:credits.error.status});
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
      } catch(e) {
        const saved=await client.rpc('seo_finish_monitor_run',{p_secret:secret,p_run_id:job.id,p_error:classifyCollectorError(e).message});
        if(saved.error||saved.data!==true)unrecorded++;
        failed++;
      }
    }
  }));
  return Response.json({claimed:jobs.length,succeeded,failed,unrecorded},{status:unrecorded?500:failed?502:200});
}
