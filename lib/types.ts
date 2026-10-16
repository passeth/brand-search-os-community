export type Brand={id:string;name:string;domain:string;audience:string;keywords:string[];competitors:string[];competitor_domains?:Record<string,string[]>};
export type Check={id:string;name:string;category:'SEO'|'AEO';passed:boolean;weight:number;evidence:string;action:string;priority:'P0'|'P1'|'P2'};
export type PageReport={url:string;title:string;description:string;h1:string[];status:number;checks:Check[];textExcerpt:string};
export type Report={version:string;startedAt:string;pages:PageReport[];errors:{url:string;message:string}[];robots:string;sitemap:string;seo:number;aeo:number;limitations:string[]};
export type Audit={id:string;brand_id:string;seo_score:number;aeo_score:number;report:Report;created_at:string};
export type Task={id:string;brand_id:string;title:string;detail:string;priority:'P0'|'P1'|'P2';status:'todo'|'doing'|'done';category:string;evidence:string};
export type Observation={id:string;brand_id:string;prompt:string;platform:string;answer:string;source_url:string;mentioned:boolean;observed_at:string;prompt_id?:string|null;source_kind?:'manual'|'model_api';model?:string|null;measurement?:import('./monitoring').Measurement|null;usage?:Record<string,unknown>};
