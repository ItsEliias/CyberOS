'use strict';
// renderer.js — All frontend logic, screen navigation, IPC calls, UI state

const api = window.electronAPI;

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  theme: 'stealth',
  vaultPath: null,
  currentScreen: 'scrape',
  isScraping: false,
  isPaused: false,
  sourceType: 'obsidian-publish',
  pdfFiles: [],
  scrapeStartTime: null,
  scrapeConfig: null,
  lastScrapeResult: null,
  deadLinkResults: null,
  sources: [],
  editingSourceId: null,
  statsCharts: {},
  soundEnabled: false,
  soundVolume: 0.6,
  splitFilePath: null,
  selectedSplitPoints: new Set(),
  logFilter: 'all'
};

// ─── Audio (base64-encoded minimal sounds via Web Audio API) ──────────────────

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume * state.soundVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (_) {}
}

const sounds = {
  success: () => { playTone(880, 200); setTimeout(() => playTone(1108, 200), 150); },
  error: () => playTone(220, 200, 'sawtooth', 0.2),
  conflict: () => playTone(440, 150, 'triangle', 0.25),
  complete: () => {
    playTone(523, 150); setTimeout(() => playTone(659, 150), 120);
    setTimeout(() => playTone(784, 250), 240);
  },
  notification: () => { playTone(660, 200); setTimeout(() => playTone(880, 300), 180); }
};

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

async function initApp() {
  const configExists = await api.configExists();

  if (configExists) {
    const config = await api.getConfig();
    state.vaultPath = config.obsidianVaultPath || null;
    state.theme = config.theme || 'stealth';

    applyTheme(state.theme);
    updateThemeSelect();
    initVaultCoreThemePicker();
    initFooterThemeSwitcher();

    await showSplash();

    if (config.vaultLoadedFromCyberLab) {
      showVaultLoadedNotice();
    }

    showMainApp();
  } else {
    await showSplash();
    showWizard();
  }

  setupEventListeners();
  setupIpcListeners();

  await refreshSourceLibrary();

  if (state.vaultPath) {
    detectPlugins();
  }

  setupUpdateBanner();
  populateSettings();

  if (state.currentScreen) navigateToScreen(state.currentScreen);
}

// ─── Splash ──────────────────────────────────────────────────────────────────

function showSplash() {
  return new Promise(resolve => {
    const splash = document.getElementById('splash-screen');
    splash.style.display = 'flex';
    setTimeout(() => {
      splash.style.display = 'none';
      resolve();
    }, 2200);
  });
}

function showVaultLoadedNotice() {
  const notice = document.getElementById('vault-loaded-notice');
  if (!notice) return;
  notice.style.display = 'flex';
  const closeBtn = document.getElementById('vault-notice-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { notice.style.display = 'none'; });
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

function showWizard() {
  document.getElementById('setup-wizard').style.display = 'flex';
}

function showStep(num) {
  document.querySelectorAll('.wizard-step').forEach(s => { s.style.display = 'none'; });
  const step = document.getElementById(`wizard-step-${num}`);
  if (step) step.style.display = 'block';
}

// ─── Main App ────────────────────────────────────────────────────────────────

function showMainApp() {
  document.getElementById('setup-wizard').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
}

// ─── Theme ───────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  const el = document.documentElement;
  if (typeof theme === 'string') {
    const legacy = {
      'stealth':  { core: 'stealth',   personality: 'neutral' },
      'cyberpunk':{ core: 'stealth',   personality: 'cyberpunk' },
      'terminal': { core: 'oled',      personality: 'terminal' },
      'threat':   { core: 'stealth',   personality: 'threat' },
      'warrior':  { core: 'stealth',   personality: 'threat' },
    };
    theme = legacy[theme] || { core: 'stealth', personality: 'neutral' };
  }
  const core        = (theme && theme.core)        || 'stealth';
  const personality = (theme && theme.personality) || 'neutral';
  el.setAttribute('data-core', core);
  el.setAttribute('data-personality', personality);
  el.removeAttribute('data-theme');
  _vcCore        = core;
  _vcPersonality = personality;
  _vcSyncChips();
  _vcUpdateCombo('vc-wizard-theme-combo');
  _vcUpdateCombo('vc-settings-theme-combo');
}

let _vcCore = 'stealth', _vcPersonality = 'neutral';

function _vcSyncChips() {
  document.querySelectorAll('#vc-wizard-core-row .theme-chip, #vc-settings-core-row .theme-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.core === _vcCore));
  document.querySelectorAll('#vc-wizard-personality-row .theme-chip, #vc-settings-personality-row .theme-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.personality === _vcPersonality));
}

function _vcUpdateCombo(id) {
  const el  = document.getElementById(id);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  if (el) el.textContent = cap(_vcCore) + ' + ' + cap(_vcPersonality);
}

function _vcSaveTheme() {
  if (api && api.setTheme) api.setTheme({ core: _vcCore, personality: _vcPersonality });
}

function initVaultCoreThemePicker() {
  // Wizard core chips
  document.querySelectorAll('#vc-wizard-core-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _vcCore = btn.dataset.core;
      _vcSyncChips();
      applyTheme({ core: _vcCore, personality: _vcPersonality });
      _vcUpdateCombo('vc-wizard-theme-combo');
    });
  });
  // Wizard personality chips
  document.querySelectorAll('#vc-wizard-personality-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _vcPersonality = btn.dataset.personality;
      _vcSyncChips();
      applyTheme({ core: _vcCore, personality: _vcPersonality });
      _vcUpdateCombo('vc-wizard-theme-combo');
    });
  });
  // Settings core chips
  document.querySelectorAll('#vc-settings-core-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _vcCore = btn.dataset.core;
      _vcSyncChips();
      applyTheme({ core: _vcCore, personality: _vcPersonality });
      _vcSaveTheme();
      _vcUpdateCombo('vc-settings-theme-combo');
    });
  });
  // Settings personality chips
  document.querySelectorAll('#vc-settings-personality-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _vcPersonality = btn.dataset.personality;
      _vcSyncChips();
      applyTheme({ core: _vcCore, personality: _vcPersonality });
      _vcSaveTheme();
      _vcUpdateCombo('vc-settings-theme-combo');
    });
  });
  _vcSyncChips();
  _vcUpdateCombo('vc-wizard-theme-combo');
  _vcUpdateCombo('vc-settings-theme-combo');
}

function updateThemeSelect() {
  // No-op — theme-select replaced by chip picker; kept for call-site compatibility
}

// ─── Sidebar Navigation (nav-item[data-view]) ────────────────────────────────

function setupSidebarNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      // Hide all view panes, show the selected one
      document.querySelectorAll('[data-view-pane]').forEach(p => p.style.display = 'none');
      const pane = document.querySelector(`[data-view-pane="${view}"]`);
      if (pane) pane.style.display = '';
    });
  });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function navigateToScreen(screenId) {
  state.currentScreen = screenId;

  // Update sidebar items
  document.querySelectorAll('.sidebar-item[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

  // Also update any topbar-pill nav elements
  document.querySelectorAll('.topbar-pill[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

  // Show correct screen
  document.querySelectorAll('.screen').forEach(s => { s.style.display = 'none'; });
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) screen.style.display = 'block';

  // Refresh data for specific screens
  if (screenId === 'sources') refreshSourceLibrary();
  if (screenId === 'schedules') refreshSchedules();
  if (screenId === 'logs') refreshLogs();
  if (screenId === 'health') { /* stats refreshed on demand */ }
  if (screenId === 'settings') { populateSettings(); detectCyberLabStatus(); }

  setStatus(`Screen: ${screenId}`);
}

// ─── Setup Event Listeners ────────────────────────────────────────────────────

function setupEventListeners() {
  // Sidebar nav (data-view items)
  setupSidebarNav();

  // Wizard steps
  document.querySelectorAll('.wizard-next').forEach(btn => {
    btn.addEventListener('click', () => showStep(parseInt(btn.dataset.next)));
  });
  document.querySelectorAll('.wizard-back').forEach(btn => {
    btn.addEventListener('click', () => showStep(parseInt(btn.dataset.back)));
  });

  document.getElementById('wizard-browse-vault').addEventListener('click', async () => {
    const folder = await api.selectFolder();
    if (folder) {
      document.getElementById('wizard-vault-path').value = folder;
      document.getElementById('wizard-next-2').disabled = false;
      const vStatus = document.getElementById('wizard-vault-status');
      vStatus.textContent = '✓ Vault path selected';
      vStatus.className = 'wizard-vault-status ok';
    }
  });

  // Theme picker initialisation (replaces old [data-theme] swatch click handlers)
  initVaultCoreThemePicker();

  document.getElementById('wizard-finish').addEventListener('click', async () => {
    const vaultPath = document.getElementById('wizard-vault-path').value;
    if (!vaultPath) { alert('Please select a vault path first.'); return; }
    await api.setVaultPath(vaultPath);
    await api.setTheme({ core: _vcCore, personality: _vcPersonality });
    state.vaultPath = vaultPath;
    showMainApp();
    navigateToScreen('scrape');
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-item[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => navigateToScreen(btn.dataset.screen));
  });

  // Topbar pills (source library shortcut, vault health shortcut)
  document.querySelectorAll('.topbar-pill[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => navigateToScreen(btn.dataset.screen));
  });

  // Minimise to tray
  document.getElementById('tray-btn').addEventListener('click', () => {
    window.close();
  });

  // Source type pills
  document.querySelectorAll('.pill[data-type]').forEach(btn => {
    btn.addEventListener('click', () => selectSourceType(btn.dataset.type));
  });

  // Scrape screen controls
  document.getElementById('start-scrape-btn').addEventListener('click', startScrape);
  document.getElementById('pause-btn').addEventListener('click', pauseScrape);
  document.getElementById('resume-btn').addEventListener('click', resumeScrape);
  document.getElementById('stop-btn').addEventListener('click', stopScrape);
  document.getElementById('retry-failed-btn').addEventListener('click', retryFailed);

  // Validate links button (scrape screen)
  const validateLinksBtn = document.getElementById('validate-links-btn');
  if (validateLinksBtn) {
    validateLinksBtn.addEventListener('click', async () => {
      setStatus('Validating links...');
      validateLinksBtn.disabled = true;
      validateLinksBtn.textContent = 'Validating...';
      const result = await api.validateLinks();
      validateLinksBtn.disabled = false;
      validateLinksBtn.textContent = 'Validate Links';
      setStatus(`Link check: ${result.live?.length || 0} live, ${result.dead?.length || 0} dead`);
    });
  }

  // Clear log button
  const clearLogBtn = document.getElementById('clear-log-btn');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      const panel = document.getElementById('log-panel');
      if (panel) panel.innerHTML = '';
      setStatus('Log cleared');
    });
  }

  // Advanced options toggle
  const advancedToggleBtn = document.getElementById('advanced-toggle-btn');
  if (advancedToggleBtn) {
    advancedToggleBtn.addEventListener('click', toggleOptionsPanel);
  }

  // Options close button
  const toggleOptionsClose = document.getElementById('toggle-options-close');
  if (toggleOptionsClose) {
    toggleOptionsClose.addEventListener('click', () => {
      const panel = document.querySelector('.options-row');
      if (panel) panel.style.display = 'none';
    });
  }

  // PDF drop zone
  setupPdfDropZone();

  // Delay slider
  document.getElementById('delay-slider').addEventListener('input', (e) => {
    const ms = parseInt(e.target.value);
    document.getElementById('delay-label').textContent = (ms / 1000).toFixed(1) + 's';
  });

  // Bulk import
  document.getElementById('bulk-import-btn').addEventListener('click', () => openModal('modal-bulk'));
  document.getElementById('bulk-start-btn').addEventListener('click', startBulkImport);

  // Post-scrape actions
  document.getElementById('ps-open-obsidian').addEventListener('click', async () => {
    await api.openVaultInObsidian(state.vaultPath);
  });
  document.getElementById('ps-open-folder').addEventListener('click', async () => {
    const subfolder = document.getElementById('output-subfolder').value || '';
    const folderPath = state.vaultPath + (subfolder ? '/' + subfolder : '');
    await api.openFolder(folderPath);
  });
  document.getElementById('ps-validate-links').addEventListener('click', async () => {
    setStatus('Validating links...');
    const result = await api.validateLinks();
    setStatus(`Link check: ${result.live?.length || 0} live, ${result.dead?.length || 0} dead`);
  });
  document.getElementById('ps-view-library').addEventListener('click', () => navigateToScreen('sources'));
  document.getElementById('ps-run-again').addEventListener('click', () => {
    document.getElementById('post-scrape').style.display = 'none';
    document.getElementById('progress-section').style.display = 'none';
  });

  // Sources screen (formerly library)
  document.getElementById('add-source-btn').addEventListener('click', () => openAddSourceModal());
  document.getElementById('library-search').addEventListener('input', filterSourceCards);
  document.getElementById('library-sort').addEventListener('change', renderSourceCards);
  document.getElementById('gap-report-btn').addEventListener('click', generateGapReport);

  // Schedules screen
  const runAllNowBtn = document.getElementById('run-all-now-btn');
  if (runAllNowBtn) {
    runAllNowBtn.addEventListener('click', async () => {
      const scheduledSources = state.sources.filter(s => s.schedule && s.schedule.enabled);
      if (scheduledSources.length === 0) { setStatus('No scheduled sources'); return; }
      runAllNowBtn.disabled = true;
      runAllNowBtn.textContent = 'Running...';
      setStatus(`Running ${scheduledSources.length} scheduled source(s)...`);
      for (const src of scheduledSources) {
        await api.scrapeSourceNow(src.id);
      }
      runAllNowBtn.disabled = false;
      runAllNowBtn.textContent = 'Run All Now';
      setStatus('All scheduled scrapes queued');
      navigateToScreen('scrape');
    });
  }

  // Logs screen
  const refreshLogsBtn = document.getElementById('refresh-logs-btn');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => refreshLogs());
  }

  const exportLogsBtn = document.getElementById('export-logs-btn');
  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', exportLogs);
  }

  const logFilterSelect = document.getElementById('logs-filter');
  if (logFilterSelect) {
    logFilterSelect.addEventListener('change', (e) => {
      state.logFilter = e.target.value;
      refreshLogs();
    });
  }

  // Vault Health tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = p.id === `tab-${tabId}` ? 'block' : 'none';
      });
    });
  });

  document.getElementById('refresh-stats-btn').addEventListener('click', loadVaultStats);
  document.getElementById('run-duplicate-btn').addEventListener('click', runDuplicateCheck);
  document.getElementById('run-deadlinks-btn').addEventListener('click', runDeadLinkCheck);
  document.getElementById('export-deadlinks-btn').addEventListener('click', exportDeadLinks);

  // Vault Health — extra action buttons
  const reviewOrphansBtn = document.getElementById('review-orphans-btn');
  if (reviewOrphansBtn) {
    reviewOrphansBtn.addEventListener('click', () => {
      // Switch to the duplicates/health tools tab
      const tab = document.querySelector('.tab[data-tab="duplicates"]');
      if (tab) tab.click();
    });
  }

  const viewAllLinked = document.getElementById('view-all-linked');
  if (viewAllLinked) {
    viewAllLinked.addEventListener('click', () => {
      setStatus('Most-linked notes shown above');
    });
  }

  const viewAllNotes = document.getElementById('view-all-notes');
  if (viewAllNotes) {
    viewAllNotes.addEventListener('click', () => {
      setStatus('Recent notes shown above');
    });
  }

  // Dead links filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterDeadLinks(btn.dataset.filter);
    });
  });

  // Markdown cleaner
  document.getElementById('cleaner-scope').addEventListener('change', (e) => {
    document.getElementById('cleaner-file-row').style.display = (e.target.value === 'file' || e.target.value === 'folder') ? 'flex' : 'none';
  });
  document.getElementById('cleaner-browse-file').addEventListener('click', async () => {
    const scope = document.getElementById('cleaner-scope').value;
    let p;
    if (scope === 'file') p = await api.selectFile([{ name: 'Markdown', extensions: ['md'] }]);
    else p = await api.selectFolder();
    if (p) document.getElementById('cleaner-file-path').value = p;
  });
  document.getElementById('cleaner-run-btn').addEventListener('click', runCleaner);
  document.getElementById('cleaner-apply-btn').addEventListener('click', applyCleanerChanges);

  // Settings
  document.getElementById('settings-browse-vault').addEventListener('click', async () => {
    const folder = await api.selectFolder();
    if (folder) {
      document.getElementById('settings-vault-path').value = folder;
      state.vaultPath = folder;
      await api.setVaultPath(folder);
      setStatus('Vault path updated');
      detectPlugins();
    }
  });

  document.getElementById('settings-open-vault-folder').addEventListener('click', async () => {
    if (state.vaultPath) await api.openFolder(state.vaultPath);
  });

  document.getElementById('settings-sounds').addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
    document.getElementById('volume-row').style.display = e.target.checked ? 'flex' : 'none';
    if (e.target.checked) sounds.success();
  });

  document.getElementById('settings-volume').addEventListener('input', (e) => {
    state.soundVolume = parseInt(e.target.value) / 100;
    document.getElementById('volume-label').textContent = e.target.value + '%';
  });

  document.getElementById('settings-minimise-tray').addEventListener('change', (e) => {
    api.setConfig('minimiseToTray', e.target.checked);
  });

  document.getElementById('settings-notifications').addEventListener('change', (e) => {
    api.setConfig('notifications', e.target.checked);
  });

  document.getElementById('factory-reset-btn').addEventListener('click', () => {
    showConfirm('Factory Reset', 'This will delete all source configurations and state files. Vault notes are NOT affected. Continue?', async () => {
      await api.factoryReset();
      state.sources = [];
      renderSourceCards();
      setStatus('Factory reset complete');
    });
  });

  document.getElementById('about-github').addEventListener('click', (e) => {
    e.preventDefault();
    api.openExternal('https://github.com/itsEliias/vaultcore');
  });

  document.getElementById('open-cyberlab-btn').addEventListener('click', () => {
    api.openCyberLab();
  });

  // Source modal
  document.getElementById('ms-save-btn').addEventListener('click', saveSource);

  // Update banner
  document.getElementById('update-banner-close').addEventListener('click', () => {
    document.getElementById('update-banner').style.display = 'none';
  });

  document.getElementById('update-view-btn').addEventListener('click', () => {
    const url = document.getElementById('update-banner').dataset.url;
    if (url) api.openExternal(url);
  });

  // Note splitter
  document.getElementById('split-browse-btn').addEventListener('click', async () => {
    const p = await api.selectFile([{ name: 'Markdown', extensions: ['md'] }]);
    if (p) {
      document.getElementById('split-file-path').value = p;
      state.splitFilePath = p;
    }
  });
  document.getElementById('split-analyse-btn').addEventListener('click', analyseSplitNote);
  document.getElementById('split-confirm-btn').addEventListener('click', confirmSplitNote);

  // Modal close buttons
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modalClose));
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // URL auto-detect source type on paste
  ['obs-url', 'web-url', 'gh-url', 'yt-url', 'reddit-url', 'twitter-url', 'notion-url', 'medium-url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('paste', () => setTimeout(() => autoDetectType(el.value), 50));
  });

  // Tray pause event
  api.onTrayPauseScrape(() => {
    if (state.isScraping && !state.isPaused) pauseScrape();
    else if (state.isPaused) resumeScrape();
  });

  // Confirm dialog
  document.getElementById('confirm-cancel').addEventListener('click', () => closeModal('modal-confirm'));
}

