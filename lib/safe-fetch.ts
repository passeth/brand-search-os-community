import https from 'node:https';
import {lookup} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
export function publicAddress(address:string){try{const ip=ipaddr.process(address);return ip.range()==='unicast';}catch{return false;}}
export function safeURL(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))throw new Error('공개 HTTPS 주소만 분석할 수 있습니다.');if(u.hostname==='localhost'||u.hostname.endsWith('.local'))throw new Error('내부 주소는 분석할 수 없습니다.');u.hash='';return u;}
export async function fetchPublic(raw:string,redirects=0):Promise<{url:string;status:number;body:string;contentType:string;headers:Record<string,string|string[]|undefined>}>{
 const u=safeURL(raw);const addresses=await lookup(u.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('공개 인터넷 주소가 아닙니다.');
 const address=addresses[0];
 const response=await new Promise<{status:number;body:string;headers:Record<string,string|string[]|undefined>}>((resolve,reject)=>{
 const req=https.request(u,{method:'GET',headers:{'User-Agent':'BrandSearchOS/1.0 (+SEO site audit)','Accept':'text/html,text/plain,application/xml','Accept-Encoding':'identity'},lookup:((_host:unknown,opts:{all?:boolean},cb:Function)=>opts.all?cb(null,[address]):cb(null,address.address,address.family)) as never},res=>{
 let size=0;const chunks:Buffer[]=[];res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>2_000_000){req.destroy(new Error('페이지가 2MB 제한을 초과했습니다.'));return;}chunks.push(chunk);});res.on('end',()=>resolve({status:res.statusCode||0,body:Buffer.concat(chunks).toString('utf8'),headers:res.headers}));res.on('error',reject);
 });req.on('error',reject);req.setTimeout(12000,()=>req.destroy(new Error('페이지 응답 시간 초과')));const deadline=setTimeout(()=>req.destroy(new Error('전체 요청 시간 초과')),15000);req.on('close',()=>clearTimeout(deadline));req.end();
 });
 if([301,302,303,307,308].includes(response.status)&&response.headers.location){if(redirects>=4)throw new Error('리다이렉트 횟수 초과');return fetchPublic(new URL(String(response.headers.location),u).href,redirects+1);}
 return {...response,url:u.href,contentType:String(response.headers['content-type']||'')};
}
