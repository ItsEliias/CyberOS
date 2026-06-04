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

async function callAnthropic(objective: string, apiKey: string): Promise<AiGenerateResult> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Generate 5-8 cybersecurity assessment steps for: ${objective}` }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? res.statusText }
  }
  const data = await res.json() as { content?: { type: string; text: string }[] }
  const text = data.content?.find(c => c.type === 'text')?.text ?? ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return { ok: false, error: 'Could not parse JSON from response' }
  const steps = JSON.parse(jsonMatch[0]) as Partial<PlaybookStep>[]
  return { ok: true, steps }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:generate-steps', async (_e, objective: string, apiKey: string): Promise<AiGenerateResult> => {
    if (!apiKey?.trim())    return { ok: false, error: 'No API key provided' }
    if (!objective?.trim()) return { ok: false, error: 'No objective provided' }
    try {
      return await callAnthropic(objective.trim(), apiKey.trim())
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })
}
