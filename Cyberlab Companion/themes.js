// themes.js — CSS variable maps for all four themes + transition logic

'use strict';

const THEMES = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    dot: '#b44fff',
    vars: {
      '--bg':           '#0d0d1a',
      '--bg-secondary': '#13132b',
      '--panel':        '#13132b',
      '--panel-alt':    '#181830',
      '--border':       '#2a2a4a',
      '--input-bg':     '#1a1a35',
      '--input-border': '#3a3a6a',
      '--accent':       '#b44fff',
      '--accent-2':     '#00ffe0',
      '--accent-glow':  'rgba(180,79,255,0.35)',
      '--accent-2-glow':'rgba(0,255,224,0.25)',
      '--text':         '#e8e8ff',
      '--text-dim':     '#8888bb',
      '--text-muted':   '#5555aa',
      '--btn-border':   '#b44fff',
      '--btn-text':     '#b44fff',
      '--btn-hover-bg': 'rgba(180,79,255,0.15)',
      '--code-bg':      '#0a0a15',
      '--chat-user-bg': 'rgba(180,79,255,0.18)',
      '--chat-ai-bg':   '#13132b',
      '--chat-ai-border':'#b44fff',
      '--scrollbar':    '#b44fff',
      '--progress-start':'#b44fff',
      '--progress-end': '#00ffe0',
      '--chart-1':      '#b44fff',
      '--chart-2':      '#00ffe0',
      '--node-glow':    '#b44fff',
      '--danger':       '#ff4466',
      '--success':      '#00ffe0',
      '--warning':      '#ffcc00',
      '--font-family':  '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      '--bg-texture':   '1',
    }
  },

  terminal: {
    id: 'terminal',
    name: 'Terminal',
    dot: '#00ff41',
    vars: {
      '--bg':           '#0a0a0a',
      '--bg-secondary': '#0f0f0f',
      '--panel':        '#0f0f0f',
      '--panel-alt':    '#121212',
      '--border':       '#1a3a1a',
      '--input-bg':     '#0a0a0a',
      '--input-border': '#00ff41',
      '--accent':       '#00ff41',
      '--accent-2':     '#00cc33',
      '--accent-glow':  'rgba(0,255,65,0.3)',
      '--accent-2-glow':'rgba(0,204,51,0.2)',
      '--text':         '#00ff41',
      '--text-dim':     '#00bb30',
      '--text-muted':   '#008820',
      '--btn-border':   '#00ff41',
      '--btn-text':     '#00ff41',
      '--btn-hover-bg': 'rgba(0,255,65,0.12)',
      '--code-bg':      '#050505',
      '--chat-user-bg': 'rgba(0,255,65,0.12)',
      '--chat-ai-bg':   '#0f0f0f',
      '--chat-ai-border':'#00ff41',
      '--scrollbar':    '#00ff41',
      '--progress-start':'#00ff41',
      '--progress-end': '#00cc33',
      '--chart-1':      '#00ff41',
      '--chart-2':      '#00cc33',
      '--node-glow':    '#00ff41',
      '--danger':       '#ff3322',
      '--success':      '#00ff41',
      '--warning':      '#ffff00',
      '--font-family':  '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      '--bg-texture':   '0',
    }
  },

  stealth: {
    id: 'stealth',
    name: 'Stealth',
    dot: '#4a9eff',
    vars: {
      '--bg':           '#0e1117',
      '--bg-secondary': '#161b22',
      '--panel':        '#161b22',
      '--panel-alt':    '#1c2128',
      '--border':       '#30363d',
      '--input-bg':     '#0d1117',
      '--input-border': '#21262d',
      '--accent':       '#4a9eff',
      '--accent-2':     '#7bb8ff',
      '--accent-glow':  'rgba(74,158,255,0.3)',
      '--accent-2-glow':'rgba(123,184,255,0.2)',
      '--text':         '#c9d1d9',
      '--text-dim':     '#8b949e',
      '--text-muted':   '#6e7681',
      '--btn-border':   '#4a9eff',
      '--btn-text':     '#4a9eff',
      '--btn-hover-bg': 'rgba(74,158,255,0.1)',
      '--code-bg':      '#1c2128',
      '--chat-user-bg': 'rgba(74,158,255,0.12)',
      '--chat-ai-bg':   '#161b22',
      '--chat-ai-border':'#4a9eff',
      '--scrollbar':    '#4a9eff',
      '--progress-start':'#4a9eff',
      '--progress-end': '#7bb8ff',
      '--chart-1':      '#4a9eff',
      '--chart-2':      '#7bb8ff',
      '--node-glow':    '#4a9eff',
      '--danger':       '#f85149',
      '--success':      '#3fb950',
      '--warning':      '#d29922',
      '--font-family':  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      '--bg-texture':   '0',
    }
  },

  graphite: {
    id: 'graphite',
    name: 'Graphite',
    dot: '#6ea8fe',
    vars: {
      '--bg':           '#111318',
      '--bg-secondary': '#1a1f27',
      '--panel':        '#1a1f27',
      '--panel-alt':    '#1a2130',
      '--border':       '#2a313d',
      '--input-bg':     '#131926',
      '--input-border': '#21262d',
      '--accent':       '#6ea8fe',
      '--accent-2':     '#9ec5fe',
      '--accent-glow':  'rgba(110,168,254,0.3)',
      '--accent-2-glow':'rgba(158,197,254,0.2)',
      '--text':         '#d8dee9',
      '--text-dim':     '#8b949e',
      '--text-muted':   '#8b949e',
      '--btn-border':   '#6ea8fe',
      '--btn-text':     '#6ea8fe',
      '--btn-hover-bg': 'rgba(110,168,254,0.1)',
      '--code-bg':      '#0d1017',
      '--chat-user-bg': 'rgba(110,168,254,0.12)',
      '--chat-ai-bg':   '#1a1f27',
      '--chat-ai-border':'#6ea8fe',
      '--scrollbar':    '#2a313d',
      '--progress-start':'#6ea8fe',
      '--progress-end': '#9ec5fe',
      '--chart-1':      '#6ea8fe',
      '--chart-2':      '#9ec5fe',
      '--node-glow':    '#6ea8fe',
      '--danger':       '#f85149',
      '--success':      '#3ddc84',
      '--warning':      '#ffb347',
      '--font-family':  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      '--bg-texture':   '0',
    }
  },

  oled: {
    id: 'oled',
    name: 'OLED',
    dot: '#4a9eff',
    vars: {
      '--bg':           '#000000',
      '--bg-secondary': '#0b0b0b',
      '--panel':        '#0b0b0b',
      '--panel-alt':    '#121212',
      '--border':       '#1a1a1a',
      '--input-bg':     '#0a0a0a',
      '--input-border': '#1a1a1a',
      '--accent':       '#4a9eff',
      '--accent-2':     '#7bb8ff',
      '--accent-glow':  'rgba(74,158,255,0.3)',
      '--accent-2-glow':'rgba(123,184,255,0.2)',
      '--text':         '#f5f5f5',
      '--text-dim':     '#888888',
      '--text-muted':   '#888888',
      '--btn-border':   '#4a9eff',
      '--btn-text':     '#4a9eff',
      '--btn-hover-bg': 'rgba(74,158,255,0.1)',
      '--code-bg':      '#050505',
      '--chat-user-bg': 'rgba(74,158,255,0.12)',
      '--chat-ai-bg':   '#0b0b0b',
      '--chat-ai-border':'#4a9eff',
      '--scrollbar':    '#1a1a1a',
      '--progress-start':'#4a9eff',
      '--progress-end': '#7bb8ff',
      '--chart-1':      '#4a9eff',
      '--chart-2':      '#7bb8ff',
      '--node-glow':    '#4a9eff',
      '--danger':       '#f85149',
      '--success':      '#3ddc84',
      '--warning':      '#ffb347',
      '--font-family':  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      '--bg-texture':   '0',
    }
  },

  threat: {
    id: 'threat',
    name: 'Threat',
    dot: '#cc0000',
    vars: {
      '--bg':           '#0a0000',
      '--bg-secondary': '#110000',
      '--panel':        '#110000',
      '--panel-alt':    '#160000',
      '--border':       '#2a0a0a',
      '--input-bg':     '#150000',
      '--input-border': '#cc0000',
      '--accent':       '#cc0000',
      '--accent-2':     '#ff2a2a',
      '--accent-glow':  'rgba(204,0,0,0.4)',
      '--accent-2-glow':'rgba(255,42,42,0.25)',
      '--text':         '#e8e0e0',
      '--text-dim':     '#aa8888',
      '--text-muted':   '#774444',
      '--btn-border':   '#cc0000',
      '--btn-text':     '#cc0000',
      '--btn-hover-bg': 'rgba(204,0,0,0.15)',
      '--code-bg':      '#0f0000',
      '--chat-user-bg': 'rgba(204,0,0,0.18)',
      '--chat-ai-bg':   '#110000',
      '--chat-ai-border':'#cc0000',
      '--scrollbar':    '#cc0000',
      '--progress-start':'#cc0000',
      '--progress-end': '#ff2a2a',
      '--chart-1':      '#cc0000',
      '--chart-2':      '#ff2a2a',
      '--node-glow':    '#cc0000',
      '--danger':       '#ff4444',
      '--success':      '#44cc44',
      '--warning':      '#cc8800',
      '--font-family':  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      '--bg-texture':   '0',
    }
  }
};

