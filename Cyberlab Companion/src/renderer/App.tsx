import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { applyTheme } from './lib/themes';
import { initSounds } from './lib/sounds';
import type { AppConfig } from '@shared/types';
import SetupWizard from './components/SetupWizard';
import MainLayout from './components/MainLayout';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';

let ghostVaultToastCb: ((msg: string) => void) | null = null;
export function setGhostVaultToastCb(cb: (msg: string) => void) { ghostVaultToastCb = cb; }
export function showGhostVaultToast(msg: string) { ghostVaultToastCb?.(msg); }

function SplashScreen() {
  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg)]">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-[var(--accent)] font-mono font-bold text-2xl tracking-widest mb-2">
          CYBERLAB
        </div>
        <div className="text-[var(--text-muted)] text-xs tracking-widest uppercase">
          Companion // ItsEliias
        </div>
        <div className="mt-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full spinner" />
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { setConfig, setSetupComplete, setApiKeyConfigured, setProgressData, setLabsData, setSnippetsData, setupComplete, apiKeyConfigured, config } = useStore();
  const [loading, setLoading] = useState(true);
  const [ghostVaultToast, setGhostVaultToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onboarding = useOnboarding();

  useEffect(() => {
    setGhostVaultToastCb((msg) => {
      setGhostVaultToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setGhostVaultToast(''), 3000);
    });
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const [cfg, hasKey] = await Promise.all([
          window.electronAPI.getConfig(),
          window.electronAPI.hasApiKey(),
        ]);

        const appConfig = cfg as AppConfig;
        setConfig(appConfig);
        setApiKeyConfigured(hasKey);

        if (appConfig.theme) {
          applyTheme(appConfig.theme);
        }

        initSounds({ soundEnabled: appConfig.soundEnabled, volume: 50 });

        const [progress, labs, snippets] = await Promise.all([
          window.electronAPI.loadProgress().catch(() => null),
          window.electronAPI.loadLabTracker().catch(() => null),
          window.electronAPI.loadSnippets().catch(() => null),
        ]);

        if (progress) setProgressData(progress as never);
        if (labs) setLabsData(labs as never);
        if (snippets) setSnippetsData(snippets as never);
      } catch (err) {
        console.error('Boot error:', err);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    }

    boot();
  }, []);

  // VPN polling
  useEffect(() => {
    const { setVpnStatus } = useStore.getState();
    const poll = async () => {
      try {
        const status = await window.electronAPI.checkVPN();
        setVpnStatus(status as never);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  // Push event listeners
  useEffect(() => {
    window.electronAPI.onUpdateAvailable(() => {
      // Handled in Header
    });

    const autosaveCleanup = window.electronAPI.onAutosaveTick(async () => {
      const { tabs, config: cfg } = useStore.getState();
      for (const tab of tabs) {
        try {
          await window.electronAPI.saveSession(tab.session as never);
        } catch {}
        // Auto-save writeup to GhostVault if content exists and vault configured
        const s = tab.session;
        if (s && s.writeupContent && cfg?.obsidianVault && s.labName !== 'New Session') {
          try {
            const date = new Date().toISOString().slice(0, 10);
            const flagCount = (s.ctfFlags?.length ?? 0) + s.findings.flags.length;
            const frontmatter = `---\nlab: ${s.platform}/${s.labName}\ndate: ${date}\ncategory: ${s.labType}\nflags: ${flagCount}\n---\n\n`;
            const result = await window.electronAPI.saveWriteup({
              content: frontmatter + s.writeupContent,
              labName: s.labName,
              platform: s.platform,
              vaultPath: cfg.obsidianVault,
            }) as { success: boolean };
            if (result?.success) showGhostVaultToast('Saved to GhostVault');
          } catch {}
        }
      }
    });

    const vpnCleanup = window.electronAPI.onVpnStatus((status: unknown) => {
      useStore.getState().setVpnStatus(status as never);
    });

    return () => {
      autosaveCleanup?.();
      vpnCleanup?.();
    };
  }, []);

  if (loading) return <SplashScreen />;

  const needsSetup = !setupComplete || !config?.setupComplete;
  const needsApiKey = !apiKeyConfigured;

  return (
    <>
      <AnimatePresence mode="wait">
        {needsSetup || needsApiKey ? (
          <motion.div key="setup" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupWizard />
          </motion.div>
        ) : (
          <motion.div key="main" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MainLayout onHelp={onboarding.open} />
          </motion.div>
        )}
        {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
      </AnimatePresence>
      <AnimatePresence>
        {ghostVaultToast && (
          <motion.div
            key="gv-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded text-xs font-mono"
            style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', color: 'var(--accent)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            {ghostVaultToast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
