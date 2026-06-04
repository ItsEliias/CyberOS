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
      restoreVersion: (id: string, versionIdx: number) => Promise<{ ok: boolean; error?: string; playbook?: Playbook }>
      exportBundle:   (id: string) => Promise<{ ok: boolean; error?: string }>
      importFile:     () => Promise<{ ok: boolean; error?: string; content?: string; ext?: string; filePath?: string }>

      // Runs
      getAllRuns:      () => Promise<PlaybookRun[]>
      startRun:       (playbookId: string, variables?: Record<string, string>) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      updateStep:     (runId: string, stepId: string, patch: Partial<PlaybookStep>) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      completeRun:    (runId: string) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      abandonRun:     (runId: string) => Promise<{ ok: boolean; error?: string; run?: PlaybookRun }>
      exportRunReport: (runId: string) => Promise<{ ok: boolean; error?: string; report?: unknown }>

      // Evidence
      pickEvidenceFile: () => Promise<{ ok: boolean; error?: string; filePath?: string }>
      openEvidenceFile: (filePath: string) => Promise<{ ok: boolean; error?: string }>

      // Push events
      onContextUpdated: (cb: (sc: SharedContext) => void) => () => void

      // Shell
      openExternal: (url: string) => Promise<void>

      // Cross-app: send command to TerminalLink
      runCommand: (payload: {
        command: string
        stepTitle: string
        playbookTitle: string
        source: string
        queuedAt: string
      }) => Promise<{ ok: boolean; error?: string }>

      // AI generation (optional — provided by linter extension)
      generateSteps?: (objective: string, apiKey: string) => Promise<{ ok: boolean; error?: string; steps?: Partial<PlaybookStep>[] }>
    }
  }
}
