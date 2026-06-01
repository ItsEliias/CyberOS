'use strict';
/**
 * renderer.js — frontend logic for CYBERTOOLS LAUNCHER (v2 UI rework)
 *
 * Key changes vs v1:
 *  • Activity feed uses circular avatar badges (flag emoji / "VS" / "CC" / "CT")
 *  • CyberLab card gets .card-active border-glow when a session is live
 *  • Status values get .has-value (accent colour) when real data is present
 *  • VPN status uses a coloured CSS dot instead of the shield emoji
 *  • Activity text format: "AppName — action description"
 */

// ─── State ────────────────────────────────────────────────────────────────────

let currentConfig    = {};
let pendingUpdateUrl = '';
let isSettingsOpen   = false;
let slotModalIndex   = null;

// ─── Entry point ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

async function init() {
  showSplash();

  // IPC event listeners
  window.api.onSplashComplete(handleSplashComplete);
  window.api.onPanelShown(handlePanelShown);
  window.api.onConfigUpdate(config => { currentConfig = config; refreshUI(config); });
  window.api.onVpnUpdate(updateVpn);
  window.api.onUpdateAvailable(showUpdateBanner);
  window.api.onOpenSettings(openSettings);

  // Static UI bindings
  bindTabToggle();
  bindThemeSelect();
  bindSettingsBtn();
  bindUpdateBanner();

  // Load initial config & apply theme
  try {
    currentConfig = await window.api.getConfig();
    initLauncherThemePicker();
    initFooterThemeSwitcher();
  } catch (_) {
    applyTheme('stealth');
  }

  // App version
  try {
    const ver = await window.api.getVersion();
    const el  = document.getElementById('about-version');
    if (el) el.textContent = ver;
  } catch (_) {}

  // Initial VPN probe
  try {
    updateVpn(await window.api.getVpnStatus());
  } catch (_) {}
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function showSplash() {
  const splash = document.getElementById('splash-screen');
  const panel  = document.getElementById('main-panel');
  if (splash) { splash.style.opacity = '1'; splash.style.display = 'flex'; }
  if (panel)  panel.style.display = 'none';
}

function handleSplashComplete() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('fading');
  setTimeout(() => {
    splash.style.display = 'none';
    const panel = document.getElementById('main-panel');
    if (panel) { panel.style.display = 'flex'; panel.style.opacity = '0'; }
    window.api.signalHideAfterSplash();
  }, 420);
}

// ─── Panel shown (tray click) ─────────────────────────────────────────────────

function handlePanelShown() {
  const panel = document.getElementById('main-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  panel.style.opacity = '0';
  panel.classList.remove('panel-opening');
  void panel.offsetWidth;           // force reflow
  panel.classList.add('panel-opening');
  panel.style.opacity = '1';
  refreshUI(currentConfig);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  const el = document.body; // Launcher uses body, not html
  if (typeof theme === 'string') {
    const legacy = {
      'stealth':  { core: 'stealth', personality: 'neutral' },
      'cyberpunk':{ core: 'stealth', personality: 'cyberpunk' },
      'terminal': { core: 'oled',   personality: 'terminal' },
      'threat':   { core: 'stealth', personality: 'threat' },
      'warrior':  { core: 'stealth', personality: 'threat' },
    };
    theme = legacy[theme] || { core: 'stealth', personality: 'neutral' };
  }
  const core        = (theme && theme.core)        || 'stealth';
  const personality = (theme && theme.personality) || 'neutral';
  el.setAttribute('data-core', core);
  el.setAttribute('data-personality', personality);
  el.removeAttribute('data-theme');
}

let _lCore = 'stealth', _lPersonality = 'neutral';

function initLauncherThemePicker() {
  const t = currentConfig && currentConfig.theme;
  if (t && typeof t === 'object') {
    _lCore        = t.core        || 'stealth';
    _lPersonality = t.personality || 'neutral';
  } else if (typeof t === 'string') {
    const legacy = {
      'stealth':  { core: 'stealth', personality: 'neutral' },
      'cyberpunk':{ core: 'stealth', personality: 'cyberpunk' },
      'terminal': { core: 'oled',   personality: 'terminal' },
      'threat':   { core: 'stealth', personality: 'threat' }
    };
    const mapped  = legacy[t] || { core: 'stealth', personality: 'neutral' };
    _lCore        = mapped.core;
    _lPersonality = mapped.personality;
  }
  _syncLauncherThemeChips();

  document.querySelectorAll('#launcher-core-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _lCore = btn.dataset.core;
      _syncLauncherThemeChips();
      applyTheme({ core: _lCore, personality: _lPersonality });
      _lSaveTheme();
      _lUpdateCombo();
    });
  });
  document.querySelectorAll('#launcher-personality-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _lPersonality = btn.dataset.personality;
      _syncLauncherThemeChips();
      applyTheme({ core: _lCore, personality: _lPersonality });
      _lSaveTheme();
      _lUpdateCombo();
    });
  });
  applyTheme({ core: _lCore, personality: _lPersonality });
  _lUpdateCombo();
}

