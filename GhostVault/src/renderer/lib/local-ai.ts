// @ts-expect-error — local-ai-engine.js is a plain JS file with no types
import LocalAI from './local-ai-engine.js';

export interface LocalAIResult {
  result?: string;
  error?: string;
}

export function localAiProcess(
  mode: string,
  text: string,
  ctx: string
): LocalAIResult {
  try {
    return LocalAI.process(mode, text, ctx) as LocalAIResult;
  } catch (e: unknown) {
    return { error: `LocalAI error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
