import {generateText} from 'ai';
// Configure model access and billing in your own AI Gateway project.
import {observationModel} from './model-config';
export {observationModel} from './model-config';
export async function askModel(prompt:string,instructions?:string,maxOutputTokens=2200){return generateText({model:observationModel,prompt,instructions,maxOutputTokens,maxRetries:0,abortSignal:AbortSignal.timeout(45000)});}
export {brandMention} from './monitoring';
