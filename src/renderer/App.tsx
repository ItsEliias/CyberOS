import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import SetupWizard from './components/SetupWizard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrapeView from './components/ScrapeView';
import SourcesView from './components/SourcesView';
import VaultHealthView from './components/VaultHealthView';
import SettingsView from './components/SettingsView';
import type { CoreTheme, PersonalityTheme } from '@shared/types';

function applyTheme(core: CoreTheme | string, personality: PersonalityTheme | string) {
  document.documentElement.setAttribute('data-core', core as string);
  document.documentElement.setAttribute('data-personality', personality as string);
}

export default function App() {
  const {
    config, vaultPath, activeView, version, updateInfo,
    setConfig, setVaultPath, setVersion, setSources,
    setUpdateInfo, setIsScraping, setIsPaused,
    setProgress, addLog, setLastResult, setHealthProgress,
  } = useStore();

  const [ready, setReady] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      const [ver, configExists] = await Promise.all([
        window.electronAPI.getAppVersion(),
        window.electronAPI.configExists(),
      ]);
      setVersion(ver);

      if (!configExists) {
        applyTheme('stealth', 'neutral');
        setShowWizard(true);
        setReady(true);
        return;
      }

      const cfg = await window.electronAPI.getConfig();
      setConfig(cfg);

      const vp = cfg.obsidianVaultPath || null;
      setVaultPath(vp);

      const theme = cfg.theme;
      if (theme && typeof theme === 'object') {
        applyTheme(theme.core || 'stealth', theme.personality || 'neutral');
      } else if (typeof theme === 'string') {
        applyTheme(theme, 'neutral');
      } else {
        applyTheme('stealth', 'neutral');
      }

      const sources = await window.electronAPI.getSources();
      setSources(sources);

      setReady(true);
    }
    boot();
  }, []);

  // ── IPC events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const offProgress = window.electronAPI.onScrapeProgress(d => {
      setIsScraping(true);
      setIsPaused(d.paused ?? false);
      setProgress(d);
    });

    const offComplete = window.electronAPI.onScrapeComplete(d => {
      setIsScraping(false);
      setIsPaused(false);
      setProgress(null);
      if (d.result) setLastResult(d.result);
      addLog({ type: 'success', message: `Scrape complete — ${d.result?.saved ?? 0} saved, ${d.result?.updated ?? 0} updated`, time: new Date().toLocaleTimeString() });
    });

    const offError = window.electronAPI.onScrapeError(d => {
      setIsScraping(false);
      setIsPaused(false);
      setProgress(null);
      addLog({ type: 'error', message: d.error, time: new Date().toLocaleTimeString() });
    });

    const offUpdate = window.electronAPI.onUpdateAvailable(d => setUpdateInfo(d));

    const offHealth = window.electronAPI.onVaultHealthProgress(d => setHealthProgress(d));

    return () => { offProgress(); offComplete(); offError(); offUpdate(); offHealth(); };
  }, []);

  // ── Wizard complete ───────────────────────────────────────────────────────
  async function handleWizardComplete(vp: string, theme: { core: CoreTheme; personality: PersonalityTheme }) {
    await window.electronAPI.setVaultPath(vp);
    await window.electronAPI.setTheme(theme);
    setVaultPath(vp);
    applyTheme(theme.core, theme.personality);
    const cfg = await window.electronAPI.getConfig();
    setConfig(cfg);
    setShowWizard(false);
  }

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        >
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>CYBERTOOLS</div>
          <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>VAULTCORE</div>
          <div className="mt-4 w-32 h-0.5 mx-auto overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-full" style={{ background: 'var(--accent)' }}
              initial={{ x: '-100%' }} animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (showWizard) return <SetupWizard onComplete={handleWizardComplete} />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {activeView === 'scrape'    && <ScrapeView />}
              {activeView === 'sources'   && <SourcesView />}
              {activeView === 'health'    && <VaultHealthView />}
              {activeView === 'settings'  && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
      {updateInfo?.hasUpdate && (
        <div className="px-4 py-2 text-xs flex items-center gap-2 border-t"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          <span>Update available — v{updateInfo.version}</span>
          {updateInfo.url && (
            <button className="underline opacity-70 hover:opacity-100"
              onClick={() => window.electronAPI.openExternal(updateInfo.url!)}>
              View release
            </button>
          )}
        </div>
      )}
    </div>
  );
}
