import { create } from 'zustand';
import type { Tab, AppConfig, Session, ChatMessage } from '@shared/types';
import type { ThemeId, BgThemeId, AccentThemeId } from '@shared/types';
import type { ProgressData } from '../lib/progress';
import type { Lab } from '../lib/labtracker';
import type { SnippetsData } from '../lib/snippets';
import { createSession } from '../lib/session';
import { applyTheme, applyBgTheme, applyAccentTheme } from '../lib/themes';

function makeTabId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeTab(session: Session): Tab {
  return {
    id: makeTabId(),
    session,
    chatHistory: [],
    activePanel: 'chat',
  };
}

interface VpnStatus {
  status: 'active' | 'off' | 'unknown';
  interface?: string;
  ip?: string;
}

interface AppStore {
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // Config & Theme
  config: AppConfig | null;
  theme: ThemeId;
  bgTheme: BgThemeId;
  accentTheme: AccentThemeId;

  // VPN
  vpnStatus: VpnStatus;

  // External data
  progressData: ProgressData | null;
  labsData: Lab[];
  snippetsData: SnippetsData;

  // Session list (saved sessions for the session manager)
  sessionList: Array<{ id: string; name: string; labType: string; platform: string; difficulty: string; updatedAt: string }>;

  // Setup state
  setupComplete: boolean;
  apiKeyConfigured: boolean;

  // Actions — tabs
  addTab: (session?: Session) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, changes: Partial<Tab>) => void;
  updateSession: (tabId: string, changes: Partial<Session>) => void;
  addChatMessage: (tabId: string, message: ChatMessage) => void;
  setActivePanel: (tabId: string, panel: Tab['activePanel']) => void;

  // Actions — config/theme
  setConfig: (config: AppConfig) => void;
  setTheme: (theme: ThemeId) => void;
  setBgTheme: (bg: BgThemeId) => void;
  setAccentTheme: (accent: AccentThemeId) => void;
  setSetupComplete: (v: boolean) => void;
  setApiKeyConfigured: (v: boolean) => void;

  // Actions — vpn
  setVpnStatus: (status: VpnStatus) => void;

  // Actions — data
  setProgressData: (data: ProgressData) => void;
  setLabsData: (labs: Lab[]) => void;
  setSnippetsData: (data: SnippetsData) => void;
  setSessionList: (list: AppStore['sessionList']) => void;
}

export const useStore = create<AppStore>((set, get) => {
  const defaultSession = createSession({ name: 'New Session' });
  const defaultTab = makeTab(defaultSession);

  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
    config: null,
    theme: 'stealth',
    bgTheme: 'stealth',
    accentTheme: 'blue',
    vpnStatus: { status: 'unknown' },
    progressData: null,
    labsData: [],
    snippetsData: { snippets: [], usageCounts: {} },
    sessionList: [],
    setupComplete: false,
    apiKeyConfigured: false,

    addTab(session) {
      const s = session || createSession({ name: 'New Session' });
      const tab = makeTab(s);
      set(state => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    },

    closeTab(tabId) {
      set(state => {
        const tabs = state.tabs.filter(t => t.id !== tabId);
        if (tabs.length === 0) {
          const newTab = makeTab(createSession({ name: 'New Session' }));
          return { tabs: [newTab], activeTabId: newTab.id };
        }
        const activeTabId = state.activeTabId === tabId
          ? tabs[Math.max(0, state.tabs.findIndex(t => t.id === tabId) - 1)]?.id || tabs[0].id
          : state.activeTabId;
        return { tabs, activeTabId };
      });
    },

    setActiveTab(tabId) {
      set({ activeTabId: tabId });
    },

    updateTab(tabId, changes) {
      set(state => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, ...changes } : t)
      }));
    },

    updateSession(tabId, changes) {
      set(state => ({
        tabs: state.tabs.map(t =>
          t.id === tabId
            ? { ...t, session: { ...t.session, ...changes, updatedAt: new Date().toISOString() } }
            : t
        )
      }));
    },

    addChatMessage(tabId, message) {
      set(state => ({
        tabs: state.tabs.map(t =>
          t.id === tabId
            ? { ...t, chatHistory: [...t.chatHistory, message], session: { ...t.session, chat: [...t.session.chat, message] } }
            : t
        )
      }));
    },

    setActivePanel(tabId, panel) {
      set(state => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, activePanel: panel } : t)
      }));
    },

    setConfig(config) {
      set({ config, setupComplete: !!config.setupComplete, apiKeyConfigured: !!config.apiKeyConfigured });
      const bg     = config.bgTheme     || 'stealth';
      const accent = config.accentTheme || 'blue';
      if (config.bgTheme || config.accentTheme) {
        applyBgTheme(bg);
        applyAccentTheme(accent);
        set({ bgTheme: bg, accentTheme: accent });
      } else if (config.theme) {
        applyTheme(config.theme);
        set({ theme: config.theme });
      }
    },

    setTheme(theme) {
      applyTheme(theme);
      set({ theme });
      const config = get().config;
      if (config) window.electronAPI.saveConfig({ ...config, theme });
    },

    setBgTheme(bg) {
      applyBgTheme(bg);
      set({ bgTheme: bg });
      const config = get().config;
      if (config) window.electronAPI.saveConfig({ ...config, bgTheme: bg });
    },

    setAccentTheme(accent) {
      applyAccentTheme(accent);
      set({ accentTheme: accent });
      const config = get().config;
      if (config) window.electronAPI.saveConfig({ ...config, accentTheme: accent });
    },

    setSetupComplete(v) { set({ setupComplete: v }); },
    setApiKeyConfigured(v) { set({ apiKeyConfigured: v }); },
    setVpnStatus(status) { set({ vpnStatus: status }); },
    setProgressData(data) { set({ progressData: data }); },
    setLabsData(labs) { set({ labsData: labs }); },
    setSnippetsData(data) { set({ snippetsData: data }); },
    setSessionList(list) { set({ sessionList: list }); },
  };
});

export const activeTab = () => {
  const { tabs, activeTabId } = useStore.getState();
  return tabs.find(t => t.id === activeTabId) || null;
};
