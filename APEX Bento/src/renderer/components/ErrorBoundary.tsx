import { Component, type ErrorInfo, type ReactNode } from 'react';

// React Error Boundary per
// https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
//
// Error boundaries are class components that implement
// `static getDerivedStateFromError(error)` and/or `componentDidCatch(error, info)`.
// They catch JavaScript errors thrown anywhere in their child component tree
// during rendering, in lifecycle methods, and in constructors of the whole
// tree below them — they do NOT catch errors inside event handlers, async
// code (setTimeout / promise callbacks), or server-side rendering. They are
// the only documented React API for preventing a single component render
// failure from unmounting the whole UI ("the whole tree below them will have
// unmounted").
//
// For the APEX Bento dashboard this matters because the renderer pulls fixture
// data over IPC and renders 6 cards in a grid; a transient render error in
// any one card (e.g. recharts throwing on an edge-case dataset, an undefined
// access in a fixture-driven map) would otherwise blank the entire grid.
// Wrapping the grid with an ErrorBoundary keeps the header + the other cards
// visible and surfaces a recoverable error pane with a "Try again" reset.

interface Props {
  children: ReactNode;
  /** Optional rendered fallback. If absent, a default APEX-styled pane shows. */
  fallback?: (state: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // React calls this after the error has been caught; per React docs this is
    // the documented place to log error reports. We log to console only — no
    // telemetry, no IPC, no APEX writes.
    console.error('[APEX Bento] render error caught by ErrorBoundary:', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return <DefaultErrorPane error={error} onReset={this.reset} />;
  }
}

interface DefaultErrorPaneProps {
  error: Error;
  onReset: () => void;
}

function DefaultErrorPane({ error, onReset }: DefaultErrorPaneProps) {
  // role="alert" announces the error to assistive tech per
  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role
  // — the role is implicitly assertive (interrupts the screen reader's
  // current utterance) which is appropriate for a render failure that has
  // already collapsed the UI.
  const message = error.message || String(error);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        minHeight: 240,
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)'
      }}
    >
      <p style={{
        fontSize: 11,
        color: 'var(--danger)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin: 0
      }}>
        Render error
      </p>
      <p style={{
        fontSize: 13,
        color: 'var(--text-primary)',
        textAlign: 'center',
        margin: 0,
        maxWidth: 520,
        wordBreak: 'break-word',
        lineHeight: 1.5
      }}>
        {message}
      </p>
      <p style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        textAlign: 'center',
        margin: 0,
        maxWidth: 520,
        lineHeight: 1.5
      }}>
        A card failed to render. APEX state is unchanged (read-only). Try again to remount the grid, or use the View → Reload menu to reload the renderer.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="apex-error-reset-btn"
        style={{
          padding: '6px 14px',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'border-color 150ms ease, color 150ms ease'
        }}
      >
        Try again
      </button>
    </div>
  );
}
