// =============================================================================
// RENDERER PART 2 — APP STATE, INIT, SPLASH, WIZARD, TOP BAR, TABS, SESSION, CHAT
// Combine with renderer-part1.js (prepend part1 content before this file)
// =============================================================================

'use strict';

// =============================================================================
// SECTION 2A — APP STATE
// =============================================================================

const AppState = {
  // Tab management
  tabs: [],           // Array of { id, session, chatHistory, pendingImages }
  activeTabId: null,

  // Config & persisted data
  config: {
    apiKey: '',
    obsidianVault: '',
    theme: 'stealth',
    outputDir: '',
    vpnCheckEnabled: true,
    autosaveEnabled: true,
    fontSize: 'medium',
    soundEnabled: true,
    notificationsEnabled: true,
    operatorName: 'ItsEliias',
  },

  // Progress & gamification
  progressData: {
    skillTree: {},    // domain -> { nodes unlocked }
    achievements: [], // array of achieved IDs
    totalXP: 0,
    stats: {},
  },

  // Lab tracker
  labsData: {
    columns: {
      backlog:     { id: 'backlog',     title: 'Backlog',      cards: [] },
      inprogress:  { id: 'inprogress',  title: 'In Progress',  cards: [] },
      completed:   { id: 'completed',   title: 'Completed',    cards: [] },
      abandoned:   { id: 'abandoned',   title: 'Abandoned',    cards: [] },
    }
  },

  // Snippets
  snippetsData: [],

  // Runtime state
  vpnStatus: { connected: false, interface: null },
  isOffline: false,
  focusMode: false,
  apiKeyValid: false,

  // Chart instances
  charts: { radar: null, activity: null },

  // Drag state for kanban
  dragState: { cardId: null, sourceCol: null },

  // Snippet search overlay
  snippetSearchOpen: false,

  // Session list cache
  sessionList: [],

  // Update available
  updateAvailable: false,

  // VPN poll interval
  vpnInterval: null,
};

// =============================================================================
// SECTION 2B — UTILITY HELPERS
// =============================================================================

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escHtml(str) {
  if (typeof str !== 'string') str = String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(message, type = 'info', duration = 3000) {
  const container = $('#toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
  document.body.appendChild(div);
  return div;
}

function showModal(id) {
  const el = $(`#${id}`);
  if (el) { el.classList.add('open'); el.removeAttribute('hidden'); }
}

function hideModal(id) {
  const el = $(`#${id}`);
  if (el) { el.classList.remove('open'); el.setAttribute('hidden', ''); }
}

function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = text || 'Loading…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    btn.disabled = false;
  }
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
    showToast('Copied to clipboard', 'success', 1500);
  }).catch(() => showToast('Copy failed', 'error'));
}

// =============================================================================
// SECTION 2C — SPLASH SCREEN
// =============================================================================

function showSplash() {
  const splash = $('#splash');
  if (!splash) return;
  splash.style.display = '';
  splash.classList.remove('fade-out');
}

function hideSplash(callback) {
  const splash = $('#splash');
  if (!splash) { callback && callback(); return; }
  // CSS: #splash.fade-out { opacity: 0; pointer-events: none; }
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.style.display = 'none';
    callback && callback();
  }, 520);
}

// =============================================================================
// SECTION 2D — SETUP WIZARD
// HTML uses: .wizard-step (shown/hidden via display), .wizard-next, .wizard-back classes
// IDs: #wizard-apikey, #wizard-vault, #browse-vault-btn, #test-api-btn, #wizard-finish
// =============================================================================

let wizardStep = 0;
const WIZARD_TOTAL = 5;

function showWizard() {
  const wizard = $('#setup-wizard');
  if (!wizard) return;
  wizard.classList.add('active');  // CSS: #setup-wizard.active { display: flex }
  wizardStep = 0;
  renderWizardStep();
}

function hideWizard() {
  const wizard = $('#setup-wizard');
  if (wizard) wizard.classList.remove('active');
}

function renderWizardStep() {
  // Show only the current step, hide all others
  $$('.wizard-step').forEach((el, i) => {
    el.style.display = i === wizardStep ? '' : 'none';
  });

  // Wire theme previews when on step 3 (index 3)
  if (wizardStep === 3) wireWizardThemes();
}

function wireWizardThemes() {
  $$('.theme-preview').forEach(el => {
    const t = el.dataset.theme;
    if (!t) return;
    el.style.cursor = 'pointer';
    el.style.outline = AppState.config.theme === t ? '2px solid var(--accent)' : '';
    el.addEventListener('click', () => {
      AppState.config.theme = t;
      applyTheme(t);
      $$('.theme-preview').forEach(p => { p.style.outline = p.dataset.theme === t ? '2px solid var(--accent)' : ''; });
    });
  });
}

async function wizardNext() {
  // Step 1 (index 1) — API Key
  if (wizardStep === 1) {
    const input = $('#wizard-apikey');
    const key = input ? input.value.trim() : '';
    if (key) {
      const activeBtn = document.activeElement;
      if (activeBtn) activeBtn.textContent = 'Testing…';
      try {
        const ok = await window.electronAPI.testApiKey(key);
        if (ok) {
          await window.electronAPI.saveApiKey(key);
          AppState.apiKeyValid = true;
          updateApiStatusDot(true);
          showToast('API key verified!', 'success');
        } else {
          showToast('Key invalid — you can fix it later in Settings', 'warning', 4000);
        }
      } catch (e) {
        showToast('Could not verify: ' + e.message, 'error');
      }
      if (activeBtn) activeBtn.textContent = 'Continue →';
    }
  }

  // Step 2 (index 2) — Obsidian vault
  if (wizardStep === 2) {
    const input = $('#wizard-vault');
    if (input && input.value.trim()) {
      AppState.config.obsidianVault = input.value.trim();
    }
  }

  if (wizardStep < WIZARD_TOTAL - 1) {
    wizardStep++;
    renderWizardStep();
  }
}

function wizardPrev() {
  if (wizardStep > 0) { wizardStep--; renderWizardStep(); }
}

async function wizardFinish() {
  AppState.config.setupComplete = true;
  await window.electronAPI.saveConfig(AppState.config);
  hideWizard();
  showApp();
}

async function wizardPickObsidian() {
  const dir = await window.electronAPI.pickFolder();
  if (dir) {
    const input = $('#wizard-vault');
    if (input) input.value = dir;
    AppState.config.obsidianVault = dir;
  }
}

async function wizardTestApi() {
  const input = $('#wizard-apikey');
  const result = $('#api-test-result');
  const btn = $('#test-api-btn');
  const key = input ? input.value.trim() : '';
  if (!key) { showToast('Enter an API key first', 'warning'); return; }
  if (btn) btn.textContent = 'Testing…';
  try {
    const ok = await window.electronAPI.testApiKey(key);
    if (result) {
      result.textContent = ok ? '✓ Connected' : '✗ Invalid key';
      result.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
    if (ok) {
      await window.electronAPI.saveApiKey(key);
      AppState.apiKeyValid = true;
      updateApiStatusDot(true);
    }
  } catch (e) {
    if (result) { result.textContent = '✗ Error'; result.style.color = 'var(--danger)'; }
  }
  if (btn) btn.textContent = 'Test Connection';
}

// =============================================================================
// SECTION 2E — APP SHELL SHOW / HIDE
// =============================================================================

function showApp() {
  const appRoot = $('#app-root');
  if (appRoot) appRoot.style.display = '';

  // Start on Dashboard — no auto-tab creation
  switchScreen('dashboard');

  // Load persisted data — each guarded so one failure doesn't cascade
  try { loadProgressData(); }   catch(e) { console.error('[showApp] loadProgressData:', e); }
  try { loadLabTrackerData(); } catch(e) { console.error('[showApp] loadLabTrackerData:', e); }
  try { loadSnippetsData(); }   catch(e) { console.error('[showApp] loadSnippetsData:', e); }
  try { startVpnMonitor(); }    catch(e) { console.error('[showApp] startVpnMonitor:', e); }

  // Wire all sections — each wrapped independently so one failure cannot block another
  try { wireTopBar(); }         catch(e) { console.error('[showApp] wireTopBar:', e); }
  try { if (typeof wireV2Layout === 'function') wireV2Layout(); }
    catch(e) { console.error('[showApp] wireV2Layout:', e); }
  try { wireModals(); }         catch(e) { console.error('[showApp] wireModals:', e); }
  try { wireSettingsScreen(); } catch(e) { console.error('[showApp] wireSettingsScreen:', e); }
  try { wireProgressScreen(); } catch(e) { console.error('[showApp] wireProgressScreen:', e); }
  try { wireTrackerScreen(); }  catch(e) { console.error('[showApp] wireTrackerScreen:', e); }

  // Wire full-page screens
  try { if (typeof wireDashboardScreen === 'function') wireDashboardScreen(); }
    catch(e) { console.error('[showApp] wireDashboardScreen:', e); }
  try { if (typeof wireOverviewScreen  === 'function') wireOverviewScreen();  }
    catch(e) { console.error('[showApp] wireOverviewScreen:', e); }
  try { if (typeof wireNotesScreen     === 'function') wireNotesScreen();     }
    catch(e) { console.error('[showApp] wireNotesScreen:', e); }
  try { if (typeof wireBookmarksScreen === 'function') wireBookmarksScreen(); }
    catch(e) { console.error('[showApp] wireBookmarksScreen:', e); }
  try { if (typeof wireCommandsScreen  === 'function') wireCommandsScreen();  }
    catch(e) { console.error('[showApp] wireCommandsScreen:', e); }
  try { if (typeof wireReconScreen     === 'function') wireReconScreen();     }
    catch(e) { console.error('[showApp] wireReconScreen:', e); }
  try { if (typeof wirePhaseScreens    === 'function') wirePhaseScreens();    }
    catch(e) { console.error('[showApp] wirePhaseScreens:', e); }

  // Finish-up
  try { checkUpdateBanner(); }  catch(e) { console.error('[showApp] checkUpdateBanner:', e); }

  // Apply saved theme
  applyTheme(AppState.config.theme || 'stealth', false);

  // Update theme dropdown
  const themeSel = $('#theme-select');
  if (themeSel) themeSel.value = AppState.config.theme || 'stealth';

  // Set font size
  applyFontSize(AppState.config.fontSize || 'medium');

  // Wire global keyboard shortcuts
  try { wireKeyboardShortcuts(); } catch(e) { console.error('[showApp] wireKeyboardShortcuts:', e); }

  // Ensure New Session buttons are always wired (safety net)
  const nsBtn1 = $('#new-tab-btn');
  if (nsBtn1 && !nsBtn1._nsWired) { nsBtn1._nsWired = true; nsBtn1.addEventListener('click', () => showNewSessionModal()); }
  const nsBtn2 = $('#dash-new-session-btn');
  if (nsBtn2 && !nsBtn2._nsWired) { nsBtn2._nsWired = true; nsBtn2.addEventListener('click', () => showNewSessionModal()); }
  const nsBtn3 = $('#create-session-btn');
  if (nsBtn3 && !nsBtn3._nsWired) { nsBtn3._nsWired = true; nsBtn3.addEventListener('click', confirmNewSession); }

  console.log('[showApp] All wiring complete');
}

function switchScreen(screenId) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === `${screenId}-screen`));
  $$('.nav-tab-btn[data-screen]').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId));
}

