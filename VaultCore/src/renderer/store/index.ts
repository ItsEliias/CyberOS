import { create } from 'zustand';
import type {
  VaultCoreConfig, Source, ScrapeProgress, ScrapeResult,
  VaultStats, DuplicateGroup, DeadLink, UpdateInfo, LogEntry,
  ViewId, ThemeConfig
} from '@shared/types';

interface VaultCoreStore {
  config      : VaultCoreConfig | null;
  vaultPath   : string | null;
  activeView  : ViewId;
  version     : string;
  sources     : Source[];
  isScraping  : boolean;
  isPaused    : boolean;
  progress    : ScrapeProgress | null;
  logEntries  : LogEntry[];
  lastResult  : ScrapeResult | null;
  vaultStats  : VaultStats | null;
  duplicates  : DuplicateGroup[];
  deadLinks   : DeadLink[];
  updateInfo  : UpdateInfo | null;
  theme       : ThemeConfig;
  healthProgress: { percent: number; message: string } | null;
  plugins     : string[];

  setConfig        : (c: VaultCoreConfig) => void;
  setVaultPath     : (p: string | null) => void;
  setActiveView    : (v: ViewId) => void;
  setVersion       : (v: string) => void;
  setSources       : (s: Source[]) => void;
  setIsScraping    : (v: boolean) => void;
  setIsPaused      : (v: boolean) => void;
  setProgress      : (p: ScrapeProgress | null) => void;
  addLog           : (entry: LogEntry) => void;
  clearLog         : () => void;
  setLastResult    : (r: ScrapeResult | null) => void;
  setVaultStats    : (s: VaultStats | null) => void;
  setDuplicates    : (d: DuplicateGroup[]) => void;
  setDeadLinks     : (d: DeadLink[]) => void;
  setUpdateInfo    : (u: UpdateInfo | null) => void;
  setTheme         : (t: ThemeConfig) => void;
  setHealthProgress: (p: { percent: number; message: string } | null) => void;
  setPlugins       : (p: string[]) => void;
}

export const useStore = create<VaultCoreStore>((set) => ({
  config      : null,
  vaultPath   : null,
  activeView  : 'scrape',
  version     : '',
  sources     : [],
  isScraping  : false,
  isPaused    : false,
  progress    : null,
  logEntries  : [],
  lastResult  : null,
  vaultStats  : null,
  duplicates  : [],
  deadLinks   : [],
  updateInfo  : null,
  theme       : { core: 'stealth', personality: 'neutral' },
  healthProgress: null,
  plugins     : [],

  setConfig         : (config)        => set({ config }),
  setVaultPath      : (vaultPath)     => set({ vaultPath }),
  setActiveView     : (activeView)    => set({ activeView }),
  setVersion        : (version)       => set({ version }),
  setSources        : (sources)       => set({ sources }),
  setIsScraping     : (isScraping)    => set({ isScraping }),
  setIsPaused       : (isPaused)      => set({ isPaused }),
  setProgress       : (progress)      => set({ progress }),
  addLog            : (entry)         => set(s => ({ logEntries: [...s.logEntries, entry] })),
  clearLog          : ()              => set({ logEntries: [] }),
  setLastResult     : (lastResult)    => set({ lastResult }),
  setVaultStats     : (vaultStats)    => set({ vaultStats }),
  setDuplicates     : (duplicates)    => set({ duplicates }),
  setDeadLinks      : (deadLinks)     => set({ deadLinks }),
  setUpdateInfo     : (updateInfo)    => set({ updateInfo }),
  setTheme          : (theme)         => set({ theme }),
  setHealthProgress : (healthProgress) => set({ healthProgress }),
  setPlugins        : (plugins)       => set({ plugins }),
}));
