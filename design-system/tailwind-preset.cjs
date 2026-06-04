/**
 * CyberOS Tailwind Preset v2
 * Usage in each app's tailwind.config.js:
 *   const preset = require('../../design-system/tailwind-preset.cjs')
 *   module.exports = { presets: [preset], content: [...], ... }
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──────────────────────────────────────────────────────
        surface: {
          0:     '#07080f',
          1:     '#0d0e18',
          2:     '#131525',
          3:     '#191c32',
        },
        // ── Core palette (Design Bible) ────────────────────────────────────
        bg: {
          base:        '#0a0a0f',
          surface:     '#0f1117',
          elevated:    '#161b27',
          overlay:     '#1c2333',
          interactive: '#1e2a3a',
        },
        border: {
          subtle:  '#1e2433',
          default: '#2a3347',
          strong:  '#3d4f6b',
        },
        text: {
          primary:   '#e6edf3',
          secondary: '#8b949e',
          muted:     '#484f58',
          inverse:   '#07080f',
        },
        // ── Semantic ────────────────────────────────────────────────────────
        success: '#3fb950',
        warning: '#d29922',
        danger:  '#f85149',
        info:    '#4a9eff',
        // ── Severity ────────────────────────────────────────────────────────
        sev: {
          critical: '#f85149',
          high:     '#ff8c42',
          medium:   '#d29922',
          low:      '#4a9eff',
          info:     '#8b949e',
        },
        // ── States ──────────────────────────────────────────────────────────
        online:  '#3fb950',
        offline: '#484f58',
        // ── Accent (per-app default) ─────────────────────────────────────────
        accent: {
          DEFAULT: '#4a9eff',
          dim:     'rgba(74,158,255,0.55)',
          tint:    'rgba(74,158,255,0.08)',
          tint2:   'rgba(74,158,255,0.15)',
          border:  'rgba(74,158,255,0.30)',
          glow:    'rgba(74,158,255,0.28)',
        },
        // ── App accents ──────────────────────────────────────────────────────
        app: {
          dashboard:     '#4a9eff',
          recondesk:     '#d29922',
          ghostvault:    '#7bb8ff',
          cyberlab:      '#b44fff',
          vaultcore:     '#3fb950',
          signalboard:   '#ff6b6b',
          credvault:     '#f78166',
          playbookstudio:'#4a9eff',
          reportforge:   '#3fb950',
          terminallink:  '#00ff41',
          networkmap:    '#d29922',
          netlab:        '#4a9eff',
          launcher:      '#b44fff',
        },
      },

      fontFamily: {
        display: ['Geist Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['Geist Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.9rem' }],
        'xs':  ['0.75rem',   { lineHeight: '1rem'   }],
        'sm':  ['0.8125rem', { lineHeight: '1.25rem'}],
        'base':['0.875rem',  { lineHeight: '1.5rem' }],
        'md':  ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg':  ['1.125rem',  { lineHeight: '1.4rem' }],
        'xl':  ['1.375rem',  { lineHeight: '1.3rem' }],
        '2xl': ['1.75rem',   { lineHeight: '1.2rem' }],
        '3xl': ['2.25rem',   { lineHeight: '1.1rem' }],
      },

      borderRadius: {
        'xs':   '4px',
        'sm':   '6px',
        'DEFAULT': '8px',
        'md':   '10px',
        'lg':   '14px',
        'xl':   '20px',
        '2xl':  '28px',
      },

      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.35)',
        'elevation-2': '0 4px 16px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.4)',
        'elevation-3': '0 12px 40px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.45)',
        'elevation-4': '0 24px 64px rgba(0,0,0,.65), 0 8px 24px rgba(0,0,0,.5)',
        'glow-accent': '0 0 12px rgba(var(--accent-rgb), 0.3), 0 0 24px rgba(var(--accent-rgb), 0.1)',
        'glow-sm':     '0 0 8px rgba(var(--accent-rgb), 0.25)',
        'glass':       'inset 0 1px 0 rgba(255,255,255,0.04)',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },

      transitionTimingFunction: {
        'cyber':  'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        'instant': '80ms',
        'fast':    '150ms',
        'base':    '250ms',
        'slow':    '400ms',
      },

      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        DEFAULT: '12px',
        'md': '16px',
        'lg': '24px',
      },

      animation: {
        'pulse-dot':  'statusPulse 2s ease-out infinite',
        'glow-pulse': 'glowPulse 2.4s ease-in-out infinite',
        'count-up':   'none',  /* handled by framer-motion */
      },
    },
  },
  plugins: [],
}
