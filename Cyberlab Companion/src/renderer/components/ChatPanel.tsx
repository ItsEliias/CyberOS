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

// Port/credential regex for ReconDesk quick-save
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
    // Ecosystem: notify other CyberOS tools that a lab has started
    try {
      await (window.electronAPI as Record<string, Function>).startLab({
        name: newSession.labName,
        platform: newSession.platform,
        targetIP: newSession.target.ip || undefined,
      });
      showToast('Ecosystem updated — GhostVault and PlaybookStudio notified');
    } catch {
      // Non-fatal — session still starts locally
    }
  }

  async function sendMessage() {
    if (!input.trim() || streaming || !session || !activeTabId) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
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
        const ollamaMessages = [
          { role: 'system', content: systemPrompt },
          ...history,
        ];
        const raw = await (window.electronAPI as Record<string, Function>).ollamaChat({
          model: ollamaModel,
          messages: ollamaMessages,
          endpoint: ollamaEndpoint,
        }) as { success: boolean; content?: string; error?: string };
        if (!raw?.success) throw new Error(raw?.error || 'Ollama error');
        responseText = raw.content || '';
      } else {
        const raw = await window.electronAPI.claudeChat({
          system: systemPrompt,
          messages: history,
          model: claudeModel,
        }) as { success: boolean; data?: { content?: Array<{ text?: string }> }; error?: string };
        if (!raw?.success) throw new Error(raw?.error || 'Claude API error');
        responseText = raw.data?.content?.[0]?.text || '';
      }

      const assistantMsgId = makeId();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };

      // Parse findings from response
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

      // Parse for ReconDesk suggestions
      const suggestions: ReconSuggestion[] = [];
      let pm: RegExpExecArray | null;
      const portPatternCopy = new RegExp(PORT_PATTERN.source, 'gi');
      while ((pm = portPatternCopy.exec(responseText)) !== null) {
        suggestions.push({ type: 'port', data: { port: pm[1], source: 'AI analysis' }, msgId: assistantMsgId });
      }
      const credPatternCopy = new RegExp(CRED_PATTERN.source, 'gi');
      while ((pm = credPatternCopy.exec(responseText)) !== null) {
        suggestions.push({ type: 'credential', data: { username: pm[1], password: pm[2] }, msgId: assistantMsgId });
      }
      if (suggestions.length > 0) setReconSuggestions(prev => [...prev, ...suggestions]);

      addChatMessage(activeTabId, assistantMsg);
    } catch (e: unknown) {
      SOUNDS.apiError();
      const errMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: `**Error:** ${e instanceof Error ? e.message : 'API request failed. Check your settings.'}`,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(activeTabId, errMsg);
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
      const res = await (window.electronAPI as Record<string, Function>).takeScreenshot() as { success: boolean; data?: string; error?: string };
      if (res.success && res.data) {
        setScreenshot({ base64: res.data, id: makeId() });
      }
    } catch (e) {
      console.error('screenshot error', e);
    } finally {
      setScreenshotLoading(false);
    }
  }

  async function saveScreenshotToVault() {
    if (!screenshot || !session) return;
    try {
      await (window.electronAPI as Record<string, Function>).saveScreenshot({
        base64: screenshot.base64,
        sessionName: session.name,
        labName: session.labName,
        vaultPath: config?.obsidianVault || '',
      });
      const attachment: ScreenshotAttachment = {
        id: screenshot.id,
        path: '',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        labName: session.labName,
      };
      updateSession(activeTabId!, { screenshots: [...(session.screenshots || []), attachment] });
      setScreenshot(null);
    } catch (e) {
      console.error('save screenshot error', e);
    }
  }

  async function pushToReconDesk(suggestion: ReconSuggestion) {
    if (!session) return;
    try {
      await (window.electronAPI as Record<string, Function>).pushToReconDesk({
        targetName: session.labName,
        finding: { type: suggestion.type, data: suggestion.data },
      });
      setReconSuggestions(prev => prev.filter(s => s !== suggestion));
    } catch (e) {
      console.error('recondesk push error', e);
    }
  }

  async function handleEndSessionConfirm() {
    setShowCloseModal(false);
    try {
      await (window.electronAPI as Record<string, Function>).endLab();
    } catch {
      // Non-fatal
    }
    // Reset this tab to a blank session
    if (activeTabId) {
      const blank = createSession({ name: 'New Session' });
      updateTab(activeTabId, { session: blank, chatHistory: [] });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (isSetup) return <SessionSetup onStart={handleSetupDone} />;

  return (
    <div className="flex flex-col h-full">
      {/* Ecosystem toast */}
      <AnimatePresence>
        {ecosystemToast && (
          <motion.div
            key="ecosystem-toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '54px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'var(--panel)',
              border: '1px solid var(--success)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              color: 'var(--success)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {ecosystemToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close modal */}
      {showCloseModal && (
        <LabCloseModal
          labName={session.labName}
          onConfirm={handleEndSessionConfirm}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      {/* Session bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
        <span className="text-xs text-[var(--text-muted)]">
          {session.labName} • {session.platform} • {session.difficulty}
          {session.target.ip && ` • ${session.target.ip}`}
        </span>
        {/* AI model badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] font-mono">
          {aiProvider === 'ollama' ? `ollama:${ollamaModel || '?'}` : claudeModel.split('-').slice(1,3).join('-')}
        </span>
        <div className="flex-1" />
        {/* End Session button */}
        <button
          className="text-xs px-2 py-1 rounded btn-ghost"
          style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
          onClick={() => setShowCloseModal(true)}
          title="End this lab session"
        >
          End Session
        </button>
        {/* Hint taken button */}
        <button
          className="relative flex items-center gap-1 text-xs px-2 py-1 rounded btn-ghost"
          onClick={logHint}
          title="Log a hint taken"
        >
          <span>?</span>
          <span>Hint</span>
          {(session.hintsUsed || 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--warning)] text-[10px] text-black flex items-center justify-center font-bold">
              {session.hintsUsed}
            </span>
          )}
        </button>
        {/* Screenshot button */}
        <button
          className="text-xs px-2 py-1 rounded btn-ghost"
          onClick={takeScreenshot}
          disabled={screenshotLoading}
          title="Capture screenshot"
        >
          {screenshotLoading ? '...' : '[ss]'}
        </button>
        {/* Hint level */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)]">Hint:</span>
          {[1,2,3,4,5].map(l => (
            <button
              key={l}
              className={`w-5 h-5 text-xs rounded transition-colors ${
                session.hintLevel === l ? `hint-${l} border bg-[var(--accent-dim)]` : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              style={{ border: session.hintLevel === l ? undefined : 'none', padding: 0 }}
              onClick={() => activeTabId && updateSession(activeTabId, { hintLevel: l })}
            >
              {l}
            </button>
          ))}
        </div>
        {/* Teach Me toggle */}
        <button
          className={`text-xs px-2.5 py-1 rounded transition-colors ${
            session.teachMeMode ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'btn-ghost'
          }`}
          onClick={() => activeTabId && updateSession(activeTabId, { teachMeMode: !session.teachMeMode, usedTeachMe: true })}
        >
          Teach Me
        </button>
      </div>

      {/* Screenshot preview */}
      <AnimatePresence>
        {screenshot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border)] bg-[var(--bg3)] px-4 py-2 flex items-center gap-3"
          >
            <img
              src={`data:image/png;base64,${screenshot.base64}`}
              alt="screenshot"
              className="w-24 h-16 object-cover rounded border border-[var(--border)] cursor-pointer"
              onClick={() => {
                const w = window.open('', '_blank');
                if (w) w.document.write(`<img src="data:image/png;base64,${screenshot.base64}" style="max-width:100%" />`);
              }}
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">Screenshot captured — click to expand</span>
              <div className="flex gap-2">
                <button className="btn-accent text-xs px-2 py-1" onClick={saveScreenshotToVault}>Save to Vault</button>
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => setScreenshot(null)}>Discard</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-sm mt-8">
            <div className="text-2xl mb-2">🤖</div>
            <div>Ask me anything about your lab.</div>
            <div className="text-xs mt-1 text-[var(--text-muted)] opacity-60">Hint level {session.hintLevel} active</div>
          </div>
        )}

        {messages.map(msg => {
          const parsed = msg.role === 'assistant' ? parseAiResponse(msg.content) : null;
          return (
            <motion.div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm selectable whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownRenderer content={msg.content} />
                    {parsed && parsed.ports.length > 0 && (
                      <ParsedPortChips
                        ports={parsed.ports}
                        targetName={session?.labName || ''}
                      />
                    )}
                    {parsed && parsed.credentials.length > 0 && (
                      <ParsedCredChips
                        creds={parsed.credentials}
                        targetName={session?.labName || ''}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {streaming && (
          <div className="flex justify-start">
            <div className="chat-msg-ai max-w-[85%]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
                <span className="text-xs text-[var(--text-muted)]">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* ReconDesk quick-save suggestions */}
        {reconSuggestions.length > 0 && (
          <div className="space-y-1">
            {reconSuggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg3)] text-xs"
              >
                <span className="text-[var(--accent)]">ReconDesk:</span>
                <span className="text-[var(--text-dim)]">
                  {s.type === 'port' ? `Port ${(s.data as Record<string,string>).port} open` : `Credential: ${(s.data as Record<string,string>).username}/${(s.data as Record<string,string>).password}`}
                </span>
                <button className="btn-accent px-2 py-0.5 text-xs ml-auto" onClick={() => pushToReconDesk(s)}>Save</button>
                <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setReconSuggestions(p => p.filter((_, j) => j !== i))}>Dismiss</button>
              </motion.div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your lab... (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none text-sm leading-relaxed max-h-32 min-h-[40px]"
            style={{ height: 'auto' }}
            rows={1}
            disabled={streaming}
          />
          <button
            className="btn-accent px-4 py-2 flex-shrink-0"
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
          >
            {streaming ? '...' : 'Send'}
          </button>
        </div>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="text-xs text-[var(--text-muted)]">
            {session.chat.length} message{session.chat.length !== 1 ? 's' : ''}
          </span>
          {(session.hintsUsed || 0) > 0 && (
            <span className="text-xs" style={{ color: 'var(--warning)' }}>
              Hints: {session.hintsUsed}
            </span>
          )}
          {session.findings.flags.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--success)' }}>
              {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
