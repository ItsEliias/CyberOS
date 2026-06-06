// PlaybookStudio — aiHandler.ts
// IPC handler for AI step generation via Anthropic API

import { ipcMain } from 'electron'
import type { PlaybookStep } from '../shared/types'

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const AI_MODEL          = 'claude-haiku-4-5-20251001'
const MAX_TOKENS        = 2048

const SYSTEM_PROMPT = `You are a cybersecurity expert. Generate a JSON array of playbook steps for the given objective.
Each step must be an object with: title (string), description (string), commands (string[]), notes (string), stepType ("action"|"command"|"verification"|"documentation"|"decision"), category ("recon"|"enum"|"exploit"|"post"|"privesc"|"loot"|"report").
Return ONLY valid JSON array, no markdown, no explanation.`

interface AiGenerateResult {
  ok: boolean
  error?: string
  steps?: Partial<PlaybookStep>[]
}

// Bound by the Anthropic prompt-token budget; longer objectives are usually
// pasted error logs or screenshots-as-text that don't help the model.
const MAX_OBJECTIVE_LEN = 4000
const FETCH_TIMEOUT_MS  = 30_000

async function callAnthropic(objective: string, apiKey: string): Promise<AiGenerateResult> {
  // AbortController gives us a hard timeout. Without it a slow API response
  // could hang the renderer's `await` indefinitely, making the UI feel dead.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Generate 5-8 cybersecurity assessment steps for: ${objective}` }],
      }),
      signal: ctrl.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { ok: false, error: `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s` }
    }
    return { ok: false, error: (e as Error).message }
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? res.statusText }
  }
  const data = await res.json() as { content?: { type: string; text: string }[] }
  const text = data.content?.find(c => c.type === 'text')?.text ?? ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return { ok: false, error: 'Could not parse JSON from response' }
  let steps: Partial<PlaybookStep>[]
  try {
    steps = JSON.parse(jsonMatch[0]) as Partial<PlaybookStep>[]
  } catch (e) {
    // Previously this would surface as an unhandled exception, caught only
    // by the outer try/catch and surfaced as a generic JS error string.
    return { ok: false, error: `Model returned malformed JSON: ${(e as Error).message}` }
  }
  if (!Array.isArray(steps)) {
    return { ok: false, error: 'Model returned a non-array payload' }
  }
  return { ok: true, steps }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:generate-steps', async (_e, objective: unknown, apiKey: unknown): Promise<AiGenerateResult> => {
    // Validate at the IPC boundary so a renderer bug can't crash the main process.
    if (typeof apiKey    !== 'string' || !apiKey.trim())    return { ok: false, error: 'No API key provided' }
    if (typeof objective !== 'string' || !objective.trim()) return { ok: false, error: 'No objective provided' }
    if (objective.length > MAX_OBJECTIVE_LEN) {
      return { ok: false, error: `Objective is too long (${objective.length} chars; max ${MAX_OBJECTIVE_LEN})` }
    }
    try {
      return await callAnthropic(objective.trim(), apiKey.trim())
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })
}
