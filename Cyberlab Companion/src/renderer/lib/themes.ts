import type { ThemeId, BgThemeId, AccentThemeId } from '@shared/types';

// ─── Background themes (base/panel/border colors) ────────────────────────────

export const BG_THEMES: Record<BgThemeId, { name: string; dot: string; vars: Record<string, string> }> = {
  stealth: {
    name: 'Stealth', dot: '#4d6a8e',
    vars: {
      '--bg': '#0e1117', '--bg-secondary': '#161b22', '--bg2': '#0d1017', '--bg3': '#181e2a', '--bg4': '#1e2535',
      '--panel': '#161b22', '--panel-alt': '#1c2128',
      '--border': '#30363d', '--border2': '#252d3d',
      '--input-bg': '#131926',
      '--code-bg': '#0d1017', '--sidebar-bg': '#0d1017', '--card-bg': '#141a24',
      '--chat-ai-bg': '#161b22', '--scrollbar': '#30363d',
    }
  },
  graphite: {
    name: 'Graphite', dot: '#4a5568',
    vars: {
      '--bg': '#111318', '--bg-secondary': '#1a1f27', '--bg2': '#0d1017', '--bg3': '#181e2a', '--bg4': '#1e2535',
      '--panel': '#1a1f27', '--panel-alt': '#1a2130',
      '--border': '#2a313d', '--border2': '#252d3d',
      '--input-bg': '#131926',
      '--code-bg': '#0d1017', '--sidebar-bg': '#0d1017', '--card-bg': '#141a24',
      '--chat-ai-bg': '#1a1f27', '--scrollbar': '#2a313d',
    }
  },
  oled: {
    name: 'OLED', dot: '#444444',
    vars: {
      '--bg': '#000000', '--bg-secondary': '#0b0b0b', '--bg2': '#050505', '--bg3': '#111111', '--bg4': '#1a1a1a',
      '--panel': '#0b0b0b', '--panel-alt': '#121212',
      '--border': '#1a1a1a', '--border2': '#252525',
      '--input-bg': '#0a0a0a',
      '--code-bg': '#050505', '--sidebar-bg': '#050505', '--card-bg': '#0b0b0b',
      '--chat-ai-bg': '#0b0b0b', '--scrollbar': '#1a1a1a',
    }
  },
  threat: {
    name: 'Threat', dot: '#6e1010',
    vars: {
      '--bg': '#0a0000', '--bg-secondary': '#110000', '--bg2': '#060000', '--bg3': '#120000', '--bg4': '#1a0505',
      '--panel': '#110000', '--panel-alt': '#160000',
      '--border': '#1f0a0a', '--border2': '#2d1010',
      '--input-bg': '#150000',
      '--code-bg': '#0f0000', '--sidebar-bg': '#060000', '--card-bg': '#110505',
      '--chat-ai-bg': '#110000', '--scrollbar': '#1f0a0a',
    }
  },
  cyber: {
    name: 'Cyber', dot: '#3d1f6e',
    vars: {
      '--bg': '#0d0d1a', '--bg-secondary': '#13132b', '--bg2': '#090912', '--bg3': '#131324', '--bg4': '#1a1a2e',
      '--panel': '#13132b', '--panel-alt': '#181830',
      '--border': '#2a2a4a', '--border2': '#2a1f4a',
      '--input-bg': '#1a1a35',
      '--code-bg': '#0a0a15', '--sidebar-bg': '#090912', '--card-bg': '#111122',
      '--chat-ai-bg': '#13132b', '--scrollbar': '#1e1535',
    }
  },
};

// ─── Accent themes (colors, text, buttons) ───────────────────────────────────

