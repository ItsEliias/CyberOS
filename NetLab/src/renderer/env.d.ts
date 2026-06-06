/// <reference types="vite/client" />

import type { Lab, LabProgress, NetLabPrefs, CommandSnippet } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      labs: {
        getAll(): Promise<Lab[]>
        save(lab: Lab): Promise<void>
        updateProgress(progress: LabProgress): Promise<void>
        getProgress(): Promise<Record<string, LabProgress>>
      }
      prefs: {
        get(): Promise<NetLabPrefs>
        set(prefs: Partial<NetLabPrefs>): Promise<void>
      }
      snippets: {
        getCustom(): Promise<CommandSnippet[]>
        saveCustom(snippets: CommandSnippet[]): Promise<boolean>
      }
      shell: {
        openExternal(url: string): Promise<void>
      }
      app: {
        version(): Promise<string>
      }
      ghostvault: {
        saveNote(payload: { labTitle: string; vendor: string; tags: string[]; content: string }): Promise<{ ok: boolean; reason?: string }>
        vaultPath(): Promise<string | null>
        status(): Promise<{ running: boolean; vaultPath?: string }>
      }
      terminallink: {
        sendCommand(command: string): Promise<void>
      }
      ipc: {
        onEcosystemEvent(cb: (event: unknown) => void): void
        sendEcosystemEvent(event: string, data: Record<string, unknown>): Promise<void>
      }
      onPendingAction(cb: (action: string) => void): (() => void)
    }
  }
}
