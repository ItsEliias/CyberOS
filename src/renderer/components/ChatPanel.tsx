import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { buildSystemPrompt, parseFindings, createSession } from '../lib/session';
import { SOUNDS } from '../lib/sounds';
import type { ChatMessage, Session } from '@shared/types';

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre class="code-block text-xs mt-2 mb-2"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-[var(--code-bg)] text-[var(--accent)] font-mono text-xs border border-[var(--border)]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[var(--text)] mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-[var(--accent-2)] mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold text-[var(--accent)] mt-3 mb-2">$1</h1>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="prose selectable text-sm"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${html}</p>` }}
    />
  );
}

interface SessionSetupProps {
  onStart: (opts: Partial<Session>) => void;
}

function SessionSetup({ onStart }: SessionSetupProps) {
  const [labName, setLabName] = useState('');
  const [platform, setPlatform] = useState<'HTB'|'THM'|'CTF'|'Other'>('HTB');
  const [difficulty, setDifficulty] = useState<'Easy'|'Medium'|'Hard'|'Insane'|''>('Medium');
  const [labType, setLabType] = useState('HTB/THM Linux');
  const [ip, setIp] = useState('');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMins, setTimerMins] = useState(120);

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-[480px] panel p-6">
        <h2 className="text-base font-semibold text-[var(--accent)] mb-4">New Session</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="input-group col-span-2">
            <label>Lab / Machine Name</label>
            <input type="text" value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Lame, Mr Robot" className="w-full" />
          </div>
          <div className="input-group">
            <label>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value as never)} className="w-full">
              {['HTB','THM','CTF','Other'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as never)} className="w-full">
              {['Easy','Medium','Hard','Insane'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="input-group col-span-2">
            <label>Lab Type</label>
            <select value={labType} onChange={e => setLabType(e.target.value)} className="w-full">
              {['HTB/THM Linux','HTB/THM Windows','CTF','Cisco/Networking','Web App','OSINT/CTF','Other'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group col-span-2">
            <label>Target IP (optional)</label>
            <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="10.10.10.x" className="w-full font-mono" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" checked={timerEnabled} onChange={e => setTimerEnabled(e.target.checked)} id="timer-cb" />
            <label htmlFor="timer-cb" className="text-sm text-[var(--text-dim)] cursor-pointer">Exam Mode (timer)</label>
            {timerEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={timerMins}
                  onChange={e => setTimerMins(parseInt(e.target.value) || 120)}
                  className="w-20 text-sm"
                  min={10}
                  max={600}
                />
                <span className="text-xs text-[var(--text-muted)]">mins</span>
              </div>
            )}
          </div>
        </div>
        <button
          className="btn-accent w-full py-2.5"
          onClick={() => onStart({ name: labName || 'New Session', labName: labName || 'New Session', platform, difficulty, labType: labType as never, ip, timerEnabled, timerMins })}
        >
          Start Session
        </button>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { tabs, activeTabId, updateTab, updateSession, addChatMessage } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeTab?.chatHistory || [];
  const isSetup = !session?.labName || session.labName === 'New Session';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  function handleSetupDone(opts: Partial<Session>) {
    if (!activeTabId) return;
    const newSession = createSession(opts);
    updateTab(activeTabId, { session: newSession, chatHistory: [] });
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
      const response = await window.electronAPI.claudeChat({
        systemPrompt,
        messages: history,
        hintLevel: session.hintLevel,
      });

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: response as string,
        timestamp: new Date().toISOString(),
      };

      // Parse findings from response
      const newFindings = parseFindings(response as string, session);
      if (newFindings.length > 0) {
        SOUNDS.finding();
        if (newFindings.some(f => f.type === 'FLAG')) SOUNDS.flag();
        updateSession(activeTabId, { findings: session.findings, updatedAt: new Date().toISOString() });
      }

      addChatMessage(activeTabId, assistantMsg);
    } catch (e: unknown) {
      SOUNDS.apiError();
      const errMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: `**Error:** ${e instanceof Error ? e.message : 'API request failed. Check your API key in Settings.'}`,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(activeTabId, errMsg);
    } finally {
      setStreaming(false);
      setStreamingContent('');
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
      {/* Session bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
        <span className="text-xs text-[var(--text-muted)]">
          {session.labName} • {session.platform} • {session.difficulty}
          {session.target.ip && ` • ${session.target.ip}`}
        </span>
        <div className="flex-1" />
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-sm mt-8">
            <div className="text-2xl mb-2">🤖</div>
            <div>Ask me anything about your lab.</div>
            <div className="text-xs mt-1 text-[var(--text-muted)] opacity-60">Hint level {session.hintLevel} active</div>
          </div>
        )}

        {messages.map(msg => (
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
                <MarkdownRenderer content={msg.content} />
              )}
            </div>
          </motion.div>
        ))}

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
          {session.findings.flags.length > 0 && (
            <span className="text-xs text-[var(--success)]">
              🚩 {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
