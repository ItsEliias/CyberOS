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
          DEFAULT: '#4a9eff',
          emphasis: '#7bb8ff',
        },
        info: '#4a9eff',
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',

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
        glow: '0 0 20px rgba(74, 158, 255, 0.15)',
        'glow-sm': '0 0 10px rgba(74, 158, 255, 0.1)',
      },
      animation: {
        statusPulse: 'statusPulse 2s ease-out infinite',
      },
      keyframes: {
        statusPulse: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
