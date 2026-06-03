/// <reference types="vite/client" />

// CyberOS Dashboard — Ambient Type Declarations
// Window.electronAPI type contract v2.0

declare global {
  interface Window {
    electronAPI: {
      // Config & State
      getState: () => Promise<any>
      getEvents: () => Promise<any[]>
      getEventHistory: () => Promise<any[]>
      getVersion: () => Promise<string>

      // New Dashboard IPC
      readConfig: () => Promise<any>
      readEvents: () => Promise<any[]>
      launchAppByKey: (appKey: string) => Promise<{ success: boolean; error?: string }>
      startWatching: () => void

      // App Actions
      launchApp: (execPath: string) => Promise<{ ok: boolean; error?: string }>
      openUrl: (url: string) => Promise<void>
      toggleFullscreen: () => Promise<void>

      // Push Listeners (main → renderer)
      onStateUpdate: (cb: (cfg: any) => void) => () => void
      onEventsUpdate: (cb: (events: any[]) => void) => () => void
      onFullscreenChange: (cb: (v: boolean) => void) => () => void
      onConfigChanged: (cb: (cfg: any) => void) => () => void
      onEventsChanged: (cb: (events: any[]) => void) => () => void
    }
  }
}

export {}
