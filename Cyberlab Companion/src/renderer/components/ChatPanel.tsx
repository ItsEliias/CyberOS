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

      {/* Session bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.7)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-xs font-medium truncate" style={{ color: '#8b949e' }}>
            {session.labName}
          </span>
          <span style={{ color: 'rgba(42,51,71,0.8)' }}>·</span>
          <Badge variant={session.platform === 'HTB' ? 'purple' : 'default'}>
            {session.platform}
          </Badge>
          <Badge
            variant={
              session.difficulty === 'Easy' ? 'success'
              : session.difficulty === 'Medium' ? 'warning'
              : session.difficulty === 'Hard' ? 'warning'
              : 'danger'
            }
          >
            {session.difficulty}
          </Badge>
          {session.target.ip && (
            <span className="font-mono text-[11px]" style={{ color: '#484f58' }}>
              {session.target.ip}
            </span>
          )}
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(13,14,24,0.8)',
              border: '1px solid rgba(42,51,71,0.5)',
              color: '#484f58',
            }}
          >
            {modelLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* End session */}
          <button
            className="text-xs px-2.5 py-1 rounded-md"
            style={{
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.25)',
              color: '#f85149',
            }}
            onClick={() => setShowCloseModal(true)}
            title="End this lab session"
          >
            End Session
          </button>

          {/* Hint button */}
          <button
            className="relative flex items-center gap-1 text-xs px-2.5 py-1 rounded-md btn-ghost"
            onClick={logHint}
            title="Log a hint taken"
          >
            <span>? Hint</span>
            {(session.hintsUsed || 0) > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#d29922', color: '#07080f' }}
              >
                {session.hintsUsed}
              </span>
            )}
          </button>

          {/* Screenshot */}
          <button
            className="text-xs px-2.5 py-1 rounded-md btn-ghost"
            onClick={takeScreenshot}
            disabled={screenshotLoading}
            title="Capture screenshot"
          >
            {screenshotLoading ? '...' : '[ss]'}
          </button>

          {/* Hint level */}
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(l => (
              <button
                key={l}
                className="w-5 h-5 text-[10px] rounded transition-colors flex items-center justify-center font-bold"
                style={{
                  border: session.hintLevel === l ? `1px solid currentColor` : '1px solid transparent',
                  background: session.hintLevel === l ? 'rgba(180,79,255,0.08)' : 'transparent',
                  color: session.hintLevel === l ? '#b44fff' : '#484f58',
                  padding: 0,
                }}
                onClick={() => activeTabId && updateSession(activeTabId, { hintLevel: l })}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Teach Me */}
          <button
            className="text-xs px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: session.teachMeMode ? '#b44fff' : 'transparent',
              border: session.teachMeMode ? '1px solid #b44fff' : '1px solid rgba(42,51,71,0.6)',
              color: session.teachMeMode ? '#fff' : '#484f58',
              fontWeight: 500,
            }}
            onClick={() => activeTabId && updateSession(activeTabId, { teachMeMode: !session.teachMeMode, usedTeachMe: true })}
          >
            Teach Me
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
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: '#484f58' }}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(180,79,255,0.08)',
                border: '1px solid rgba(180,79,255,0.15)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b44fff" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium" style={{ color: '#8b949e' }}>Ask me anything about your lab.</div>
              <div className="text-xs mt-1" style={{ color: '#484f58' }}>Hint level {session.hintLevel} active</div>
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
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
                <div
                  className={isUser ? 'chat-msg-user' : 'chat-msg-ai'}
                  style={isUser ? {
                    background: 'linear-gradient(135deg, rgba(180,79,255,0.22) 0%, rgba(180,79,255,0.12) 100%)',
                    border: '1px solid rgba(180,79,255,0.35)',
                    borderRadius: '12px 4px 12px 12px',
                    padding: '10px 14px',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  } : {
                    background: 'rgba(13,14,24,0.72)',
                    border: '1px solid rgba(255,255,255,0.055)',
                    borderRadius: '4px 12px 12px 12px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '10px 14px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {isUser ? (
                    <p className="text-sm selectable whitespace-pre-wrap" style={{ color: '#e6edf3' }}>
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
          <div className="flex justify-start">
            <div className="chat-msg-ai">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: '#b44fff' }}
                />
                <span className="text-xs" style={{ color: '#484f58' }}>Thinking...</span>
              </div>
            </div>
          </div>
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

      {/* Input area */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.8)' }}
      >
        <div
          className="flex gap-2 items-end rounded-lg p-2"
          style={{
            background: 'var(--surface-1)',
            border: streaming ? '1px solid rgba(180,79,255,0.3)' : '1px solid rgba(42,51,71,0.6)',
            transition: 'border-color 0.15s',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your lab... (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none text-sm leading-relaxed max-h-32 min-h-[36px] bg-transparent"
            style={{
              border: 'none', outline: 'none', padding: '2px 4px',
              color: '#e6edf3', fontFamily: 'var(--font-display)',
            }}
            rows={1}
            disabled={streaming}
          />
          <button
            className="flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: streaming || !input.trim() ? 'rgba(180,79,255,0.1)' : '#b44fff',
              color: streaming || !input.trim() ? '#b44fff' : '#fff',
              border: '1px solid rgba(180,79,255,0.3)',
              opacity: streaming || !input.trim() ? 0.5 : 1,
            }}
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
          >
            {streaming ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" />
                Wait
              </span>
            ) : 'Send'}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-1.5 px-1">
          <span className="text-[11px]" style={{ color: '#484f58' }}>
            {session.chat.length} msg{session.chat.length !== 1 ? 's' : ''}
          </span>
          {(session.hintsUsed || 0) > 0 && (
            <span className="text-[11px]" style={{ color: '#d29922' }}>
              {session.hintsUsed} hint{session.hintsUsed !== 1 ? 's' : ''}
            </span>
          )}
          {session.findings.flags.length > 0 && (
            <span className="text-[11px]" style={{ color: '#3fb950' }}>
              {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[11px] ml-auto" style={{ color: '#484f58' }}>
            Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
}
