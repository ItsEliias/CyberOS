import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Selector for tabbable elements within the drawer (focus-trap scope).
const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function DetailDrawer({ open, onClose, title, children }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Remember the element that had focus before the drawer opened, so we can
  // restore focus when it closes (W3C WAI-ARIA APG dialog-modal pattern).
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move initial focus to the close button — least-destructive option for a
    // read-only observability surface (WAI-ARIA APG initial-focus guidance).
    // requestAnimationFrame so the transform transition has started and the
    // panel is hittable.
    const raf = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap: Tab / Shift+Tab cycle within the drawer panel only.
      const panel = panelRef.current;
      if (!panel) return;
      const tabbables = Array.from(
        panel.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)
      ).filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
      if (tabbables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKey);
      // Restore focus to the opener when the drawer closes.
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,8,15,0.6)',
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 150ms ease'
        }}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={open ? undefined : true}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: 'var(--surface-1)',
          borderLeft: '1px solid var(--border-default)',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms cubic-bezier(0.2,0.8,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--elevation-4)',
          visibility: open ? 'visible' : 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0
        }}>
          <p
            id={titleId}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}
          >
            {title}
          </p>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close detail drawer"
            className="drawer-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '16px',
              lineHeight: 1,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          fontFamily: 'var(--font-display)'
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
