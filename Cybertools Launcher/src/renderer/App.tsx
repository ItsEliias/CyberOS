import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLauncherStore } from './store';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import StatsStrip from './components/StatsStrip';
import ActivityFeed from './components/ActivityFeed';
import UpdateBanner from './components/UpdateBanner';
import SettingsPanel from './components/SettingsPanel';
import AppManager from './components/AppManager';
import Footer from './components/Footer';

export default function App() {
  const {
    config, updateInfo, ecosystemEvents,
    activeTab, splashDone, settingsOpen,
    setConfig, setVpn, setUpdateInfo, setEcosystemEvents,
    setActiveTab, setVersion, setSplashDone, setSettingsOpen
  } = useLauncherStore();

  // Splash: show until main sends splash-complete, then animate out
  const [showSplash, setShowSplash] = useState(true);

  const panelClassRef = useRef(false);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const api = window.api;
    Promise.all([api.getConfig(), api.getVpnStatus(), api.getVersion()]).then(
      ([cfg, vpn, ver]) => { setConfig(cfg); setVpn(vpn); setVersion(ver); }
    );

    const unsubs = [
      api.onConfigUpdate(cfg => setConfig(cfg)),
      api.onVpnUpdate(vpn => setVpn(vpn)),
      api.onUpdateAvailable(info => setUpdateInfo(info)),
      api.onEcosystemUpdated(events => setEcosystemEvents(events)),
      api.onSplashComplete(() => setShowSplash(false)),
      api.onOpenSettings(() => setSettingsOpen(true)),
      api.onPanelShown(() => {
        if (!panelClassRef.current) {
          document.body.classList.add('panel-visible');
          panelClassRef.current = true;
        }
      }),
    ];

    return () => unsubs.forEach(u => u());
  }, []);

  // ── Apply theme to <body> ─────────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    document.body.setAttribute('data-core', config.theme || 'stealth');
    document.body.setAttribute('data-personality', config.personalityTheme || 'neutral');
  }, [config?.theme, config?.personalityTheme]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleSaveConfig(updates: Record<string, unknown>) {
    await window.api.saveConfig(updates as Parameters<typeof window.api.saveConfig>[0]);
    const refreshed = await window.api.getConfig();
    setConfig(refreshed);
  }

  const activity   = config?.launcher?.activityFeed || [];
  const core       = config?.theme || 'stealth';
  const personality= config?.personalityTheme || 'neutral';

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      <SplashScreen visible={showSplash} onHide={() => setSplashDone(true)} />

      {splashDone && (
        <>
          <UpdateBanner updateInfo={updateInfo} />
          <Header onSettingsClick={() => setSettingsOpen(true)} />
          <StatsStrip />

          {/* Tab bar */}
          <div className="flex border-b" style={{ borderColor: 'rgba(42,51,71,0.6)' }}>
            {(['apps', 'activity'] as const).map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 text-[11px] uppercase tracking-wider font-medium capitalize relative transition-colors"
                style={{ color: activeTab === tab ? '#d29922' : '#4a5568' }}>
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: '#d29922' }} />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar) transparent' }}>

            {activeTab === 'apps' && (
              <AppManager />
            )}

            {activeTab === 'activity' && (
              <ActivityFeed
                entries={activity}
                ecosystemEvents={ecosystemEvents}
                onClear={async () => {
                  await window.api.clearActivity();
                  const refreshed = await window.api.getConfig();
                  setConfig(refreshed);
                }}
              />
            )}
          </div>

          <Footer
            core={core}
            personality={personality}
            onCoreChange={(c) => handleSaveConfig({ theme: c })}
            onPersonalityChange={(p) => handleSaveConfig({ personalityTheme: p })}
          />

          <SettingsPanel
            open={settingsOpen}
            config={config}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSaveConfig}
          />

        </>
      )}
    </div>
  );
}
