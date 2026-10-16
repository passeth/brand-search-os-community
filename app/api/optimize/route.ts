import {authorize,apiError} from '@/lib/auth';import {optimizeText} from '@/lib/workflow';
import {fetchPublic,safeURL} from '@/lib/safe-fetch';import robotsParser from 'robots-parser';import * as cheerio from 'cheerio';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{const {client}=await authorize(request);const {brandId,url,text}=await request.json();
 const {data:brand}=await client.from('seo_brands').select('id').eq('id',brandId).single();if(!brand)throw new Error('브랜드를 선택하세요.');
 let content=typeof text==='string'?text.trim():'';let source='';
 if(url){const quota=await client.rpc('seo_reserve_audit');if(quota.error||!quota.data)throw new Error('시간당 실행 한도를 확인하세요.');const u=safeURL(url);
 async function allowed(raw:string){const origin=new URL(raw).origin;const r=await fetchPublic(origin+'/robots.txt');if(r.status!==200&&r.status!==404)throw new Error('robots.txt 확인 실패');if(r.status===200&&r.contentType.includes('html'))throw new Error('robots.txt를 확인할 수 없습니다.');if(robotsParser(origin+'/robots.txt',r.status===200?r.body:'').isAllowed(raw,'BrandSearchOS')===false)throw new Error('robots.txt에서 수집을 제한합니다.');}
 await allowed(u.href);const r=await fetchPublic(u.href);if(r.url!==u.href)await allowed(r.url);if(r.status!==200||!r.contentType.includes('html'))throw new Error('공개 HTML 페이지를 읽을 수 없습니다.');const $=cheerio.load(r.body);$('script,style,nav,footer,header').remove();$('h1,h2,h3').each((_,e)=>{$(e).replaceWith('\n'+ '#'.repeat(Number(e.tagName.slice(1)))+' '+$(e).text()+'\n');});$('a[href]').each((_,e)=>{try{const href=new URL($(e).attr('href')!,r.url);if(href.protocol==='https:')$(e).append(' ('+href.href+')');}catch{}});$('p,li,br,div').append('\n');content=($('main').text()||$('body').text()).replace(/\n\s*\n/g,'\n\n').trim().slice(0,100000);source=r.url;
 }
 if(!content||content.length>100000)throw new Error('1~100,000자의 텍스트를 입력하세요.');const result=optimizeText(content);const {data,error}=await client.from('seo_optimizations').insert({brand_id:brandId,source_url:source,content,result}).select().single();if(error)throw new Error('검사 저장 실패');return Response.json(data);
 }catch(e){return apiError(e);}}
