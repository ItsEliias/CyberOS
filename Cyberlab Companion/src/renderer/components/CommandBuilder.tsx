import { useState } from 'react';
import { useStore } from '../store';
import { TOOLS, TOOL_CATEGORIES, type Tool } from '../lib/commandbuilder';
import { SOUNDS } from '../lib/sounds';

export default function CommandBuilder() {
  const { tabs, activeTabId, updateSession } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [selectedCategory, setSelectedCategory] = useState(TOOL_CATEGORIES[0].id);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [generatedCmd, setGeneratedCmd] = useState('');
  const [copied, setCopied] = useState(false);

  const toolsInCategory = TOOLS.filter(t => t.category === selectedCategory);

  function selectTool(tool: Tool) {
    setSelectedTool(tool);
    setGeneratedCmd('');
    setCopied(false);
    const defaults: Record<string, string> = {};
    tool.params.forEach(p => {
      if (p.autoFill === 'ip' && session?.target.ip) {
        defaults[p.id] = session.target.ip;
      } else if (p.autoFill === 'url' && session?.target.ip) {
        defaults[p.id] = `http://${session.target.ip}`;
      } else {
        defaults[p.id] = p.default || '';
      }
    });
    setParams(defaults);
  }

  function buildCmd() {
    if (!selectedTool) return;
    try {
      const cmd = selectedTool.buildCommand(params);
      setGeneratedCmd(cmd);
    } catch {
      setGeneratedCmd('# Error generating command');
    }
  }

  async function copyCmd() {
    if (!generatedCmd) return;
    try {
      await navigator.clipboard.writeText(generatedCmd);
    } catch {
      // Clipboard rejected — don't record a 'copied' session event for a
      // command the user doesn't actually have on their clipboard.
      return;
    }
    SOUNDS.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);

    if (activeTabId && session) {
      const toolsUsed = Array.from(new Set([...session.toolsUsed, selectedTool?.label || '']));
      const commandsCopied = [...session.commandsCopied, {
        command: generatedCmd,
        tool: selectedTool?.label || '',
        timestamp: new Date().toISOString(),
      }];
      updateSession(activeTabId, { toolsUsed, commandsCopied });
    }
  }

  return (
    <div className="flex h-full">
      {/* Tool list */}
      <div className="w-52 border-r border-[var(--border)] flex flex-col flex-shrink-0">
        {/* Category tabs */}
        <div className="flex flex-col gap-0.5 p-2 border-b border-[var(--border)]">
          {TOOL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`text-left px-3 py-1.5 rounded text-xs transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
              }`}
              style={{ border: 'none' }}
              onClick={() => { setSelectedCategory(cat.id); setSelectedTool(null); setGeneratedCmd(''); }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {/* Tools in category */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {toolsInCategory.map(tool => (
            <button
              key={tool.id}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                selectedTool?.id === tool.id
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]'
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
              }`}
              style={{ border: selectedTool?.id === tool.id ? undefined : 'none' }}
              onClick={() => selectTool(tool)}
            >
              <div className="font-mono">{tool.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{tool.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Builder area */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {!selectedTool ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            Select a tool from the list
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)] font-mono">{selectedTool.label}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedTool.description}</p>
              <code className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Install: {selectedTool.install}
              </code>
            </div>

            {/* Params */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedTool.params.map(param => (
                <div key={param.id} className="input-group">
                  <label>{param.label}</label>
                  {param.type === 'select' ? (
                    <select
                      value={params[param.id] || param.default || ''}
                      onChange={e => setParams(p => ({ ...p, [param.id]: e.target.value }))}
                      className="w-full"
                    >
                      {param.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={params[param.id] || ''}
                      onChange={e => setParams(p => ({ ...p, [param.id]: e.target.value }))}
                      placeholder={param.placeholder}
                      className="w-full font-mono text-xs"
                    />
                  )}
                </div>
              ))}
            </div>

            <button className="btn-accent w-full py-2 mb-4" onClick={buildCmd}>
              Build Command
            </button>

            {generatedCmd && (
              <div className="relative">
                <pre className="code-block text-xs overflow-x-auto pr-16">{generatedCmd}</pre>
                <button
                  className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded transition-colors"
                  style={{
                    background: copied ? 'var(--success)' : 'var(--accent-dim)',
                    color: copied ? '#fff' : 'var(--accent)',
                    border: '1px solid var(--accent)',
                  }}
                  onClick={copyCmd}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
