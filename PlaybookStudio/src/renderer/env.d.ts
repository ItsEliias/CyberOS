/// <reference types="vite/client" />
import type { Playbook, PlaybookRun, PlaybookStep, SharedContext, AppState } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      getVersion:  () => Promise<string>
      getState:    () => Promise<AppState>
      getContext:  () => Promise<SharedContext>

      // Playbooks
      getAllPlaybooks: () => Promise<Playbook[]>
      savePlaybook:   (pb: Playbook) => Promise<{ ok: boolean; error?: string; playbook?: Playbook }>
      deletePlaybook: (id: string) => Promise<{ ok: boolean; error?: string }>
      clonePlaybook:  (id: string) => Promise<{ ok: boolean; error?: string; playbook?: Playbook }>

      // Runs
      getAllRuns:   () => Promise<PlaybookRun[]>
      startRun:    (playbookId: string) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      updateStep:  (runId: string, stepId: string, patch: Partial<PlaybookStep>) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      completeRun: (runId: string) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      abandonRun:  (runId: string) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>

      // Push events
      onContextUpdated: (cb: (sc: SharedContext) => void) => () => void

      // Cross-app: send command to TerminalLink
      runCommand: (payload: {
        command: string
        stepTitle: string
        playbookTitle: string
        source: string
        queuedAt: string
      }) => Promise<{ ok: boolean; error?: string }>
    }
  }
}