function applyFontSize(size) {
  const sizes = { small: '13px', medium: '14px', large: '16px' };
  document.documentElement.style.setProperty('--base-font-size', sizes[size] || '14px');
}

// =============================================================================
// SECTION 2F — TOP BAR WIRING
// =============================================================================

function wireTopBar() {
  // Theme switcher
  const themeSel = $('#theme-select');
  if (themeSel) {
    themeSel.value = AppState.config.theme || 'stealth';
    themeSel.addEventListener('change', async () => {
      AppState.config.theme = themeSel.value;
      applyTheme(AppState.config.theme);
      if (AppState.config.soundEnabled) Sounds.themeSwitch();
      await window.electronAPI.saveConfig(AppState.config);
      updateHighlightThemeForActiveTab();
    });
  }

  // Screen nav buttons (legacy top-bar nav)
  $$('.nav-tab-btn[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      switchScreen(screen);
      if (screen === 'progress') refreshProgressScreen();
      if (screen === 'tracker') refreshTrackerScreen();
    });
  });

  // v2 sidebar nav items
  // Each item is wired ONCE here. Wiring is guarded so it's safe to call wireTopBar multiple times.
  $$('.sidebar-nav-item:not([data-wired])').forEach(btn => {
    btn.dataset.wired = '1'; // prevent double-binding
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      const view   = btn.dataset.view;

      // ── Active highlight ──────────────────────────────────────────────────
      $$('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // ── Screen-switch items (all non-lab screens) ────────────────────────
      if (screen && screen !== 'lab') {
        switchScreen(screen);
        if (screen === 'dashboard')  { if (typeof renderDashboardScreen  === 'function') renderDashboardScreen(); }
        if (screen === 'overview')   { if (typeof renderOverviewScreen   === 'function') renderOverviewScreen(); }
        if (screen === 'progress')   refreshProgressScreen();
        if (screen === 'tracker')    refreshTrackerScreen();
        if (screen === 'notes')      { if (typeof refreshNotesScreen     === 'function') refreshNotesScreen(); }
        if (screen === 'bookmarks')  { if (typeof refreshBookmarksScreen === 'function') refreshBookmarksScreen(); }
        if (screen === 'recon')      { if (typeof refreshReconScreen     === 'function') refreshReconScreen(); }
        if (screen === 'commands')   { if (typeof wireCommandsScreen     === 'function') wireCommandsScreen(); }
        if (['exploits','enum','privesc','postex','loot'].includes(screen)) {
          if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
        }
        return;
      }

      // ── Lab views — stay on lab screen ────────────────────────────────────
      switchScreen('lab');

      const filterMap = {
        overview: 'all', chat: 'all', exploit: 'exploit',
        enum: 'enum', privesc: 'privesc', post: 'post',
        loot: 'post', notes: 'all', bookmarks: 'all', recon: 'recon'
      };
      const catFilter = filterMap[view] || 'all';

      // Render tools panel with the matching category
      if (typeof renderToolsPanel === 'function') renderToolsPanel(catFilter);

      // Sync tool-filter tab strip
      $$('.tfil').forEach(t => t.classList.toggle('active', t.dataset.filter === catFilter));

      // Per-view side effects — make it obvious something happened
      if (view === 'chat' || view === 'overview') {
        // Delay focus slightly so Electron window re-focus settles
        setTimeout(() => { const inp = $('#message-input'); if (inp) inp.focus(); }, 80);
      }

      if (view === 'loot') {
        // no panel scroll needed — stays on lab screen
      }

      if (view === 'loot') {
        // Scroll findings sections into view in target panel
        const creds = $('#findings-credentials');
        if (creds) creds.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Flash the tools section briefly so the user sees it changed
      const toolsSec = $('#tools-section');
      if (toolsSec) {
        toolsSec.style.transition = 'none';
        toolsSec.style.outline = '2px solid var(--accent)';
        setTimeout(() => {
          toolsSec.style.outline = '';
          toolsSec.style.transition = '';
        }, 400);
      }
    });
  });

  // Focus mode button
  const focusBtn = $('#btn-focus');
  if (focusBtn) focusBtn.addEventListener('click', toggleFocusMode);

  // Focus exit pill
  const focusExit = $('#focus-exit-pill');
  if (focusExit) focusExit.addEventListener('click', toggleFocusMode);

  // Settings button — HTML id is btn-settings2
  const settingsBtn = $('#btn-settings2');
  if (settingsBtn && !settingsBtn._settingsWired) {
    settingsBtn.addEventListener('click', () => switchScreen('settings'));
    settingsBtn._settingsWired = true;
  }

  // Update banner — HTML has view-release-btn and dismiss-update-btn
  const updateBtn = $('#view-release-btn');
  if (updateBtn) updateBtn.addEventListener('click', () => window.electronAPI.openExternal('https://github.com/cyberlab-companion/releases'));
  const dismissBtn = $('#dismiss-update-btn');
  if (dismissBtn) dismissBtn.addEventListener('click', () => {
    const banner = $('#update-banner');
    if (banner) banner.style.display = 'none';
  });
}

function updateVpnIndicator(status) {
  AppState.vpnStatus = status;
  // v2 layout: .vpn-chip#vpn-indicator (no longer #vpn-dot)
  const chip = $('#vpn-indicator');
  const label = $('#vpn-label');
  const focusDot = $('#focus-vpn-dot');
  if (chip) {
    chip.classList.toggle('vpn-on', status.connected);
    chip.classList.toggle('vpn-off', !status.connected);
  }
  if (focusDot) {
    focusDot.classList.toggle('on', status.connected);
    focusDot.classList.toggle('off', !status.connected);
  }
  if (label) {
    label.textContent = status.connected ? (status.interface || 'VPN') : 'No VPN';
  }
}

function updateApiStatusDot(valid) {
  AppState.apiKeyValid = valid;
  const dot = $('#api-status-dot');
  if (dot) {
    dot.classList.toggle('api-ok', valid);
    dot.classList.toggle('api-err', !valid);
    dot.title = valid ? 'API Connected' : 'API Not Connected';
  }
}

function checkUpdateBanner() {
  const banner = $('#update-banner');
  if (banner && AppState.updateAvailable) {
    banner.removeAttribute('hidden');
  }
}

function startVpnMonitor() {
  if (!AppState.config.vpnCheckEnabled) return;
  const poll = async () => {
    try {
      const status = await window.electronAPI.checkVPN();
      updateVpnIndicator(status);
    } catch (_) {}
  };
  poll();
  AppState.vpnInterval = setInterval(poll, 30000);
}