function _syncLauncherThemeChips() {
  document.querySelectorAll('#launcher-core-row .theme-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.core === _lCore));
  document.querySelectorAll('#launcher-personality-row .theme-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.personality === _lPersonality));
}

function _lSaveTheme() {
  window.api.saveConfigDeep({ theme: { core: _lCore, personality: _lPersonality } });
  currentConfig.theme = { core: _lCore, personality: _lPersonality };
}

function _lUpdateCombo() {
  const el  = document.getElementById('launcher-theme-combo');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  if (el) el.textContent = cap(_lCore) + ' + ' + cap(_lPersonality);
}

function updateThemeSelect() { /* no-op — kept for compatibility */ }
function bindThemeSelect()   { /* no-op — replaced by initLauncherThemePicker */ }

window.setTheme = async function setTheme(theme) {
  applyTheme(theme);
};

// ─── Settings ─────────────────────────────────────────────────────────────────

function bindSettingsBtn() {
  const btn = document.getElementById('settings-btn');
  if (btn) btn.addEventListener('click', openSettings);
}

function openSettings() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
  isSettingsOpen = true;
  renderSettingsContent(currentConfig);
}

window.closeSettings = function closeSettings() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(() => { panel.style.display = 'none'; }, 300);
  isSettingsOpen = false;
};

function renderSettingsContent(config) {
  setText('cyberlab-path-text',     config.cyberlab     && config.cyberlab.execPath     || 'Not registered');
  setText('vaultscraper-path-text', config.vaultscraper && config.vaultscraper.execPath || 'Not registered');
  setText('ghostvault-path-text',   config.ghostvault   && config.ghostvault.execPath   || 'Not registered');
  setText('vault-path-text',        config.obsidianVaultPath || 'Not set');
  renderSettingsSlotList(config);
  _syncLauncherThemeChips();
  _lUpdateCombo();
}

function renderSettingsSlotList(config) {
  const container = document.getElementById('settings-slots-list');
  if (!container) return;
  const slots  = (config.launcher && config.launcher.customSlots) || [];
  const addBtn = document.getElementById('settings-add-slot-btn');
  container.innerHTML = slots.length === 0
    ? '<p style="font-size:11px;color:var(--text-muted);">No custom shortcuts configured.</p>'
    : slots.map((slot, i) => `
        <div class="settings-slot-item">
          <span class="settings-slot-name">${escHtml(slot.name || 'Unnamed')}</span>
          <button class="settings-slot-edit"   onclick="openSlotModal(${i})">Edit</button>
          <button class="settings-slot-remove" onclick="removeSlot(${i})">Remove</button>
        </div>`).join('');
  if (addBtn) addBtn.style.display = slots.length >= 4 ? 'none' : '';
}

// ─── Locate / change paths ────────────────────────────────────────────────────

window.locateApp = async function locateApp(appKey) {
  const filters = process.platform === 'win32'
    ? [{ name: 'Executables', extensions: ['exe'] }]
    : process.platform === 'darwin'
      ? [{ name: 'Applications', extensions: ['app', '*'] }]
      : [{ name: 'All Files', extensions: ['*'] }];
  const filePath = await window.api.openFilePicker({ filters });
  if (!filePath) return;
  const updates = {};
  if (appKey === 'cyberlab') {
    updates.cyberlab = Object.assign({}, currentConfig.cyberlab, { execPath: filePath, installed: true });
  } else if (appKey === 'vaultscraper') {
    updates.vaultscraper = Object.assign({}, currentConfig.vaultscraper, { execPath: filePath, installed: true });
  } else if (appKey === 'ghostvault') {
    updates.ghostvault = Object.assign({}, currentConfig.ghostvault, { execPath: filePath });
  }
  await window.api.saveConfigDeep(updates);
  currentConfig = await window.api.getConfig();
  refreshUI(currentConfig);
  if (isSettingsOpen) renderSettingsContent(currentConfig);
};

