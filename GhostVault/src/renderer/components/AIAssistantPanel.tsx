// GhostVault — AI Assistant Panel (Screen 6)
// Full Ollama chat screen with model selector, attach note, AI actions

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

let msgId = 0;

const AI_ACTIONS = [
  { key: 'format',    label: 'Format note',   desc: 'Structure & clean up markdown' },
  { key: 'summarize', label: 'Summarise',      desc: 'Key points only' },
  { key: 'tags',      label: 'Suggest tags',   desc: 'AI-suggested tags for this note' },
  { key: 'expand',    label: 'Expand',         desc: 'Expand bullets into full prose' },
];

export default function AIAssistantPanel() {
  const { ollamaStatus, ollamaModel, setOllamaModel, setOllamaStatus, activeNote, editorContent } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [statusChecking, setStatusChecking] = useState(false);
  const [applyTarget, setApplyTarget] = useState<{ id: number; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (ollamaStatus?.models) setModels(ollamaStatus.models);
  }, [ollamaStatus]);

  const checkConnection = useCallback(async () => {
    setStatusChecking(true);
    try {
      const status = await window.ghostvault.getOllamaStatus();
      setOllamaStatus(status);
      if (status?.models) setModels(status.models);
    } finally {
      setStatusChecking(false);
    }
  }, [setOllamaStatus]);

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return;
    const userMsg: ChatMessage = { id: ++msgId, role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    const assistantId = ++msgId;
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }]);

    try {
      const result = await window.ghostvault.ollamaFormat({
        mode: 'chat',
        text: content.trim(),
        ctx: 'cyber',
        model: ollamaModel,
      });
      const reply = result?.result || 'No response from model.';
      // Simulate character-by-character streaming
      let i = 0;
      const interval = setInterval(() => {
        i += Math.ceil(reply.length / 40);
        const chunk = reply.slice(0, i);
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: chunk, streaming: i < reply.length } : m
        ));
        if (i >= reply.length) {
          clearInterval(interval);
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: reply, streaming: false } : m
          ));
        }
      }, 30);
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: 'Error: could not reach Ollama. Make sure it is running on localhost:11434.', streaming: false } : m
      ));
    } finally {
      setSending(false);
    }
  }

  async function handleAiAction(action: string) {
    if (!editorContent.trim()) {
      sendMessage(`Please help me with: ${action}`);
      return;
    }
    const noteRef = activeNote ? `"${activeNote.name}"` : 'current note';
    const prompts: Record<string, string> = {
      format   : `Format and structure this note from ${noteRef} as clean Markdown:\n\n${editorContent}`,
      summarize: `Summarise the key points from this note (${noteRef}):\n\n${editorContent}`,
      tags     : `Suggest relevant tags for this note (${noteRef}). Return only a comma-separated list of tags:\n\n${editorContent}`,
      expand   : `Expand the bullet points in this note (${noteRef}) into full prose:\n\n${editorContent}`,
    };
    const prompt = prompts[action] || `${action}:\n\n${editorContent}`;
    sendMessage(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function attachCurrentNote() {
    if (!editorContent.trim()) return;
    const noteName = activeNote?.name || 'current note';
    setInput(prev => prev + (prev ? '\n\n' : '') + `[Attached: ${noteName}]\n\n${editorContent}`);
    inputRef.current?.focus();
  }

  function applyToNote(content: string, id: number) {
    setApplyTarget({ id, content });
  }

  function confirmApply() {
    if (!applyTarget) return;
    useStore.getState().setEditorContent(applyTarget.content);
    useStore.getState().setDirty(true);
    setApplyTarget(null);
    setMessages(prev => prev.map(m =>
      m.id === applyTarget.id ? { ...m, content: m.content + '\n\n*✓ Applied to note.*' } : m
    ));
  }

  const isOnline = ollamaStatus?.running;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>AI Assistant</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Powered by Ollama — runs locally
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? 'status-dot-pulse' : ''}`}
                style={{
                  background: isOnline ? '#3fb950' : '#8b949e',
                  '--pulse-color': 'rgba(63,185,80,0.4)',
                } as React.CSSProperties}
              />
              <span className="text-xs" style={{ color: isOnline ? '#3fb950' : 'var(--text-dim)' }}>
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            <button
              onClick={checkConnection}
              disabled={statusChecking}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {statusChecking ? 'Checking…' : 'Test connection'}
            </button>
          </div>
        </div>

        {/* Model selector + AI action shortcuts */}
        <div className="flex items-center gap-3 mt-3">
          {models.length > 0 && (
            <select
              value={ollamaModel}
              onChange={e => { setOllamaModel(e.target.value); window.ghostvault.saveConfig({ ollamaModel: e.target.value }); }}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          <div className="flex gap-1.5 flex-wrap">
            {AI_ACTIONS.map(a => (
              <button
                key={a.key}
                onClick={() => handleAiAction(a.key)}
                disabled={!isOnline || sending}
                title={a.desc}
                className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:scale-[1.02] disabled:opacity-40"
                style={{ borderColor: 'rgba(123,184,255,0.25)', color: '#7bb8ff', background: 'rgba(123,184,255,0.06)' }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="text-4xl opacity-30">🤖</div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
              {isOnline ? 'Ask me anything about your notes' : 'Ollama is not running'}
            </div>
            <div className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
              {isOnline
                ? 'Use the action buttons above to process your current note, or type a message below.'
                : 'Start Ollama with: ollama serve — then click "Test connection".'
              }
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                <div
                  className="px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? { background: 'rgba(123,184,255,0.12)', color: 'var(--text)', border: '1px solid rgba(123,184,255,0.2)' }
                      : { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }
                  }
                >
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-bottom animate-pulse" style={{ background: '#7bb8ff', borderRadius: 2 }} />
                  )}
                </div>
                {msg.role === 'assistant' && !msg.streaming && msg.content && msg.content.length > 20 && activeNote && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={() => applyToNote(msg.content, msg.id)}
                      className="text-[10px] px-2.5 py-1 rounded-lg border transition-colors hover:bg-white/5"
                      style={{ borderColor: 'rgba(123,184,255,0.25)', color: '#7bb8ff' }}
                    >
                      Apply to note
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Apply confirmation */}
      <AnimatePresence>
        {applyTarget && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-6 mb-2 px-4 py-3 rounded-xl border flex items-center justify-between gap-3"
            style={{ background: 'rgba(123,184,255,0.08)', borderColor: 'rgba(123,184,255,0.25)' }}
          >
            <span className="text-xs" style={{ color: '#7bb8ff' }}>
              Replace current note content with this AI response?
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setApplyTarget(null)}
                className="text-xs px-3 py-1 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmApply}
                className="text-xs px-3 py-1 rounded-lg font-medium transition-all hover:opacity-80"
                style={{ background: '#7bb8ff', color: '#0a0a0f' }}
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-6 pb-4 shrink-0">
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? 'Ask anything… (⌘↵ to send)' : 'Connect Ollama to start chatting…'}
            disabled={!isOnline || sending}
            rows={3}
            className="w-full px-4 pt-3 pb-2 text-sm resize-none outline-none disabled:opacity-40"
            style={{ background: 'transparent', color: 'var(--text)', lineHeight: '1.6', fontFamily: 'inherit' }}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <button
              onClick={attachCurrentNote}
              disabled={!activeNote || !editorContent.trim()}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5 disabled:opacity-30"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Attach current note
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!isOnline || !input.trim() || sending}
              className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40 hover:opacity-80"
              style={{ background: '#7bb8ff', color: '#0a0a0f' }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
