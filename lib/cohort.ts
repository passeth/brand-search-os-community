import type {Brand} from './types';
export function siteCohort(brand:Pick<Brand,'id'|'domain'|'language'>){const u=new URL(brand.domain);return {site:brand.id,origin:u.origin,path:u.pathname.replace(/\/$/,'')||'/',language:brand.language??'und'};}
export function cohortKey(brand:Pick<Brand,'id'|'domain'|'language'>){return JSON.stringify(siteCohort(brand));}
