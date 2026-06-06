// PlaybookStudio — ipc-handlers.ts
// Playbook, evidence, runs, and cross-app IPC handlers

import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import { BUILTIN_PLAYBOOKS } from '../shared/builtinPlaybooks'
import type { Playbook, PlaybookRun, PlaybookStep } from '../shared/types'

export interface AppRefs {
  customPlaybooks: Playbook[]
  runs: PlaybookRun[]
  getWindow: () => BrowserWindow | null
  readConfig: () => Record<string, unknown>
  writeConfig: (patch: Record<string, unknown>) => void
  updateStatus: (activePlaybook?: string, progress?: string) => void
  uid: () => string
  // Persist custom playbooks / runs to disk. Without these, every mutation
  // (save / delete / clone / run-start / run-update / run-complete) lives in
  // memory only and is lost when the app closes.
  savePlaybooks: () => void
  saveRuns: () => void
}

const MAX_VERSIONS = 10

const REPORT_FORGE_DIR = path.join(
  os.homedir(), 'Library', 'Application Support', 'ReportForge', 'pending'
)

// ─── Playbook handlers ────────────────────────────────────────────────────────

function registerPlaybookHandlers(refs: AppRefs): void {
  const all = () => [...BUILTIN_PLAYBOOKS, ...refs.customPlaybooks]

  ipcMain.handle('playbooks:get-all', () => all())

  ipcMain.handle('playbooks:save', (_e, playbook: Playbook) => {
    if (playbook.isBuiltIn) return { ok: false, error: 'Cannot modify built-in playbooks' }
    const idx = refs.customPlaybooks.findIndex(p => p.id === playbook.id)
    const now = new Date().toISOString()
    let versions = playbook.versions ?? []
    if (idx >= 0) {
      const prev = refs.customPlaybooks[idx]
      const { versions: _v, ...snapshot } = prev
      versions = [{ version: prev.version, savedAt: now, snapshot }, ...versions].slice(0, MAX_VERSIONS)
    }
    const updated = { ...playbook, updatedAt: now, versions }
    if (idx >= 0) refs.customPlaybooks[idx] = updated
    else refs.customPlaybooks.push(updated)
    refs.savePlaybooks()
    emitEvent('PlaybookStudio', 'playbook:saved', { id: playbook.id, name: playbook.name })
    return { ok: true, playbook: updated }
  })

  ipcMain.handle('playbooks:delete', (_e, id: string) => {
    const idx = refs.customPlaybooks.findIndex(p => p.id === id)
    if (idx < 0) return { ok: false, error: 'Playbook not found' }
    if (refs.customPlaybooks[idx].isBuiltIn) return { ok: false, error: 'Cannot delete built-in playbooks' }
    refs.customPlaybooks.splice(idx, 1)
    refs.savePlaybooks()
    return { ok: true }
  })

  ipcMain.handle('playbooks:clone', (_e, id: string) => {
    const source = all().find(p => p.id === id)
    if (!source) return { ok: false, error: 'Playbook not found' }
    const now = new Date().toISOString()
    const cloned: Playbook = {
      ...source, id: `custom-${refs.uid()}`, name: `${source.name} (Copy)`,
      isBuiltIn: false, createdAt: now, updatedAt: now, versions: [],
    }
    refs.customPlaybooks.push(cloned)
    refs.savePlaybooks()
    return { ok: true, playbook: cloned }
  })

  ipcMain.handle('playbooks:restore-version', (_e, id: string, versionIdx: number) => {
    const idx = refs.customPlaybooks.findIndex(p => p.id === id)
    if (idx < 0) return { ok: false, error: 'Playbook not found' }
    const pb = refs.customPlaybooks[idx]
    const ver = pb.versions?.[versionIdx]
    if (!ver) return { ok: false, error: 'Version not found' }
    const restored: Playbook = { ...ver.snapshot, id: pb.id, updatedAt: new Date().toISOString(), versions: pb.versions }
    refs.customPlaybooks[idx] = restored
    refs.savePlaybooks()
    return { ok: true, playbook: restored }
  })

  ipcMain.handle('playbooks:export-bundle', async (_e, id: string) => {
    const pb = all().find(p => p.id === id)
    if (!pb) return { ok: false, error: 'Playbook not found' }
    const win = refs.getWindow()
    if (!win) return { ok: false, error: 'No window' }
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Playbook Bundle',
      defaultPath: `${pb.name.replace(/[^a-z0-9]/gi, '_')}.playbook.json`,
      filters: [{ name: 'Playbook Bundle', extensions: ['playbook.json', 'json'] }],
    })
    if (result.canceled || !result.filePath) return { ok: false, error: 'Cancelled' }
    try { fs.writeFileSync(result.filePath, JSON.stringify(pb, null, 2), 'utf8'); return { ok: true } }
    catch (e) { return { ok: false, error: (e as Error).message } }
  })

  ipcMain.handle('playbooks:import-file', async () => {
    const win = refs.getWindow()
    if (!win) return { ok: false, error: 'No window' }
    const result = await dialog.showOpenDialog(win, {
      title: 'Import Playbook',
      filters: [{ name: 'Playbook / YAML / JSON', extensions: ['json', 'yaml', 'yml'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { ok: false, error: 'Cancelled' }
    try {
      const fp = result.filePaths[0]
      return { ok: true, content: fs.readFileSync(fp, 'utf8'), ext: path.extname(fp).toLowerCase(), filePath: fp }
    } catch (e) { return { ok: false, error: (e as Error).message } }
  })
}

// ─── Evidence handlers ────────────────────────────────────────────────────────

function registerEvidenceHandlers(refs: AppRefs): void {
  ipcMain.handle('evidence:pick-file', async () => {
    const win = refs.getWindow()
    if (!win) return { ok: false, error: 'No window' }
    const result = await dialog.showOpenDialog(win, {
      title: 'Attach Evidence', properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }, { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { ok: false, error: 'Cancelled' }
    return { ok: true, filePath: result.filePaths[0] }
  })

  ipcMain.handle('evidence:open-file', async (_e, filePath: string) => {
    try { await shell.openPath(filePath); return { ok: true } }
    catch (e) { return { ok: false, error: (e as Error).message } }
  })
}

// ─── Run handlers ─────────────────────────────────────────────────────────────

function registerRunHandlers(refs: AppRefs): void {
  const all = () => [...BUILTIN_PLAYBOOKS, ...refs.customPlaybooks]

  ipcMain.handle('runs:get-all', () => refs.runs)

  ipcMain.handle('runs:start', (_e, playbookId: string, variables?: Record<string, string>) => {
    const pb = all().find(p => p.id === playbookId)
    if (!pb) return { ok: false, error: 'Playbook not found' }
    const cfg = refs.readConfig()
    const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
    const now = new Date().toISOString()
    const run: PlaybookRun = {
      id: `run-${refs.uid()}`, playbookId: pb.id, playbookName: pb.name, startedAt: now,
      targetName: sc['activeTarget'] as string | undefined,
      labName: sc['activeLab'] as string | undefined,
      steps: pb.steps.map(s => ({ ...s, status: 'todo' as const })),
      status: 'running',
      variables: { ...(pb.variables ?? {}), ...(variables ?? {}) },
    }
    refs.runs.unshift(run)
    refs.saveRuns()
    refs.writeConfig({ shared_context: { ...sc, activePlaybook: pb.name } })
    refs.updateStatus(pb.name, `0/${pb.steps.length} steps`)
    emitEvent('PlaybookStudio', 'playbook:started', { runId: run.id, playbook: pb.name, target: run.targetName })
    return { ok: true, run }
  })

  ipcMain.handle('runs:update-step', (_e, runId: string, stepId: string, patch: Partial<PlaybookStep>) => {
    const idx = refs.runs.findIndex(r => r.id === runId)
    if (idx < 0) return { ok: false, error: 'Run not found' }
    const updated: PlaybookRun = { ...refs.runs[idx], steps: refs.runs[idx].steps.map(s => s.id === stepId ? { ...s, ...patch } : s) }
    refs.runs[idx] = updated
    refs.saveRuns()
    const done = updated.steps.filter(s => s.status === 'done' || s.status === 'skipped').length
    refs.updateStatus(updated.playbookName, `${done}/${updated.steps.length} steps`)
    emitEvent('PlaybookStudio', 'step:completed', { runId, stepId, progress: `${done}/${updated.steps.length}` })
    return { ok: true, run: updated }
  })

  ipcMain.handle('runs:complete', (_e, runId: string) => {
    const idx = refs.runs.findIndex(r => r.id === runId)
    if (idx < 0) return { ok: false, error: 'Run not found' }
    const run = { ...refs.runs[idx], status: 'completed' as const, completedAt: new Date().toISOString() }
    refs.runs[idx] = run
    refs.saveRuns()
    const cfg = refs.readConfig()
    const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
    refs.writeConfig({ shared_context: { ...sc, activePlaybook: undefined } })
    refs.updateStatus()
    emitEvent('PlaybookStudio', 'playbook:completed', { runId, playbook: run.playbookName })
    return { ok: true, run }
  })

  ipcMain.handle('runs:abandon', (_e, runId: string) => {
    const idx = refs.runs.findIndex(r => r.id === runId)
    if (idx < 0) return { ok: false, error: 'Run not found' }
    const run = { ...refs.runs[idx], status: 'abandoned' as const, completedAt: new Date().toISOString() }
    refs.runs[idx] = run
    refs.saveRuns()
    const cfg = refs.readConfig()
    const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
    refs.writeConfig({ shared_context: { ...sc, activePlaybook: undefined } })
    refs.updateStatus()
    return { ok: true, run }
  })

  ipcMain.handle('runs:export-report', async (_e, runId: string) => {
    const run = refs.runs.find(r => r.id === runId)
    if (!run) return { ok: false, error: 'Run not found' }
    const report = buildReport(run)
    const reportForgeAvailable = isReportForgeInstalled()
    let pendingPath: string | null = null
    if (reportForgeAvailable) {
      try {
        if (!fs.existsSync(REPORT_FORGE_DIR)) fs.mkdirSync(REPORT_FORGE_DIR, { recursive: true })
        pendingPath = path.join(REPORT_FORGE_DIR, `playbook-run-${run.id}.json`)
        atomicWriteJsonFile(pendingPath, report)
      } catch {
        // Stat said installed but write failed (permissions?) — degrade
        // gracefully; the save dialog below still gives the user a path.
        pendingPath = null
      }
    }
    emitEvent('PlaybookStudio', 'run:exported', {
      runId, target: 'ReportForge', reportForgeAvailable, pendingPath,
    })
    const win = refs.getWindow()
    if (!win) return { ok: true, report, reportForgeAvailable, pendingPath }
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Run Report',
      defaultPath: `report-${run.playbookName.replace(/[^a-z0-9]/gi, '_')}-${run.id.slice(-6)}.json`,
      filters: [{ name: 'JSON Report', extensions: ['json'] }],
    })
    if (!result.canceled && result.filePath) {
      try { atomicWriteJsonFile(result.filePath, report) }
      catch (e) { return { ok: false, error: (e as Error).message, reportForgeAvailable, pendingPath } }
    }
    return { ok: true, report, reportForgeAvailable, pendingPath }
  })

  ipcMain.handle('playbook:run-command', (_e, payload: unknown) => {
    try { refs.writeConfig({ pending_command: payload }); return { ok: true } }
    catch (e) { return { ok: false, error: (e as Error).message } }
  })
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function registerIpcHandlers(refs: AppRefs): void {
  registerPlaybookHandlers(refs)
  registerEvidenceHandlers(refs)
  registerRunHandlers(refs)
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildReport(run: PlaybookRun): unknown {
  return {
    source: 'PlaybookStudio', exportedAt: new Date().toISOString(),
    playbook: run.playbookName, runId: run.id,
    startedAt: run.startedAt, completedAt: run.completedAt,
    targetName: run.targetName, labName: run.labName, variables: run.variables,
    summary: {
      total: run.steps.length,
      done: run.steps.filter(s => s.status === 'done').length,
      skipped: run.steps.filter(s => s.status === 'skipped').length,
      failed: run.steps.filter(s => s.status === 'todo' || s.status === 'inprogress').length,
    },
    steps: run.steps.map(s => ({
      order: s.order, title: s.title, category: s.category, status: s.status,
      startedAt: s.startedAt, completedAt: s.completedAt, operatorNotes: s.operatorNotes,
      noteThread: s.noteThread, evidence: s.evidence,
      mitreTechniqueId: s.mitreTechniqueId, mitreTechniqueName: s.mitreTechniqueName,
    })),
  }
}
