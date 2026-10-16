import {createClient} from '@supabase/supabase-js';
export function db(token?:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) throw new Error('Supabase 연결 환경변수가 없습니다.');
 return createClient(url,key,token?{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}}:undefined);
}