// ─── IPC Listeners ────────────────────────────────────────────────────────────

function setupIpcListeners() {
  api.onScrapeProgress((data) => {
    handleProgress(data);
  });

  api.onScrapeComplete((data) => {
    handleScrapeComplete(data);
  });

  api.onScrapeError((data) => {
    appendLog('error', `Fatal error: ${data.error}`);
    setScrapeIndicator('error', 'Error');
    setScrapeStatusDot('error');
    setStatus('Scrape failed: ' + data.error);
    state.isScraping = false;
    sounds.error();
  });

  api.onUpdateAvailable((data) => {
    showUpdateBanner(data);
  });

  api.onVaultHealthProgress((data) => {
    updateHealthProgress(data);
  });
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

function handleKeyboard(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) {
    if (e.key === 'Escape') closeAllModals();
    return;
  }

  switch (e.key) {
    case 'Enter': e.preventDefault(); if (!state.isScraping) startScrape(); break;
    case '.': e.preventDefault(); if (state.isScraping) { state.isPaused ? resumeScrape() : pauseScrape(); } break;
    case 's': e.preventDefault(); if (state.isScraping) stopScrape(); break;
    case '1': e.preventDefault(); applyTheme({ core: 'stealth', personality: 'cyberpunk' }); _vcSaveTheme(); break;
    case '2': e.preventDefault(); applyTheme({ core: 'oled', personality: 'terminal' }); _vcSaveTheme(); break;
    case '3': e.preventDefault(); applyTheme({ core: 'stealth', personality: 'neutral' }); _vcSaveTheme(); break;
    case '4': e.preventDefault(); applyTheme({ core: 'stealth', personality: 'threat' }); _vcSaveTheme(); break;
    case 'l': e.preventDefault(); navigateToScreen('sources'); break;
    case 'h': e.preventDefault(); navigateToScreen('health'); break;
    case ',': e.preventDefault(); navigateToScreen('settings'); break;
    case 'n': e.preventDefault(); clearScrapeInput(); break;
    case 'b': e.preventDefault(); openModal('modal-bulk'); break;
    case '[': e.preventDefault(); toggleOptionsPanel(); break;
  }
}

// ─── Source Type Selection ─────────────────────────────────────────────────────

function selectSourceType(type) {
  state.sourceType = type;

  document.querySelectorAll('.pill[data-type]').forEach(p => {
    p.classList.toggle('active', p.dataset.type === type);
  });

  document.querySelectorAll('.source-form').forEach(f => { f.style.display = 'none'; });
  const form = document.getElementById(`form-${type}`);
  if (form) form.style.display = 'block';

  autoFillOutputSubfolder(type);
}

function autoFillOutputSubfolder(type) {
  const subfolderInput = document.getElementById('output-subfolder');
  const urlMap = {
    'obsidian-publish': 'ObsidianPublish',
    'website': 'Web',
    'github': 'GitHub',
    'youtube': 'YouTube',
    'pdf': 'PDFs',
    'reddit': 'Reddit',
    'twitter': 'Twitter',
    'notion': 'Notion',
    'medium': 'Articles',
    'cve': 'CVEs',
    'rss': 'RSS'
  };
  if (!subfolderInput.value) subfolderInput.value = urlMap[type] || type;
}

function autoDetectType(url) {
  if (!url) return;
  const u = url.toLowerCase();
  let type = null;
  if (u.includes('publish.obsidian.md')) type = 'obsidian-publish';
  else if (u.includes('github.com')) type = 'github';
  else if (u.includes('youtube.com') || u.includes('youtu.be')) type = 'youtube';
  else if (u.includes('reddit.com')) type = 'reddit';
  else if (u.includes('twitter.com') || u.includes('x.com')) type = 'twitter';
  else if (u.includes('notion.so')) type = 'notion';
  else if (u.includes('medium.com') || u.includes('substack.com')) type = 'medium';

  if (type) selectSourceType(type);
}

// ─── PDF Drop Zone ────────────────────────────────────────────────────────────

function setupPdfDropZone() {
  const zone = document.getElementById('pdf-drop-zone');
  if (!zone) return;

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf'));
    addPdfFiles(files.map(f => f.path));
  });

  document.getElementById('pdf-browse-btn').addEventListener('click', async () => {
    const files = await api.selectFiles([{ name: 'PDF Files', extensions: ['pdf'] }]);
    if (files && files.length > 0) addPdfFiles(files);
  });
}

function addPdfFiles(paths) {
  for (const p of paths) {
    if (!state.pdfFiles.includes(p)) state.pdfFiles.push(p);
  }
  renderPdfFileList();
}

function renderPdfFileList() {
  const list = document.getElementById('pdf-file-list');
  list.innerHTML = state.pdfFiles.map((p, i) => `
    <div class="pdf-file-item">
      <span>📄 ${p.split('/').pop().split('\\').pop()}</span>
      <button onclick="removePdfFile(${i})">✕</button>
    </div>
  `).join('');
}

window.removePdfFile = (i) => {
  state.pdfFiles.splice(i, 1);
  renderPdfFileList();
};

// ─── Start Scrape ─────────────────────────────────────────────────────────────

async function startScrape() {
  if (state.isScraping) return;

  if (!state.vaultPath) {
    setStatus('⚠ No vault path set. Go to Settings.');
    return;
  }

  const config = buildScrapeConfig();
  if (!config) return;

  state.isScraping = true;
  state.isPaused = false;
  state.scrapeConfig = config;
  state.scrapeStartTime = Date.now();

  document.getElementById('post-scrape').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('log-panel').innerHTML = '';
  resetStats();

  // Update active card
  const cardIcon = document.getElementById('scrape-card-icon');
  if (cardIcon) cardIcon.textContent = sourceTypeIcon(config.sourceType);
  const cardUrl = document.getElementById('scrape-card-url');
  if (cardUrl) cardUrl.textContent = config.url || '';

  const progressName  = document.getElementById('progress-source-name');
  const progressBadge = document.getElementById('progress-type-badge');
  if (progressName)  progressName.textContent  = config.sourceName || config.url || 'Unknown';
  if (progressBadge) progressBadge.textContent = config.sourceType || '';
  document.getElementById('pause-btn').style.display = 'inline-flex';
  document.getElementById('resume-btn').style.display = 'none';
  document.getElementById('retry-failed-btn').style.display = 'none';

  setScrapeIndicator('scraping', config.sourceName || 'Scraping...');
  setScrapeStatusDot('active');
  setStatus(`Scraping: ${config.sourceName || config.url}`);

  startElapsedTimer();

  const result = await api.startScrape(config);

  if (result && result.error) {
    appendLog('error', result.error);
    setScrapeIndicator('error', 'Error');
    setScrapeStatusDot('error');
    state.isScraping = false;
    sounds.error();
  }
}

