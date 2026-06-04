// ReconDesk — Tool Launcher Panel (Feature 20)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../stores/useRecondeskStore'

interface Tool {
  id: string
  name: string
  icon: string
  description: string
  template: string
}

const TOOLS: Tool[] = [
  { id: 'nmap-full',  name: 'Nmap Full Scan',   icon: '⬡', description: 'Full TCP + version + script scan', template: 'nmap -sV -sC -p- -T4 {target}' },
  { id: 'gobuster',   name: 'Gobuster',          icon: '⬡', description: 'Directory/file enumeration',       template: 'gobuster dir -u http://{target} -w {wordlist}' },
  { id: 'ffuf',       name: 'ffuf',              icon: '⬡', description: 'Web fuzzing',                      template: 'ffuf -u http://{target}/FUZZ -w {wordlist}' },
  { id: 'nikto',      name: 'Nikto',             icon: '⬡', description: 'Web server scanner',              template: 'nikto -h http://{target}' },
  { id: 'sqlmap',     name: 'SQLmap',            icon: '⬡', description: 'SQL injection scanner',           template: 'sqlmap -u "http://{target}/?id=1" --batch' },
  { id: 'enum4linux', name: 'enum4linux',        icon: '⬡', description: 'SMB/Samba enumeration',           template: 'enum4linux -a {target}' },
  { id: 'smbclient',  name: 'smbclient',         icon: '⬡', description: 'SMB share listing',               template: 'smbclient -L //{target} -N' },
  { id: 'whatweb',    name: 'WhatWeb',           icon: '⬡', description: 'Web technology fingerprint',      template: 'whatweb http://{target}' },
]

const DEFAULT_WORDLISTS = [
  '/usr/share/wordlists/rockyou.txt',
  '/usr/share/wordlists/dirb/common.txt',
  '/usr/share/seclists/Discovery/Web-Content/big.txt',
]

interface ToolLauncherProps {
  open: boolean
  onClose: () => void
}

export default function ToolLauncher({ open, onClose }: ToolLauncherProps) {
  const targets        = useRecondeskStore(s => s.targets)
  const activeTargetId = useRecondeskStore(s => s.activeTargetId)
  const emitEvent      = useRecondeskStore(s => s.emitEvent)
  const showToast      = useRecondeskStore(s => s.showToast)

  const activeTarget = targets.find(t => t.id === activeTargetId)
  const [selectedTool, setSelectedTool]     = useState<string | null>(null)
  const [customTarget, setCustomTarget]     = useState(activeTarget?.ip ?? '')
  const [selectedWordlist, setWordlist]     = useState(DEFAULT_WORDLISTS[1])
  const [launched, setLaunched]             = useState<string | null>(null)

  function buildCommand(tool: Tool): string {
    return tool.template
      .replace('{target}', customTarget || activeTarget?.ip || 'TARGET')
      .replace('{wordlist}', selectedWordlist)
  }

  async function launch(tool: Tool) {
    const cmd = buildCommand(tool)
    setLaunched(tool.id)
    await emitEvent('terminallink:run-command', { command: cmd, target: customTarget || activeTarget?.ip, tool: tool.name })
    showToast(`Launched: ${tool.name}`, 'success')
    setTimeout(() => setLaunched(null), 2000)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-72 bg-[#0d0d14] border-l border-[#2a3347] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3347] flex-shrink-0">
              <div>
                <h2 className="text-xs font-semibold text-[#e2e8f0] uppercase tracking-widest">Tool Launcher</h2>
                <p className="text-[10px] text-[#4a5568] mt-0.5">Sends to TerminalLink</p>
              </div>
              <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0] text-lg leading-none transition-colors">×</button>
            </div>

            {/* Target + wordlist config */}
            <div className="px-3 py-3 border-b border-[#2a3347] flex-shrink-0">
              <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Target</label>
              <input
                value={customTarget}
                onChange={e => setCustomTarget(e.target.value)}
                placeholder={activeTarget?.ip ?? '10.10.10.1'}
                className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] font-mono transition-colors"
              />
              <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mt-2 mb-1">Wordlist</label>
              <select
                value={selectedWordlist}
                onChange={e => setWordlist(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1 text-[10px] text-[#e2e8f0] focus:outline-none focus:border-[#d29922] transition-colors"
              >
                {DEFAULT_WORDLISTS.map(w => (
                  <option key={w} value={w}>{w.split('/').pop()}</option>
                ))}
                {(activeTarget?.wordlists ?? []).filter(w => !DEFAULT_WORDLISTS.includes(w)).map(w => (
                  <option key={w} value={w}>{w.split('/').pop()} (custom)</option>
                ))}
              </select>
            </div>

            {/* Tool list */}
            <div className="flex-1 overflow-y-auto py-1.5">
              {TOOLS.map(tool => {
                const isSelected = selectedTool === tool.id
                const isLaunched = launched === tool.id
                return (
                  <div key={tool.id} className="border-b border-[#2a3347]/40 last:border-none">
                    <button
                      onClick={() => setSelectedTool(isSelected ? null : tool.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#2a3347]/25 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#e2e8f0]">{tool.name}</span>
                        <span className="text-[9px] text-[#4a5568]">{isSelected ? '▴' : '▾'}</span>
                      </div>
                      <p className="text-[10px] text-[#4a5568] mt-0.5">{tool.description}</p>
                    </button>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-2.5">
                            <div className="bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-2 mb-2">
                              <code className="text-[10px] font-mono text-[#d29922]/80 break-all leading-relaxed">
                                {buildCommand(tool)}
                              </code>
                            </div>
                            <button
                              onClick={() => launch(tool)}
                              className={`w-full py-1.5 text-[10px] rounded border transition-colors font-medium ${isLaunched ? 'bg-[#3fb950]/15 border-[#3fb950]/30 text-[#3fb950]' : 'bg-[#d29922]/15 border-[#d29922]/30 text-[#d29922] hover:bg-[#d29922]/25'}`}
                            >
                              {isLaunched ? '✓ Launched' : 'Launch in TerminalLink'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
