import {createGateway} from 'ai';

const failures = {
  credits_exhausted: {status:402,message:'AI Gateway 잔액이 0 이하라 수집을 중단했습니다. Vercel AI Gateway에서 크레딧을 충전한 뒤 다시 실행하세요.'},
  credits_unavailable: {status:503,message:'AI Gateway 잔액을 확인하지 못해 수집을 중단했습니다. Gateway 인증·연결·크레딧 상태를 확인한 뒤 다시 실행하세요.'},
  authentication: {status:503,message:'AI 수집 인증에 실패했습니다. 서버의 AI Gateway 인증 설정과 접근 권한을 확인하세요.'},
  rate_limit: {status:429,message:'AI 제공자의 사용량 한도에 도달했습니다. Gateway 및 제공자의 한도를 확인한 뒤 나중에 실행하세요.'},
  timeout: {status:504,message:'AI 수집 응답 시간이 초과되었습니다. 제공자 상태를 확인한 뒤 다시 실행하세요.'},
  model_configuration: {status:502,message:'수집 모델 또는 검색 프로토콜 설정이 맞지 않습니다. 모델 접근 권한과 수집 설정을 확인하세요.'},
  incomplete_answer: {status:502,message:'AI 답변이 완성되지 않아 저장하지 않았습니다. 제공자 상태를 확인한 뒤 다시 측정하세요.'},
  invalid_search: {status:502,message:'검색어 형식이 유효하지 않아 저장하지 않았습니다. 질문과 검색 설정을 확인한 뒤 다시 측정하세요.'},
  provider_unavailable: {status:502,message:'AI 제공자 연결 또는 응답에 문제가 있습니다. Gateway 및 제공자 상태를 확인하세요.'},
  collection_failed: {status:502,message:'AI 응답을 수집하지 못했습니다. Gateway 연결·모델 설정·사용량 한도를 확인하세요.'},
  claim_failed: {status:500,message:'수집 작업을 예약하지 못했습니다. 데이터베이스 연결과 작업 예약 설정을 확인하세요.'},
  storage_failed: {status:500,message:'수집 결과 저장을 확인하지 못했습니다. 실행 기록과 데이터베이스 상태를 확인하세요. 자동 재시도하지 않았습니다.'},
} as const;
export type CollectorErrorCode = keyof typeof failures;
export type SafeCollectorError = {code:CollectorErrorCode;status:number;message:string};
export function collectorError(code:CollectorErrorCode):SafeCollectorError {
  return {code,...failures[code]};
}

// Read only data properties: never stringify errors, invoke getters, or copy provider payloads.
function field(value:unknown,key:string):unknown {
  if(!value || typeof value!=='object')return undefined;
  try {return Object.getOwnPropertyDescriptor(value,key)?.value;} catch {return undefined;}
}

function nativeExceptionName(value:unknown):unknown {
  try {return value instanceof DOMException?Object.getOwnPropertyDescriptor(DOMException.prototype,'name')?.get?.call(value):undefined;}
  catch {return undefined;}
}

/** Accept only finite decimal balances, not Number coercions such as null, hex or whitespace. */
export function parseGatewayBalance(response:unknown):number|null {
  const raw=field(response,'balance');
  if(typeof raw!=='number' && (typeof raw!=='string'||!/^[-+]?\d+(?:\.\d+)?$/.test(raw.trim())))return null;
  const value=Number(typeof raw==='string'?raw.trim():raw);
  return Number.isFinite(value)?value:null;
}

/** Fixed allowlisted output; raw messages, bodies, headers, URLs and credentials never leave here. */
export function classifyCollectorError(error:unknown):SafeCollectorError {
  let current=error, fallback:CollectorErrorCode='collection_failed';
  const seen=new Set<unknown>();
  for(let depth=0;current && depth<5 && !seen.has(current);depth++) {
    seen.add(current);
    const status=field(current,'statusCode')??field(current,'status');
    const name=field(current,'name')??nativeExceptionName(current), code=field(current,'code');
    if(status===402||code==='insufficient_credits')return collectorError('credits_exhausted');
    if(status===401||status===403||name==='GatewayAuthenticationError'||name==='GatewayForbiddenError')return collectorError('authentication');
    if(status===429||name==='GatewayRateLimitError'||code==='insufficient_quota')return collectorError('rate_limit');
    if(status===408||status===504||name==='TimeoutError'||name==='AbortError'||code==='ETIMEDOUT'||code==='ABORT_ERR')return collectorError('timeout');
    if(status===400||status===404||name==='GatewayModelNotFoundError'||name==='GatewayInvalidRequestError')return collectorError('model_configuration');
    if(typeof status==='number' && status>=500 && status<=599)fallback='provider_unavailable';
    if(code==='ECONNRESET'||code==='ENOTFOUND'||code==='ECONNREFUSED')fallback='provider_unavailable';
    // These are exact local validation messages, never arbitrary provider text or substrings.
    const message=field(current,'message');
    if(message==='AI 답변이 완성되지 않아 지표에 반영하지 않았습니다. 다시 측정해 주세요.')return collectorError('incomplete_answer');
    if(message==='검색어에 유니코드 이스케이프가 반환되어 유효한 관찰로 저장하지 않았습니다. 원문 질문으로 다시 측정하세요.')return collectorError('invalid_search');
    current=field(current,'cause');
  }
  return collectorError(fallback);
}

// getCredits is a read-only metadata call, not generation. Bound the transport, with no retries.
async function getGatewayCredits():Promise<unknown> {
  const gateway=createGateway({fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)})});
  return gateway.getCredits();
}
export type CreditPreflight = {ok:true;balance:number}|{ok:false;error:SafeCollectorError};
export async function preflightCollectorCredits(getCredits:()=>Promise<unknown>=getGatewayCredits):Promise<CreditPreflight> {
  try {
    const balance=parseGatewayBalance(await getCredits());
    if(balance===null)return {ok:false,error:collectorError('credits_unavailable')};
    if(balance<=0)return {ok:false,error:collectorError('credits_exhausted')};
    return {ok:true,balance};
  } catch {
    return {ok:false,error:collectorError('credits_unavailable')};
  }
}