function sourceTypeIcon(type) {
  const icons = {
    'obsidian-publish': '🔮',
    'website': '🌐',
    'github': '🐙',
    'youtube': '▶',
    'pdf': '📄',
    'reddit': '🤖',
    'twitter': '✦',
    'notion': '📝',
    'medium': '✍',
    'cve': '🛡',
    'rss': '📡'
  };
  return icons[type] || '🌐';
}

function buildScrapeConfig() {
  const type = state.sourceType;
  const config = {
    sourceType: type,
    sourceName: document.getElementById('source-name').value || autoSourceName(type),
    outputSubfolder: document.getElementById('output-subfolder').value,
    requestDelay: parseInt(document.getElementById('delay-slider').value) || 1500,
    conflictStrategy: document.getElementById('conflict-strategy').value,
    saveToLibrary: document.getElementById('save-to-library').checked,
    generateCanvas: document.getElementById('generate-canvas').checked,
    updateMode: 'full'
  };

  switch (type) {
    case 'obsidian-publish':
      config.url = document.getElementById('obs-url').value;
      config.updateMode = document.getElementById('obs-update-mode').value;
      if (!config.url) { setStatus('⚠ Enter an Obsidian Publish URL'); return null; }
      break;
    case 'website':
      config.url = document.getElementById('web-url').value;
      config.crawlDepth = parseInt(document.getElementById('web-depth').value) || 3;
      config.sameDomain = document.getElementById('web-same-domain').checked;
      config.saveAssets = document.getElementById('web-save-assets')?.checked || false;
      if (!config.url) { setStatus('⚠ Enter a URL'); return null; }
      break;
    case 'github':
      config.url = document.getElementById('gh-url').value;
      config.githubMode = document.getElementById('gh-mode').value;
      config.branch = document.getElementById('gh-branch').value || 'main';
      if (!config.url) { setStatus('⚠ Enter a GitHub URL'); return null; }
      break;
    case 'youtube':
      config.url = document.getElementById('yt-url').value;
      config.youtubeMode = document.getElementById('yt-mode').value;
      config.timestampLinks = document.getElementById('yt-timestamps').checked;
      if (!config.url) { setStatus('⚠ Enter a YouTube URL'); return null; }
      break;
    case 'pdf':
      if (state.pdfFiles.length === 0) { setStatus('⚠ No PDF files selected'); return null; }
      config.filePaths = state.pdfFiles;
      config.url = state.pdfFiles[0];
      break;
    case 'reddit':
      config.url = document.getElementById('reddit-url').value;
      config.minUpvotes = parseInt(document.getElementById('reddit-min-upvotes').value) || 10;
      if (!config.url) { setStatus('⚠ Enter a Reddit URL'); return null; }
      break;
    case 'twitter':
      config.url = document.getElementById('twitter-url').value;
      if (!config.url) { setStatus('⚠ Enter a Twitter/X URL'); return null; }
      break;
    case 'notion':
      config.url = document.getElementById('notion-url').value;
      if (!config.url) { setStatus('⚠ Enter a Notion URL'); return null; }
      break;
    case 'medium':
      config.url = document.getElementById('medium-url').value;
      if (!config.url) { setStatus('⚠ Enter a Medium/Substack URL'); return null; }
      break;
    case 'cve':
      config.cveId = document.getElementById('cve-ids').value;
      if (!config.cveId.trim()) { setStatus('⚠ Enter at least one CVE ID'); return null; }
      config.url = 'CVE lookup';
      break;
    case 'rss':
      config.url = document.getElementById('rss-url').value;
      config.rssMaxItems = parseInt(document.getElementById('rss-max').value) || 10;
      if (!config.url) { setStatus('⚠ Enter an RSS feed URL'); return null; }
      break;
  }

  if (!config.sourceName) config.sourceName = config.url;
  return config;
}

function autoSourceName(type) {
  const names = {
    'obsidian-publish': 'Obsidian Publish',
    'website': 'Website Scrape',
    'github': 'GitHub Repo',
    'youtube': 'YouTube',
    'pdf': 'PDF Import',
    'reddit': 'Reddit Thread',
    'twitter': 'Twitter Thread',
    'notion': 'Notion Page',
    'medium': 'Article',
    'cve': 'CVE Notes',
    'rss': 'RSS Feed'
  };
  return names[type] || type;
}

// ─── Progress Handling ────────────────────────────────────────────────────────

let elapsedTimer = null;

function startElapsedTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => {
    if (!state.isScraping) { clearInterval(elapsedTimer); return; }
    const elapsed = Math.round((Date.now() - state.scrapeStartTime) / 1000);
    document.getElementById('stat-elapsed').textContent = formatDuration(elapsed);
  }, 1000);
}

function handleProgress(data) {
  if (data.type === 'log') {
    appendLog(data.logType, data.message, data.url);
  } else if (data.type === 'progress') {
    updateProgressBar(data.percent || 0);
    if (data.total > 0) {
      document.getElementById('stat-found').textContent = data.total;
      document.getElementById('stat-eta').textContent = estimateETA(data);
    }
  } else if (data.type === 'status') {
    setStatus(data.message);
  }

  if (data.stats) {
    document.getElementById('stat-found').textContent = data.stats.found || 0;
    document.getElementById('stat-saved').textContent = data.stats.saved || 0;
    document.getElementById('stat-updated').textContent = data.stats.updated || 0;
    document.getElementById('stat-failed').textContent = data.stats.failed || 0;
    document.getElementById('stat-skipped').textContent = data.stats.skipped || 0;
  }

  // Update active card page count
  if (data.stats || data.percent) {
    const saved = data.stats ? (data.stats.saved || 0) : 0;
    const pct   = data.percent ? Math.round(data.percent) : 0;
    const countEl = document.getElementById('progress-count');
    const pctEl   = document.getElementById('progress-pct');
    if (countEl) countEl.textContent = `${saved} pages`;
    if (pctEl)   pctEl.textContent   = pct > 0 ? `${pct}%` : '0%';
  }

  if (data.percent > 0) updateProgressBar(data.percent);
}

function appendLog(type, message, url) {
  const panel = document.getElementById('log-panel');
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const icons = { success: '✓', error: '✗', warning: '⚠', skipped: '→', info: 'ℹ' };
  const icon = icons[type] || '·';

  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.innerHTML = `<span class="log-time">${time}</span><span>${icon} ${escapeHtml(message)}</span>`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;

  if (type === 'error') sounds.error();
  else if (type === 'warning') sounds.conflict();
}

function updateProgressBar(percent) {
  document.getElementById('progress-bar').style.width = Math.min(100, percent) + '%';
}

function resetStats() {
  ['found', 'saved', 'updated', 'failed', 'skipped'].forEach(k => {
    document.getElementById(`stat-${k}`).textContent = '0';
  });
  document.getElementById('stat-elapsed').textContent = '0s';
  document.getElementById('stat-eta').textContent = '—';
  updateProgressBar(0);
}

function estimateETA(data) {
  if (!data.current || !data.total || data.current === 0) return '—';
  const elapsed = Date.now() - state.scrapeStartTime;
  const perItem = elapsed / data.current;
  const remaining = (data.total - data.current) * perItem;
  return formatDuration(Math.round(remaining / 1000));
}

