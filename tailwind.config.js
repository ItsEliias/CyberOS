/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        bg2:     'var(--bg2)',
        bg3:     'var(--bg3)',
        panel:   'var(--panel)',
        border:  'var(--border)',
        text:    'var(--text)',
        muted:   'var(--text-muted)',
        dim:     'var(--text-dim)',
        accent:  'var(--accent)',
        success: '#3fb950',
        warning: '#d29922',
        danger:  '#f85149',
      }
    }
  },
  plugins: []
};
