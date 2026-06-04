// themeStore — per-app theme persisted in localStorage
import { create } from 'zustand'

export interface AppTheme {
  accentColor: string   // Default: '#ff6b6b'
  bgColor:     string   // Default: '#0a0a0f'
  textColor:   string   // Default: '#e2e8f0'
}

export const ACCENT_SWATCHES = [
  { label: 'Coral',   value: '#ff6b6b' },
  { label: 'Blue',    value: '#4a9eff' },
  { label: 'Green',   value: '#3fb950' },
  { label: 'Yellow',  value: '#d29922' },
  { label: 'Purple',  value: '#b44fff' },
  { label: 'Red',     value: '#f78166' },
]

export const BG_SWATCHES = [
  { label: 'Dark',     value: '#0a0a0f' },
  { label: 'Graphite', value: '#111318' },
  { label: 'Navy',     value: '#0d1117' },
  { label: 'OLED',     value: '#000000' },
]

export const DEFAULT_THEME: AppTheme = {
  accentColor: '#ff6b6b',
  bgColor:     '#0a0a0f',
  textColor:   '#e2e8f0',
}

const STORAGE_KEY = 'sb-app-theme'

function loadTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_THEME }
}

function saveTheme(theme: AppTheme) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)) } catch { /* ignore */ }
}

interface ThemeStore {
  theme: AppTheme
  setAccent: (color: string) => void
  setBg:     (color: string) => void
  setText:   (color: string) => void
  reset:     () => void
}

export const useThemeStore = create<ThemeStore>(set => ({
  theme: loadTheme(),
  setAccent: color => set(s => {
    const next = { ...s.theme, accentColor: color }
    saveTheme(next)
    return { theme: next }
  }),
  setBg: color => set(s => {
    const next = { ...s.theme, bgColor: color }
    saveTheme(next)
    return { theme: next }
  }),
  setText: color => set(s => {
    const next = { ...s.theme, textColor: color }
    saveTheme(next)
    return { theme: next }
  }),
  reset: () => set(() => {
    saveTheme(DEFAULT_THEME)
    return { theme: { ...DEFAULT_THEME } }
  }),
}))