function formatDuration(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

function handleScrapeComplete(data) {
  state.isScraping = false;
  state.isPaused = false;
  clearInterval(elapsedTimer);

  const result = data.result || {};
  state.lastScrapeResult = result;

  setScrapeIndicator('idle', 'Idle');
  setScrapeStatusDot('idle');
  updateProgressBar(100);
  setStatus(`Scrape complete — ${result.saved || 0} saved, ${result.updated || 0} updated`);

  if ((result.failedUrls || []).length > 0) {
    document.getElementById('retry-failed-btn').style.display = 'inline-flex';
  }

  document.getElementById('ss-saved').textContent = result.saved || 0;
  document.getElementById('ss-updated').textContent = result.updated || 0;
  document.getElementById('ss-skipped').textContent = result.skipped || 0;
  document.getElementById('ss-failed').textContent = result.failed || 0;
  document.getElementById('ss-time').textContent = result.elapsed ? formatDuration(Math.round(result.elapsed / 1000)) : '—';
  document.getElementById('post-scrape').style.display = 'block';

  sounds.complete();
}

// ─── Pause / Resume / Stop ────────────────────────────────────────────────────

async function pauseScrape() {
  await api.pauseScrape();
  state.isPaused = true;
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('resume-btn').style.display = 'inline-flex';
  setScrapeIndicator('idle', 'Paused');
  setStatus('Scrape paused');
}

async function resumeScrape() {
  await api.resumeScrape();
  state.isPaused = false;
  document.getElementById('pause-btn').style.display = 'inline-flex';
  document.getElementById('resume-btn').style.display = 'none';
  setScrapeIndicator('scraping', state.scrapeConfig?.sourceName || 'Scraping');
  setStatus('Scrape resumed');
}

async function stopScrape() {
  await api.stopScrape();
  state.isScraping = false;
  state.isPaused = false;
  clearInterval(elapsedTimer);
  setScrapeIndicator('idle', 'Idle');
  setScrapeStatusDot('idle');
  setStatus('Scrape stopped');
  appendLog('info', 'Scrape stopped by user');
}

async function retryFailed() {
  if (!state.scrapeConfig) return;
  document.getElementById('retry-failed-btn').style.display = 'none';
  await api.retryFailed(state.scrapeConfig);
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

async function startBulkImport() {
  const urlsText = document.getElementById('bulk-urls').value.trim();
  const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));

  if (urls.length === 0) { setStatus('⚠ No valid URLs'); return; }

  const sourceType = document.getElementById('bulk-source-type').value;
  const conflictStrategy = document.getElementById('bulk-conflict').value;
  const outputFolder = document.getElementById('bulk-output-folder').value || 'BulkImport';

  closeModal('modal-bulk');
  navigateToScreen('scrape');

  const config = {
    sourceType: sourceType === 'auto' ? 'website' : sourceType,
    sourceName: `Bulk Import (${urls.length} URLs)`,
    urls,
    url: urls[0],
    outputSubfolder: outputFolder,
    conflictStrategy,
    requestDelay: parseInt(document.getElementById('delay-slider').value) || 1500,
    saveToLibrary: false,
    generateCanvas: false,
    updateMode: 'full',
    bulkUrls: urls
  };

  state.isScraping = true;
  state.scrapeStartTime = Date.now();
  state.scrapeConfig = config;
  document.getElementById('post-scrape').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('log-panel').innerHTML = '';
  resetStats();
  document.getElementById('progress-source-name').textContent = `Bulk Import (${urls.length} URLs)`;
  document.getElementById('progress-type-badge').textContent = 'bulk';
  setScrapeIndicator('scraping', 'Bulk Import');
  setScrapeStatusDot('active');
  startElapsedTimer();

  const result = await api.startScrape(config);
  if (result && result.error) {
    appendLog('error', result.error);
    state.isScraping = false;
  }
}

// ─── Source Library ───────────────────────────────────────────────────────────

async function refreshSourceLibrary() {
  state.sources = await api.getSources();
  renderSourceCards();
  await refreshLibraryHealth();
}

async function refreshLibraryHealth() {
  const health = await api.getSourceHealth();
  if (!health) return;
  document.getElementById('lib-total-sources').textContent = health.totalSources || 0;
  document.getElementById('lib-total-notes').textContent = health.totalNotes || 0;
  document.getElementById('lib-last-activity').textContent = health.lastActivity
    ? formatRelativeDate(health.lastActivity) : '—';
  document.getElementById('lib-storage').textContent = health.storageUsed || '—';
}

function renderSourceCards() {
  const sortBy = document.getElementById('library-sort').value;
  const search = (document.getElementById('library-search').value || '').toLowerCase();

  let sources = [...state.sources];

  if (search) {
    sources = sources.filter(s =>
      (s.name || '').toLowerCase().includes(search) ||
      (s.url || '').toLowerCase().includes(search) ||
      (s.type || '').toLowerCase().includes(search)
    );
  }

  sources.sort((a, b) => {
    switch (sortBy) {
      case 'lastScraped': return (new Date(b.lastScraped) || 0) - (new Date(a.lastScraped) || 0);
      case 'name': return (a.name || '').localeCompare(b.name || '');
      case 'type': return (a.type || '').localeCompare(b.type || '');
      case 'noteCount': return (b.noteCount || 0) - (a.noteCount || 0);
      default: return 0;
    }
  });

  const container = document.getElementById('source-cards');
  const empty = document.getElementById('empty-library');

  if (sources.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  container.innerHTML = sources.map(src => renderSourceCard(src)).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleSourceAction(btn.dataset.action, btn.dataset.id));
  });
}

function renderSourceCard(src) {
  const status = src.status || 'never-scraped';
  const statusClass = { 'up-to-date': 'ok', 'never-scraped': 'never', 'error': 'error', 'updates-available': 'updates' }[status] || 'never';
  const statusLabel = { 'up-to-date': '✓ Up to date', 'never-scraped': '○ Never scraped', 'error': '✗ Error', 'updates-available': '⚠ Updates available' }[status] || status;
  const typeClass = `sc-icon-${src.type || 'website'}`;

  return `
    <div class="source-card">
      <div class="sc-icon-wrap ${typeClass}">${sourceTypeIcon(src.type || 'website')}</div>
      <div class="sc-status ${statusClass}" title="${statusLabel}"></div>
      <div class="sc-info">
        <div class="sc-name-row">
          <span class="sc-name">${escapeHtml(src.name || 'Unnamed')}</span>
          <span class="sc-type-badge">${src.type || 'website'}</span>
        </div>
        <div class="sc-url">${escapeHtml(src.url || '')}</div>
        <div class="sc-meta">
          <span>Last scraped: ${src.lastScraped ? formatRelativeDate(src.lastScraped) : 'Never'}</span>
          <span>Notes: ${src.noteCount || 0}</span>
          <span>Schedule: ${formatSchedule(src.schedule)}</span>
        </div>
      </div>
      <div class="sc-actions">
        <button class="btn btn-sm btn-primary" data-action="scrape" data-id="${src.id}">Scrape Now</button>
        <button class="btn btn-sm btn-outline" data-action="edit" data-id="${src.id}">Edit</button>
        <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${src.id}">Delete</button>
      </div>
    </div>
  `;
}

async function handleSourceAction(action, id) {
  switch (action) {
    case 'scrape':
      navigateToScreen('scrape');
      setStatus('Queuing scrape for source...');
      const scrapeResult = await api.scrapeSourceNow(id);
      if (scrapeResult && scrapeResult.error) setStatus('Error: ' + scrapeResult.error);
      break;
    case 'edit':
      const src = state.sources.find(s => s.id === id);
      if (src) openEditSourceModal(src);
      break;
    case 'delete':
      showConfirm('Delete Source', 'Delete this source? (Vault notes are not affected)', async () => {
        await api.deleteSource(id);
        await refreshSourceLibrary();
      });
      break;
  }
}

function filterSourceCards() { renderSourceCards(); }

function formatSchedule(schedule) {
  if (!schedule || !schedule.enabled || schedule.frequency === 'manual') return 'Manual only';
  const labels = {
    'daily': 'Daily',
    'every-3-days': 'Every 3 days',
    'weekly': 'Weekly',
    'every-2-weeks': 'Every 2 weeks'
  };
  return labels[schedule.frequency] || schedule.frequency;
}

// ─── Schedules Screen ─────────────────────────────────────────────────────────

