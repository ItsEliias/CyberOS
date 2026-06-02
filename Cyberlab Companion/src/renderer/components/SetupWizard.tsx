import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { AppConfig } from '@shared/types';

type Step = 'welcome' | 'apikey' | 'settings' | 'done';

export default function SetupWizard() {
  const { setConfig, setSetupComplete, setApiKeyConfigured } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiWarning, setApiWarning] = useState('');
  const [operatorName, setOperatorName] = useState('ItsEliias');
  const [obsidianVault, setObsidianVault] = useState('');

  async function testAndSaveKey() {
    if (!apiKey.trim().startsWith('sk-ant-')) {
      setApiError('Key must start with sk-ant-');
      return;
    }
    setTesting(true);
    setApiError('');
    try {
      const result = await window.electronAPI.testApiKey(apiKey.trim()) as { success: boolean; error?: string; warning?: string };
      if (result?.success) {
        await window.electronAPI.saveApiKey(apiKey.trim());
        setApiKeyConfigured(true);
        if (result.warning) setApiWarning(result.warning);
        setStep('settings');
      } else {
        setApiError(result?.error || 'API key test failed — check the key and try again.');
      }
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  async function finish() {
    const cfg: AppConfig = {
      theme: 'stealth',
      obsidianVault,
      outputDir: '',
      vpnCheckEnabled: true,
      autosaveEnabled: true,
      fontSize: 'medium',
      soundEnabled: false,
      operatorName: operatorName || 'ItsEliias',
      apiKeyConfigured: true,
      setupComplete: true,
    };
    await window.electronAPI.saveConfig(cfg);
    setConfig(cfg);
    setSetupComplete(true);
  }

  async function pickVault() {
    const path = await window.electronAPI.pickFolder();
    if (path) setObsidianVault(path);
  }

  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg)]">
      <motion.div
        className="w-[480px] panel p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[var(--accent)] font-mono font-bold text-xl tracking-widest">CYBERLAB COMPANION</div>
          <div className="text-[var(--text-muted)] text-xs mt-1 tracking-widest">// ItsEliias</div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome','apikey','settings'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-[var(--accent)] text-white' :
                (['welcome','apikey','settings'].indexOf(step) > i ? 'bg-[var(--success)] text-white' : 'bg-[var(--bg3)] text-[var(--text-muted)]')
              }`}>{i + 1}</div>
              {i < 2 && <div className="w-8 h-px bg-[var(--border)]" />}
            </div>
          ))}
        </div>

        <AnimatedStep show={step === 'welcome'}>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Welcome</h2>
          <p className="text-[var(--text-dim)] text-sm leading-relaxed mb-6">
            CyberLab Companion is your AI-powered assistant for HTB, THM, and CTF challenges.
            You'll need a Claude API key to get started.
          </p>
          <button className="btn-accent w-full py-2.5" onClick={() => setStep('apikey')}>
            Get Started
          </button>
        </AnimatedStep>

        <AnimatedStep show={step === 'apikey'}>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Claude API Key</h2>
          <p className="text-[var(--text-dim)] text-sm mb-4">
            Enter your Anthropic Claude API key. It's stored securely using system encryption.
          </p>
          <div className="input-group mb-4">
            <label>API Key</label>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setApiError(''); }}
              className="w-full font-mono text-xs"
            />
          </div>
          {apiError && <p className="text-[var(--error)] text-xs mb-3">{apiError}</p>}
          <button
            className="btn-accent w-full py-2.5"
            onClick={testAndSaveKey}
            disabled={testing || !apiKey.trim()}
          >
            {testing ? 'Testing...' : 'Test & Save Key'}
          </button>
        </AnimatedStep>

        <AnimatedStep show={step === 'settings'}>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Quick Setup</h2>
          {apiWarning && (
            <p className="text-[var(--warning,#eab308)] text-xs mb-3 p-2 rounded" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
              ⚠ API key saved, but: {apiWarning}
            </p>
          )}
          <div className="space-y-4 mb-6">
            <div className="input-group">
              <label>Your Operator Name</label>
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="w-full"
                placeholder="ItsEliias"
              />
            </div>
            <div className="input-group">
              <label>Obsidian Vault Path (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={obsidianVault}
                  onChange={e => setObsidianVault(e.target.value)}
                  className="flex-1"
                  placeholder="/path/to/vault"
                />
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={pickVault}>Browse</button>
              </div>
            </div>
          </div>
          <button className="btn-accent w-full py-2.5" onClick={finish}>
            Launch CyberLab
          </button>
        </AnimatedStep>
      </motion.div>
    </div>
  );
}

function AnimatedStep({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

