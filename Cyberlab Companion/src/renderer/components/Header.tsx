import { useState } from 'react';
import { useStore } from '../store';
import type { AppConfig } from '@shared/types';

const CLAUDE_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet' },
  { value: 'claude-opus-4-7', label: 'Claude Opus' },
];

interface HeaderProps {
  onHelp?: () => void
}

export default function Header({ onHelp }: HeaderProps) {
  const { vpnStatus, tabs, activeTabId, config, setConfig } = useStore();
  const [showAiMenu, setShowAiMenu] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const aiProvider = config?.aiProvider || 'claude';
  const claudeModel = config?.claudeModel || 'claude-sonnet-4-6';
  const ollamaModel = config?.ollamaModel || '';

  const currentModelLabel = aiProvider === 'ollama'
    ? `Ollama: ${ollamaModel || '?'}`
    : CLAUDE_MODELS.find(m => m.value === claudeModel)?.label || 'Claude';

  const vpnOnline = vpnStatus.status === 'active';
  const vpnOff    = vpnStatus.status === 'off';
  const vpnColor  = vpnOnline ? '#3fb950' : vpnOff ? '#f85149' : '#484f58';

  async function handleModelSelect(provider: 'claude' | 'ollama', model?: string) {
    if (!config) return;
    const updated: AppConfig = { ...config, aiProvider: provider };
    if (model) {
      if (provider === 'claude') updated.claudeModel = model;
      else updated.ollamaModel = model;
    }
    await window.electronAPI.saveConfig(updated);
    setConfig(updated);
    setShowAiMenu(false);
  }

  function handleFullscreen() {
    try { (window.electronAPI as Record<string, Function>).toggleFullscreen?.(); } catch {}
  }

  const hasSession = session?.labName && session.labName !== 'New Session';

  return (
    <div
      className="h-10 flex items-center px-4 drag-region shrink-0 relative"
      style={{
        background: 'rgba(7,8,15,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Purple accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(180,79,255,0.18) 40%, rgba(180,79,255,0.18) 60%, transparent 100%)' }}
      />

      {/* macOS traffic light spacer */}
      <div className="w-[70px] no-drag" />

      {/* App identity */}
      <div className="flex items-center gap-2 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(180,79,255,0.45))' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L13.5 4.75V11.25L8 14.5L2.5 11.25V4.75L8 1.5Z" stroke="#b44fff" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="#b44fff" />
          </svg>
        </div>
        <span
          className="text-[13px] font-semibold tracking-wide"
          style={{ color: '#8b949e' }}
        >
          CyberLab
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(180,79,255,0.08)',
            border: '1px solid rgba(180,79,255,0.18)',
            color: '#b44fff',
          }}
        >
          Companion
        </span>
        {hasSession && (
          <>
            <span style={{ color: 'rgba(42,51,71,0.8)', fontSize: 12 }}>—</span>
            <span className="text-xs font-medium" style={{ color: '#b44fff' }}>
              {session.labName}
            </span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Session HUD strip */}
      {hasSession && (() => {
        const totalFlags = (session.findings?.flags?.length ?? 0) + (session.ctfFlags?.length ?? 0);
        const totalPts = (session.ctfFlags ?? []).reduce((s, f) => s + (f.points ?? 0), 0);
        const elapsedHrs = (session.timer?.elapsed ?? 0) / 3600;
        const flagRate = elapsedHrs > 0 ? (totalFlags / elapsedHrs).toFixed(1) : '—';
        return (
          <div
            className="flex items-center gap-3 px-3 py-1 rounded-md mr-2"
            style={{ background: 'rgba(180,79,255,0.06)', border: '1px solid rgba(180,79,255,0.12)' }}
          >
            <span className="text-[10px] font-mono tabular-nums" style={{ color: '#3fb950' }}>
              {totalFlags} flags
            </span>
            {totalPts > 0 && (
              <span className="text-[10px] font-mono tabular-nums" style={{ color: '#b44fff' }}>
                {totalPts} pts
              </span>
            )}
            <span className="text-[10px] font-mono tabular-nums" style={{ color: '#484f58' }}>
              {flagRate}/hr
            </span>
          </div>
        );
      })()}

      {/* Right actions */}
      <div className="flex items-center gap-1 no-drag">
        {/* VPN indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
          style={{
            background: vpnOnline ? 'rgba(63,185,80,0.06)' : 'transparent',
            border: `1px solid ${vpnOnline ? 'rgba(63,185,80,0.2)' : 'transparent'}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: vpnColor,
              boxShadow: vpnOnline ? `0 0 4px ${vpnColor}88` : 'none',
            }}
          />
          <span style={{ color: vpnColor, fontSize: '11px' }}>
            {vpnOnline ? (vpnStatus.ip || 'VPN') : vpnOff ? 'No VPN' : 'VPN?'}
          </span>
        </div>

        {/* AI provider selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md no-drag"
            style={{
              background: 'rgba(13,14,24,0.8)',
              border: '1px solid rgba(42,51,71,0.5)',
              color: '#8b949e',
              fontSize: '11px',
            }}
            onClick={() => setShowAiMenu(!showAiMenu)}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: aiProvider === 'ollama' ? '#3fb950' : '#b44fff' }}
            />
            <span>AI: {currentModelLabel}</span>
            <span style={{ opacity: 0.4, fontSize: 9 }}>▾</span>
          </button>

          {showAiMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAiMenu(false)} />
              <div
                className="absolute right-0 top-8 z-20 p-1 rounded-lg"
                style={{
                  background: 'rgba(7,8,15,0.98)',
                  border: '1px solid rgba(42,51,71,0.7)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.65)',
                  minWidth: '184px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="px-2 py-1.5 mb-0.5"
                  style={{ fontSize: '10px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Claude API
                </div>
                {CLAUDE_MODELS.map(m => (
                  <button
                    key={m.value}
                    className="w-full text-left px-3 py-1.5 rounded flex items-center gap-2"
                    style={{
                      background: aiProvider === 'claude' && claudeModel === m.value
                        ? 'rgba(180,79,255,0.1)' : 'transparent',
                      color: aiProvider === 'claude' && claudeModel === m.value
                        ? '#b44fff' : '#8b949e',
                      border: 'none', fontSize: '12px',
                    }}
                    onClick={() => handleModelSelect('claude', m.value)}
                  >
                    {aiProvider === 'claude' && claudeModel === m.value && (
                      <span style={{ color: '#b44fff', fontSize: 10 }}>✓</span>
                    )}
                    {m.label}
                  </button>
                ))}
                <div style={{ height: '1px', background: 'rgba(42,51,71,0.5)', margin: '4px 8px' }} />
                <div
                  className="px-2 py-1.5 mb-0.5"
                  style={{ fontSize: '10px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Ollama (Local)
                </div>
                <button
                  className="w-full text-left px-3 py-1.5 rounded flex items-center gap-2"
                  style={{
                    background: aiProvider === 'ollama' ? 'rgba(63,185,80,0.1)' : 'transparent',
                    color: aiProvider === 'ollama' ? '#3fb950' : '#8b949e',
                    border: 'none', fontSize: '12px',
                  }}
                  onClick={() => handleModelSelect('ollama')}
                >
                  {aiProvider === 'ollama' && <span style={{ color: '#3fb950', fontSize: 10 }}>✓</span>}
                  {ollamaModel ? `Ollama: ${ollamaModel}` : 'Ollama (configure in Settings)'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Fullscreen */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md no-drag transition-colors"
          style={{ background: 'transparent', border: 'none', color: '#484f58' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(19,21,37,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          onClick={handleFullscreen}
          title="Toggle Fullscreen"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>

        {/* CYBERTOOLS badge */}
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(180,79,255,0.06)', color: '#484f58', border: '1px solid rgba(180,79,255,0.1)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-8 h-8 flex items-center justify-center rounded-md no-drag transition-colors"
            style={{ background: 'transparent', border: '1px solid rgba(42,51,71,0.5)', color: '#484f58', fontSize: 12, fontWeight: 700 }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(180,79,255,0.5)';
              el.style.color = '#b44fff';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(42,51,71,0.5)';
              el.style.color = '#484f58';
            }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
}
