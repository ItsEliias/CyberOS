import { create } from 'zustand';
import type { CyberToolsConfig, VpnStatus, UpdateInfo, EcosystemEvent } from '@shared/types';

export type ActiveTab = 'tools' | 'activity' | 'apps';

interface LauncherStore {
  config: CyberToolsConfig | null;
  vpn: VpnStatus;
  updateInfo: UpdateInfo | null;
  ecosystemEvents: EcosystemEvent[];
  activeTab: ActiveTab;
  version: string;
  splashDone: boolean;
  settingsOpen: boolean;
  setConfig: (config: CyberToolsConfig) => void;
  setVpn: (vpn: VpnStatus) => void;
  setUpdateInfo: (info: UpdateInfo) => void;
  setEcosystemEvents: (events: EcosystemEvent[]) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setVersion: (v: string) => void;
  setSplashDone: (done: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useLauncherStore = create<LauncherStore>((set) => ({
  config         : null,
  vpn            : { active: false, interface: null },
  updateInfo     : null,
  ecosystemEvents: [],
  activeTab      : 'tools',
  version        : '',
  splashDone     : false,
  settingsOpen   : false,

  setConfig          : (config) => set({ config }),
  setVpn             : (vpn) => set({ vpn }),
  setUpdateInfo      : (updateInfo) => set({ updateInfo }),
  setEcosystemEvents : (ecosystemEvents) => set({ ecosystemEvents }),
  setActiveTab       : (activeTab) => set({ activeTab }),
  setVersion         : (version) => set({ version }),
  setSplashDone      : (splashDone) => set({ splashDone }),
  setSettingsOpen    : (settingsOpen) => set({ settingsOpen }),
}));