export const ACCENT_THEMES: Record<AccentThemeId, { name: string; dot: string; vars: Record<string, string> }> = {
  blue: {
    name: 'Blue', dot: '#4a9eff',
    vars: {
      '--accent': '#4a9eff', '--accent-2': '#7bb8ff',
      '--accent-dim': 'rgba(74,158,255,0.12)', '--accent-glow': 'rgba(74,158,255,0.3)', '--accent-2-glow': 'rgba(123,184,255,0.2)',
      '--text': '#c9d1d9', '--text-dim': '#8b949e', '--text-muted': '#8b949e',
      '--btn-border': '#4a9eff', '--btn-text': '#4a9eff', '--btn-glow': 'rgba(74,158,255,0.3)', '--btn-hover-bg': 'rgba(74,158,255,0.1)',
      '--input-border': '#21262d',
      '--chat-user-bg': 'rgba(74,158,255,0.12)', '--chat-ai-border': '#4a9eff',
      '--progress-start': '#4a9eff', '--progress-end': '#7bb8ff',
      '--danger': '#f85149', '--error': '#ff4a6e', '--success': '#3ddc84', '--warning': '#ffb347',
      '--font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
    }
  },
  terminal: {
    name: 'Terminal', dot: '#00ff41',
    vars: {
      '--accent': '#00ff41', '--accent-2': '#39ff14',
      '--accent-dim': 'rgba(0,255,65,0.10)', '--accent-glow': 'rgba(0,255,65,0.3)', '--accent-2-glow': 'rgba(0,204,51,0.2)',
      '--text': '#00ff41', '--text-dim': '#00bb30', '--text-muted': '#2d7a2d',
      '--btn-border': '#00ff41', '--btn-text': '#00ff41', '--btn-glow': 'rgba(0,255,65,0.35)', '--btn-hover-bg': 'rgba(0,255,65,0.12)',
      '--input-border': '#00ff41',
      '--chat-user-bg': 'rgba(0,255,65,0.12)', '--chat-ai-border': '#00ff41',
      '--progress-start': '#00ff41', '--progress-end': '#39ff14',
      '--danger': '#ff3322', '--error': '#ff3300', '--success': '#00ff41', '--warning': '#ffff00',
      '--font-family': '"JetBrains Mono","Fira Code",Consolas,monospace',
    }
  },
  purple: {
    name: 'Purple', dot: '#b44fff',
    vars: {
      '--accent': '#b44fff', '--accent-2': '#00ffe0',
      '--accent-dim': 'rgba(180,79,255,0.12)', '--accent-glow': 'rgba(180,79,255,0.35)', '--accent-2-glow': 'rgba(0,255,224,0.25)',
      '--text': '#e8e8ff', '--text-dim': '#8888bb', '--text-muted': '#5555aa',
      '--btn-border': '#b44fff', '--btn-text': '#b44fff', '--btn-glow': 'rgba(180,79,255,0.4)', '--btn-hover-bg': 'rgba(180,79,255,0.15)',
      '--input-border': '#3a3a6a',
      '--chat-user-bg': 'rgba(180,79,255,0.18)', '--chat-ai-border': '#b44fff',
      '--progress-start': '#b44fff', '--progress-end': '#00ffe0',
      '--danger': '#ff4466', '--error': '#ff4466', '--success': '#00ffe0', '--warning': '#ffcc00',
      '--font-family': '"JetBrains Mono","Fira Code",Consolas,monospace',
    }
  },
  red: {
    name: 'Red', dot: '#cc0000',
    vars: {
      '--accent': '#cc0000', '--accent-2': '#ff2a2a',
      '--accent-dim': 'rgba(204,0,0,0.12)', '--accent-glow': 'rgba(204,0,0,0.4)', '--accent-2-glow': 'rgba(255,42,42,0.25)',
      '--text': '#f0e0e0', '--text-dim': '#aa8888', '--text-muted': '#7a4040',
      '--btn-border': '#cc0000', '--btn-text': '#cc0000', '--btn-glow': 'rgba(204,0,0,0.4)', '--btn-hover-bg': 'rgba(204,0,0,0.15)',
      '--input-border': '#cc0000',
      '--chat-user-bg': 'rgba(204,0,0,0.18)', '--chat-ai-border': '#cc0000',
      '--progress-start': '#cc0000', '--progress-end': '#ff2a2a',
      '--danger': '#ff4444', '--error': '#ff2a2a', '--success': '#44cc44', '--warning': '#ff8c00',
      '--font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
    }
  },
  cyan: {
    name: 'Cyan', dot: '#00ffe0',
    vars: {
      '--accent': '#00ffe0', '--accent-2': '#7fffd4',
      '--accent-dim': 'rgba(0,255,224,0.10)', '--accent-glow': 'rgba(0,255,224,0.3)', '--accent-2-glow': 'rgba(127,255,212,0.2)',
      '--text': '#e0fffc', '--text-dim': '#88bbbb', '--text-muted': '#407070',
      '--btn-border': '#00ffe0', '--btn-text': '#00ffe0', '--btn-glow': 'rgba(0,255,224,0.35)', '--btn-hover-bg': 'rgba(0,255,224,0.12)',
      '--input-border': '#00ffe0',
      '--chat-user-bg': 'rgba(0,255,224,0.12)', '--chat-ai-border': '#00ffe0',
      '--progress-start': '#00ffe0', '--progress-end': '#7fffd4',
      '--danger': '#ff4466', '--error': '#ff4466', '--success': '#00ff88', '--warning': '#ffcc00',
      '--font-family': '"JetBrains Mono","Fira Code",Consolas,monospace',
    }
  },
};