// Difficulty dot colours — consistent across all themes
const DIFFICULTY_COLORS = {
  Easy:   '#3fb950',
  Medium: '#d29922',
  Hard:   '#f85149',
  Insane: '#a371f7',
};

// Syntax highlight themes per app theme (for highlight.js)
const HIGHLIGHT_THEMES = {
  cyberpunk: 'atom-one-dark',
  terminal:  'base16/green-screen',
  stealth:   'github-dark',
  threat:   'base16/tomorrow-night',
};

function applyTheme(themeId, animate = true) {
  const theme = THEMES[themeId];
  if (!theme) return;
  const root = document.documentElement;

  if (animate) {
    root.style.transition = 'background-color 0.3s, color 0.3s';
  }

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Remove all theme classes, add new one
  Object.keys(THEMES).forEach(id => document.body.classList.remove(`theme-${id}`));
  document.body.classList.add(`theme-${themeId}`);

  // Background texture toggle
  document.body.classList.toggle('bg-texture', theme.vars['--bg-texture'] === '1');
  // Vignette for threat
  document.body.classList.toggle('bg-vignette', themeId === 'threat');
  // Blinking cursor for terminal
  document.body.classList.toggle('theme-cursor-blink', themeId === 'terminal');

  // Swap highlight.js theme
  updateHighlightTheme(HIGHLIGHT_THEMES[themeId] || 'github-dark');

  if (animate) {
    setTimeout(() => { root.style.transition = ''; }, 350);
  }
}

function updateHighlightTheme(themeName) {
  let link = document.getElementById('hljs-theme');
  if (!link) {
    link = document.createElement('link');
    link.id = 'hljs-theme';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${themeName}.min.css`;
}

module.exports = { THEMES, DIFFICULTY_COLORS, HIGHLIGHT_THEMES, applyTheme };