function refreshSchedules() {
  const scheduledSources = state.sources.filter(s => s.schedule && s.schedule.enabled);
  const list = document.getElementById('schedules-list');
  if (!list) return;

  // Update health summary
  const activeCountEl = document.getElementById('sched-active-count');
  if (activeCountEl) activeCountEl.textContent = scheduledSources.length;

  const nextRunEl = document.getElementById('sched-next-run');
  if (nextRunEl) {
    if (scheduledSources.length > 0) {
      // Find the soonest upcoming run
      const upcoming = scheduledSources
        .map(s => computeNextRun(s.schedule))
        .filter(Boolean)
        .sort();
      nextRunEl.textContent = upcoming.length > 0 ? formatRelativeDate(upcoming[0]) : '—';
    } else {
      nextRunEl.textContent = '—';
    }
  }

  const runsTodayEl = document.getElementById('sched-total-runs');
  if (runsTodayEl) {
    const today = new Date().toDateString();
    const todayRuns = state.sources.filter(s => {
      if (!s.lastScraped) return false;
      return new Date(s.lastScraped).toDateString() === today;
    }).length;
    runsTodayEl.textContent = todayRuns;
  }

  if (scheduledSources.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏱</div>
        <div class="empty-title">No scheduled sources</div>
        <div class="empty-sub">Enable scheduling on a source to see it here.</div>
        <button class="btn btn-primary" onclick="navigateToScreen('sources')">Go to Sources</button>
      </div>
    `;
    return;
  }

  list.innerHTML = scheduledSources.map(src => {
    const nextRun = computeNextRun(src.schedule);
    const freq = formatSchedule(src.schedule);
    const lastRun = src.lastScraped ? formatRelativeDate(src.lastScraped) : 'Never';
    const typeIcon = sourceTypeIcon(src.type || 'website');
    const typeClass = `sc-icon-${src.type || 'website'}`;

    return `
      <div class="schedule-row-item">
        <div class="sched-icon-wrap ${typeClass}">${typeIcon}</div>
        <div class="sched-body">
          <div class="sched-name">${escapeHtml(src.name || 'Unnamed')}</div>
          <div class="sched-url">${escapeHtml(src.url || '')}</div>
          <div class="sched-times">
            <span class="sched-freq">${freq}</span>
            <span class="sched-last">Last: ${lastRun}</span>
          </div>
        </div>
        <div class="sched-next">
          <div class="sched-next-label">Next run</div>
          <div class="sched-next-val">${nextRun ? formatRelativeDate(nextRun) : 'Pending'}</div>
        </div>
        <div class="sched-actions">
          <button class="btn btn-sm btn-primary" onclick="scrapeSourceNowFromSchedule('${src.id}')">Run Now</button>
          <button class="btn btn-sm btn-ghost" onclick="editSourceFromSchedule('${src.id}')">Edit</button>
        </div>
      </div>
    `;
  }).join('');
}

function computeNextRun(schedule) {
  if (!schedule || !schedule.enabled) return null;
  const now = new Date();
  const [hour, minute] = (schedule.time || '09:00').split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (schedule.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (schedule.frequency === 'every-3-days') {
    if (next <= now) next.setDate(next.getDate() + 3);
  } else if (schedule.frequency === 'weekly') {
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (schedule.frequency === 'every-2-weeks') {
    if (next <= now) next.setDate(next.getDate() + 14);
  } else {
    return null;
  }
  return next.toISOString();
}

window.scrapeSourceNowFromSchedule = async (id) => {
  setStatus('Running scheduled scrape...');
  navigateToScreen('scrape');
  const result = await api.scrapeSourceNow(id);
  if (result && result.error) setStatus('Error: ' + result.error);
};

window.editSourceFromSchedule = (id) => {
  const src = state.sources.find(s => s.id === id);
  if (src) openEditSourceModal(src);
};

// ─── Logs Screen ──────────────────────────────────────────────────────────────

async function refreshLogs() {
  const panel = document.getElementById('log-panel-history');
  if (!panel) return;

  panel.innerHTML = '<div class="log-loading">Loading logs...</div>';

  let logEntries = [];

  try {
    if (state.vaultPath) {
      const logPath = state.vaultPath + '/_scrape_log.json';
      const raw = await api.readFile(logPath);
      if (raw) {
        logEntries = JSON.parse(raw);
      }
    }
  } catch (_) {
    logEntries = [];
  }

  // Update summary
  const totalEl = document.getElementById('log-total');
  if (totalEl) totalEl.textContent = logEntries.length;

  const errorCount = logEntries.filter(e => e.type === 'error').length;
  const errorsEl = document.getElementById('log-errors');
  if (errorsEl) errorsEl.textContent = errorCount;

  const lastRunEl = document.getElementById('log-last-run');
  if (lastRunEl && logEntries.length > 0) {
    const latest = logEntries[logEntries.length - 1];
    lastRunEl.textContent = latest.timestamp ? formatRelativeDate(latest.timestamp) : '—';
  } else if (lastRunEl) {
    lastRunEl.textContent = '—';
  }

  // Filter
  const filter = state.logFilter || 'all';
  const filtered = filter === 'all' ? logEntries : logEntries.filter(e => e.type === filter);

  if (filtered.length === 0) {
    panel.innerHTML = '<div class="log-empty">No log entries found. Run a scrape to generate logs.</div>';
    return;
  }

  // Render newest first
  const reversed = [...filtered].reverse();
  panel.innerHTML = reversed.map(entry => {
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ', skipped: '→' };
    const icon = icons[entry.type] || '·';
    const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
    return `
      <div class="log-line log-${entry.type || 'info'}">
        <span class="log-time">${time}</span>
        <span>${icon} ${escapeHtml(entry.message || '')}</span>
        ${entry.source ? `<span class="log-source">[${escapeHtml(entry.source)}]</span>` : ''}
      </div>
    `;
  }).join('');
}

async function exportLogs() {
  if (!state.vaultPath) { setStatus('No vault configured'); return; }
  try {
    const logPath = state.vaultPath + '/_scrape_log.json';
    const raw = await api.readFile(logPath);
    if (!raw) { setStatus('No log file found'); return; }
    const entries = JSON.parse(raw);

    // Convert to CSV
    const header = 'timestamp,type,message,source\n';
    const rows = entries.map(e =>
      [e.timestamp || '', e.type || '', `"${(e.message || '').replace(/"/g, '""')}"`, e.source || ''].join(',')
    ).join('\n');
    const csv = header + rows;

    const exportPath = state.vaultPath + '/_scrape_log_export.csv';
    await api.writeFile(exportPath, csv);
    setStatus('Logs exported: _scrape_log_export.csv');
  } catch (err) {
    setStatus('Export failed: ' + err.message);
  }
}

// ─── Add/Edit Source Modal ────────────────────────────────────────────────────

function openAddSourceModal() {
  state.editingSourceId = null;
  document.getElementById('source-modal-title').textContent = 'Add Source';
  document.getElementById('ms-name').value = '';
  document.getElementById('ms-url').value = '';
  document.getElementById('ms-type').value = 'website';
  document.getElementById('ms-frequency').value = 'manual';
  document.getElementById('ms-time').value = '09:00';
  document.getElementById('ms-conflict').value = 'skip';
  openModal('modal-source');
}

function openEditSourceModal(src) {
  state.editingSourceId = src.id;
  document.getElementById('source-modal-title').textContent = 'Edit Source';
  document.getElementById('ms-name').value = src.name || '';
  document.getElementById('ms-url').value = src.url || '';
  document.getElementById('ms-type').value = src.type || 'website';
  document.getElementById('ms-frequency').value = src.schedule?.frequency || 'manual';
  document.getElementById('ms-time').value = src.schedule?.time || '09:00';
  document.getElementById('ms-conflict').value = src.schedule?.conflictStrategy || 'skip';
  openModal('modal-source');
}

async function saveSource() {
  const name = document.getElementById('ms-name').value.trim();
  const url = document.getElementById('ms-url').value.trim();
  const type = document.getElementById('ms-type').value;
  const frequency = document.getElementById('ms-frequency').value;
  const time = document.getElementById('ms-time').value;
  const conflictStrategy = document.getElementById('ms-conflict').value;

  if (!name) { setStatus('⚠ Source name required'); return; }
  if (!url && type !== 'cve') { setStatus('⚠ URL required'); return; }

  const sourceData = {
    name, url, type,
    schedule: {
      enabled: frequency !== 'manual',
      frequency, time, conflictStrategy
    }
  };

  if (state.editingSourceId) {
    await api.updateSource(state.editingSourceId, sourceData);
  } else {
    await api.addSource(sourceData);
  }

  closeModal('modal-source');
  await refreshSourceLibrary();
}

// ─── Knowledge Gap Report ─────────────────────────────────────────────────────