function updateHighlightThemeForActiveTab() {
  // Re-highlight all code blocks in active chat
  if (typeof hljs !== 'undefined') {
    $$('#chat-history pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
}

// =============================================================================
// SECTION 2G — TAB MANAGEMENT
// =============================================================================

function createTab(sessionData) {
  if (AppState.tabs.length >= 5) {
    showToast('Maximum 5 tabs open', 'warning');
    return null;
  }

  const tabId = generateId();
  const session = sessionData || createSession({
    name: 'New Session',
    target: '',
    platform: 'HTB',
    difficulty: 'Medium',
  });

  const tab = {
    id: tabId,
    session,
    chatHistory: [], // Array of { role, content, timestamp, images? }
    pendingImages: [],
    isTyping: false,
    hintLevel: 1,
    teachMeMode: false,
    methodologyStep: 0,
    scrollPos: 0,
  };

  AppState.tabs.push(tab);
  renderTabBar();
  switchTab(tabId);
  return tabId;
}

function closeTab(tabId) {
  const idx = AppState.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  // Prompt save if session has content
  const tab = AppState.tabs[idx];
  if (tab.chatHistory.length > 0 && !tab.session.saved) {
    // Auto-save before closing
    autoSaveTab(tab);
  }

  AppState.tabs.splice(idx, 1);

  if (AppState.tabs.length === 0) {
    // No more tabs — return to Dashboard, do NOT auto-create a blank session
    AppState.activeTabId = null;
    renderTabBar();
    switchScreen('dashboard');
    if (typeof renderDashboardScreen === 'function') renderDashboardScreen();
    return;
  }

  // Switch to adjacent tab
  const newIdx = Math.min(idx, AppState.tabs.length - 1);
  switchTab(AppState.tabs[newIdx].id);
  renderTabBar();
}

function switchTab(tabId) {
  const tab = AppState.tabs.find(t => t.id === tabId);
  if (!tab) return;

  // Save scroll position of old tab
  const oldTab = AppState.tabs.find(t => t.id === AppState.activeTabId);
  if (oldTab) {
    const messages = $('#chat-history');
    if (messages) oldTab.scrollPos = messages.scrollTop;
  }

  AppState.activeTabId = tabId;
  renderTabBar();
  renderActiveTab();
}

function getActiveTab() {
  return AppState.tabs.find(t => t.id === AppState.activeTabId) || null;
}

function renderTabBar() {
  const tabBar = $('#tab-bar');
  if (!tabBar) return;

  const addBtn = tabBar.querySelector('.tab-add');  // HTML: id="new-tab-btn" class="tab-add"
  // Remove old tabs but keep add button
  tabBar.querySelectorAll('.tab-item').forEach(t => t.remove());

  AppState.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `tab-item ${tab.id === AppState.activeTabId ? 'active' : ''}`;
    el.dataset.tabId = tab.id;

    const name = tab.session?.name || 'New Session';
    const platform = tab.session?.platform || '';
    const diff = tab.session?.difficulty || '';
    const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
    const dotColor = diffColors[diff] || 'var(--text-muted)';

    el.innerHTML = `
      <span class="tab-dot" style="background:${dotColor}"></span>
      <span class="tab-label" title="${escHtml(name)}">${escHtml(name.length > 18 ? name.slice(0, 18) + '…' : name)}</span>
      ${platform ? `<span class="tab-platform">${escHtml(platform)}</span>` : ''}
      <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">×</button>
    `;

    el.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) switchTab(tab.id);
    });

    const closeBtn = el.querySelector('.tab-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab.id); });

    if (addBtn) tabBar.insertBefore(el, addBtn);
    else tabBar.appendChild(el);
  });

  // Disable add button if max reached
  if (addBtn) addBtn.disabled = AppState.tabs.length >= 5;
}

function renderActiveTab() {
  const tab = getActiveTab();
  if (!tab) return;

  // Update session info panel
  renderSessionInfo(tab);

  // Render chat history
  renderChatHistory(tab);

  // Update right panel state
  renderRightPanelForTab(tab);

  // Update hint level display
  updateHintLevelDisplay(tab);

  // Update teach me button state
  const teachBtn = $('#teach-me-btn');
  if (teachBtn) teachBtn.classList.toggle('active', !!tab.teachMeMode);
  const teachBadge = $('#teach-me-badge');
  if (teachBadge) teachBadge.style.display = tab.teachMeMode ? '' : 'none';

  // Update context bar session name
  const ctxName = $('#context-session-name');
  if (ctxName) ctxName.textContent = tab.session?.name || '—';

  // Update status bar
  updateStatusBar(tab);
  updateSidebarProgress();

  // Restore scroll
  setTimeout(() => {
    const messages = $('#chat-history');
    if (messages) messages.scrollTop = tab.scrollPos || messages.scrollHeight;
  }, 50);
}

// =============================================================================
// SECTION 2H — SESSION MANAGEMENT
// =============================================================================

function showNewSessionModal() {
  const modal = $('#new-session-modal');
  if (!modal) return;

  // Reset form
  const form = modal.querySelector('form') || modal;
  const nameInput = modal.querySelector('#ns-name');
  const targetInput = modal.querySelector('#ns-ip');
  const platformSel = modal.querySelector('#ns-platform');
  const diffSel = modal.querySelector('#ns-difficulty');
  const ipInput = modal.querySelector('#ns-ip');
  const osInput = modal.querySelector('#ns-labtype');
  const notesInput = modal.querySelector('#ns-name');

  if (nameInput) nameInput.value = '';
  if (targetInput) targetInput.value = '';
  if (platformSel) platformSel.value = 'HTB';
  if (diffSel) diffSel.value = 'Medium';
  if (ipInput) ipInput.value = '';
  if (osInput) osInput.value = '';
  if (notesInput) notesInput.value = '';

  showModal('new-session-modal');
  if (nameInput) nameInput.focus();
}

function confirmNewSession() {
  const modal = $('#new-session-modal');
  if (!modal) return;

  const name = (modal.querySelector('#ns-name')?.value || '').trim();
  if (!name) { showToast('Please enter a session name', 'warning'); return; }

  const sessionData = createSession({
    name,
    target: modal.querySelector('#ns-ip')?.value?.trim() || '',
    platform: modal.querySelector('#ns-platform')?.value || 'HTB',
    difficulty: modal.querySelector('#ns-difficulty')?.value || 'Medium',
    targetIp: modal.querySelector('#ns-ip')?.value?.trim() || '',
    targetOs: modal.querySelector('#ns-labtype')?.value?.trim() || '',
    notes: modal.querySelector('#ns-name')?.value?.trim() || '',
  });

  hideModal('new-session-modal');

  // Create new tab with this session
  const tabId = createTab(sessionData);
  if (tabId && AppState.config.soundEnabled) Sounds.click();

  showToast(`Session "${name}" started`, 'success');
}

function renderSessionInfo(tab) {
  if (!tab?.session) return;
  const s = tab.session;

  // ── Top bar session indicator ─────────────────────────────────────────────
  const sessionNameDisplay = $('#session-name-display');
  if (sessionNameDisplay) sessionNameDisplay.textContent = s.name || 'No active session';
  const sessionPulse = $('#session-pulse');
  if (sessionPulse) {
    sessionPulse.className = 'session-pulse ' + (s.targetIp ? 'active' : 'idle');
  }

  // ── Target panel status dot + name ────────────────────────────────────────
  const statusDot = $('#session-status-dot');
  if (statusDot) statusDot.classList.toggle('active', !!s.targetIp);

  const nameEl = $('#target-hostname');
  if (nameEl) nameEl.textContent = s.name || 'Unnamed';

  // Platform select dropdown
  const platformSel = $('#session-platform-select');
  if (platformSel) {
    platformSel.value = s.platform || 'HTB';
    // Wire once — guard with _platformWired
    if (!platformSel._platformWired) {
      platformSel._platformWired = true;
      platformSel.addEventListener('change', async () => {
        const tab = getActiveTab();
        if (tab?.session) {
          tab.session.platform = platformSel.value;
          renderTabBar(); // refresh tab badge
          await autoSaveTab(tab);
        }
      });
    }
  }

  // Difficulty badge
  const diffEl = $('#session-difficulty-label');
  const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
  if (diffEl) {
    diffEl.textContent = s.difficulty || '';
    diffEl.style.color = diffColors[s.difficulty] || 'var(--text-dim)';
  }

  // Session type badge (session-diff-badge)
  const diffBadge = $('#session-diff-badge');
  if (diffBadge && s.difficulty) {
    diffBadge.textContent = s.difficulty;
    diffBadge.style.color = diffColors[s.difficulty] || 'var(--text-dim)';
    diffBadge.style.borderColor = diffColors[s.difficulty] || 'var(--border)';
  }

  // Target IP
  const ipEl = $('#target-ip');
  if (ipEl) ipEl.textContent = s.targetIp || '—';

  // Hostname (displayed below IP if different from name)
  const hostnameEl = $('#target-hostname-display');
  if (hostnameEl) hostnameEl.textContent = s.hostname || s.name || '—';

  // OS
  const osEl = $('#target-os');
  if (osEl) osEl.textContent = s.targetOs || '—';

  // Duration
  const durEl = $('#elapsed-display');
  if (durEl) durEl.textContent = formatDuration(s.startTime ? Date.now() - s.startTime : 0);

  // Context bar — session name
  const ctxName = $('#context-session-name');
  if (ctxName) ctxName.textContent = s.name || '—';

  // Methodology steps
  renderMethodologyTracker(tab);

  // Findings list (also updates status bar + sidebar progress)
  renderFindingsList(tab);

  // Status bar + sidebar
  updateStatusBar(tab);
  updateSidebarProgress();
}

