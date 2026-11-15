import {generateText} from 'ai';
import {openai} from '@ai-sdk/openai';
import {cohortKey} from './cohort';
import {observationEngines,observationInstructions,type ObservationEngine} from './model-config';
import {google} from '@ai-sdk/google';
import {parseGrounding,resolveGrounding,comparisonKey,assertCompleteAnswer,parseOpenAISources} from './grounding';
import {measureAnswer} from './monitoring';
import type {Brand} from './types';

export async function collectObservation(brand:Brand,prompt:string,promptId?:string,engine:ObservationEngine='gemini') {
  const config=observationEngines[engine];
  if(!brand.language||brand.language==='und')throw new Error('사이트 언어를 먼저 선택하세요.');
  // The target and competitors are deliberately absent from the model instructions.
  const result=await generateText({model:config.model,prompt,instructions:observationInstructions(brand.language,engine),tools:engine==='gemini'?{google_search:google.tools.googleSearch({})}:{web_search:openai.tools.webSearch({})},maxOutputTokens:2200,maxRetries:0,abortSignal:AbortSignal.timeout(40000)});
  assertCompleteAnswer(result.text,result.finishReason);
  const grounding=await resolveGrounding(engine==='gemini'?parseGrounding(result.providerMetadata):parseOpenAISources(result.sources,result.content));
  const measurement={...measureAnswer(result.text,prompt,brand),version:'grounding-v2' as const,quality:'complete' as const,protocol:config.protocol,engine,cohort:cohortKey(brand),comparisonKey:comparisonKey(brand),webSearch:grounding.queries.length>0||grounding.sources.length>0,grounding,citations:grounding.citationMetadata?[...new Set(grounding.supports.flatMap(s=>s.sourceIndices))]:null};
  return {brand_id:brand.id,prompt_id:promptId??null,prompt,platform:config.platform,answer:result.text,source_url:'',mentioned:measurement.mentioned,source_kind:'model_api',model:config.model,usage:result.usage,measurement};
}
