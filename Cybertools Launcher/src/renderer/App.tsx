import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLauncherStore } from './store';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import StatsStrip from './components/StatsStrip';
import AppCard from './components/AppCard';
import NewAppCard from './components/NewAppCard';
import CustomSlotsGrid from './components/CustomSlotsGrid';
import ActivityFeed from './components/ActivityFeed';
import UpdateBanner from './components/UpdateBanner';
import SettingsPanel from './components/SettingsPanel';
import CustomSlotModal from './components/CustomSlotModal';
import AppManager from './components/AppManager';
import Footer from './components/Footer';
import type { CustomSlot } from '@shared/types';

export default function App() {
  const {
    config, updateInfo, ecosystemEvents,
    activeTab, splashDone, settingsOpen,
    setConfig, setVpn, setUpdateInfo, setEcosystemEvents,
    setActiveTab, setVersion, setSplashDone, setSettingsOpen
  } = useLauncherStore();

  // Splash: show until main sends splash-complete, then animate out
  const [showSplash, setShowSplash] = useState(true);

  // Custom slot modal state
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editSlotIndex, setEditSlotIndex] = useState<number | null>(null);

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
  function handleLaunch(appKey: string) {
    window.api.launchApp(appKey);
  }

  function handleUpdateNow() {
    window.api.updateNow();
  }

  async function handleSaveConfig(updates: Record<string, unknown>) {
    await window.api.saveConfig(updates as Parameters<typeof window.api.saveConfig>[0]);
    const refreshed = await window.api.getConfig();
    setConfig(refreshed);
  }

  // Custom slots
  function openAddSlot() {
    setEditSlotIndex(null);
    setSlotModalOpen(true);
  }

  function openEditSlot(index: number) {
    setEditSlotIndex(index);
    setSlotModalOpen(true);
  }

  async function handleSaveSlot(slot: CustomSlot) {
    if (editSlotIndex !== null) {
      await window.api.updateCustomSlot(editSlotIndex, slot);
    } else {
      await window.api.addCustomSlot(slot);
    }
    const refreshed = await window.api.getConfig();
    setConfig(refreshed);
  }

  async function handleDeleteSlot() {
    if (editSlotIndex !== null) {
      await window.api.removeCustomSlot(editSlotIndex);
      const refreshed = await window.api.getConfig();
      setConfig(refreshed);
    }
    setSlotModalOpen(false);
    setEditSlotIndex(null);
  }

  const slots      = config?.launcher?.customSlots || [];
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
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {(['tools', 'activity', 'apps'] as const).map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 text-[11px] uppercase tracking-wider font-medium capitalize relative transition-colors"
                style={{ color: activeTab === tab ? 'var(--accent)' : 'var(--text-dim)' }}>
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar) transparent' }}>

            {activeTab === 'tools' && config && (
              <>
                {/* ── Core ── */}
                <div className="text-[10px] uppercase tracking-widest font-semibold px-0.5"
                  style={{ color: 'var(--text-dim)' }}>
                  Core
                </div>
                <AppCard appKey="cyberlab"     config={config} onLaunch={handleLaunch} />
                <AppCard appKey="vaultscraper" config={config} onLaunch={handleLaunch} onUpdateNow={handleUpdateNow} />
                <AppCard appKey="ghostvault"   config={config} onLaunch={handleLaunch} />
                <AppCard appKey="recondesk"    config={config} onLaunch={handleLaunch} />
                <AppCard appKey="signalboard"  config={config} onLaunch={handleLaunch} />
                <AppCard appKey="cyberos"      config={config} onLaunch={handleLaunch} />

                {/* ── Tools ── */}
                <div className="text-[10px] uppercase tracking-widest font-semibold px-0.5 pt-1"
                  style={{ color: 'var(--text-dim)' }}>
                  Tools
                </div>
                <NewAppCard appKey="credvault"      config={config} onLaunch={handleLaunch} />
                <NewAppCard appKey="playbookstudio" config={config} onLaunch={handleLaunch} />
                <NewAppCard appKey="reportforge"    config={config} onLaunch={handleLaunch} />
                <NewAppCard appKey="terminallink"   config={config} onLaunch={handleLaunch} />
                <NewAppCard appKey="networkmap"     config={config} onLaunch={handleLaunch} />

                {slots.length > 0 && (
                  <div className="pt-1">
                    <CustomSlotsGrid
                      slots={slots}
                      onLaunch={handleLaunch}
                      onAdd={openAddSlot}
                      onEdit={(i, _slot) => openEditSlot(i)}
                    />
                  </div>
                )}

                {slots.length === 0 && (
                  <div className="flex justify-center pt-1">
                    <button onClick={openAddSlot}
                      className="text-[11px] px-3 py-1.5 rounded border transition-colors hover:bg-white/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                      + Pin an app
                    </button>
                  </div>
                )}
              </>
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

            {activeTab === 'apps' && (
              <AppManager />
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

          <CustomSlotModal
            open={slotModalOpen}
            initial={editSlotIndex !== null ? slots[editSlotIndex] : null}
            onSave={handleSaveSlot}
            onClose={() => { setSlotModalOpen(false); setEditSlotIndex(null); }}
            onDelete={editSlotIndex !== null ? handleDeleteSlot : undefined}
          />
        </>
      )}
    </div>
  );
}