function renderMethodologyTracker(tab) {
  const container = $('#methodology-phases');
  if (!container || !tab?.session) return;

  const STEPS = ['Recon', 'Enum', 'Exploit', 'Post-Exploit', 'PrivEsc', 'Lateral', 'Flag Capture'];
  const currentStep = tab.session.methodologyStep || 0;

  container.innerHTML = STEPS.map((step, i) => {
    const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
    return `
      <div class="method-step method-step-${state}" data-step="${i}" title="${escHtml(step)}">
        <span class="method-icon">${state === 'done' ? '✓' : i + 1}</span>
        <span class="method-label">${escHtml(step)}</span>
      </div>
    `;
  }).join('');

  // Click to advance
  container.querySelectorAll('.method-step').forEach(el => {
    el.addEventListener('click', () => {
      const step = parseInt(el.dataset.step);
      if (!tab.session) return;
      tab.session.methodologyStep = step;
      renderMethodologyTracker(tab);
    });
  });
}

function renderFindingsList(tab) {
  if (!tab?.session) return;

  // session.findings is a categorized object: { ports:[], users:[], credentials:[], flags:[], cves:[], files:[], hashes:[], services:[] }
  const TYPE_MAP = [
    ['ports',       'PORT'],
    ['users',       'USER'],
    ['credentials', 'CRED'],
    ['flags',       'FLAG'],
    ['cves',        'CVE'],
    ['files',       'FILE'],
    ['hashes',      'HASH'],
    ['services',    'SERVICE'],
  ];

  const raw = tab.session.findings;

  // Build typed buckets
  const byType = { PORT:[], USER:[], CRED:[], FLAG:[], CVE:[], FILE:[], HASH:[], SERVICE:[] };
  if (Array.isArray(raw)) {
    raw.forEach(f => {
      const t = (f.type || 'unknown').toUpperCase();
      if (byType[t]) byType[t].push(f);
    });
  } else if (raw && typeof raw === 'object') {
    TYPE_MAP.forEach(([key, type]) => {
      (raw[key] || []).forEach(f => byType[type].push({ ...f, type }));
    });
  }

  // Chip renderer for target panel
  const chip = (f, type) => {
    const raw = f.value || f.port || '';
    const val = escHtml(raw.toString().slice(0, 36));
    return `<span class="tp-find-chip tp-chip-${type.toLowerCase()}" title="${escHtml(raw.toString())}">${val}</span>`;
  };

  const emptySpan = `<span class="tp-empty" style="font-size:10px;color:var(--text-muted);font-style:italic">none</span>`;

  // Ports
  const portsEl = $('#findings-ports');
  if (portsEl) portsEl.innerHTML = byType.PORT.length ? byType.PORT.map(f => chip(f, 'PORT')).join('') : emptySpan;

  // Ports count badge
  const countBadge = $('#ports-count-badge');
  if (countBadge) countBadge.textContent = byType.PORT.length + byType.SERVICE.length;

  // Services (no empty fallback — collapsed if none)
  const servicesEl = $('#findings-services');
  if (servicesEl) servicesEl.innerHTML = byType.SERVICE.map(f => chip(f, 'SERVICE')).join('');

  // Credentials
  const credsEl = $('#findings-credentials');
  if (credsEl) credsEl.innerHTML = byType.CRED.length ? byType.CRED.map(f => chip(f, 'CRED')).join('') : emptySpan;

  // Users (no empty — collapsed if none)
  const usersEl = $('#findings-users');
  if (usersEl) usersEl.innerHTML = byType.USER.map(f => chip(f, 'USER')).join('');

  // Flags
  const flagsCaptured = byType.FLAG.length;
  const flagsTotal = tab.session.flagCount || 0;
  const flagsEl = $('#findings-flags');
  if (flagsEl) flagsEl.innerHTML = byType.FLAG.length ? byType.FLAG.map(f => chip(f, 'FLAG')).join('') : emptySpan;

  const flagsFrac = $('#flags-fraction');
  if (flagsFrac) flagsFrac.textContent = `${flagsCaptured}/${flagsTotal || '?'}`;

  // CVEs
  const cvesEl = $('#findings-cves');
  if (cvesEl) cvesEl.innerHTML = byType.CVE.length ? byType.CVE.map(f => chip(f, 'CVE')).join('') : emptySpan;

  // Legacy #findings-content fallback (in hidden panel or legacy layout)
  const legacyEl = $('#findings-content');
  if (legacyEl) {
    const flat = Object.values(byType).flat();
    const typeIcons = { PORT:'🔌', CRED:'🔑', CVE:'⚠️', FLAG:'🚩', FILE:'📄', SERVICE:'⚙️', USER:'👤', HASH:'#️⃣' };
    if (flat.length === 0) {
      legacyEl.innerHTML = '<div class="findings-empty" style="font-size:11px;color:var(--text-muted);padding:8px 0">No findings yet.</div>';
    } else {
      legacyEl.innerHTML = flat.map(f => `
        <div class="finding-item finding-${(f.type||'unknown').toLowerCase()}" data-id="${escHtml(f.id||'')}" data-type="${escHtml(f.type||'')}">
          <span class="finding-icon">${typeIcons[f.type]||'•'}</span>
          <span class="finding-type" style="font-size:10px;opacity:0.6">${escHtml(f.type||'')}</span>
          <span class="finding-value" title="${escHtml(f.value||'')}" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml((f.value||'').length>40?(f.value||'').slice(0,40)+'…':(f.value||''))}</span>
          <button class="finding-copy-btn" data-value="${escHtml(f.value||'')}" title="Copy" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px">⧉</button>
          <button class="finding-del-btn" data-id="${escHtml(f.id||'')}" data-type="${escHtml(f.type||'')}" title="Remove" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px">×</button>
        </div>`).join('');
      legacyEl.querySelectorAll('.finding-copy-btn').forEach(btn => btn.addEventListener('click', () => copyToClipboard(btn.dataset.value)));
      legacyEl.querySelectorAll('.finding-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (typeof sessionRemoveFinding === 'function') sessionRemoveFinding(tab.session, btn.dataset.type, btn.dataset.id);
          renderFindingsList(tab);
        });
      });
    }
  }

  // Cascade update to status bar + sidebar
  updateStatusBar(tab);
  updateSidebarProgress();
}

// -----------------------------------------------------------------------------
// STATUS BAR — update bottom strip with live session data
// -----------------------------------------------------------------------------
function updateStatusBar(tab) {
  const s = tab?.session;

  // Elapsed timer
  const elapsedEl = $('#status-elapsed');
  if (elapsedEl && s?.startTime) {
    elapsedEl.textContent = formatDuration(Date.now() - s.startTime);
  } else if (elapsedEl) {
    elapsedEl.textContent = '00:00:00';
  }

  // Target name
  const targetNameEl = $('#status-target-name');
  if (targetNameEl) targetNameEl.textContent = s?.name || '—';

  // Flags progress
  const raw = s?.findings;
  let flagCount = 0;
  if (Array.isArray(raw)) {
    flagCount = raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
  } else if (raw?.flags) {
    flagCount = (raw.flags || []).length;
  }
  const totalFlags = s?.flagCount || 0;

  const flagsTextEl = $('#status-flags-text');
  if (flagsTextEl) flagsTextEl.textContent = `${flagCount} / ${totalFlags || '?'} flags captured`;

  const flagsFill = $('#status-flags-bar-fill');
  if (flagsFill) {
    const pct = totalFlags > 0 ? Math.round((flagCount / totalFlags) * 100) : 0;
    flagsFill.style.width = pct + '%';
  }
}

