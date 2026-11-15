export const observationEngines={gemini:{model:'google/gemini-2.5-flash-lite',protocol:'google-search-v1',platform:'Gemini API · Google 검색'},openai:{model:'openai/gpt-4.1-mini',protocol:'openai-web-search-v1',platform:'OpenAI GPT API · 웹 검색'}} as const;
export type ObservationEngine=keyof typeof observationEngines;
export const observationModel=observationEngines.gemini.model;
export const observationProtocol=observationEngines.gemini.protocol;
export const observationPlatform=observationEngines.gemini.platform;
export function isObservationEngine(v:unknown):v is ObservationEngine{return v==='gemini'||v==='openai';}
