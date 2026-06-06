import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { applyTheme } from './lib/themes';
import { initSounds } from './lib/sounds';
import { DEFAULT_PAYLOADS } from './lib/defaultPayloads';
import SetupWizard from './components/SetupWizard';
import MainLayout from './components/MainLayout';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';
import CommandPalette from './components/CommandPalette';
let ghostVaultToastCb = null;
export function setGhostVaultToastCb(cb) { ghostVaultToastCb = cb; }
export function showGhostVaultToast(msg) { ghostVaultToastCb?.(msg); }
function SplashScreen() {
    return (<div className="flex items-center justify-center h-full bg-[var(--bg)]">
      <motion.div className="text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <div className="text-[var(--accent)] font-mono font-bold text-2xl tracking-widest mb-2">
          CYBERLAB
        </div>
        <div className="text-[var(--text-muted)] text-xs tracking-widest uppercase">
          Companion // ItsEliias
        </div>
        <div className="mt-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full spinner"/>
        </div>
      </motion.div>
    </div>);
}
export default function App() {
    const { setConfig, setSetupComplete, setApiKeyConfigured, setProgressData, setLabsData, setSnippetsData, setupComplete, apiKeyConfigured, config } = useStore();
    const [loading, setLoading] = useState(true);
    const [ghostVaultToast, setGhostVaultToast] = useState('');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const toastTimer = useRef(null);
    const onboarding = useOnboarding();
    useEffect(() => {
        setGhostVaultToastCb((msg) => {
            setGhostVaultToast(msg);
            if (toastTimer.current)
                clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setGhostVaultToast(''), 3000);
        });
        return () => { if (toastTimer.current)
            clearTimeout(toastTimer.current); };
    }, []);
    // ── ⌘K command palette ─────────────────────────────────────────────────────
    useEffect(() => {
        function onKey(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(o => !o);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    useEffect(() => {
        async function boot() {
            try {
                const [cfg, hasKey] = await Promise.all([
                    window.electronAPI.getConfig(),
                    window.electronAPI.hasApiKey(),
                ]);
                const appConfig = cfg;
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
                if (progress)
                    setProgressData(progress);
                if (labs)
                    setLabsData(labs);
                if (snippets) {
                    const sData = snippets;
                    // Seed default payloads if not already present
                    const existing = Array.isArray(sData.snippets) ? sData.snippets : [];
                    const existingIds = new Set(existing.map(s => s.id));
                    const toSeed = DEFAULT_PAYLOADS.filter(p => !existingIds.has(p.id));
                    if (toSeed.length > 0) {
                        const merged = { snippets: [...existing, ...toSeed], usageCounts: sData.usageCounts || {} };
                        setSnippetsData(merged);
                        window.electronAPI.saveSnippets(merged).catch(() => { });
                    }
                    else {
                        setSnippetsData(snippets);
                    }
                }
                else {
                    // First boot — seed all default payloads
                    const seedData = { snippets: DEFAULT_PAYLOADS, usageCounts: {} };
                    setSnippetsData(seedData);
                    window.electronAPI.saveSnippets(seedData).catch(() => { });
                }
            }
            catch (err) {
                console.error('Boot error:', err);
            }
            finally {
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
                setVpnStatus(status);
            }
            catch { }
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
                    await window.electronAPI.saveSession(tab.session);
                }
                catch { }
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
                        });
                        if (result?.success)
                            showGhostVaultToast('Saved to GhostVault');
                    }
                    catch { }
                }
            }
        });
        const vpnCleanup = window.electronAPI.onVpnStatus((status) => {
            useStore.getState().setVpnStatus(status);
        });
        const pendingCleanup = window.electronAPI.onPendingAction(async (action) => {
            if (action === 'refresh-stats') {
                // Mirrors CommandPalette's "Refresh platform stats" command
                const api = window.electronAPI;
                try {
                    await api.fetchHtbStats?.();
                }
                catch { /* ignore */ }
                try {
                    await api.fetchThmStats?.();
                }
                catch { /* ignore */ }
                const { activeTabId, setActivePanel } = useStore.getState();
                if (activeTabId)
                    setActivePanel(activeTabId, 'progress');
            }
        });
        return () => {
            autosaveCleanup?.();
            vpnCleanup?.();
            pendingCleanup?.();
        };
    }, []);
    if (loading)
        return <SplashScreen />;
    const needsSetup = !setupComplete || !config?.setupComplete;
    const needsApiKey = !apiKeyConfigured;
    return (<>
      <AnimatePresence mode="wait">
        {needsSetup || needsApiKey ? (<motion.div key="setup" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupWizard />
          </motion.div>) : (<motion.div key="main" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MainLayout onHelp={onboarding.open}/>
          </motion.div>)}
        {onboarding.show && <OnboardingModal onClose={onboarding.close}/>}
      </AnimatePresence>
      <AnimatePresence>
        {ghostVaultToast && (<motion.div key="gv-toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded text-xs font-mono" style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', color: 'var(--accent)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {ghostVaultToast}
          </motion.div>)}
      </AnimatePresence>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}/>
    </>);
}