// -----------------------------------------------------------------------------
// SIDEBAR PROGRESS — update aggregate stats across all tabs
// -----------------------------------------------------------------------------
function updateSidebarProgress() {
  const allTabs = AppState.tabs || [];
  let totalMachines = 0, totalFlags = 0, totalHints = 0, totalMs = 0;

  allTabs.forEach(tab => {
    const s = tab?.session;
    if (!s) return;
    if (s.completed) totalMachines++;
    const raw = s.findings;
    if (Array.isArray(raw)) totalFlags += raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
    else if (raw?.flags) totalFlags += (raw.flags || []).length;
    totalHints += s.hintsUsed || 0;
    if (s.startTime && !s.endTime) totalMs += (Date.now() - s.startTime);
    else if (s.duration) totalMs += s.duration;
  });

  // Per-session progress bar (active tab)
  const activeTab = getActiveTab();
  const raw = activeTab?.session?.findings;
  let curFlags = 0;
  const curTotal = activeTab?.session?.flagCount || 0;
  if (Array.isArray(raw)) curFlags = raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
  else if (raw?.flags) curFlags = (raw.flags || []).length;

  const pct = curTotal > 0 ? Math.round((curFlags / curTotal) * 100) : 0;
  const fill = $('#sidebar-progress-fill');
  const pctEl = $('#sidebar-progress-pct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  // Global stats
  const setEl = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val; };
  setEl('stat-machines-hacked', totalMachines);
  setEl('stat-flags-captured', totalFlags);
  setEl('stat-hints-used', totalHints);
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  setEl('stat-time-spent', hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
}

async function autoSaveTab(tab) {
  if (!tab?.session) return;
  try {
    const data = serializeSession(tab.session, tab.chatHistory);
    await window.electronAPI.saveSession(data);
    tab.session.saved = true;
  } catch (e) {
    console.warn('Autosave failed:', e.message);
  }
}

async function manualSaveSession() {
  const tab = getActiveTab();
  if (!tab) return;
  try {
    const data = serializeSession(tab.session, tab.chatHistory);
    await window.electronAPI.saveSession(data);
    tab.session.saved = true;
    showToast('Session saved', 'success', 1500);
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function loadSessionList() {
  try {
    AppState.sessionList = await window.electronAPI.listSessions();
  } catch (e) {
    AppState.sessionList = [];
  }
}

// =============================================================================
// SECTION 2I — CHAT SYSTEM
// =============================================================================

function renderChatHistory(tab) {
  const container = $('#chat-history');
  if (!container) return;
  container.innerHTML = '';

  if (tab.chatHistory.length === 0) {
    renderWelcomeMessage(container, tab);
    return;
  }

  tab.chatHistory.forEach(msg => appendMessageToDOM(container, msg, tab));
}

function renderWelcomeMessage(container, tab) {
  const welcome = document.createElement('div');
  welcome.className = 'chat-welcome';
  const sessionName = tab?.session?.name || 'New Session';
  const platform = tab?.session?.platform || '';
  welcome.innerHTML = `
    <div class="chat-welcome-icon">⚡</div>
    <div class="chat-welcome-title">CYBERLAB COMPANION</div>
    <div class="chat-welcome-sub">Session: <strong>${escHtml(sessionName)}</strong>${platform ? ` · ${escHtml(platform)}` : ''}</div>
    <div class="chat-welcome-hint">Ask anything about your target, request hints, or use the quick actions below.</div>
    <div class="chat-quick-pills">
      <button class="quick-pill" data-prompt="What should I start with for initial reconnaissance?">🔍 Start Recon</button>
      <button class="quick-pill" data-prompt="Generate a checklist for this machine based on what we know.">📋 Checklist</button>
      <button class="quick-pill" data-prompt="Give me a hint for my current step.">💡 Hint</button>
      <button class="quick-pill" data-prompt="Explain the methodology I should follow for this type of machine.">📖 Methodology</button>
      <button class="quick-pill" data-prompt="What are common vulnerabilities for this platform?">⚠️ Vulns</button>
      <button class="quick-pill" data-prompt="How do I capture the flag from here?">🚩 Get Flag</button>
    </div>
  `;
  welcome.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => sendChatMessage(pill.dataset.prompt));
  });
  container.appendChild(welcome);
}

function appendMessageToDOM(container, msg, tab) {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${msg.role}`;
  div.dataset.msgId = msg.id || '';

  if (msg.role === 'user') {
    div.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-msg-role">YOU</span>
        <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="chat-msg-body">${formatUserMessage(msg)}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-msg-role">CYBERLAB AI</span>
        <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
        <button class="chat-copy-btn" title="Copy response">⧉ Copy</button>
      </div>
      <div class="chat-msg-body">${renderAiMessage(msg.content, tab)}</div>
    `;
    const copyBtn = div.querySelector('.chat-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(msg.content));
  }

  // Auto-extracted findings pills (shown under AI messages)
  if (msg.findings && msg.findings.length > 0) {
    const badgeRow = document.createElement('div');
    badgeRow.className = 'finding-badge-row';

    // Label
    const lbl = document.createElement('span');
    lbl.className = 'ai-section-label';
    lbl.textContent = 'AUTO-EXTRACTED FINDINGS';
    badgeRow.appendChild(lbl);

    // Pills
    const pillsRow = document.createElement('div');
    pillsRow.className = 'auto-findings-row';
    msg.findings.forEach(f => {
      const pill = document.createElement('span');
      const type = (f.type || 'unknown').toUpperCase();
      pill.className = `auto-finding-pill ${type}`;
      const typeIcons = { PORT:'🔌', CRED:'🔑', CVE:'⚠️', FLAG:'🚩', FILE:'📄', SERVICE:'⚙️', USER:'👤', HASH:'#️⃣' };
      const icon = typeIcons[type] || '•';
      const valShort = f.value.length > 28 ? f.value.slice(0, 28) + '…' : f.value;
      pill.textContent = `${icon} ${type}:${valShort}`;
      pill.title = f.value;
      pillsRow.appendChild(pill);
    });
    badgeRow.appendChild(pillsRow);
    div.appendChild(badgeRow);
  }

  // Images
  if (msg.images && msg.images.length > 0) {
    const imgRow = document.createElement('div');
    imgRow.className = 'chat-msg-images';
    msg.images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'chat-msg-image';
      img.alt = 'Attached image';
      imgRow.appendChild(img);
    });
    div.appendChild(imgRow);
  }

  container.appendChild(div);

  // Highlight code blocks
  if (msg.role === 'assistant' && typeof hljs !== 'undefined') {
    div.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  }

  // Wire command copy buttons inside AI messages
  div.querySelectorAll('.cmd-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd || btn.closest('.cmd-block')?.querySelector('code')?.textContent || ''));
  });

  return div;
}

function formatUserMessage(msg) {
  let text = escHtml(msg.content || '');
  if (msg.images && msg.images.length > 0) {
    text += `<span class="img-attach-indicator">📎 ${msg.images.length} image${msg.images.length > 1 ? 's' : ''} attached</span>`;
  }
  return `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderAiMessage(content, tab) {
  if (!content) return '';
  // Ensure content is always a string — AI response may arrive as object in some error states
  if (typeof content !== 'string') {
    try { content = JSON.stringify(content, null, 2); }
    catch(e) { content = String(content); }
  }

  // Parse sections: ```code```, **bold**, bullet lists, numbered lists
  let html = '';
  const lines = content.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let inList = false;
  let listHtml = '';

  const flushList = () => {
    if (inList) { html += `<ul>${listHtml}</ul>`; listHtml = ''; inList = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = typeof lines[i] === 'string' ? lines[i] : String(lines[i] ?? '');

    if (line.startsWith('```')) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeLang = line.slice(3).trim() || 'bash';
        codeLines = [];
      } else {
        inCode = false;
        const codeText = codeLines.join('\n');
        html += `
          <div class="cmd-block">
            <div class="cmd-block-header">
              <span class="cmd-lang">${escHtml(codeLang)}</span>
              <button class="cmd-copy-btn" data-cmd="${escHtml(codeText)}">⧉ Copy</button>
            </div>
            <pre><code class="language-${escHtml(codeLang)}">${escHtml(codeText)}</code></pre>
          </div>
        `;
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    // Heading
    if (line.startsWith('### ')) {
      flushList();
      html += `<h4 class="ai-heading">${escHtml(line.slice(4))}</h4>`;
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      html += `<h3 class="ai-heading">${escHtml(line.slice(3))}</h3>`;
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      html += `<h2 class="ai-heading">${escHtml(line.slice(2))}</h2>`;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*]\s/)) {
      inList = true;
      const text = inlineMd(line.slice(2));
      listHtml += `<li>${text}</li>`;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      flushList();
      html += `<ol>${''}`;
      // Simple handling — accumulate numbered
      html += `<li>${inlineMd(line.replace(/^\d+\.\s/, ''))}</li>`;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      flushList();
      html += '<hr class="ai-divider">';
      continue;
    }

    // Finding tags — render inline badge
    if (line.includes('[FINDING:')) {
      flushList();
      const rendered = line.replace(/\[FINDING:(\w+)\]\s*(.+)/g, (_, type, val) => {
        return `<span class="inline-finding-badge inline-finding-${type.toLowerCase()}">[${escHtml(type)}] ${escHtml(val.trim())}</span>`;
      });
      html += `<p>${inlineMd(rendered.includes('inline-finding') ? rendered : escHtml(line))}</p>`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      html += '<br>';
      continue;
    }

    // Normal paragraph
    flushList();
    html += `<p>${inlineMd(line)}</p>`;
  }

  flushList();
  if (inCode && codeLines.length > 0) {
    html += `<pre><code>${escHtml(codeLines.join('\n'))}</code></pre>`;
  }

  return html;
}

function inlineMd(text) {
  if (!text) return '';
  // Already escaped or has HTML? pass through for finding badges
  if (text.includes('class="inline-finding')) return text;
  text = escHtml(text);
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  text = text.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>');
  // Links
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="#" class="ai-link" data-href="$2">$1</a>');
  return text;
}