window.changeVaultPath = async function changeVaultPath() {
  const p = await window.api.openFolderPicker();
  if (!p) return;
  await window.api.saveConfig({ obsidianVaultPath: p });
  currentConfig.obsidianVaultPath = p;
  setText('vault-path-text', p);
};

// ─── Tab switching ────────────────────────────────────────────────────────────

function bindTabToggle() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const toolsView    = document.getElementById('view-tools');
  const activityView = document.getElementById('view-activity');
  if (toolsView)    toolsView.style.display    = tab === 'tools'    ? 'flex' : 'none';
  if (activityView) activityView.style.display = tab === 'activity' ? 'flex' : 'none';
  if (tab === 'activity') refreshActivityFeed();
}

// ─── Main refresh ─────────────────────────────────────────────────────────────

function refreshUI(config) {
  if (!config) return;
  currentConfig = config;
  updateStatsStrip(config);
  updateCyberlabCard(config);
  updateVaultScraperCard(config);
  updateGhostVaultCard(config);
  updateCustomSlotsGrid(config);
  const actView = document.getElementById('view-activity');
  if (actView && actView.style.display !== 'none') refreshActivityFeed();
  if (isSettingsOpen) renderSettingsContent(config);
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function updateStatsStrip(config) {
  const cl = config.cyberlab_status    || {};
  const vs = config.vaultscraper_status || {};
  setStatValue('stat-streak',  cl.streak        != null ? Number(cl.streak).toLocaleString()        : '—');
  setStatValue('stat-labs',    cl.labsDone       != null ? Number(cl.labsDone).toLocaleString()      : '—');
  setStatValue('stat-notes',   vs.vaultNoteCount != null ? Number(vs.vaultNoteCount).toLocaleString(): '—');
  setStatValue('stat-sources', vs.totalSources   != null ? Number(vs.totalSources).toLocaleString()  : '—');
}

function setStatValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── CyberLab card ────────────────────────────────────────────────────────────

function updateCyberlabCard(config) {
  const installed = !!(config.cyberlab && config.cyberlab.installed);
  const execPath  = (config.cyberlab && config.cyberlab.execPath) || '';
  const raw       = config.cyberlab_status || null;
  const card      = document.getElementById('card-cyberlab');
  const dot       = document.getElementById('cyberlab-dot');
  const warning   = document.getElementById('cyberlab-warning');
  const launchBtn = document.getElementById('cyberlab-launch-btn');

  // ── Not installed ──────────────────────────────────────────────────────────
  if (!installed || !execPath) {
    if (card)     { card.classList.remove('card-active', 'stale'); }
    if (dot)      setDot(dot, 'none');
    if (warning)  warning.style.display = 'none';
    if (launchBtn) setNotInstalled(launchBtn);
    setSv('cyberlab-lab',   'Not installed', false);
    setSv('cyberlab-time',  '—', false);
    setSv('cyberlab-hints', '—', false);
    return;
  }

  // ── File existence check ───────────────────────────────────────────────────
  window.api.checkFileExists(execPath).then(exists => {
    if (warning)  warning.style.display = exists ? 'none' : 'flex';
    if (launchBtn) exists ? setInstalled(launchBtn, 'cyberlab') : setNotInstalled(launchBtn);
  });

  // ── No live status ─────────────────────────────────────────────────────────
  if (!raw) {
    if (card) card.classList.remove('card-active', 'stale');
    if (dot)  setDot(dot, 'none');
    setSv('cyberlab-lab',   'Not running', false);
    setSv('cyberlab-time',  '—', false);
    setSv('cyberlab-hints', '—', false);
    return;
  }

  // ── Stale check ───────────────────────────────────────────────────────────
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = (Date.now() - lastActive) > 60000;
  if (card) {
    card.classList.toggle('stale', isStale && !raw.sessionActive);
    card.classList.toggle('card-active', !isStale && !!raw.sessionActive);
  }

  // ── Status dot ────────────────────────────────────────────────────────────
  if (dot) {
    if (isStale)               setDot(dot, 'none');
    else if (raw.sessionActive) setDot(dot, 'active-session');
    else                        setDot(dot, 'idle');
  }

  // ── Status rows ───────────────────────────────────────────────────────────
  const sessionActive = !!raw.sessionActive;
  setSv('cyberlab-lab',   raw.currentLab   || 'No active session', sessionActive && !!raw.currentLab);
  setSv('cyberlab-time',  sessionActive && raw.sessionStart ? formatElapsed(raw.sessionStart) : '—', sessionActive);
  setSv('cyberlab-hints', raw.hintLevel    || '—', !!raw.hintLevel);
}

// ─── VaultCore card ───────────────────────────────────────────────────────────

function updateVaultScraperCard(config) {
  const installed = !!(config.vaultscraper && config.vaultscraper.installed);
  const execPath  = (config.vaultscraper && config.vaultscraper.execPath) || '';
  const raw       = config.vaultscraper_status || null;
  const card      = document.getElementById('card-vaultcore');
  const dot       = document.getElementById('vaultcore-dot');
  const warning   = document.getElementById('vaultcore-warning');
  const launchBtn = document.getElementById('vaultcore-launch-btn');
  const updateBtn = document.getElementById('vs-update-btn');

  // ── Not installed ──────────────────────────────────────────────────────────
  if (!installed || !execPath) {
    if (dot)       setDot(dot, 'none');
    if (warning)   warning.style.display = 'none';
    if (launchBtn) setNotInstalled(launchBtn);
    if (updateBtn) updateBtn.disabled = true;
    setSv('vs-status',  'Not installed', false);
    setSv('vs-last',    '—', false);
    setSv('vs-next',    '—', false);
    setSv('vs-notes',   '—', false);
    setSv('vs-sources', '—', false);
    return;
  }

  // ── File check ────────────────────────────────────────────────────────────
  window.api.checkFileExists(execPath).then(exists => {
    if (warning)  warning.style.display = exists ? 'none' : 'flex';
    if (launchBtn) exists ? setInstalled(launchBtn, 'vaultscraper') : setNotInstalled(launchBtn);
  });

  // ── No live status ────────────────────────────────────────────────────────
  if (!raw) {
    if (dot)  setDot(dot, 'none');
    if (updateBtn) updateBtn.disabled = false;
    setSv('vs-status',  'Not running', false);
    setSv('vs-last',    '—', false);
    setSv('vs-next',    '—', false);
    setSv('vs-notes',   '—', false);
    setSv('vs-sources', '—', false);
    return;
  }

  if (updateBtn) updateBtn.disabled = false;

  // ── Stale check ───────────────────────────────────────────────────────────
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = (Date.now() - lastActive) > 60000;
  if (card) card.classList.toggle('stale', isStale);

  // ── Status dot ────────────────────────────────────────────────────────────
  if (dot) {
    if (raw.error)              setDot(dot, 'error');
    else if (raw.activeScrape)  setDot(dot, 'scraping');
    else if (isStale)           setDot(dot, 'none');
    else                        setDot(dot, 'idle');
  }

  // ── Status rows ───────────────────────────────────────────────────────────
  if (raw.activeScrape) {
    const pct = raw.activeScrape.progress != null ? ` ${Math.round(raw.activeScrape.progress)}%` : '';
    setSv('vs-status', (raw.activeScrape.name || 'Scraping') + pct, true);
  } else {
    setSv('vs-status', raw.error ? 'Error' : 'Idle', !raw.error);
  }
  setSv('vs-last',    raw.lastScrape     ? relativeTime(raw.lastScrape)  : 'Never',         !!raw.lastScrape);
  setSv('vs-next',    raw.nextScheduled  ? futureTime(raw.nextScheduled) : 'Not scheduled', !!raw.nextScheduled);
  setSv('vs-notes',   raw.vaultNoteCount != null ? Number(raw.vaultNoteCount).toLocaleString() + ' notes'   : '—', raw.vaultNoteCount > 0);
  setSv('vs-sources', raw.totalSources   != null ? Number(raw.totalSources).toLocaleString()   + ' sources' : '—', raw.totalSources   > 0);
}

// ─── GhostVault card ─────────────────────────────────────────────────────────

function updateGhostVaultCard(config) {
  const execPath  = (config.ghostvault && config.ghostvault.execPath) || '';
  const raw       = config.ghostvault_status || null;
  const card      = document.getElementById('card-ghostvault');
  const dot       = document.getElementById('ghostvault-dot');
  const warning   = document.getElementById('ghostvault-warning');
  const launchBtn = document.getElementById('ghostvault-launch-btn');

  if (!execPath) {
    if (card)     card.classList.remove('card-active', 'stale');
    if (dot)      setDot(dot, 'none');
    if (warning)  warning.style.display = 'none';
    if (launchBtn) setNotInstalled(launchBtn);
    setSv('ghostvault-status', 'Not installed', false);
    setSv('ghostvault-last',   '—', false);
    setSv('ghostvault-notes',  '—', false);
    return;
  }

  window.api.checkFileExists(execPath).then(exists => {
    if (warning)  warning.style.display = exists ? 'none' : 'flex';
    if (launchBtn) exists ? setInstalled(launchBtn, 'ghostvault') : setNotInstalled(launchBtn);
  });

  if (!raw) {
    if (dot) setDot(dot, 'none');
    setSv('ghostvault-status', 'Not running', false);
    setSv('ghostvault-last',   '—', false);
    setSv('ghostvault-notes',  '—', false);
    return;
  }

  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = (Date.now() - lastActive) > 60000;
  if (dot) setDot(dot, raw.active && !isStale ? 'active-session' : 'idle');
  setSv('ghostvault-status', raw.active && !isStale ? 'Active' : 'Idle', raw.active && !isStale);
  setSv('ghostvault-last',   raw.lastCapture ? relativeTime(raw.lastCapture) : 'Never', !!raw.lastCapture);
  setSv('ghostvault-notes',  raw.noteCount  != null ? Number(raw.noteCount).toLocaleString() + ' notes' : '—', raw.noteCount > 0);
}

// ─── Custom slots grid ────────────────────────────────────────────────────────

function updateCustomSlotsGrid(config) {
  const slots         = (config.launcher && config.launcher.customSlots) || [];
  const pinnedSection = document.getElementById('pinned-section');
  const grid          = document.getElementById('custom-slots-grid');
  const addWrap       = document.getElementById('add-slot-wrap');

  if (pinnedSection) pinnedSection.style.display = slots.length > 0 ? 'block' : 'none';
  if (addWrap)       addWrap.style.display        = slots.length < 4 ? 'flex'  : 'none';
  if (!grid) return;

  if (slots.length === 0) { grid.innerHTML = ''; return; }

  grid.innerHTML = slots.map((slot, i) => {
    const initial   = escHtml((slot.name || '?').charAt(0).toUpperCase());
    const iconHtml  = slot.iconPath
      ? `<img class="app-icon" src="${escHtml(slot.iconPath)}" alt="" draggable="false"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="app-icon-ph" style="display:none;">${initial}</div>`
      : `<div class="app-icon-ph">${initial}</div>`;

    return `
      <div class="app-card slot-card" id="slot-card-${i}">
        <button class="slot-remove-btn" onclick="removeSlot(${i})" title="Remove" aria-label="Remove">✕</button>
        <div class="app-card-top">
          <div class="app-icon-wrap">${iconHtml}</div>
        </div>
        <div class="app-name">${escHtml(slot.name || 'Unnamed')}</div>
        ${slot.description ? `<div class="app-desc">${escHtml(slot.description)}</div>` : ''}
        <div class="app-card-footer" style="margin-top:auto;">
          <button class="launch-btn" onclick="launchApp('custom_${i}')">Open →</button>
        </div>
      </div>`;
  }).join('');
}

// ─── Activity feed (Ecosystem Event Bus) ─────────────────────────────────────

window.refreshActivityFeed = async function refreshActivityFeed() {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;
  try {
    const events = await window.api.ecosystemReadEvents();
    renderActivityFeed(events);
  } catch (e) {
    console.error('Activity feed error:', e);
  }
};

function renderActivityFeed(events) {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;
  if (!events || events.length === 0) {
    list.innerHTML = `<div class="activity-empty">
      No activity yet.<br>
      <span style="font-size:11px;opacity:.7;">Launch CyberLab, VaultCore, or GhostVault<br>to see live events here.</span>
    </div>`;
    return;
  }
  list.innerHTML = events.map(ev => {
    const appClass = (ev.app || '').toLowerCase().replace(/\s/g, '');
    const label    = formatEventLabel(ev.event, ev.data);
    const time     = formatEventTime(ev.timestamp);
    return `<div class="activity-item">
      <div class="activity-dot ${escHtml(appClass)}"></div>
      <div class="activity-content">
        <div class="activity-app">${escHtml(ev.app || 'Unknown')}</div>
        <div class="activity-event" title="${escHtml(label)}">${escHtml(label)}</div>
        <div class="activity-time">${escHtml(time)}</div>
      </div>
    </div>`;
  }).join('');
}

function formatEventLabel(eventType, data) {
  switch (eventType) {
    case 'ghostvault.note.created':
      return `Note saved${data && data.title ? ': ' + data.title : ''}${data && data.mode ? ' (' + data.mode + ')' : ''}`;
    case 'ghostvault.app.opened':
      return 'GhostVault opened';
    case 'vaultcore.app.opened':
      return `VaultCore opened${data && data.sources != null ? ' — ' + data.sources + ' sources, ' + (data.notes || 0) + ' notes' : ''}`;
    case 'vaultcore.sync.completed':
      return `Scrape complete${data && data.source ? ': ' + data.source : ''}`;
    case 'cyberlab.session.started':
      return `Session started${data && data.name ? ': ' + data.name : ''}`;
    case 'cyberlab.htb.synced':
      return `HTB synced — ${data && data.count != null ? data.count + ' machines' : 'done'}`;
    case 'cyberlab.thm.synced':
      return `THM synced — ${data && data.count != null ? data.count + ' rooms' : 'done'}`;
    case 'cyberlab.flag.captured':
      return `Flag captured${data && data.machine ? ': ' + data.machine : ''}`;
    case 'launcher.opened':
      return 'Launcher opened';
    default:
      return eventType.replace(/\./g, ' › ');
  }
}

function formatEventTime(iso) {
  try {
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch { return ''; }
}

// Listen for real-time updates from main process
if (window.api.onEcosystemUpdated) {
  window.api.onEcosystemUpdated(renderActivityFeed);
}

// Load activity feed on startup
refreshActivityFeed();

/**
 * Build the circular badge HTML for an activity entry (legacy config-based feed).
 * Kept for backward compatibility.
 */
function buildBadge(type, text) {
  if (type === 'cyberlab') {
    const isFlag = /flag|capture|captured/i.test(text);
    const inner  = isFlag ? '🚩' : 'CL';
    return `<div class="activity-badge badge-cyberlab">${inner}</div>`;
  }
  if (type === 'vaultscraper' || type === 'vaultcore') {
    return `<div class="activity-badge badge-vaultscraper">VC</div>`;
  }
  if (type === 'ghostvault') {
    return `<div class="activity-badge badge-ghostvault">GV</div>`;
  }
  if (type === 'error') {
    return `<div class="activity-badge badge-error">!</div>`;
  }
  return `<div class="activity-badge badge-launcher">CT</div>`;
}

// ─── VPN status ───────────────────────────────────────────────────────────────

function updateVpn(status) {
  const container = document.getElementById('vpn-status');
  const text      = document.getElementById('vpn-text');
  if (!container || !text) return;
  if (status && status.active) {
    container.className = 'vpn-status vpn-on';
    text.textContent    = `VPN Active — ${status.interface}`;
  } else {
    container.className = 'vpn-status vpn-off';
    text.textContent    = 'VPN Off';
  }
}

// ─── Update banner ────────────────────────────────────────────────────────────

function bindUpdateBanner() {
  const viewBtn    = document.getElementById('update-view-btn');
  const dismissBtn = document.getElementById('update-dismiss-btn');
  if (viewBtn)    viewBtn.addEventListener('click',    () => { if (pendingUpdateUrl) window.api.openExternal(pendingUpdateUrl); });
  if (dismissBtn) dismissBtn.addEventListener('click', () => { const b = document.getElementById('update-banner'); if (b) b.style.display = 'none'; });
}

function showUpdateBanner(info) {
  const banner = document.getElementById('update-banner');
  const text   = document.getElementById('update-text');
  if (!banner || !text) return;
  text.textContent = `v${info.version} available`;
  pendingUpdateUrl = info.url || '';
  banner.style.display = 'flex';
}

// ─── Launch / trigger (global for HTML onclick) ───────────────────────────────

window.launchApp = async function launchApp(appKey) {
  await window.api.launchApp(appKey);
};

window.triggerUpdate = async function triggerUpdate() {
  const dot = document.getElementById('vaultcore-dot');
  if (dot) setDot(dot, 'scraping');
  await window.api.updateNow();
};

// ─── Clear activity ───────────────────────────────────────────────────────────

window.clearActivity = function clearActivity() {
  showConfirm('Clear Activity', 'Clear all activity entries? This cannot be undone.', async () => {
    await window.api.clearActivity();
    currentConfig = await window.api.getConfig();
    refreshActivityFeed();
  });
};

// ─── Custom slot modal ────────────────────────────────────────────────────────

window.openSlotModal = function openSlotModal(index) {
  slotModalIndex = index;
  const modal = document.getElementById('slot-modal');
  const title = document.getElementById('modal-title');
  if (!modal) return;

  document.getElementById('modal-name').value = '';
  document.getElementById('modal-desc').value = '';
  document.getElementById('modal-exec').value = '';
  document.getElementById('modal-icon').value = '';

  if (index !== null && index !== undefined) {
    const slots = (currentConfig.launcher && currentConfig.launcher.customSlots) || [];
    const slot  = slots[index];
    if (slot) {
      document.getElementById('modal-name').value = slot.name        || '';
      document.getElementById('modal-desc').value = slot.description || '';
      document.getElementById('modal-exec').value = slot.execPath    || '';
      document.getElementById('modal-icon').value = slot.iconPath    || '';
    }
    if (title) title.textContent = 'Edit Shortcut';
  } else {
    if (title) title.textContent = 'Add Shortcut';
  }
  modal.style.display = 'flex';
};

window.closeSlotModal = function closeSlotModal() {
  const modal = document.getElementById('slot-modal');
  if (modal) modal.style.display = 'none';
  slotModalIndex = null;
};

window.onModalOverlayClick = function onModalOverlayClick(e) {
  if (e.target === e.currentTarget) closeSlotModal();
};

window.browseExec = async function browseExec() {
  const p = await window.api.openFilePicker();
  if (p) document.getElementById('modal-exec').value = p;
};

window.browseIcon = async function browseIcon() {
  const p = await window.api.openFilePicker({
    filters: [{ name: 'Images', extensions: ['png','jpg','jpeg','gif','ico'] }]
  });
  if (p) document.getElementById('modal-icon').value = p;
};

window.saveSlot = async function saveSlot() {
  const name     = document.getElementById('modal-name').value.trim();
  const desc     = document.getElementById('modal-desc').value.trim();
  const execPath = document.getElementById('modal-exec').value.trim();
  const iconPath = document.getElementById('modal-icon').value.trim();
  if (!name)     return flashInput('modal-name', 'Name is required');
  if (!execPath) return flashInput('modal-exec', 'Executable path is required');
  const slot = { name, description: desc, execPath, iconPath };
  if (slotModalIndex !== null && slotModalIndex !== undefined) {
    await window.api.updateCustomSlot(slotModalIndex, slot);
  } else {
    await window.api.addCustomSlot(slot);
  }
  closeSlotModal();
  currentConfig = await window.api.getConfig();
  refreshUI(currentConfig);
};

window.removeSlot = function removeSlot(index) {
  const slots = (currentConfig.launcher && currentConfig.launcher.customSlots) || [];
  const name  = (slots[index] && slots[index].name) || 'this shortcut';
  showConfirm('Remove Shortcut', `Remove "${escHtml(name)}"?`, async () => {
    await window.api.removeCustomSlot(index);
    currentConfig = await window.api.getConfig();
    refreshUI(currentConfig);
    if (isSettingsOpen) renderSettingsContent(currentConfig);
  });
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────

let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
  const modal   = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl   = document.getElementById('confirm-message');
  const okBtn   = document.getElementById('confirm-ok-btn');
  if (!modal) return;
  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = message;
  confirmCallback = onConfirm;
  if (okBtn) okBtn.onclick = () => { closeConfirm(); if (typeof confirmCallback === 'function') confirmCallback(); };
  modal.style.display = 'flex';
}

window.closeConfirm = function closeConfirm() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.style.display = 'none';
  confirmCallback = null;
};

window.onConfirmOverlayClick = function onConfirmOverlayClick(e) {
  if (e.target === e.currentTarget) closeConfirm();
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Set a status value cell, optionally applying the accent "has-value" class */
function setSv(id, text, hasValue) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('has-value', !!hasValue);
}

function setDot(dotEl, state) {
  dotEl.className = 'status-dot';
  if (state && state !== 'none') dotEl.classList.add(state);
  const labels = { 'active-session': 'Session active', scraping: 'Scraping', idle: 'Idle', error: 'Error', none: 'Not running' };
  dotEl.title = labels[state] || '';
}

function setNotInstalled(btn) {
  btn.textContent = 'Not installed';
  btn.classList.add('not-installed');
  btn.onclick = null;
}

function setInstalled(btn, appKey) {
  btn.textContent = 'Open →';
  btn.classList.remove('not-installed');
  btn.onclick = () => launchApp(appKey);
}

function flashInput(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const orig = el.style.borderColor;
  el.style.borderColor = '#ef4444';
  el.title = msg;
  el.focus();
  setTimeout(() => { el.style.borderColor = orig; el.title = ''; }, 2000);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return '';
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60),
          h = Math.floor(m / 60),      d = Math.floor(h / 24);
    if (s < 60)  return 'just now';
    if (m < 60)  return `${m}m ago`;
    if (h < 24)  return `${h}h ago`;
    if (d === 1) return 'Yesterday';
    if (d < 7)   return `${d} days ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_) { return ''; }
}

function futureTime(iso) {
  if (!iso) return '';
  try {
    const diff = new Date(iso).getTime() - Date.now();
    if (isNaN(diff) || diff < 0) return relativeTime(iso);
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60),
          h = Math.floor(m / 60),      d = Math.floor(h / 24);
    if (s < 60)  return 'in <1m';
    if (m < 60)  return `in ${m}m`;
    if (h < 24)  return `in ${h}h`;
    if (d === 1) return 'Tomorrow';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_) { return ''; }
}

function formatElapsed(isoStart) {
  if (!isoStart) return '—';
  try {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(isoStart).getTime()) / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  } catch (_) { return '—'; }
}

// ─── FOOTER QUICK THEME SWITCHER ──────────────────────────────────────────────
function initFooterThemeSwitcher() {
  const btn   = document.getElementById('footer-theme-btn');
  const panel = document.getElementById('footer-theme-panel');
  const label = document.getElementById('footer-theme-label');
  if (!btn || !panel) return;

  const CORE_NAMES = { stealth: 'Stealth', graphite: 'Graphite', frost: 'Frost', oled: 'OLED' };
  const PERS_NAMES = { neutral: 'Neutral', cyberpunk: 'Cyberpunk', terminal: 'Terminal', threat: 'Threat' };

  function getTheme() {
    return {
      core:        document.body.getAttribute('data-core')        || _lCore || 'stealth',
      personality: document.body.getAttribute('data-personality') || _lPersonality || 'neutral',
    };
  }

  function sync() {
    const t = getTheme();
    if (label) label.textContent = `${CORE_NAMES[t.core] || t.core} / ${PERS_NAMES[t.personality] || t.personality}`;
    panel.querySelectorAll('.ftp-chip[data-core]').forEach(c =>
      c.classList.toggle('active', c.dataset.core === t.core));
    panel.querySelectorAll('.ftp-chip[data-personality]').forEach(c =>
      c.classList.toggle('active', c.dataset.personality === t.personality));
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) sync();
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) panel.style.display = 'none';
  });

  panel.querySelectorAll('.ftp-chip[data-core]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const t = getTheme();
      _lCore = chip.dataset.core;
      applyTheme({ core: _lCore, personality: t.personality });
      _lSaveTheme();
      sync();
      try { _syncLauncherThemeChips(); } catch (_) {}
    });
  });

  panel.querySelectorAll('.ftp-chip[data-personality]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const t = getTheme();
      _lPersonality = chip.dataset.personality;
      applyTheme({ core: t.core, personality: _lPersonality });
      _lSaveTheme();
      sync();
      try { _syncLauncherThemeChips(); } catch (_) {}
    });
  });

  sync();
}
