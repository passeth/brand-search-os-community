import {ga4MatchesBrand} from './google-domain';

export type GA4WebStream={id:string;url:string;measurementId:string};
export type GoogleLive={property:string;checkedAt:string;windowMinutes:30;streams:GA4WebStream[];activeUsers:number;pageViews:number;events:{name:string;count:number}[]};
export function matchingStreams(streams:GA4WebStream[],domain:string){
 const matches=streams.filter(s=>/^\d+$/.test(s.id)&&ga4MatchesBrand([s.url],domain));
 if(!matches.length)throw new Error('현재 브랜드와 일치하는 GA4 웹 스트림이 없습니다.');
 return matches;
}
export function realtimeRequests(streams:GA4WebStream[]){
 if(!streams.length)throw new Error('측정 스트림이 필요합니다.');
 const dimensionFilter={filter:{fieldName:'streamId',inListFilter:{values:streams.map(s=>s.id)}}};
 return [
  {dimensionFilter,metrics:[{name:'activeUsers'},{name:'screenPageViews'}],limit:1},
  {dimensionFilter,dimensions:[{name:'eventName'}],metrics:[{name:'eventCount'}],limit:100},
 ];
}