function showTypingIndicator() {
  const container = $('#chat-history');
  if (!container) return;
  removeTypingIndicator();
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'chat-msg chat-msg-assistant typing-indicator';
  div.innerHTML = `
    <div class="chat-msg-meta"><span class="chat-msg-role">CYBERLAB AI</span></div>
    <div class="chat-msg-body"><span class="typing-dots"><span></span><span></span><span></span></span></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const ind = $('#typing-indicator');
  if (ind) ind.remove();
}

function scrollChatToBottom() {
  const container = $('#chat-history');
  if (container) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(overrideText) {
  const tab = getActiveTab();
  if (!tab) return;

  const input = $('#message-input');
  const text = overrideText || (input ? input.value.trim() : '');
  if (!text && tab.pendingImages.length === 0) return;

  if (!AppState.apiKeyValid && !overrideText) {
    showToast('No API key set — go to Settings to add your Claude API key', 'error', 4000);
    return;
  }

  // Clear input
  if (input && !overrideText) { input.value = ''; autoResizeInput(input); }

  // Build user message
  const userMsg = {
    id: generateId(),
    role: 'user',
    content: text,
    images: [...tab.pendingImages],
    timestamp: Date.now(),
  };
  tab.pendingImages = [];
  updateImagePreviewBar();

  // Update chat history
  tab.chatHistory.push(userMsg);

  // Re-render (or append)
  const container = $('#chat-history');
  const welcomeEl = container?.querySelector('.chat-welcome');
  if (welcomeEl) welcomeEl.remove();
  if (container) appendMessageToDOM(container, userMsg, tab);

  // Show typing
  showTypingIndicator();
  scrollChatToBottom();

  // Disable send button
  const sendBtn = $('#send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    // Build API messages array
    const apiMessages = buildApiMessages(tab);

    // System prompt
    const systemPrompt = buildSystemPrompt(tab.session, tab.hintLevel, tab.teachMeMode);

    // Call Claude
    const response = await window.electronAPI.claudeChat({
      system: systemPrompt,
      messages: apiMessages,
      images: userMsg.images,
    });

    removeTypingIndicator();

    // Parse findings from response
    const extracted = parseFindings(response);
    extracted.forEach(f => sessionAddFinding(tab.session, f));

    // Build AI message
    const aiMsg = {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      findings: extracted,
    };
    tab.chatHistory.push(aiMsg);

    if (container) appendMessageToDOM(container, aiMsg, tab);
    scrollChatToBottom();

    // Update findings panel
    renderFindingsList(tab);

    // Check achievements
    const newAchievements = checkAchievements(AppState.progressData, tab.session, tab.chatHistory);
    newAchievements.forEach(a => triggerAchievement(a));

    // Play sounds
    if (AppState.config.soundEnabled) {
      if (extracted.some(f => f.type === 'FLAG')) Sounds.flag();
      else if (extracted.length > 0) Sounds.finding();
    }

    // Update methodology if flag found
    if (extracted.some(f => f.type === 'FLAG')) {
      if (tab.session.methodologyStep < 6) tab.session.methodologyStep = 6;
      renderMethodologyTracker(tab);
    }

    // Autosave
    if (AppState.config.autosaveEnabled) autoSaveTab(tab);

    // Tab rename update
    renderTabBar();

  } catch (e) {
    removeTypingIndicator();
    if (AppState.config.soundEnabled) Sounds.apiError();

    const errMsg = {
      id: generateId(),
      role: 'assistant',
      content: `**Error:** ${e.message}\n\nPlease check your API key in Settings or try again.`,
      timestamp: Date.now(),
      isError: true,
      findings: [],
    };
    tab.chatHistory.push(errMsg);
    if (container) appendMessageToDOM(container, errMsg, tab);
    scrollChatToBottom();
    showToast('API error: ' + e.message, 'error', 5000);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}

function buildApiMessages(tab) {
  // Trim to last 20 messages to stay within context limits
  const history = tab.chatHistory.slice(-20);
  return history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content || '',
  }));
}

// =============================================================================
// SECTION 2J — CHAT INPUT WIRING
// =============================================================================

function wireChatInput() {
  const input = $('#message-input');
  const sendBtn = $('#send-btn');
  const imageDropZone = $('#image-drop-zone');

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
    input.addEventListener('input', () => autoResizeInput(input));

    // Snippet search trigger — type :: to open
    input.addEventListener('keyup', (e) => {
      if (input.value.endsWith('::')) {
        input.value = input.value.slice(0, -2);
        openSnippetSearch();
      }
    });

    // Paste image
    input.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', () => sendChatMessage());

  // Image attach button
  const attachBtn = $('#image-attach-btn');
  const fileInput = $('#image-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      Array.from(fileInput.files || []).forEach(handleImageFile);
      fileInput.value = '';
    });
  }

  // Drag-drop onto chat area
  const chatArea = $('#center-panel') || $('#chat-history');
  if (chatArea) {
    chatArea.addEventListener('dragover', (e) => { e.preventDefault(); chatArea.classList.add('drag-over'); });
    chatArea.addEventListener('dragleave', () => chatArea.classList.remove('drag-over'));
    chatArea.addEventListener('drop', (e) => {
      e.preventDefault();
      chatArea.classList.remove('drag-over');
      Array.from(e.dataTransfer.files).forEach(f => {
        if (f.type.startsWith('image/')) handleImageFile(f);
      });
    });
  }

  // Quick pills at bottom of chat
  const quickPills = $('#quick-pills');
  if (quickPills) {
    quickPills.querySelectorAll('.pill[data-prompt]').forEach(pill => {
      if (pill.id === 'add-custom-pill') return; // handled separately
      pill.addEventListener('click', () => {
        const prompt = pill.dataset.prompt;
        if (prompt === 'TEACH_ME') {
          // Toggle teach me mode
          const tab = getActiveTab();
          if (tab) {
            tab.teachMeMode = !tab.teachMeMode;
            const badge = $('#teach-me-badge');
            if (badge) badge.style.display = tab.teachMeMode ? '' : 'none';
            showToast(tab.teachMeMode ? 'Teach Me Mode ON' : 'Teach Me Mode OFF', 'info', 1500);
          }
        } else {
          sendChatMessage(prompt);
        }
      });
    });

    // Custom pill — prompts for custom text
    const customPill = $('#add-custom-pill');
    if (customPill) {
      customPill.addEventListener('click', () => {
        const inp = $('#message-input');
        if (inp) { inp.focus(); inp.placeholder = 'Type your custom prompt…'; }
      });
    }
  }

  // Terminal output toggle (Paste terminal output)
  const termToggle = $('#terminal-toggle');
  const termArea = $('#terminal-output-area');
  if (termToggle && termArea) {
    termToggle.addEventListener('click', () => {
      const open = termArea.style.display !== 'none' && termArea.style.display !== '';
      termArea.style.display = open ? 'none' : 'block';
      termToggle.textContent = open ? '▶ Paste terminal output' : '▼ Hide terminal paste';
    });
  }

  // Context selector — cycle context depth
  const ctxSel = $('#context-selector');
  if (ctxSel) {
    ctxSel.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab) return;
      const modes = ['minimal', 'standard', 'full'];
      const cur = tab.contextMode || 'standard';
      tab.contextMode = modes[(modes.indexOf(cur) + 1) % modes.length];
      const nameEl = $('#context-session-name');
      if (nameEl) nameEl.textContent = `${tab.session?.name || '—'} (${tab.contextMode})`;
    });
  }

  // Auto-commands toggle
  const autoCmdStatus = $('#auto-cmd-status');
  const autoCmdBar = autoCmdStatus?.closest('.auto-cmd-indicator');
  if (autoCmdBar) {
    autoCmdBar.style.cursor = 'pointer';
    autoCmdBar.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab) return;
      tab.autoCmd = !tab.autoCmd;
      if (autoCmdStatus) {
        autoCmdStatus.textContent = tab.autoCmd !== false ? 'ON' : 'OFF';
        autoCmdStatus.className = tab.autoCmd !== false ? 'auto-cmd-on' : 'auto-cmd-off';
      }
    });
  }

  // Hint level buttons
  wireHintControls();

  // Teach me button (button, not checkbox)
  const teachBtn = $('#teach-me-btn');
  if (teachBtn) {
    teachBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (tab) {
        tab.teachMeMode = !tab.teachMeMode;
        teachBtn.classList.toggle('active', tab.teachMeMode);
        const badge = $('#teach-me-badge');
        if (badge) badge.style.display = tab.teachMeMode ? '' : 'none';
        showToast(tab.teachMeMode ? '📚 Teach Me Mode ON' : 'Teach Me Mode OFF', 'info', 1800);
      }
    });
  }

  // Mark complete / Done button
  const saveBtn = $('#mark-complete-btn');
  if (saveBtn) saveBtn.addEventListener('click', manualSaveSession);

  // Writeup buttons — both trigger the modal (go-to-writeup-btn and generate-writeup-btn)
  $$('#writeup-btn, #go-to-writeup-btn, #generate-writeup-btn').forEach(btn => {
    if (btn && !btn._writeupWired) { btn._writeupWired = true; btn.addEventListener('click', () => showWriteupModal()); }
  });

  // Summary button
  const summaryBtn = $('#summary-btn');
  if (summaryBtn) summaryBtn.addEventListener('click', () => showSessionSummaryModal());

  // Add finding manually
  const addFindingBtn = $('#add-finding-btn');
  if (addFindingBtn) addFindingBtn.addEventListener('click', () => showModal('add-finding-modal'));
}

function autoResizeInput(input) {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

function handleImageFile(file) {
  const tab = getActiveTab();
  if (!tab) return;
  if (tab.pendingImages.length >= 3) { showToast('Max 3 images per message', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    tab.pendingImages.push(e.target.result);
    updateImagePreviewBar();
  };
  reader.readAsDataURL(file);
}

function updateImagePreviewBar() {
  const tab = getActiveTab();
  const bar = $('#image-preview-area');
  if (!bar) return;
  if (!tab || tab.pendingImages.length === 0) {
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.innerHTML = tab.pendingImages.map((src, i) => `
    <div class="img-preview-thumb">
      <img src="${src}" alt="img ${i + 1}">
      <button class="img-remove-btn" data-idx="${i}">×</button>
    </div>
  `).join('');
  bar.querySelectorAll('.img-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tab.pendingImages.splice(parseInt(btn.dataset.idx), 1);
      updateImagePreviewBar();
    });
  });
}

// =============================================================================
// SECTION 2K — HINT LADDER
// =============================================================================

function wireHintControls() {
  // HTML uses a range slider (#hint-slider) for hint level — wire it
  const slider = $('#hint-slider');
  if (slider) {
    slider.addEventListener('input', () => {
      const tab = getActiveTab();
      if (tab) {
        tab.hintLevel = parseInt(slider.value, 10);
        updateHintLevelDisplay(tab);
      }
    });
  }

  // Legacy up/down buttons (null-safe if not present)
  const hintDown = $('#hint-level-down');
  const hintUp = $('#hint-level-up');
  if (hintDown) hintDown.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.hintLevel > 1) { tab.hintLevel--; updateHintLevelDisplay(tab); }
  });
  if (hintUp) hintUp.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.hintLevel < 5) { tab.hintLevel++; updateHintLevelDisplay(tab); }
  });
}

function updateHintLevelDisplay(tab) {
  const labels = ['', 'Nudge', 'Pointed Hint', 'Strong Hint', 'Near Solution', 'Full Solution'];

  // Level name label
  const el = $('#hint-level-name');
  if (el) el.textContent = `Level ${tab.hintLevel} — ${labels[tab.hintLevel]}`;

  // Badge (L1, L2…)
  const badge = $('#hint-level-badge');
  if (badge) badge.textContent = `L${tab.hintLevel}`;

  // Range slider value
  const slider = $('#hint-slider');
  if (slider) slider.value = tab.hintLevel;

  // Hint float badge in focus mode
  const hintFloat = $('#focus-hint-float');
  if (hintFloat) hintFloat.textContent = `Hint: ${labels[tab.hintLevel]}`;

  const focusHintLevel = $('#focus-hint-level');
  if (focusHintLevel) focusHintLevel.textContent = tab.hintLevel;
}

// =============================================================================
// SECTION 2L — FOCUS MODE
// =============================================================================

function toggleFocusMode() {
  AppState.focusMode = !AppState.focusMode;
  document.body.classList.toggle('focus-mode', AppState.focusMode);

  const pill = $('#focus-exit-pill');
  if (pill) pill.style.display = AppState.focusMode ? 'flex' : 'none';

  const hintFloat = $('#focus-hint-float');
  if (hintFloat) hintFloat.style.display = AppState.focusMode ? 'flex' : 'none';

  if (AppState.config.soundEnabled) Sounds.focusToggle();

  showToast(AppState.focusMode ? 'Focus Mode ON — press Esc or the pill to exit' : 'Focus Mode OFF', 'info', 2000);
}

// =============================================================================
// SECTION 2M — RIGHT PANEL TABS
// =============================================================================

function renderRightPanelForTab(tab) {
  // Refresh v2 right panel (notes re-render per tab, tools stay constant)
  if (typeof renderNotesPanel === 'function') renderNotesPanel(tab, 'notes');
}

function wireChatSidePanel() {
  // Wire right panel tab buttons ONCE (HTML: class="right-tab", data-tab="builder")
  $$('.right-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      $$('.right-tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.right-tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
    });
  });

  // Wire Refs tab external link buttons
  $$('.ref-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) window.electronAPI.openExternal(url);
    });
  });

  // Command builder tab
  wireCommandBuilderPanel();

  // Reverse shell tab
  wireRevshellPanel();

  // Encoder tab
  wireEncoderPanel();

  // Cheatsheet tab
  wireCheatsheetPanel();

  // Notes tab
  wireNotesPanel();
}

// =============================================================================
// SECTION 2N — ACHIEVEMENT TOAST
// =============================================================================

function triggerAchievement(achievement) {
  const toast = $('#achievement-toast');
  if (!toast) return;

  const nameEl = toast.querySelector('.achievement-name');
  const descEl = toast.querySelector('.achievement-desc');
  const iconEl = toast.querySelector('.achievement-icon');

  if (nameEl) nameEl.textContent = achievement.name || '';
  if (descEl) descEl.textContent = achievement.description || '';
  if (iconEl) iconEl.textContent = achievement.icon || '🏆';

  toast.classList.add('show');
  if (AppState.config.soundEnabled) Sounds.achievement();

  setTimeout(() => toast.classList.remove('show'), 5000);

  // Save achievement
  if (!AppState.progressData.achievements.includes(achievement.id)) {
    AppState.progressData.achievements.push(achievement.id);
    saveProgressData();
  }
}

// =============================================================================
// SECTION 2O — PERSISTENCE
// =============================================================================

async function loadProgressData() {
  try {
    const data = await window.electronAPI.loadProgress();
    if (data) AppState.progressData = data;
  } catch (_) {}
}

async function saveProgressData() {
  try {
    await window.electronAPI.saveProgress(AppState.progressData);
  } catch (_) {}
}

async function loadLabTrackerData() {
  try {
    const data = await window.electronAPI.loadLabTracker();
    if (data) AppState.labsData = data;
  } catch (_) {}
}

async function saveLabTrackerData() {
  try {
    await window.electronAPI.saveLabTracker(AppState.labsData);
  } catch (_) {}
}

async function loadSnippetsData() {
  try {
    const data = await window.electronAPI.loadSnippets();
    if (data) AppState.snippetsData = data;
  } catch (_) {}
}

async function saveSnippetsData() {
  try {
    await window.electronAPI.saveSnippets(AppState.snippetsData);
  } catch (_) {}
}

// =============================================================================
// SECTION 2P — MODAL WIRING
// =============================================================================

function wireModals() {
  // Wire ALL close buttons — HTML uses data-close="modal-id" on .modal-close and Cancel btns
  $$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.close;
      if (targetId) hideModal(targetId);
      // Also close by traversal in case of legacy usage
      const overlay = btn.closest('.modal-overlay');
      if (overlay && !targetId) overlay.classList.remove('open');
    });
  });

  // Close on backdrop click (.modal-overlay is the backdrop)
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // New session modal
  const nsConfirm = $('#create-session-btn');
  if (nsConfirm) nsConfirm.addEventListener('click', confirmNewSession);
  const nsCancel = $('.btn[data-close="new-session-modal"]');
  if (nsCancel) nsCancel.addEventListener('click', () => hideModal('new-session-modal'));

  // Add finding modal
  wireAddFindingModal();

  // Snippet modal
  wireSnippetModal();

  // Lab modal
  wireLabModal();

  // Writeup modal
  wireWriteupModal();

  // Session summary modal
  wireSessionSummaryModal();

  // Bulk import modal
  wireBulkImportModal();

  // Confirm modal
  wireConfirmModal();

  // New tab / new session button (tab bar + button)
  const newTabBtn = $('#new-tab-btn');
  if (newTabBtn) newTabBtn.addEventListener('click', () => showNewSessionModal());
}

function wireAddFindingModal() {
  const confirmBtn = $('#confirm-add-finding');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const type = $('#finding-type-select')?.value || 'UNKNOWN';
      const value = ($('#finding-value-input')?.value || '').trim();
      if (!value) { showToast('Please enter a value', 'warning'); return; }

      const tab = getActiveTab();
      if (tab) {
        sessionAddFinding(tab.session, { type, value, manual: true, timestamp: Date.now() });
        renderFindingsList(tab);
        if (AppState.config.soundEnabled) Sounds.finding();
      }
      hideModal('add-finding-modal');
      const valInput = $('#finding-value-input');
      if (valInput) valInput.value = '';
    });
  }
}

function wireConfirmModal() {
  // Confirm modal is triggered programmatically
  window._confirmCallback = null;

  const confirmBtn = $('#confirm-ok-btn');
  const cancelBtn = $('.btn[data-close="confirm-modal"]');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      hideModal('confirm-modal');
      if (typeof window._confirmCallback === 'function') window._confirmCallback(true);
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal('confirm-modal');
      if (typeof window._confirmCallback === 'function') window._confirmCallback(false);
    });
  }
}

function showConfirm(message, callback) {
  const msgEl = $('#confirm-msg');
  if (msgEl) msgEl.textContent = message;
  window._confirmCallback = callback;
  showModal('confirm-modal');
}

// =============================================================================
// SECTION 2Q — WRITEUP & SUMMARY MODALS
// =============================================================================

function wireWriteupModal() {
  // Helper — editor is #writeup-edit-pane in HTML
  const getEditor = () => $('#writeup-edit-pane');

  // Generate button — HTML id is "generate-writeup-btn" (also wired as "go-to-writeup-btn")
  const genBtn = $('#generate-writeup-btn');
  if (genBtn && !genBtn._writeupGenWired) {
    genBtn._writeupGenWired = true;
    genBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      if (!tab) return;
      const generatingEl = $('#writeup-generating');
      const splitEl = $('#writeup-split');
      if (generatingEl) generatingEl.style.display = '';
      if (splitEl) splitEl.style.display = 'none';
      setButtonLoading(genBtn, true, 'Generating…');
      try {
        const prompt = buildWriteupSystemPrompt(tab.session, tab.chatHistory);
        const result = await window.electronAPI.claudeChat({
          system: prompt,
          messages: [{ role: 'user', content: buildWriteupContext(tab.session, tab.chatHistory) }],
        });
        const editor = getEditor();
        if (editor) editor.value = result;
        const previewEl = $('#writeup-preview-pane');
        if (previewEl && typeof marked !== 'undefined') previewEl.innerHTML = marked.parse(result);
        if (generatingEl) generatingEl.style.display = 'none';
        if (splitEl) splitEl.style.display = '';
      } catch (e) {
        showToast('Generation failed: ' + e.message, 'error');
        if (generatingEl) generatingEl.style.display = 'none';
      }
      setButtonLoading(genBtn, false);
    });
  }

  // Save Writeup button — HTML id is "writeup-save-btn" (added to modal footer)
  const saveBtn = $('#writeup-save-btn');
  if (saveBtn && !saveBtn._wired) {
    saveBtn._wired = true;
    saveBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      const content = getEditor()?.value || '';
      if (!content) { showToast('Nothing to save', 'warning'); return; }
      try {
        await window.electronAPI.saveWriteup({ sessionId: tab?.session?.id, content, name: tab?.session?.name });
        showToast('Writeup saved!', 'success');
        hideModal('writeup-modal');
      } catch (e) {
        showToast('Save failed: ' + e.message, 'error');
      }
    });
  }

  // Copy to Clipboard button — HTML id is "copy-writeup-btn"
  const copyBtn = $('#copy-writeup-btn');
  if (copyBtn && !copyBtn._wired) {
    copyBtn._wired = true;
    copyBtn.addEventListener('click', () => {
      const content = getEditor()?.value || '';
      if (content) copyToClipboard(content, copyBtn);
    });
  }

  // Export PDF button — HTML id is "export-pdf-btn"
  const exportBtn = $('#export-pdf-btn');
  if (exportBtn && !exportBtn._wired) {
    exportBtn._wired = true;
    exportBtn.addEventListener('click', async () => {
      const content = getEditor()?.value || '';
      if (!content) { showToast('Nothing to export', 'warning'); return; }
      const tab = getActiveTab();
      try {
        await window.electronAPI.exportPDF({ content, name: tab?.session?.name || 'writeup' });
        showToast('PDF exported!', 'success');
      } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
      }
    });
  }

  // Save to Obsidian — HTML id is "save-obsidian-btn"
  const obsidianBtn = $('#save-obsidian-btn');
  if (obsidianBtn && !obsidianBtn._wired) {
    obsidianBtn._wired = true;
    obsidianBtn.addEventListener('click', async () => {
      const content = getEditor()?.value || '';
      const tab = getActiveTab();
      if (!AppState.config.obsidianVault) {
        showToast('No Obsidian vault configured — set it in Settings', 'warning');
        return;
      }
      try {
        await window.electronAPI.saveWriteup({
          sessionId: tab?.session?.id, content, name: tab?.session?.name,
          vault: AppState.config.obsidianVault, obsidian: true,
        });
        showToast('Saved to Obsidian vault!', 'success');
      } catch (e) {
        showToast('Obsidian save failed: ' + e.message, 'error');
      }
    });
  }
}

function showWriteupModal() {
  showModal('writeup-modal');
}

function wireSessionSummaryModal() {
  // Nothing to wire — populated when opened
}

function showSessionSummaryModal() {
  const tab = getActiveTab();
  if (!tab?.session) return;

  const s = tab.session;
  const mistakes = s.mistakes || [];
  const duration = s.startTime ? Date.now() - s.startTime : 0;

  // Flatten findings object into typed array
  const raw = s.findings;
  const findings = [];
  if (Array.isArray(raw)) {
    findings.push(...raw);
  } else if (raw && typeof raw === 'object') {
    [['ports','PORT'],['users','USER'],['credentials','CRED'],['flags','FLAG'],['cves','CVE'],['files','FILE'],['hashes','HASH'],['services','SERVICE']].forEach(([key,type]) => {
      (raw[key]||[]).forEach(f => findings.push({...f, type}));
    });
  }

  const container = $('#session-summary-body');
  if (container) {
    container.innerHTML = `
      <div class="summary-row"><span>Session</span><strong>${escHtml(s.name)}</strong></div>
      <div class="summary-row"><span>Platform</span><strong>${escHtml(s.platform || '—')}</strong></div>
      <div class="summary-row"><span>Difficulty</span><strong>${escHtml(s.difficulty || '—')}</strong></div>
      <div class="summary-row"><span>Duration</span><strong>${formatDuration(duration)}</strong></div>
      <div class="summary-row"><span>Findings</span><strong>${findings.length}</strong></div>
      <div class="summary-row"><span>Flags</span><strong>${findings.filter(f => f.type === 'FLAG').length}</strong></div>
      <div class="summary-row"><span>Messages</span><strong>${tab.chatHistory.length}</strong></div>
      <div class="summary-row"><span>Hints Used</span><strong>${mistakes.length}</strong></div>
      <div class="summary-section-title">Techniques Used</div>
      <div class="summary-tags">${(s.techniques || inferTechniques(tab.chatHistory)).map(t => `<span class="summary-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="summary-section-title">Key Findings</div>
      <div class="summary-findings">${findings.slice(0, 10).map(f => `<div class="summary-finding"><span class="sf-type">${escHtml(f.type)}</span><span class="sf-val">${escHtml(f.value||'')}</span></div>`).join('') || '<div style="color:var(--text-muted)">None captured</div>'}</div>
    `;
  }

  showModal('session-summary-modal');
}

// =============================================================================
// SECTION 2R — KEYBOARD SHORTCUTS
// =============================================================================

function wireKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape — exit focus mode or close modal
    if (e.key === 'Escape') {
      if (AppState.focusMode) { toggleFocusMode(); return; }
      const openModal = $('.modal.open');
      if (openModal) { openModal.classList.remove('open'); openModal.setAttribute('hidden', ''); return; }
      if (AppState.snippetSearchOpen) { closeSnippetSearch(); return; }
    }

    // Ctrl/Cmd + K — snippet search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSnippetSearch();
      return;
    }

    // Ctrl/Cmd + S — save session
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      manualSaveSession();
      return;
    }

    // Ctrl/Cmd + T — new tab
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      createTab();
      return;
    }

    // Ctrl/Cmd + W — close tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (AppState.activeTabId) closeTab(AppState.activeTabId);
      return;
    }

    // Ctrl/Cmd + 1-5 — switch tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const idx = parseInt(e.key) - 1;
      if (AppState.tabs[idx]) switchTab(AppState.tabs[idx].id);
      return;
    }

    // F11 — toggle focus mode
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
  });
}

