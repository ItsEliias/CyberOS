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

  const vpnColor = vpnStatus.status === 'active' ? '#3fb950' :
                   vpnStatus.status === 'off' ? '#f85149' : '#4a5568';

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

  return (
    <div
      className="h-10 border-b flex items-center px-4 drag-region shrink-0"
      style={{
        background: 'rgba(10, 10, 15, 0.92)',
        borderBottomColor: 'rgba(42, 51, 71, 0.5)',
      }}
    >
      {/* macOS traffic light spacer */}
      <div className="w-[70px] no-drag" />

      {/* App identity */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L13.5 4.75V11.25L8 14.5L2.5 11.25V4.75L8 1.5Z" stroke="#b44fff" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="8" r="2" fill="#b44fff" />
        </svg>
        <span className="text-sm font-medium" style={{ color: '#8b949e' }}>
          CyberLab Companion
        </span>
        {session?.labName && session.labName !== 'New Session' && (
          <>
            <span style={{ color: '#2a3347' }}>—</span>
            <span className="text-xs" style={{ color: '#b44fff' }}>{session.labName}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2 no-drag">
        {/* VPN indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: vpnColor,
              boxShadow: vpnStatus.status === 'active' ? `0 0 4px ${vpnColor}88` : 'none',
            }}
          />
          <span style={{ color: vpnColor, fontSize: '11px' }}>
            {vpnStatus.status === 'active'
              ? (vpnStatus.ip || 'VPN')
              : vpnStatus.status === 'off'
              ? 'No VPN'
              : 'VPN?'}
          </span>
        </div>

        {/* AI provider selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md no-drag"
            style={{
              background: 'rgba(26, 27, 38, 0.8)',
              border: '1px solid rgba(42, 51, 71, 0.6)',
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
            <span style={{ opacity: 0.5 }}>▾</span>
          </button>

          {showAiMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAiMenu(false)} />
              <div
                className="absolute right-0 top-8 z-20 p-1 rounded-lg"
                style={{
                  background: 'rgba(18, 19, 26, 0.98)',
                  border: '1px solid rgba(42, 51, 71, 0.8)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  minWidth: '180px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="px-2 py-1 mb-1" style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Claude API
                </div>
                {CLAUDE_MODELS.map(m => (
                  <button
                    key={m.value}
                    className="w-full text-left px-3 py-1.5 rounded text-xs flex items-center gap-2"
                    style={{
                      background: aiProvider === 'claude' && claudeModel === m.value ? 'rgba(180, 79, 255, 0.12)' : 'transparent',
                      color: aiProvider === 'claude' && claudeModel === m.value ? '#b44fff' : '#8b949e',
                      border: 'none',
                      fontSize: '12px',
                    }}
                    onClick={() => handleModelSelect('claude', m.value)}
                  >
                    {aiProvider === 'claude' && claudeModel === m.value && (
                      <span style={{ color: '#b44fff' }}>✓</span>
                    )}
                    {m.label}
                  </button>
                ))}
                <div
                  className="my-1"
                  style={{ height: '1px', background: 'rgba(42, 51, 71, 0.5)', margin: '4px 8px' }}
                />
                <div className="px-2 py-1 mb-1" style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ollama (Local)
                </div>
                <button
                  className="w-full text-left px-3 py-1.5 rounded text-xs flex items-center gap-2"
                  style={{
                    background: aiProvider === 'ollama' ? 'rgba(63, 185, 80, 0.12)' : 'transparent',
                    color: aiProvider === 'ollama' ? '#3fb950' : '#8b949e',
                    border: 'none',
                    fontSize: '12px',
                  }}
                  onClick={() => handleModelSelect('ollama')}
                >
                  {aiProvider === 'ollama' && <span style={{ color: '#3fb950' }}>✓</span>}
                  {ollamaModel ? `Ollama: ${ollamaModel}` : 'Ollama (configure in Settings)'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Fullscreen */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-md no-drag"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4a5568',
          }}
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
          style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded-md no-drag"
            style={{ background: 'transparent', border: '1px solid rgba(42,51,71,0.6)', color: '#4a5568', fontSize: 12, fontWeight: 700 }}
            onMouseEnter={e => { const el = e.target as HTMLElement; el.style.borderColor = '#b44fff'; el.style.color = '#b44fff' }}
            onMouseLeave={e => { const el = e.target as HTMLElement; el.style.borderColor = 'rgba(42,51,71,0.6)'; el.style.color = '#4a5568' }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
}
