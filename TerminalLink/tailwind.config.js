/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── CyberOS Design Bible — Core Palette ─────────────────────────
        bg: {
          base: '#0a0a0f',
          elevated: '#12131a',
          interactive: '#1a1b26',
        },
        border: {
          subtle: '#1e2030',
          default: '#2a3347',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#8b949e',
          muted: '#4a5568',
        },

        // ─── Accent Colors ───────────────────────────────────────────────
        accent: {
          DEFAULT: '#00ff41',
          emphasis: '#56ff70',
        },
        info: '#4a9eff',
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',

        // ─── App Accent Colors ───────────────────────────────────────────
        app: {
          ghostvault: '#7bb8ff',
          recondesk: '#d29922',
          vaultcore: '#3fb950',
          signalboard: '#ff6b6b',
          credvault: '#f78166',
          cyberlab: '#b44fff',
          networkmap: '#d29922',
          terminallink: '#00ff41',
          playbookstudio: '#4a9eff',
          reportforge: '#3fb950',
          dashboard: '#4a9eff',
          launcher: '#b44fff',
        },

        // ─── Legacy compatibility ────────────────────────────────────────
        panel: '#161b22',
        muted: '#8b949e',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 255, 65, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 255, 65, 0.1)',
        'glow-accent': '0 0 8px rgba(0, 255, 65, 0.5)',
      },
      animation: {
        statusPulse: 'statusPulse 2s ease-out infinite',
      },
      keyframes: {
        statusPulse: {
          '0%': { boxShadow: '0 0 0 0 var(--pulse-color, rgba(0, 255, 65, 0.4))' },
          '70%': { boxShadow: '0 0 0 6px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
      },
    },
  },
  plugins: [],
}
