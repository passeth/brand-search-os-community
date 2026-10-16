import {hostname} from './grounding';
export function gscMatchesBrand(site:string,domain:string){
 if(site.startsWith('sc-domain:')){const parent=site.slice(10).toLowerCase(),host=hostname(domain);return host===parent||host.endsWith('.'+parent);}
 try{const a=new URL(site),b=new URL(domain);return a.protocol===b.protocol&&hostname(site)===hostname(domain)&&b.pathname.startsWith(a.pathname);}catch{return false;}
}
export function ga4MatchesBrand(streamUrls:string[],domain:string){return streamUrls.some(url=>hostname(url)===hostname(domain));}
