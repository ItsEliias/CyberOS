import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { buildSystemPrompt, parseFindings, createSession } from '../lib/session';
import { SOUNDS } from '../lib/sounds';
import { parseAiResponse } from '../hooks/useAiParser';
import type { ChatMessage, Session, ScreenshotAttachment } from '@shared/types';
import LabCloseModal from './LabCloseModal';
import SessionSetup from './SessionSetup';
import MarkdownRenderer from './MarkdownRenderer';
import SessionCompleteModal from './writeup/SessionCompleteModal';
import WriteupEditor from './writeup/WriteupEditor';
import FlagLogger from './flags/FlagLogger';
import ParsedPortChips from './chat/ParsedPortChips';
import ParsedCredChips from './chat/ParsedCredChips';
import LiveDot from './ui/LiveDot';
import Badge from './ui/Badge';

const PORT_PATTERN = /\bport[s]?\s+(\d{1,5})\s+(?:is\s+)?(?:open|running|listening)/gi;
const CRED_PATTERN = /credential[s]?[:\s]+([^\s/]+)\/([^\s,.\n]+)/gi;

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

interface ReconSuggestion {
  type: 'port' | 'credential';
  data: Record<string, unknown>;
  msgId: string;
}

export default function ChatPanel() {
  const { tabs, activeTabId, updateTab, updateSession, addChatMessage, config } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [reconSuggestions, setReconSuggestions] = useState<ReconSuggestion[]>([]);
  const [screenshot, setScreenshot] = useState<{ base64: string; id: string } | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [ecosystemToast, setEcosystemToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function showToast(msg: string) {
    setEcosystemToast(msg);
    setTimeout(() => setEcosystemToast(null), 3500);
  }

  const messages = activeTab?.chatHistory || [];
  const isSetup = !session?.labName || session.labName === 'New Session';
  const aiProvider = config?.aiProvider || 'claude';
  const claudeModel = config?.claudeModel || 'claude-sonnet-4-6';
  const ollamaModel = config?.ollamaModel || '';
  const ollamaEndpoint = config?.ollamaEndpoint || 'http://localhost:11434';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  async function handleSetupDone(opts: Partial<Session>) {
    if (!activeTabId) return;
    const newSession = createSession(opts);
    updateTab(activeTabId, { session: newSession, chatHistory: [] });
    try {
      await (window.electronAPI as Record<string, Function>).startLab({
        name: newSession.labName,
        platform: newSession.platform,
        targetIP: newSession.target.ip || undefined,
      });
      showToast('Ecosystem updated — GhostVault and PlaybookStudio notified');
    } catch { /* Non-fatal */ }
  }

  async function sendMessage() {
    if (!input.trim() || streaming || !session || !activeTabId) return;

    const userMsg: ChatMessage = {
      id: makeId(), role: 'user',
      content: input.trim(), timestamp: new Date().toISOString(),
    };

    addChatMessage(activeTabId, userMsg);
    setInput('');
    setStreaming(true);
    setStreamingContent('');

    const systemPrompt = buildSystemPrompt(session);
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      let responseText = '';

      if (aiProvider === 'ollama') {
        const raw = await (window.electronAPI as Record<string, Function>).ollamaChat({
          model: ollamaModel, messages: [{ role: 'system', content: systemPrompt }, ...history],
          endpoint: ollamaEndpoint,
        }) as { success: boolean; content?: string; error?: string };
        if (!raw?.success) throw new Error(raw?.error || 'Ollama error');
        responseText = raw.content || '';
      } else {
        const raw = await window.electronAPI.claudeChat({
          system: systemPrompt, messages: history, model: claudeModel,
        }) as { success: boolean; data?: { content?: Array<{ text?: string }> }; error?: string };
        if (!raw?.success) throw new Error(raw?.error || 'Claude API error');
        responseText = raw.data?.content?.[0]?.text || '';
      }

      const assistantMsgId = makeId();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId, role: 'assistant',
        content: responseText, timestamp: new Date().toISOString(),
      };

      const newFindings = parseFindings(responseText, session);
      if (newFindings.length > 0) {
        SOUNDS.finding();
        const flagCount = newFindings.filter(f => f.type === 'FLAG').length;
        if (flagCount > 0) {
          SOUNDS.flag();
          (window.electronAPI as Record<string, Function>).incrementFlags(flagCount).catch(() => {});
        }
        updateSession(activeTabId, { findings: session.findings, updatedAt: new Date().toISOString() });
      }

      const suggestions: ReconSuggestion[] = [];
      let pm: RegExpExecArray | null;
      const portPat = new RegExp(PORT_PATTERN.source, 'gi');
      while ((pm = portPat.exec(responseText)) !== null)
        suggestions.push({ type: 'port', data: { port: pm[1], source: 'AI analysis' }, msgId: assistantMsgId });
      const credPat = new RegExp(CRED_PATTERN.source, 'gi');
      while ((pm = credPat.exec(responseText)) !== null)
        suggestions.push({ type: 'credential', data: { username: pm[1], password: pm[2] }, msgId: assistantMsgId });
      if (suggestions.length > 0) setReconSuggestions(prev => [...prev, ...suggestions]);

      addChatMessage(activeTabId, assistantMsg);
    } catch (e: unknown) {
      SOUNDS.apiError();
      addChatMessage(activeTabId, {
        id: makeId(), role: 'assistant',
        content: `**Error:** ${e instanceof Error ? e.message : 'API request failed. Check your settings.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  function logHint() {
    if (!session || !activeTabId) return;
    const stage = session.methodology.activePhase || 'Unknown';
    const hintLog = [...(session.hintLog || []), { timestamp: new Date().toISOString(), stage }];
    updateSession(activeTabId, { hintsUsed: (session.hintsUsed || 0) + 1, hintLog });
    SOUNDS.finding?.();
  }

  async function takeScreenshot() {
    setScreenshotLoading(true);
    try {
      const res = await (window.electronAPI as Record<string, Function>).takeScreenshot() as { success: boolean; data?: string };
      if (res.success && res.data) setScreenshot({ base64: res.data, id: makeId() });
    } catch (e) { console.error('screenshot error', e); }
    finally { setScreenshotLoading(false); }
  }

  async function saveScreenshotToVault() {
    if (!screenshot || !session) return;
    try {
      await (window.electronAPI as Record<string, Function>).saveScreenshot({
        base64: screenshot.base64, sessionName: session.name,
        labName: session.labName, vaultPath: config?.obsidianVault || '',
      });
      const attachment: ScreenshotAttachment = {
        id: screenshot.id, path: '', timestamp: new Date().toISOString(),
        sessionId: session.id, labName: session.labName,
      };
      updateSession(activeTabId!, { screenshots: [...(session.screenshots || []), attachment] });
      setScreenshot(null);
    } catch (e) { console.error('save screenshot error', e); }
  }

  async function pushToReconDesk(suggestion: ReconSuggestion) {
    if (!session) return;
    try {
      await (window.electronAPI as Record<string, Function>).pushToReconDesk({
        targetName: session.labName,
        finding: { type: suggestion.type, data: suggestion.data },
      });
      setReconSuggestions(prev => prev.filter(s => s !== suggestion));
    } catch (e) { console.error('recondesk push error', e); }
  }

  async function handleEndSessionConfirm() {
    setShowCloseModal(false);
    try { await (window.electronAPI as Record<string, Function>).endLab(); } catch {}
    if (activeTabId) {
      const blank = createSession({ name: 'New Session' });
      updateTab(activeTabId, { session: blank, chatHistory: [] });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (isSetup) return <SessionSetup onStart={handleSetupDone} />;

  const modelLabel = aiProvider === 'ollama'
    ? `ollama:${ollamaModel || '?'}`
    : claudeModel.split('-').slice(1, 3).join('-');

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      {/* Ecosystem toast */}
      <AnimatePresence>
        {ecosystemToast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: '54px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, background: 'rgba(13,14,24,0.96)',
              border: '1px solid rgba(63,185,80,0.3)', borderRadius: '8px',
              padding: '7px 14px', fontSize: '12px', color: '#3fb950',
              pointerEvents: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {ecosystemToast}
          </motion.div>
        )}
      </AnimatePresence>

      {showCloseModal && (
        <LabCloseModal
          labName={session.labName}
          onConfirm={handleEndSessionConfirm}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      {/* Session bar — structured meta strip */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {/* Platform badge */}
          <span
            className="platform-badge"
            data-platform={session.platform}
          >
            {session.platform}
          </span>
          {/* Difficulty pill */}
          {session.difficulty && (
            <span className="diff-pill" data-diff={session.difficulty}>
              {session.difficulty}
            </span>
          )}
          {/* Target IP — monospace, copyable-feeling */}
          {session.target.ip && (
            <span className="data-value" style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-caption)' }}>
              {session.target.ip}
            </span>
          )}
          {/* Model label */}
          <span
            className="font-mono"
            style={{
              fontSize: 'var(--type-caption)',
              color: 'var(--text-muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '1px 5px',
            }}
          >
            {modelLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Hint level stepper */}
          <div className="flex items-center gap-0.5 mr-1">
            {[1,2,3,4,5].map(l => (
              <button
                key={l}
                style={{
                  width: '18px', height: '18px',
                  fontSize: 'var(--type-caption)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  border: session.hintLevel === l ? '1px solid rgba(180,79,255,0.4)' : '1px solid transparent',
                  background: session.hintLevel === l ? 'rgba(180,79,255,0.08)' : 'transparent',
                  color: session.hintLevel === l ? '#b44fff' : 'var(--text-muted)',
                  borderRadius: '3px',
                  padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={() => activeTabId && updateSession(activeTabId, { hintLevel: l })}
                title={`Hint level ${l}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Hint log button */}
          <button
            className="relative flex items-center gap-1 rounded"
            onClick={logHint}
            title="Log a hint taken"
            style={{
              fontSize: 'var(--type-caption)',
              padding: '3px 8px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Hint
            {(session.hintsUsed || 0) > 0 && (
              <span
                style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  fontSize: '8px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#d29922', color: '#07080f',
                }}
              >
                {session.hintsUsed}
              </span>
            )}
          </button>

          {/* Screenshot */}
          <button
            style={{
              fontSize: 'var(--type-caption)',
              padding: '3px 8px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              borderRadius: '4px',
              fontFamily: 'var(--font-display)',
            }}
            onClick={takeScreenshot}
            disabled={screenshotLoading}
            title="Capture screenshot"
          >
            {screenshotLoading ? '…' : 'SS'}
          </button>

          {/* Teach Me toggle */}
          <button
            style={{
              fontSize: 'var(--type-caption)',
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: '4px',
              background: session.teachMeMode ? 'rgba(180,79,255,0.15)' : 'transparent',
              border: session.teachMeMode ? '1px solid rgba(180,79,255,0.4)' : '1px solid var(--border-subtle)',
              color: session.teachMeMode ? '#b44fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
            }}
            onClick={() => activeTabId && updateSession(activeTabId, { teachMeMode: !session.teachMeMode, usedTeachMe: true })}
          >
            Teach
          </button>

          {/* End session */}
          <button
            style={{
              fontSize: 'var(--type-caption)',
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'transparent',
              border: '1px solid rgba(248,81,73,0.3)',
              color: '#f85149',
              fontFamily: 'var(--font-display)',
            }}
            onClick={() => setShowCloseModal(true)}
            title="End this lab session"
          >
            End
          </button>
        </div>
      </div>

      {/* Screenshot preview */}
      <AnimatePresence>
        {screenshot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(13,14,24,0.8)' }}
          >
            <img
              src={`data:image/png;base64,${screenshot.base64}`}
              alt="screenshot"
              className="w-24 h-16 object-cover rounded cursor-pointer"
              style={{ border: '1px solid rgba(42,51,71,0.6)' }}
              onClick={() => {
                const w = window.open('', '_blank');
                if (w) w.document.write(`<img src="data:image/png;base64,${screenshot.base64}" style="max-width:100%" />`);
              }}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: '#8b949e' }}>Screenshot captured — click to expand</span>
              <div className="flex gap-2">
                <button className="btn-accent text-xs px-2 py-1" onClick={saveScreenshotToVault}>Save to Vault</button>
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => setScreenshot(null)}>Discard</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-area">
        {messages.length === 0 && (
          <div className="empty-state h-full">
            {/* CTF flag glyph — domain-specific empty state identity */}
            <div className="empty-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="2" x2="4" y2="18" />
                <path d="M4 4 L16 4 L13 8 L16 12 L4 12" fill="rgba(180,79,255,0.12)" />
              </svg>
            </div>
            <div>
              <div className="empty-title">Ready for your lab</div>
              <div className="empty-sub">
                Ask about enumeration, exploits, privilege escalation — I have full session context.
              </div>
              <div
                style={{
                  fontSize: 'var(--type-caption)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '8px',
                }}
              >
                Hint level {session.hintLevel} active
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => {
          const parsed = msg.role === 'assistant' ? parseAiResponse(msg.content) : null;
          const isUser = msg.role === 'user';
          const timeLabel = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <motion.div
              key={msg.id}
              className={`flex group/msg ${isUser ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
                <div
                  className={isUser ? 'chat-msg-user' : 'chat-msg-ai'}
                  style={isUser ? {
                    background: 'rgba(180,79,255,0.1)',
                    border: '1px solid rgba(180,79,255,0.22)',
                    borderRadius: '10px 3px 10px 10px',
                    padding: '9px 13px',
                  } : {
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '3px 10px 10px 10px',
                    padding: '9px 13px',
                  }}
                >
                  {isUser ? (
                    <p
                      className="selectable whitespace-pre-wrap"
                      style={{
                        fontSize: 'var(--type-body)',
                        color: 'var(--text-primary)',
                        lineHeight: 1.55,
                      }}
                    >
                      {msg.content}
                    </p>
                  ) : (
                    <>
                      <MarkdownRenderer content={msg.content} />
                      {parsed && parsed.ports.length > 0 && (
                        <ParsedPortChips ports={parsed.ports} targetName={session?.labName || ''} />
                      )}
                      {parsed && parsed.credentials.length > 0 && (
                        <ParsedCredChips creds={parsed.credentials} targetName={session?.labName || ''} />
                      )}
                    </>
                  )}
                </div>
                {/* Timestamp — fades in on bubble hover */}
                <div
                  className="msg-timestamp font-mono"
                  style={{ textAlign: isUser ? 'right' : 'left', paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0 }}
                >
                  {timeLabel}
                </div>
              </div>
            </motion.div>
          );
        })}

        {streaming && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="flex items-center gap-2 px-3.5 py-2.5"
              style={{
                background: 'rgba(13,14,24,0.82)',
                border: '1px solid rgba(180,79,255,0.18)',
                borderRadius: '4px 12px 12px 12px',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: '#b44fff', opacity: 0.7 }}
              >
                AI
              </span>
              <div className="flex items-center gap-1">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '160ms' }} />
                <span className="typing-dot" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ReconDesk quick-save suggestions */}
        {reconSuggestions.length > 0 && (
          <div className="space-y-1.5">
            {reconSuggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
                style={{ border: '1px solid rgba(180,79,255,0.2)', background: 'rgba(180,79,255,0.05)' }}
              >
                <span style={{ color: '#b44fff', fontWeight: 600 }}>ReconDesk:</span>
                <span style={{ color: '#8b949e' }}>
                  {s.type === 'port'
                    ? `Port ${(s.data as Record<string,string>).port} open`
                    : `Cred: ${(s.data as Record<string,string>).username}/${(s.data as Record<string,string>).password}`}
                </span>
                <button className="btn-accent px-2 py-0.5 text-xs ml-auto" onClick={() => pushToReconDesk(s)}>Save</button>
                <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setReconSuggestions(p => p.filter((_, j) => j !== i))}>×</button>
              </motion.div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — compact instrument-style */}
      <div
        className="flex-shrink-0 px-3 py-2.5"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
      >
        <div
          className="flex gap-2 items-end rounded-lg px-3 py-2"
          style={{
            background: 'var(--surface-1)',
            border: streaming ? '1px solid var(--accent-border)' : '1px solid var(--border-default)',
            transition: 'border-color var(--motion-fast) var(--ease)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your lab… (↵ send, ⇧↵ newline)"
            className="flex-1 resize-none leading-relaxed max-h-32 min-h-[32px] bg-transparent selectable"
            style={{
              border: 'none',
              outline: 'none',
              padding: '1px 0',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--type-body)',
            }}
            rows={1}
            disabled={streaming}
          />
          <button
            className="flex-shrink-0 rounded font-medium"
            style={{
              padding: '5px 14px',
              fontSize: 'var(--type-body)',
              background: streaming || !input.trim() ? 'transparent' : '#b44fff',
              color: streaming || !input.trim() ? '#b44fff' : '#fff',
              border: '1px solid rgba(180,79,255,0.35)',
              opacity: streaming || !input.trim() ? 0.45 : 1,
              fontFamily: 'var(--font-display)',
            }}
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
          >
            {streaming ? (
              <span className="flex items-center gap-1.5">
                <span className="spinner w-3 h-3 border border-current rounded-full" style={{ borderTopColor: 'transparent' }} />
              </span>
            ) : 'Send'}
          </button>
        </div>

        <div className="flex items-center gap-2.5 mt-1 px-0.5">
          <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {session.chat.length}msg
          </span>
          {(session.hintsUsed || 0) > 0 && (
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
              {session.hintsUsed}hint
            </span>
          )}
          {session.findings.flags.length > 0 && (
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              {session.findings.flags.length}flag
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