// ─── Legacy combined themes (kept for backwards compat) ──────────────────────

export const THEMES: Record<ThemeId, { id: ThemeId; name: string; dot: string; vars: Record<string, string> }> = {
  stealth:  { id: 'stealth',  name: 'Stealth',   dot: '#4a9eff',  vars: { ...BG_THEMES.stealth.vars,  ...ACCENT_THEMES.blue.vars } },
  graphite: { id: 'graphite', name: 'Graphite',  dot: '#6ea8fe',  vars: { ...BG_THEMES.graphite.vars, ...ACCENT_THEMES.blue.vars } },
  oled:     { id: 'oled',     name: 'OLED',      dot: '#4a9eff',  vars: { ...BG_THEMES.oled.vars,     ...ACCENT_THEMES.blue.vars } },
  threat:   { id: 'threat',   name: 'Threat',    dot: '#cc0000',  vars: { ...BG_THEMES.threat.vars,   ...ACCENT_THEMES.red.vars  } },
  terminal: { id: 'terminal', name: 'Terminal',  dot: '#00ff41',  vars: { ...BG_THEMES.oled.vars,     ...ACCENT_THEMES.terminal.vars } },
  cyberpunk:{ id: 'cyberpunk',name: 'Cyberpunk', dot: '#b44fff',  vars: { ...BG_THEMES.cyber.vars,    ...ACCENT_THEMES.purple.vars   } },
};

// ─── Apply helpers ────────────────────────────────────────────────────────────

function setVars(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export function applyBgTheme(id: BgThemeId) {
  const t = BG_THEMES[id];
  if (t) setVars(t.vars);
}

export function applyAccentTheme(id: AccentThemeId) {
  const t = ACCENT_THEMES[id];
  if (t) setVars(t.vars);
}

export function applyThemePair(bgId: BgThemeId, accentId: AccentThemeId, animate = true) {
  const root = document.documentElement;
  if (animate) root.style.transition = 'background-color 0.3s,color 0.3s';
  applyBgTheme(bgId);
  applyAccentTheme(accentId);
  if (animate) setTimeout(() => (root.style.transition = ''), 350);
}

export function applyTheme(themeId: ThemeId, animate = true) {
  const t = THEMES[themeId];
  if (!t) return;
  const root = document.documentElement;
  if (animate) root.style.transition = 'background-color 0.3s,color 0.3s';
  setVars(t.vars);
  root.dataset.theme = themeId;
  if (animate) setTimeout(() => (root.style.transition = ''), 350);
}
