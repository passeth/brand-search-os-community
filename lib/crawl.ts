import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import {fetchPublic,safeURL} from './safe-fetch';
import {inspectHTML,score} from './analyze';
import type {Report} from './types';
export async function auditSite(raw:string):Promise<Report>{
 const start=safeURL(raw);const report:Report={version:'1.0',startedAt:new Date().toISOString(),pages:[],errors:[],robots:'',sitemap:'',seo:0,aeo:0,limitations:['최대 5개 동일 호스트 페이지의 정적 HTML을 검사합니다.','SEO/AEO 점수는 내부 가중 체크리스트이며 검색 순위·AI 인용률이 아닙니다.','JavaScript 렌더링, Core Web Vitals, 실제 색인, 검색량 및 AI 응답은 이 검사에 포함되지 않습니다.']};
 const rules=new Map<string,ReturnType<typeof robotsParser>>();
 async function allowed(url:string){const origin=new URL(url).origin;if(!rules.has(origin)){const r=await fetchPublic(origin+'/robots.txt');if(r.status!==200&&r.status!==404)throw new Error(`robots.txt 확인 실패 (HTTP ${r.status})`);if(r.status===200&&r.contentType.includes('html'))throw new Error('robots.txt가 HTML을 반환하여 접근 정책을 확인할 수 없습니다.');rules.set(origin,robotsParser(origin+'/robots.txt',r.status===200?r.body:''));report.robots+=`${origin}: HTTP ${r.status}. `;}return rules.get(origin)!.isAllowed(url,'BrandSearchOS')!==false;}
 const queue=[start.href];const seen=new Set<string>();const deadline=Date.now()+110000;
 while(queue.length&&report.pages.length<5&&seen.size<10&&Date.now()<deadline){const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);try{
 if(!await allowed(url)){report.errors.push({url,message:'robots.txt에서 크롤링을 허용하지 않습니다.'});continue;}
 const r=await fetchPublic(url);if(new URL(r.url).hostname!==start.hostname&&new URL(r.url).hostname!==`www.${start.hostname}`&&start.hostname!==`www.${new URL(r.url).hostname}`)throw new Error('다른 사이트로 이동하는 리다이렉트는 분석하지 않습니다.');
 if(r.url!==url&&!await allowed(r.url))throw new Error('최종 URL이 robots.txt에서 차단되었습니다.');
 if(!r.contentType.includes('text/html'))throw new Error(`HTML이 아닌 응답: ${r.contentType}`);
 if(report.pages.some(p=>p.url===r.url))continue;seen.add(r.url);
 report.pages.push(inspectHTML(r.body,r.url,r.status,String(r.headers['x-robots-tag']||'')));
 if(r.status===200){const $=cheerio.load(r.body);$('a[href]').each((_,el)=>{try{const u=new URL($(el).attr('href')!,r.url);u.hash='';if(u.origin===new URL(r.url).origin&&(start.pathname==='/'||u.pathname===start.pathname||u.pathname.startsWith(start.pathname.replace(/\/$/,'')+'/'))&&u.protocol==='https:'&&!u.search&&!/\.(pdf|jpg|png|zip|webp|mp4)$/i.test(u.pathname)&&!/(logout|signout|delete|cart|checkout|login|admin)/i.test(u.pathname)&&!seen.has(u.href)&&!queue.includes(u.href)&&queue.length<20)queue.push(u.href);}catch{}});}
 }catch(e){report.errors.push({url,message:e instanceof Error?e.message:'알 수 없는 오류'});}}
 try{const url=start.origin+'/sitemap.xml';if(await allowed(url)){const r=await fetchPublic(url);report.sitemap=`HTTP ${r.status} · ${r.status===200&&/<(?:urlset|sitemapindex)[\s>]/.test(r.body)?'XML sitemap 확인':'유효 XML sitemap 미확인'}`;}else report.sitemap='robots.txt 차단';}catch{report.sitemap='확인 실패';}
 if(!report.pages.length)throw new Error(report.errors.map(e=>e.message).join(' / ')||'분석할 수 있는 페이지가 없습니다.');report.seo=score(report.pages,'SEO');report.aeo=score(report.pages,'AEO');return report;
}
