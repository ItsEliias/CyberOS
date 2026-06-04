// NetLab — LabStepView.tsx

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetLabStore } from '../store'

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded border border-border-default overflow-hidden mb-4">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle"
        style={{ background: '#161b27' }}>
        <span className="text-2xs text-text-muted uppercase tracking-wider">Command</span>
        <div className="flex gap-2">
          <button onClick={copy}
            className="text-2xs px-2 py-0.5 rounded transition-colors"
            style={{ background: copied ? 'rgba(63,185,80,0.2)' : '#2a3347', color: copied ? '#3fb950' : '#8b949e' }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => window.electronAPI.ipc.sendEcosystemEvent('netlab:execute-command', { command })}
            className="text-2xs px-2 py-0.5 rounded transition-colors"
            style={{ background: 'rgba(94,196,255,0.1)', color: '#5ec4ff' }}>
            Execute in Terminal
          </button>
        </div>
      </div>
      <pre className="p-4 text-sm font-mono-code text-text-primary overflow-x-auto"
        style={{ background: '#0a0a0f', color: '#e6edf3' }}>
        {command}
      </pre>
    </div>
  )
}

export default function LabStepView() {
  const activeLab          = useNetLabStore(s => s.activeLab)
  const activeStepIndex    = useNetLabStore(s => s.activeStepIndex)
  const progress           = useNetLabStore(s => s.progress)
  const labStartTime       = useNetLabStore(s => s.labStartTime)
  const setActiveStepIndex = useNetLabStore(s => s.setActiveStepIndex)
  const setActiveLab       = useNetLabStore(s => s.setActiveLab)
  const clearLabTimer      = useNetLabStore(s => s.clearLabTimer)
  const updateStepResult   = useNetLabStore(s => s.updateStepResult)
  const updateLabNotes     = useNetLabStore(s => s.updateLabNotes)

  const [actualOutput, setActualOutput] = useState('')
  const [verifyResult, setVerifyResult] = useState<'pass' | 'fail' | null>(null)
  const [hintIndex, setHintIndex]       = useState(0)
  const [showHints, setShowHints]       = useState(false)
  const [ghostSaved, setGhostSaved]     = useState(false)

  // GhostVault auto-save every 2 minutes when notes exist
  useEffect(() => {
    if (!activeLab) return
    const id = setInterval(async () => {
      const prog = useNetLabStore.getState().progress[activeLab.id]
      const prefs = await window.electronAPI.prefs.get().catch(() => ({ ghostVaultAutoSave: false }))
      if (!prefs.ghostVaultAutoSave || !prog?.notes?.trim()) return
      await window.electronAPI.ghostvault.saveNote({
        labTitle: activeLab.title,
        vendor: activeLab.vendor,
        tags: activeLab.tags,
        content: prog.notes,
      }).catch(console.error)
    }, 120000)
    return () => clearInterval(id)
  }, [activeLab])

  if (!activeLab) return null

  const step    = activeLab.steps[activeStepIndex]
  const prog    = progress[activeLab.id]
  const notes   = prog?.notes ?? ''

  function checkLabComplete(labId: string, stepId: string, passed: boolean) {
    const updatedProgress = useNetLabStore.getState().progress[labId]
    if (!updatedProgress) return
    const allPassed = activeLab!.steps.every(s => {
      if (s.id === stepId) return passed
      return updatedProgress.stepResults[s.id]?.passed === true
    })
    if (allPassed && !updatedProgress.completedAt) {
      const elapsedMs = labStartTime ? Date.now() - labStartTime : undefined
      const existing  = updatedProgress
      const updated   = {
        ...existing,
        completedAt: new Date().toISOString(),
        bestTimeMs:  elapsedMs && (!existing.bestTimeMs || elapsedMs < existing.bestTimeMs)
          ? elapsedMs : existing.bestTimeMs,
      }
      window.electronAPI.labs.updateProgress(updated).catch(console.error)
      useNetLabStore.setState(state => ({ progress: { ...state.progress, [labId]: updated } }))
    }
  }

  function verify() {
    if (!step.expectedOutput) return
    const passed = actualOutput.toLowerCase().includes(step.expectedOutput.toLowerCase())
    setVerifyResult(passed ? 'pass' : 'fail')
    updateStepResult(activeLab!.id, step.id, passed, actualOutput)
    checkLabComplete(activeLab!.id, step.id, passed)
  }

  async function saveToGhostVault() {
    if (!notes.trim()) return
    const result = await window.electronAPI.ghostvault.saveNote({
      labTitle: activeLab!.title,
      vendor: activeLab!.vendor,
      tags: activeLab!.tags,
      content: notes,
    }).catch(() => ({ ok: false, reason: 'Unknown error' }))
    if (result.ok) {
      setGhostSaved(true)
      setTimeout(() => setGhostSaved(false), 2500)
    }
  }

  function goNext() {
    if (activeStepIndex < activeLab!.steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1)
      setActualOutput('')
      setVerifyResult(null)
      setHintIndex(0)
      setShowHints(false)
    }
  }

  function goPrev() {
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1)
      setActualOutput('')
      setVerifyResult(null)
      setHintIndex(0)
      setShowHints(false)
    }
  }

  function exitLab() {
    setActiveLab(null)
    clearLabTimer()
  }

  const stepResult = prog?.stepResults[step.id]
  const totalSteps = activeLab.steps.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border-subtle shrink-0"
        style={{ background: '#0f1117' }}>
        <button onClick={exitLab} className="text-2xs text-text-muted hover:text-text-primary transition-colors">
          ← Back to Labs
        </button>
        <span className="text-border-default">|</span>
        <span className="text-sm font-medium text-text-primary">{activeLab.title}</span>
        <div className="flex-1" />
        {/* Step progress dots */}
        <div className="flex items-center gap-1">
          {activeLab.steps.map((s, i) => {
            const r = prog?.stepResults[s.id]
            return (
              <button
                key={s.id}
                onClick={() => { setActiveStepIndex(i); setActualOutput(''); setVerifyResult(null) }}
                className="w-2 h-2 rounded-full transition-all"
                style={
                  r?.passed ? { background: '#3fb950' }
                  : i === activeStepIndex ? { background: '#5ec4ff' }
                  : { background: '#2a3347' }
                }
              />
            )
          })}
        </div>
        <span className="text-2xs text-text-muted ml-2">{activeStepIndex + 1}/{totalSteps}</span>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Step number + title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={
                    stepResult?.passed
                      ? { background: 'rgba(63,185,80,0.2)', color: '#3fb950', border: '1px solid #3fb950' }
                      : { background: 'rgba(94,196,255,0.1)', color: '#5ec4ff', border: '1px solid #5ec4ff' }
                  }
                >
                  {stepResult?.passed ? '✓' : step.number}
                </div>
                <h2 className="text-lg font-semibold text-text-primary">{step.title}</h2>
              </div>

              {step.deviceName && (
                <div className="mb-3">
                  <span className="text-2xs px-2 py-0.5 rounded font-mono-code"
                    style={{ background: 'rgba(94,196,255,0.08)', color: '#5ec4ff', border: '1px solid rgba(94,196,255,0.2)' }}>
                    Device: {step.deviceName}
                  </span>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-4">{step.description}</p>

              {/* Command block */}
              {step.command && <CommandBlock command={step.command} />}

              {/* Verification section */}
              {step.expectedOutput && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Verification</p>
                    {step.verificationCommand && (
                      <code className="text-2xs font-mono-code text-[#5ec4ff]">{step.verificationCommand}</code>
                    )}
                  </div>
                  <div className="p-3 rounded border border-border-subtle mb-3"
                    style={{ background: '#0f1117' }}>
                    <p className="text-2xs text-text-muted mb-1">Expected output contains:</p>
                    <code className="text-sm font-mono-code text-[#3fb950]">{step.expectedOutput}</code>
                  </div>
                  <textarea
                    value={actualOutput}
                    onChange={e => setActualOutput(e.target.value)}
                    placeholder="Paste your actual command output here..."
                    className="w-full h-24 px-3 py-2 rounded border border-border-default text-sm font-mono-code text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-[#5ec4ff]"
                    style={{ background: '#0a0a0f' }}
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <motion.button
                      onClick={verify}
                      disabled={!actualOutput.trim()}
                      className="px-4 py-1.5 rounded text-sm font-semibold transition-colors disabled:opacity-40"
                      style={{ background: '#5ec4ff', color: '#0a0a0f' }}
                      whileHover={{ opacity: 0.85 }}
                    >
                      Verify Output
                    </motion.button>
                    {verifyResult && (
                      <span className="text-sm font-semibold"
                        style={{ color: verifyResult === 'pass' ? '#3fb950' : '#f85149' }}>
                        {verifyResult === 'pass' ? '✓ Passed' : '✗ Not matched — check output'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Hints */}
              {step.hints.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowHints(v => !v)}
                    className="text-xs text-text-muted hover:text-[#5ec4ff] transition-colors"
                  >
                    {showHints ? 'Hide hints' : `Show hint (${hintIndex + 1}/${step.hints.length})`}
                  </button>
                  {showHints && (
                    <div className="mt-2 p-3 rounded border border-border-default"
                      style={{ background: 'rgba(94,196,255,0.04)' }}>
                      <p className="text-sm text-text-secondary">{step.hints[hintIndex]}</p>
                      {hintIndex < step.hints.length - 1 && (
                        <button
                          onClick={() => setHintIndex(i => i + 1)}
                          className="text-2xs text-[#5ec4ff] mt-2 hover:opacity-75"
                        >
                          Next hint →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Notes</p>
                  <button
                    onClick={saveToGhostVault}
                    className="text-2xs px-2 py-0.5 rounded transition-colors"
                    style={ghostSaved
                      ? { background: 'rgba(63,185,80,0.15)', color: '#3fb950' }
                      : { background: 'rgba(123,184,255,0.08)', color: '#7bb8ff', border: '1px solid rgba(123,184,255,0.2)' }}
                  >
                    {ghostSaved ? 'Saved to GhostVault' : 'Save to GhostVault'}
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={e => updateLabNotes(activeLab.id, e.target.value)}
                  placeholder="Your notes for this lab..."
                  className="w-full h-20 px-3 py-2 rounded border border-border-subtle text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-[#5ec4ff]"
                  style={{ background: '#0f1117' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle shrink-0"
        style={{ background: '#0f1117' }}>
        <motion.button
          onClick={goPrev}
          disabled={activeStepIndex === 0}
          className="px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-30"
          style={{ background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}
          whileHover={{ borderColor: '#5ec4ff', color: '#5ec4ff' }}
        >
          ← Previous Step
        </motion.button>

        <span className="text-2xs text-text-muted">
          {activeLab.steps.filter(s => prog?.stepResults[s.id]?.passed).length} / {totalSteps} verified
        </span>

        <motion.button
          onClick={goNext}
          disabled={activeStepIndex === totalSteps - 1}
          className="px-4 py-1.5 rounded text-sm font-semibold transition-colors disabled:opacity-30"
          style={{ background: '#5ec4ff', color: '#0a0a0f' }}
          whileHover={{ opacity: 0.85 }}
        >
          Next Step →
        </motion.button>
      </div>
    </div>
  )
}