async function generateGapReport() {
  setStatus('Generating knowledge gap report...');
  const btn = document.getElementById('gap-report-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const result = await api.generateKnowledgeGapReport();

  btn.disabled = false;
  btn.textContent = 'Generate Knowledge Gap Report';

  if (result.error) {
    setStatus('Error: ' + result.error);
    return;
  }

  setStatus(`Report saved: Knowledge Gap ${result.reportDate}.md (${result.gaps} gaps found)`);
  sounds.notification();

  showConfirm(
    'Report Generated',
    `Knowledge gap report saved to vault with ${result.gaps} topics identified. Open it in Obsidian?`,
    () => api.openVaultInObsidian(state.vaultPath)
  );
}

// ─── Vault Health ─────────────────────────────────────────────────────────────

async function loadVaultStats() {
  document.getElementById('stats-loading').style.display = 'block';
  document.getElementById('stats-content').style.display = 'none';

  const stats = await api.getVaultStats();

  document.getElementById('stats-loading').style.display = 'none';

  if (!stats) { setStatus('No vault configured'); return; }

  document.getElementById('stats-content').style.display = 'block';
  document.getElementById('st-total-notes').textContent = stats.totalNotes.toLocaleString();
  document.getElementById('st-total-words').textContent = stats.totalWords.toLocaleString();
  document.getElementById('st-orphans').textContent = stats.orphanedNotes.length;

  // Storage display
  const storageEl = document.getElementById('st-storage');
  if (storageEl) storageEl.textContent = stats.storageUsed || '—';

  // Source types count
  const sourcesEl = document.getElementById('st-sources');
  if (sourcesEl) sourcesEl.textContent = Object.keys(stats.sourceBreakdown || {}).length;

  // Orphan hero
  const orphanHero = document.getElementById('orphan-hero-count');
  if (orphanHero) orphanHero.textContent = stats.orphanedNotes.length;

  const updatedEl = document.getElementById('stats-last-updated');
  if (updatedEl) updatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString();

  renderStatsLists(stats);
  renderStatsCharts(stats);
}

function renderStatsLists(stats) {
  // Most linked — ranked list
  const mostLinked = document.getElementById('most-linked-list');
  if (mostLinked) {
    mostLinked.innerHTML = (stats.mostLinkedNotes || []).map((n, i) =>
      `<div class="ranked-item">
        <span class="ranked-num">${i + 1}</span>
        <span class="ranked-title">${escapeHtml(n.title)}</span>
        <span class="ranked-val">${n.inbound} links</span>
      </div>`
    ).join('');
  }

  // Orphaned notes — simple list
  const orphaned = document.getElementById('orphaned-list');
  if (orphaned) {
    orphaned.innerHTML = (stats.orphanedNotes || []).slice(0, 12).map(n =>
      `<div class="ranked-item">
        <span class="ranked-title">${escapeHtml(n.title)}</span>
      </div>`
    ).join('');
  }

  // Newest/recent notes — ranked list
  const newest = document.getElementById('newest-list');
  if (newest) {
    newest.innerHTML = (stats.newestNotes || []).slice(0, 12).map((n, i) =>
      `<div class="ranked-item">
        <span class="ranked-num">${i + 1}</span>
        <span class="ranked-title">${escapeHtml(n.title)}</span>
        <span class="ranked-val">${formatRelativeDate(n.created)}</span>
      </div>`
    ).join('');
  }
}

function renderStatsCharts(stats) {
  Object.values(state.statsCharts).forEach(c => { try { c.destroy(); } catch (_) {} });
  state.statsCharts = {};

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const accent2Color = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();

  // Folders bar chart
  const folderData = Object.entries(stats.notesByFolder || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (folderData.length > 0 && document.getElementById('chart-folders')) {
    const ctx = document.getElementById('chart-folders');
    state.statsCharts.folders = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: folderData.map(([k]) => k),
        datasets: [{ data: folderData.map(([, v]) => v), backgroundColor: accentColor, borderRadius: 4 }]
      },
      options: chartOptions(textColor)
    });
  }

  // Tags donut chart
  const tagData = Object.entries(stats.notesByTag || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (tagData.length > 0 && document.getElementById('chart-tags')) {
    const ctx = document.getElementById('chart-tags');
    state.statsCharts.tags = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: tagData.map(([k]) => k),
        datasets: [{ data: tagData.map(([, v]) => v), backgroundColor: generateColors(tagData.length, accentColor) }]
      },
      options: { ...chartOptions(textColor), cutout: '60%' }
    });
  }

  // Source breakdown bar chart
  const srcData = Object.entries(stats.sourceBreakdown || {}).sort((a, b) => b[1] - a[1]);
  if (srcData.length > 0 && document.getElementById('chart-sources')) {
    const ctx = document.getElementById('chart-sources');
    state.statsCharts.sources = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: srcData.map(([k]) => k),
        datasets: [{ data: srcData.map(([, v]) => v), backgroundColor: accent2Color, borderRadius: 4 }]
      },
      options: chartOptions(textColor)
    });
  }
}

function chartOptions(textColor) {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { bodyColor: textColor, titleColor: textColor }
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };
}

function generateColors(count, baseColor) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(`hsla(${(i / count) * 360}, 70%, 60%, 0.8)`);
  }
  return colors;
}

// ─── Duplicate Check ──────────────────────────────────────────────────────────

async function runDuplicateCheck() {
  document.getElementById('dup-progress').style.display = 'block';
  document.getElementById('dup-results').style.display = 'none';
  document.getElementById('run-duplicate-btn').disabled = true;

  api.onVaultHealthProgress((data) => {
    document.getElementById('dup-progress-bar').style.width = data.percent + '%';
    document.getElementById('dup-progress-msg').textContent = data.message;
  });

  const results = await api.runDuplicateCheck();

  document.getElementById('dup-progress').style.display = 'none';
  document.getElementById('run-duplicate-btn').disabled = false;

  if (results.error) { setStatus('Error: ' + results.error); return; }

  renderDuplicateResults(results);
}

function renderDuplicateResults(results) {
  document.getElementById('dup-results').style.display = 'block';
  const totalPairs = (results.similarContent || []).length + (results.exactTitle || []).length;
  document.getElementById('dup-summary').textContent =
    `Found ${totalPairs} potential duplicate pairs. Review each pair and choose an action.`;

  const pairsEl = document.getElementById('dup-pairs');
  let html = '';

  for (const pair of (results.similarContent || [])) {
    html += `<div class="dup-pair">
      <div class="dup-pair-header">
        <span class="dup-sim">${pair.similarity}% similar</span>
        <span style="color:var(--text-muted);font-size:12px">${pair.type}</span>
      </div>
      <div class="dup-notes">
        <div class="dup-note">
          <div class="dup-note-name">${escapeHtml(pair.noteA.title)}</div>
          <div class="dup-note-path">${escapeHtml(pair.noteA.path)}</div>
        </div>
        <div class="dup-note">
          <div class="dup-note-name">${escapeHtml(pair.noteB.title)}</div>
          <div class="dup-note-path">${escapeHtml(pair.noteB.path)}</div>
        </div>
      </div>
      <div class="dup-actions">
        <button class="btn btn-sm btn-outline" onclick="dupAction('keepA','${pair.noteA.fullPath}','${pair.noteB.fullPath}')">Keep A</button>
        <button class="btn btn-sm btn-outline" onclick="dupAction('keepB','${pair.noteA.fullPath}','${pair.noteB.fullPath}')">Keep B</button>
        <button class="btn btn-sm btn-outline" onclick="dupMerge('${pair.noteA.fullPath}','${pair.noteB.fullPath}')">Merge</button>
      </div>
    </div>`;
  }

  pairsEl.innerHTML = html || '<p style="color:var(--text-muted);font-size:13px">No duplicates found.</p>';
}

window.dupAction = async (action, pathA, pathB) => {
  const deleteTarget = action === 'keepA' ? pathB : pathA;
  await api.deleteNote(deleteTarget);
  setStatus(`Deleted: ${deleteTarget.split('/').pop()}`);
  runDuplicateCheck();
};

window.dupMerge = async (pathA, pathB) => {
  const result = await api.mergeNotes(pathA, pathB, pathA);
  if (result.error) { setStatus('Merge error: ' + result.error); return; }
  document.getElementById('conflict-merge-content').value = result.merged;
  document.getElementById('conflict-merge-area').style.display = 'block';
  document.getElementById('conflict-save-merge').onclick = async () => {
    await api.writeFile(pathA, document.getElementById('conflict-merge-content').value);
    await api.deleteNote(pathB);
    closeModal('modal-conflict');
    setStatus('Notes merged');
    runDuplicateCheck();
  };
  openModal('modal-conflict');
};

// ─── Dead Link Check ──────────────────────────────────────────────────────────

async function runDeadLinkCheck() {
  document.getElementById('dl-progress').style.display = 'block';
  document.getElementById('dl-results').style.display = 'none';
  document.getElementById('run-deadlinks-btn').disabled = true;
  document.getElementById('export-deadlinks-btn').style.display = 'none';

  const results = await api.runDeadLinkCheck();

  document.getElementById('dl-progress').style.display = 'none';
  document.getElementById('run-deadlinks-btn').disabled = false;

  if (results.error) { setStatus('Error: ' + results.error); return; }

  state.deadLinkResults = results;
  renderDeadLinkResults(results);
}

function renderDeadLinkResults(results) {
  document.getElementById('dl-results').style.display = 'block';
  document.getElementById('export-deadlinks-btn').style.display = 'inline-flex';

  document.getElementById('dl-summary').innerHTML =
    `Total: ${results.total} | <span style="color:var(--success)">Live: ${results.live}</span> | <span style="color:var(--error)">Dead: ${results.dead}</span> | <span style="color:var(--warning)">Redirected: ${results.redirected}</span> | Unknown: ${results.unknown}`;

  filterDeadLinks('all');
}