// =============================================================================
// SECTION 2S — SNIPPET SEARCH OVERLAY
// =============================================================================

function openSnippetSearch() {
  const overlay = $('#snippet-search-overlay');
  if (!overlay) return;
  AppState.snippetSearchOpen = true;
  overlay.removeAttribute('hidden');
  const input = overlay.querySelector('#global-snippet-input');
  if (input) { input.value = ''; input.focus(); renderSnippetSearchResults(''); }
}

function closeSnippetSearch() {
  const overlay = $('#snippet-search-overlay');
  if (overlay) overlay.setAttribute('hidden', '');
  AppState.snippetSearchOpen = false;
}

function renderSnippetSearchResults(query) {
  const list = $('#global-snippet-results');
  if (!list) return;

  const q = query.toLowerCase();
  const results = AppState.snippetsData.filter(s =>
    !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q))
  ).slice(0, 20);

  if (results.length === 0) {
    list.innerHTML = '<div class="snippet-search-empty">No snippets found</div>';
    return;
  }

  list.innerHTML = results.map((s, i) => `
    <div class="snippet-search-item" data-idx="${i}" data-id="${s.id}">
      <span class="snippet-search-title">${escHtml(s.title)}</span>
      <span class="snippet-search-preview">${escHtml((s.content || '').slice(0, 80))}</span>
      ${(s.tags || []).map(t => `<span class="snippet-tag-mini">${escHtml(t)}</span>`).join('')}
    </div>
  `).join('');

  list.querySelectorAll('.snippet-search-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const snippet = results[i];
      const input = $('#message-input');
      if (input) {
        input.value += snippet.content;
        autoResizeInput(input);
        input.focus();
      }
      closeSnippetSearch();
    });
  });
}

function wireSnippetSearchOverlay() {
  const overlay = $('#snippet-search-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSnippetSearch();
  });

  const input = overlay.querySelector('#global-snippet-input');
  if (input) {
    input.addEventListener('input', () => renderSnippetSearchResults(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSnippetSearch();
      if (e.key === 'Enter') {
        const first = overlay.querySelector('.snippet-search-item');
        if (first) first.click();
      }
    });
  }

  const closeBtn = overlay.querySelector('.snippet-search-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSnippetSearch);
}

// =============================================================================
// END OF RENDERER PART 2
// Continues in renderer-part3.js
// =============================================================================
