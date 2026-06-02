// PlaybookStudio — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { Playbook, PlaybookRun, PlaybookStep, SharedContext, AppState } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion:  (): Promise<string>    => ipcRenderer.invoke('app:version'),
  getState:    (): Promise<AppState>  => ipcRenderer.invoke('app:get-state'),
  getContext:  (): Promise<SharedContext> => ipcRenderer.invoke('context:get'),

  // Playbooks
  getAllPlaybooks: (): Promise<Playbook[]>                                     => ipcRenderer.invoke('playbooks:get-all'),
  savePlaybook:   (pb: Playbook): Promise<{ ok: boolean; error?: string; playbook?: Playbook }> => ipcRenderer.invoke('playbooks:save', pb),
  deletePlaybook: (id: string): Promise<{ ok: boolean; error?: string }>       => ipcRenderer.invoke('playbooks:delete', id),
  clonePlaybook:  (id: string): Promise<{ ok: boolean; error?: string; playbook?: Playbook }> => ipcRenderer.invoke('playbooks:clone', id),

  // Runs
  getAllRuns:   (): Promise<PlaybookRun[]>                                             => ipcRenderer.invoke('runs:get-all'),
  startRun:    (playbookId: string): Promise<{ ok: boolean; error?: string; run?: PlaybookRun }> => ipcRenderer.invoke('runs:start', playbookId),
  updateStep:  (runId: string, stepId: string, patch: Partial<PlaybookStep>): Promise<{ ok: boolean; error?: string; run?: PlaybookRun }> => ipcRenderer.invoke('runs:update-step', runId, stepId, patch),
  completeRun: (runId: string): Promise<{ ok: boolean; error?: string; run?: PlaybookRun }> => ipcRenderer.invoke('runs:complete', runId),
  abandonRun:  (runId: string): Promise<{ ok: boolean; error?: string; run?: PlaybookRun }> => ipcRenderer.invoke('runs:abandon', runId),

  // Push events from main
  onContextUpdated: (cb: (sc: SharedContext) => void) => {
    ipcRenderer.on('context:updated', (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('context:updated')
  },

  // Cross-app: send command to TerminalLink via config file
  runCommand: (payload: {
    command: string
    stepTitle: string
    playbookTitle: string
    source: string
    queuedAt: string
  }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('playbook:run-command', payload),
})