function filterDeadLinks(filter) {
  if (!state.deadLinkResults) return;
  const results = state.deadLinkResults.results || [];
  const filtered = filter === 'all' ? results : results.filter(r => r.status === filter);

  const list = document.getElementById('dl-list');
  list.innerHTML = filtered.map(r => `
    <div class="dl-item ${r.status}">
      <span class="dl-status-badge ${r.status}">${r.status}</span>
      <span class="dl-url">${escapeHtml(r.url)}</span>
      <span class="dl-file">${escapeHtml(r.file)}</span>
      <div class="dl-actions">
        <button class="btn btn-sm btn-ghost" onclick="api.openExternal('${escapeHtml(r.url)}')" title="Open URL">↗</button>
        ${r.status === 'dead' ? `<button class="btn btn-sm btn-ghost" onclick="api.archiveWayback('${escapeHtml(r.url)}')" title="Wayback Machine">⏱</button>` : ''}
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);padding:16px">No links in this category.</p>';
}

async function exportDeadLinks() {
  if (!state.deadLinkResults) return;
  const path = await api.exportDeadLinksCsv(state.deadLinkResults);
  if (path) setStatus('Exported: ' + path);
}

function updateHealthProgress(data) {
  const progressBars = document.querySelectorAll('.tool-progress .progress-bar');
  progressBars.forEach(bar => { bar.style.width = data.percent + '%'; });
  const msgs = document.querySelectorAll('.tool-progress span');
  msgs.forEach(msg => { if (msg.textContent !== data.message) msg.textContent = data.message; });
}

// ─── Markdown Cleaner ─────────────────────────────────────────────────────────

async function runCleaner() {
  const scope = document.getElementById('cleaner-scope').value;
  const before = document.getElementById('cleaner-before').value;
  const filePath = document.getElementById('cleaner-file-path').value;

  const operations = {
    fixHeadings: document.getElementById('cl-fix-headings').checked,
    removeExtraBlankLines: document.getElementById('cl-blank-lines').checked,
    fixWikilinks: document.getElementById('cl-wikilinks').checked,
    standardizeCodeBlocks: document.getElementById('cl-code-blocks').checked,
    removeHtml: document.getElementById('cl-html').checked,
    fixListIndentation: document.getElementById('cl-lists').checked,
    normalizeFrontmatter: document.getElementById('cl-frontmatter').checked,
    stripTrackingParams: document.getElementById('cl-tracking').checked
  };

  const result = await api.cleanMarkdown({
    scope: scope === 'paste' ? 'paste' : scope,
    content: scope === 'paste' ? before : undefined,
    filePath: scope === 'file' ? filePath : undefined,
    folderPath: scope === 'folder' ? filePath : undefined,
    operations
  });

  if (result.error) { setStatus('Error: ' + result.error); return; }

  if (scope === 'paste') {
    document.getElementById('cleaner-after').value = result.cleaned;
    document.getElementById('cleaner-apply-btn').style.display = 'inline-flex';
    setStatus(`Cleaning preview ready — ${result.changed ? 'changes found' : 'no changes needed'}`);
  } else {
    setStatus(`${result.message}`);
  }
}

function applyCleanerChanges() {
  const cleaned = document.getElementById('cleaner-after').value;
  document.getElementById('cleaner-before').value = cleaned;
  document.getElementById('cleaner-after').value = '';
  document.getElementById('cleaner-apply-btn').style.display = 'none';
  setStatus('Cleaned content copied to input');
}

// ─── Note Splitter ────────────────────────────────────────────────────────────

async function analyseSplitNote() {
  const filePath = document.getElementById('split-file-path').value;
  if (!filePath) { setStatus('⚠ Select a note to split'); return; }

  const result = await api.analyseNoteHeadings(filePath);
  if (result.error) { setStatus('Error: ' + result.error); return; }

  const headings = result.headings || [];
  if (headings.length === 0) {
    setStatus('No H2/H3 headings found in this note');
    return;
  }

  state.selectedSplitPoints = new Set(headings.map(h => h.title));

  const list = document.getElementById('split-heading-list');
  list.innerHTML = headings.map(h => `
    <div class="split-heading-item">
      <input type="checkbox" checked data-heading="${escapeHtml(h.title)}" onchange="toggleSplitPoint('${escapeHtml(h.title)}', this.checked)">
      <span class="split-heading-level">H${h.level}</span>
      <span>${escapeHtml(h.title)}</span>
    </div>
  `).join('');

  document.getElementById('split-headings-preview').style.display = 'block';
  document.getElementById('split-confirm-btn').style.display = 'inline-flex';
}

window.toggleSplitPoint = (title, checked) => {
  if (checked) state.selectedSplitPoints.add(title);
  else state.selectedSplitPoints.delete(title);
};

async function confirmSplitNote() {
  const filePath = document.getElementById('split-file-path').value;
  const splitPoints = [...state.selectedSplitPoints];

  const result = await api.splitNote(filePath, splitPoints);
  if (result.error) { setStatus('Split error: ' + result.error); return; }

  closeModal('modal-split');
  setStatus(`Split complete: ${result.created.length} notes created`);
  sounds.success();
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function populateSettings() {
  const config = await api.getConfig();
  const vp = config.obsidianVaultPath || state.vaultPath || '';
  document.getElementById('settings-vault-path').value = vp;

  const version = await api.getAppVersion();
  document.getElementById('about-version').textContent = version || '1.0';

  const minimiseToTray = config.minimiseToTray !== false;
  document.getElementById('settings-minimise-tray').checked = minimiseToTray;

  const notifs = config.notifications !== false;
  document.getElementById('settings-notifications').checked = notifs;

  _vcSyncChips();
}

async function detectPlugins() {
  const plugins = await api.detectObsidianPlugins();
  const badges = document.getElementById('plugin-badges');
  if (!badges) return;
  if (!plugins || plugins.length === 0) {
    badges.innerHTML = '<span style="color:var(--text-muted);font-size:12px">None detected</span>';
    return;
  }
  const known = {
    'dataview': 'Dataview',
    'templater-obsidian': 'Templater',
    'obsidian-kanban': 'Kanban',
    'obsidian-tasks-plugin': 'Tasks',
    'obsidian-excalidraw-plugin': 'Excalidraw',
    'obsidian-git': 'Git',
    'calendar': 'Calendar'
  };
  const toShow = plugins.filter(p => known[p]).slice(0, 8);
  if (toShow.length === 0) {
    badges.innerHTML = `<span class="plugin-badge">${plugins.length} plugins</span>`;
    return;
  }
  badges.innerHTML = toShow.map(p => `<span class="plugin-badge">${known[p] || p}</span>`).join('');
}

async function detectCyberLabStatus() {
  const isInstalled = await api.isCyberLabInstalled();
  const indicator = document.getElementById('cl-indicator');
  const statusText = document.getElementById('cl-status-text');
  const openBtn = document.getElementById('open-cyberlab-btn');

  if (isInstalled) {
    indicator.querySelector('.dot').className = 'dot dot-green';
    statusText.textContent = 'CyberLab is installed and connected';
    openBtn.style.display = 'inline-flex';
  } else {
    indicator.querySelector('.dot').className = 'dot dot-grey';
    statusText.textContent = 'CyberLab not found (~cybertools-config.json)';
    openBtn.style.display = 'none';
  }
}

// ─── Update Banner ────────────────────────────────────────────────────────────

async function setupUpdateBanner() {
  // Handled by IPC event from main
}

function showUpdateBanner(data) {
  const banner = document.getElementById('update-banner');
  document.getElementById('update-banner-text').textContent = `Update available: v${data.version}`;
  banner.dataset.url = data.url || '';
  banner.style.display = 'flex';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setScrapeIndicator(status, label) {
  const indicator = document.getElementById('scrape-indicator');
  indicator.className = `scrape-indicator ${status}`;
  document.getElementById('indicator-label').textContent = label;
}

function setScrapeStatusDot(status) {
  const dot = document.getElementById('scrape-status-dot');
  dot.className = 'scrape-status-dot' + (status !== 'idle' ? ` ${status}` : '');
  dot.title = `Status: ${status}`;
}

function setStatus(msg) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = msg;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelativeDate(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch (_) { return isoStr; }
}

function clearScrapeInput() {
  document.getElementById('source-name').value = '';
  document.getElementById('output-subfolder').value = '';
  document.getElementById('obs-url').value = '';
  document.getElementById('web-url').value = '';
  document.getElementById('gh-url').value = '';
  document.getElementById('yt-url').value = '';
  state.pdfFiles = [];
  renderPdfFileList();
  document.getElementById('progress-section').style.display = 'none';
  document.getElementById('post-scrape').style.display = 'none';
  setStatus('Input cleared');
}

function toggleOptionsPanel() {
  const panel = document.querySelector('.options-row');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }
}

let confirmCallback = null;
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = onConfirm;
  openModal('modal-confirm');

  document.getElementById('confirm-ok').onclick = () => {
    closeModal('modal-confirm');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  };
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
      core:        document.documentElement.getAttribute('data-core')        || _vcCore || 'stealth',
      personality: document.documentElement.getAttribute('data-personality') || _vcPersonality || 'neutral',
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
      _vcCore = chip.dataset.core;
      applyTheme({ core: _vcCore, personality: t.personality });
      _vcSaveTheme();
      sync();
      try { _vcSyncChips(); } catch (_) {}
    });
  });

  panel.querySelectorAll('.ftp-chip[data-personality]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const t = getTheme();
      _vcPersonality = chip.dataset.personality;
      applyTheme({ core: t.core, personality: _vcPersonality });
      _vcSaveTheme();
      sync();
      try { _vcSyncChips(); } catch (_) {}
    });
  });

  sync();
}
