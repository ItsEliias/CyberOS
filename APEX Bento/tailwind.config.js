import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--surface-0)',
        bg2:     'var(--surface-1)',
        bg3:     'var(--surface-2)',
        panel:   'var(--surface-1)',
        border:  'var(--border-default)',
        text:    'var(--text-primary)',
        muted:   'var(--text-secondary)',
        dim:     'var(--text-muted)',
        accent:  'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',
        info:    'var(--info)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace']
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      transitionDuration: {
        instant: 'var(--motion-instant)',
        fast:    'var(--motion-fast)',
        base:    'var(--motion-base)',
        slow:    'var(--motion-slow)'
      }
    }
  },
  plugins: []
};
