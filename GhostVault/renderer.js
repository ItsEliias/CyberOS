// ═══════════════════════════════════════════════════════════
//   GHOSTVAULT — renderer.js
//   ItsEliias // v1.0 — Full app logic
//   Vault · Editor · Preview · AI · Search · Shortcuts
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  config:        {},
  vaultPath:     null,
  notes:         [],        // flat list from vault
  folders:       [],        // folder names
  activeNote:    null,      // { path, name, folder, content }
  editorMode:    'split',   // 'edit' | 'split' | 'preview'
  dirty:         false,
  autosave:      true,
  autosaveTimer: null,
  searchQuery:   '',
  pinnedPaths:   new Set(),
  alwaysOnTop:   false,
  contextTarget: null,      // note item that was right-clicked
  wizardTheme:   { core: 'stealth', personality: 'neutral' },
  wizardVault:   null,
  wizardStep:    0,
};

// ─── BOOT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  state.config = await gv('getConfig');
  const theme  = state.config.theme || { core: 'stealth', personality: 'neutral' };
  applyTheme(theme);

  // Load AI settings
  _aiCtx       = state.config.aiCtx       || 'work';
  _ollamaModel = state.config.ollamaModel  || 'mistral';

  // Load pins
  try { state.pinnedPaths = new Set(JSON.parse(state.config.pins || '[]')); } catch {}

  // Load autosave setting
  state.autosave = state.config.autosave !== false;
  const asChk = document.getElementById('settings-autosave');
  if (asChk) asChk.checked = state.autosave;

  // Load vault structure setting
  const evChk = document.getElementById('settings-existing-vault');
  if (evChk) evChk.checked = !!state.config.useExistingStructure;

  // Animate splash
  const splash = document.getElementById('splash');
  const status = document.getElementById('splash-status');

  status.textContent = 'Loading configuration...';
  await sleep(400);
  status.textContent = 'Checking vault...';
  await sleep(400);

  if (state.config.vaultPath) {
    status.textContent = 'Mounting vault...';
    state.vaultPath = state.config.vaultPath;
    await sleep(300);
    status.textContent = 'Indexing notes...';
    await sleep(300);
    splash.classList.add('fade-out');
    await sleep(550);
    splash.style.display = 'none';
    await launchApp();
  } else {
    status.textContent = 'First launch — setup required';
    await sleep(500);
    splash.classList.add('fade-out');
    await sleep(550);
    splash.style.display = 'none';
    showWizard();
  }

  // Global shortcut listener from main
  window.ghostvault.onQuickCapture(() => openQuickCapture());

  // Vault refresh triggered by capture window after saving
  window.ghostvault.onVaultRefresh(() => refreshVault());

  // Register keyboard shortcuts
  document.addEventListener('keydown', onKeyDown);

  // Close menus on outside click
  document.addEventListener('click', onDocClick);

  // Close context menu on outside click
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.note-item')) closeContextMenu();
  });

  // Always-on-top state from main
  state.alwaysOnTop = await gv('getAlwaysOnTop');
  syncAotButton();
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const gv   = (fn, ...args) => window.ghostvault[fn](...args);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const $     = (id) => document.getElementById(id);
const ts    = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

function toast(msg, type = 'info', duration = 2800) {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 220);
  }, duration);
}

// ─── THEME ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const el = document.documentElement;
  if (typeof theme === 'string') {
    const legacy = {
      'stealth':   { core: 'stealth',  personality: 'neutral' },
      'cyberpunk': { core: 'stealth',  personality: 'cyberpunk' },
      'terminal':  { core: 'oled',     personality: 'terminal' },
      'threat':    { core: 'stealth',  personality: 'threat' },
      'warrior':   { core: 'stealth',  personality: 'threat' },
      'graphite':  { core: 'graphite', personality: 'neutral' },
      'oled':      { core: 'oled',     personality: 'neutral' },
      'frost':     { core: 'frost',    personality: 'neutral' },
    };
    theme = legacy[theme] || { core: 'stealth', personality: 'neutral' };
  }
  const core        = (theme && theme.core)        || 'stealth';
  const personality = (theme && theme.personality) || 'neutral';
  el.setAttribute('data-core', core);
  el.setAttribute('data-personality', personality);
  el.removeAttribute('data-theme');
}

function _updateCombo(id, core, personality) {
  const el = document.getElementById(id);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  if (el) el.textContent = cap(core) + ' + ' + cap(personality);
}

// ─── WIZARD THEME PICKER ──────────────────────────────────────────────────────
let _wCore = 'stealth', _wPersonality = 'neutral';

function initWizardThemePicker() {
  document.querySelectorAll('#wizard-core-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _wCore = btn.dataset.core;
      document.querySelectorAll('#wizard-core-row .theme-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme({ core: _wCore, personality: _wPersonality });
      _updateCombo('wizard-theme-combo', _wCore, _wPersonality);
      state.wizardTheme = { core: _wCore, personality: _wPersonality };
    });
  });
  document.querySelectorAll('#wizard-personality-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _wPersonality = btn.dataset.personality;
      document.querySelectorAll('#wizard-personality-row .theme-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme({ core: _wCore, personality: _wPersonality });
      _updateCombo('wizard-theme-combo', _wCore, _wPersonality);
      state.wizardTheme = { core: _wCore, personality: _wPersonality };
    });
  });
}

// ─── SETTINGS THEME PICKER ────────────────────────────────────────────────────
let _sCore = 'stealth', _sPersonality = 'neutral';
let _settingsThemeInitDone = false;

function initSettingsThemePicker() {
  // Sync to current live theme from DOM (always up to date)
  _sCore        = document.documentElement.getAttribute('data-core')        || 'stealth';
  _sPersonality = document.documentElement.getAttribute('data-personality') || 'neutral';

  // Mark chips active — always run so UI reflects current state
  document.querySelectorAll('#settings-core-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.core === _sCore);
  });
  document.querySelectorAll('#settings-personality-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.personality === _sPersonality);
  });
  _updateCombo('settings-theme-combo', _sCore, _sPersonality);

  // Bind listeners only once — prevent duplicate handler accumulation
  if (_settingsThemeInitDone) return;
  _settingsThemeInitDone = true;

  document.querySelectorAll('#settings-core-row .theme-chip').forEach(b => {
    b.addEventListener('click', () => {
      _sCore = b.dataset.core;
      document.querySelectorAll('#settings-core-row .theme-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyTheme({ core: _sCore, personality: _sPersonality });
      _saveTheme();
      _updateCombo('settings-theme-combo', _sCore, _sPersonality);
    });
  });
  document.querySelectorAll('#settings-personality-row .theme-chip').forEach(b => {
    b.addEventListener('click', () => {
      _sPersonality = b.dataset.personality;
      document.querySelectorAll('#settings-personality-row .theme-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyTheme({ core: _sCore, personality: _sPersonality });
      _saveTheme();
      _updateCombo('settings-theme-combo', _sCore, _sPersonality);
    });
  });
}

function _saveTheme() {
  gv('saveConfig', { theme: { core: _sCore, personality: _sPersonality } });
}

// ─── WIZARD ───────────────────────────────────────────────────────────────────
function showWizard() {
  const w = $('setup-wizard');
  w.classList.add('active');
  setWizardStep(0);
  initWizardThemePicker();
}

function setWizardStep(n) {
  state.wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach((s, i) => {
    s.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.wdot').forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < n) d.classList.add('done');
    else if (i === n) d.classList.add('active');
  });
  $('wizard-stepnum').textContent = `${n + 1} / 3`;
}

function wizardNext() {
  if (state.wizardStep === 0) { setWizardStep(1); return; }
  if (state.wizardStep === 1) {
    if (!state.wizardVault) { toast('Please select a vault folder first', 'error'); return; }
    setWizardStep(2); return;
  }
}

function wizardBack() {
  if (state.wizardStep > 0) setWizardStep(state.wizardStep - 1);
}

async function pickVault() {
  const p = await gv('pickVaultDir');
  if (p) {
    state.wizardVault = p;
    $('vault-path-input').value = p;
    const status = $('vault-pick-status');
    status.textContent = '✓ Vault directory set — folders will be created automatically';
    status.className = 'vault-pick-status ok';
    $('wizard-next-1').disabled = false;
  }
}

// wizardPickTheme — handled by initWizardThemePicker() event listeners

async function wizardFinish() {
  const useExisting = $('wizard-existing-vault') ? $('wizard-existing-vault').checked : false;
  await gv('saveConfig', {
    vaultPath:          state.wizardVault,
    theme:              state.wizardTheme,
    useExistingStructure: useExisting,
    firstRun:           false
  });
  state.vaultPath = state.wizardVault;
  $('setup-wizard').classList.remove('active');
  await launchApp();
}

function onWizardVaultToggle(checked) {
  const autoDiv     = $('wfp-auto-folders');
  const existingDiv = $('wfp-existing-note');
  if (autoDiv)     autoDiv.style.display    = checked ? 'none'  : '';
  if (existingDiv) existingDiv.style.display = checked ? ''     : 'none';
}

// ─── LAUNCH ───────────────────────────────────────────────────────────────────
async function launchApp() {
  $('app-root').style.display = 'block';
  initNavigation();
  initSidebarThemeStrip();
  syncAiCtxButtons();
  checkOllamaStatus();
  if (state.config.alwaysOnTop) {
    state.alwaysOnTop = true;
    syncAotButton();
  }
  await refreshVault();
}

// ─── OLLAMA & AI CONTEXT ─────────────────────────────────────────────────────
function syncAiCtxButtons() {
  document.querySelectorAll('.ai-ctx-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ctx === _aiCtx);
  });
}

async function checkOllamaStatus() {
  const icon  = $('ollama-status-icon');
  const title = $('ollama-status-title');
  const sub   = $('ollama-status-sub');
  const sel   = $('ollama-model-select');
  if (!icon) return;

  title.textContent = 'Checking Ollama...';
  try {
    const res = await gv('ollamaCheck');
    if (res.running) {
      icon.textContent  = '🟢';
      title.textContent = 'Ollama running — AI formatting active';
      sub.textContent   = `${res.models.length} model${res.models.length !== 1 ? 's' : ''} available`;

      // Populate model selector
      if (sel && res.models.length) {
        sel.innerHTML = res.models.map(m =>
          `<option value="${m}"${m === _ollamaModel ? ' selected' : ''}>${m}</option>`
        ).join('');
        // If saved model not in list, pick first
        if (!res.models.includes(_ollamaModel)) {
          _ollamaModel = res.models[0];
          gv('saveConfig', { ollamaModel: _ollamaModel }).catch(() => {});
          if (sel) sel.value = _ollamaModel;
        }
      }
    } else {
      icon.textContent  = '⚡';
      title.textContent = 'Ollama offline — using local engine';
      sub.textContent   = 'Install Ollama + run: ollama pull mistral — then restart GhostVault';
    }
  } catch {
    icon.textContent  = '⚡';
    title.textContent = 'Local engine active';
    sub.textContent   = 'Ollama not detected. All 7 AI actions still work offline.';
  }
}

function setOllamaModel(model) {
  _ollamaModel = model;
  gv('saveConfig', { ollamaModel: model }).catch(() => {});
  toast(`Model set to ${model}`, 'success');
}

// ─── SIDEBAR NAVIGATION ───────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      const nav = item.dataset.nav;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
      const pane = document.getElementById('view-' + nav);
      if (pane) pane.classList.add('active');
      // Update vault view path when switching to vault pane
      if (nav === 'vault') updateVaultView();
    });
  });
}

function updateVaultView() {
  const vpEl = $('vault-view-path');
  if (vpEl && state.vaultPath) vpEl.textContent = state.vaultPath;
  const statsEl = $('vault-stats');
  if (statsEl && state.notes) {
    const folders = [...new Set(state.notes.map(n => n.folder))].filter(f => f && f !== '/');
    statsEl.innerHTML = `
      <div>${state.notes.length} notes</div>
      <div>${folders.length} folders</div>
      <div>${state.vaultPath ? state.vaultPath : '—'}</div>
    `;
  }
}

// ─── INLINE CAPTURE (view-capture pane) ───────────────────────────────────────
async function saveInlineCapture() {
  const folder = ($('inline-qc-folder') || {}).value || 'Notes';
  const title  = ($('inline-qc-title') || {}).value || '';
  const text   = ($('inline-qc-text') || {}).value || '';
  if (!text.trim()) { toast('Nothing to capture', 'warn'); return; }
  const result = await gv('saveCaptureNote', { folder, title, text });
  if (result && result.ok) {
    toast('Captured!', 'success');
    if ($('inline-qc-title')) $('inline-qc-title').value = '';
    if ($('inline-qc-text'))  $('inline-qc-text').value  = '';
    await refreshVault();
    // Emit ecosystem event
    if (window.electronAPI && window.electronAPI.ecosystemEmit) {
      window.electronAPI.ecosystemEmit('GhostVault', 'ghostvault.note.created', { title, mode: 'capture' });
    }
  } else {
    toast('Failed to save', 'error');
  }
}

// ─── TEMPLATE NAV HELPER ──────────────────────────────────────────────────────
function switchToNotesAndInsert(templateKey) {
  // Switch to notes pane
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const notesNav = document.querySelector('.nav-item[data-nav="notes"]');
  if (notesNav) notesNav.classList.add('active');
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
  const notesPane = $('view-notes');
  if (notesPane) notesPane.classList.add('active');
  // Insert template into editor
  insertTemplate(templateKey);
}

async function refreshVault() {
  if (!state.vaultPath) return;
  state.folders = await gv('listFolders', state.vaultPath);
  state.notes   = await gv('listNotes',   state.vaultPath);
  renderSidebar();
  // Sync settings vault path display
  const svp = $('settings-vault-path');
  if (svp) svp.value = state.vaultPath;
  // Update shell sidebar info
  const snc = $('sidebar-note-count');
  if (snc) snc.textContent = `${state.notes.length} note${state.notes.length !== 1 ? 's' : ''}`;
  const svpath = $('sidebar-vault-path');
  if (svpath) svpath.textContent = state.vaultPath;
  // Update inline capture folder list
  const iqcf = $('inline-qc-folder');
  if (iqcf) {
    iqcf.innerHTML = state.folders.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  }
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function renderSidebar(filter = '') {
  const tree = $('folder-tree');
  tree.innerHTML = '';

  const q = filter.toLowerCase().trim();
  const filtered = q
    ? state.notes.filter(n => n.name.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q))
    : state.notes;

  // Group by folder
  const byFolder = {};
  for (const n of filtered) {
    const f = n.folder || '/';
    if (!byFolder[f]) byFolder[f] = [];
    byFolder[f].push(n);
  }

  // Pinned section (shown at top when no filter)
  if (!q) {
    const pinned = state.notes.filter(n => state.pinnedPaths.has(n.path));
    if (pinned.length) {
      const sec = makeFolderSection('📌 Pinned', pinned, 'pinned');
      tree.appendChild(sec);
    }
  }

  // Render each folder
  const folderOrder = [...new Set([...state.folders, ...Object.keys(byFolder)])];
  for (const folder of folderOrder) {
    if (folder === 'pinned' || folder === '/') continue;
    const notes = byFolder[folder] || [];
    const sec   = makeFolderSection(folder, notes, folder);
    tree.appendChild(sec);
  }

  // Unfiled notes (root-level)
  const rootNotes = byFolder['/'] || byFolder[''] || [];
  if (rootNotes.length) {
    const sec = makeFolderSection('📄 Root', rootNotes, '/');
    tree.appendChild(sec);
  }

  // Empty state
  if (tree.children.length === 0) {
    tree.innerHTML = `<div style="padding:20px 16px;font-size:11px;color:var(--text-muted);line-height:1.7;">
      No notes yet.<br>Click <b>+ New Note</b> to get started.
    </div>`;
  }

  // Update quick-capture folder dropdown
  const qcSel = $('qc-folder');
  if (qcSel) {
    qcSel.innerHTML = state.folders.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  }
}

function makeFolderSection(label, notes, folderKey) {
  const stored  = localStorage.getItem(`folder-open-${folderKey}`);
  const isOpen  = stored === null ? true : stored === 'true';

  const sec = document.createElement('div');
  sec.className = 'folder-section';

  const hdr = document.createElement('div');
  hdr.className = `folder-header ${isOpen ? 'open' : ''}`;
  hdr.innerHTML = `
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(label)}</span>
    <span class="folder-count">${notes.length}</span>
    <span class="fh-arrow">▶</span>`;
  hdr.addEventListener('click', () => {
    hdr.classList.toggle('open');
    notesEl.classList.toggle('open');
    localStorage.setItem(`folder-open-${folderKey}`, hdr.classList.contains('open'));
  });
  hdr.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // future: folder context menu
  });

  const notesEl = document.createElement('div');
  notesEl.className = `folder-notes ${isOpen ? 'open' : ''}`;

  for (const note of notes) {
    const item = makeNoteItem(note);
    notesEl.appendChild(item);
  }

  sec.appendChild(hdr);
  sec.appendChild(notesEl);
  return sec;
}

function makeNoteItem(note) {
  const item = document.createElement('div');
  item.className = 'note-item';
  item.dataset.path = note.path;
  if (state.activeNote && state.activeNote.path === note.path) item.classList.add('active');

  const pinIcon = state.pinnedPaths.has(note.path)
    ? '<span class="note-item-pin">📌</span>' : '';

  item.innerHTML = `
    <span class="note-item-name">${esc(note.name)}</span>
    ${pinIcon}`;

  item.addEventListener('click', () => openNote(note));
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, note);
  });

  return item;
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── OPEN NOTE ────────────────────────────────────────────────────────────────
async function openNote(noteRef) {
  if (state.dirty) await autoSave();

  const content = await gv('readNote', noteRef.path);
  state.activeNote = { ...noteRef, content };

  const editor = $('editor');
  editor.value  = content;

  $('top-note-title').textContent = noteRef.name;
  $('top-note-path').textContent  = noteRef.folder ? `${noteRef.folder}/` : '';

  // Pin button state
  const btnPin = $('btn-pin');
  if (btnPin) btnPin.classList.toggle('active', state.pinnedPaths.has(noteRef.path));

  markClean();
  renderPreview(content);
  highlightActiveNote(noteRef.path);
  editor.focus();
}

function highlightActiveNote(path) {
  document.querySelectorAll('.note-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === path);
  });
}

// ─── EDITOR ───────────────────────────────────────────────────────────────────
const editor = () => $('editor');

document.addEventListener('DOMContentLoaded', () => {
  const ed = $('editor');
  if (!ed) return;

  ed.addEventListener('input', () => {
    markDirty();
    renderPreview(ed.value);
    updateEditorStats(ed.value);
    if (state.autosave) scheduleAutosave();
  });

  ed.addEventListener('keydown', (e) => {
    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ed.selectionStart, end = ed.selectionEnd;
      ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(end);
      ed.selectionStart = ed.selectionEnd = s + 2;
      markDirty();
    }
    // Enter in list → auto-continue bullet
    if (e.key === 'Enter') {
      const before = ed.value.slice(0, ed.selectionStart);
      const lastLine = before.split('\n').pop();
      const listMatch = lastLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const bullet = listMatch[2];
        const newBullet = /^\d+$/.test(bullet.replace('.',''))
          ? `${parseInt(bullet) + 1}. ` : `${bullet} `;
        const ins = `\n${indent}${newBullet}`;
        insertAtCursor(ins);
        markDirty();
        renderPreview(ed.value);
      }
    }
  });

  // Drag-and-drop images
  ed.addEventListener('dragover', (e) => { e.preventDefault(); });
  ed.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    for (const f of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const md = `\n![${f.name}](${dataUrl})\n`;
        insertAtCursor(md);
        markDirty();
        renderPreview(ed.value);
      };
      reader.readAsDataURL(f);
    }
  });
});

function insertAtCursor(text) {
  const ed = $('editor');
  const s  = ed.selectionStart;
  ed.value = ed.value.slice(0, s) + text + ed.value.slice(ed.selectionEnd);
  ed.selectionStart = ed.selectionEnd = s + text.length;
}

function markDirty() {
  state.dirty = true;
  const ef = $('ef-save');
  if (ef) { ef.textContent = 'Unsaved'; ef.className = 'ef-save dirty'; }
}

function markClean() {
  state.dirty = false;
  const ef = $('ef-save');
  if (ef) { ef.textContent = 'Saved'; ef.className = 'ef-save'; }
}

function updateEditorStats(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars  = content.length;
  const lines  = content.split('\n').length;
  const ew = $('ef-words'); if (ew) ew.textContent = `${words} words`;
  const ec = $('ef-chars'); if (ec) ec.textContent = `${chars} chars`;
  const el = $('ef-lines'); if (el) el.textContent = `${lines} lines`;
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(autoSave, 2000);
}

async function autoSave() {
  if (!state.dirty || !state.activeNote) return;
  const content = $('editor').value;
  const ok = await gv('writeNote', state.activeNote.path, content);
  if (ok) {
    state.activeNote.content = content;
    markClean();
    // Refresh note list silently
    state.notes = await gv('listNotes', state.vaultPath);
  }
}

// ─── EDITOR MODE ─────────────────────────────────────────────────────────────
function setEditorMode(mode) {
  state.editorMode = mode;
  const ep = $('editor-pane');
  const pp = $('preview-pane');

  ep.classList.remove('hidden', 'full-width');
  pp.classList.remove('hidden');

  if (mode === 'edit') {
    pp.classList.add('hidden');
    ep.classList.add('full-width');
  } else if (mode === 'preview') {
    ep.classList.add('hidden');
  }
  // split: both visible (default)

  // Pill state
  ['edit','split','preview'].forEach(m => {
    const pill = $(`pill-${m}`);
    if (pill) pill.classList.toggle('active', m === mode);
  });

  gv('saveConfig', { editorMode: mode });
}

// ─── MARKDOWN PREVIEW ────────────────────────────────────────────────────────
function renderPreview(md) {
  const container = $('preview-content');
  if (!container) return;
  container.innerHTML = parseMarkdown(md);
}

function parseMarkdown(md) {
  if (!md) return '<div class="empty-state"><div class="empty-icon">👻</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Start typing in the editor to see a live preview.</div></div>';

  let html = md;

  // Callout blocks: > [!TYPE] Title
  html = html.replace(/^> \[!(NOTE|TIP|WARNING|DANGER|INFO)\]\s*(.*)\n((?:> .*\n?)*)/gim, (_, type, title, body) => {
    const t = type.toLowerCase();
    const bodyText = body.replace(/^> ?/gm, '').trim();
    const typeMap = { note: 'callout-note', tip: 'callout-tip', warning: 'callout-warning', danger: 'callout-danger', info: 'callout-note' };
    const cls = typeMap[t] || 'callout-note';
    const icons = { note: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🔴', info: 'ℹ️' };
    return `<div class="${cls}"><div class="callout-title">${icons[t] || ''} ${escHtml(title || type)}</div><p>${escHtml(bodyText)}</p></div>`;
  });

  // Fenced code blocks (``` lang)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escHtml(code.trim());
    const langLabel = lang ? `<span class="code-lang">${escHtml(lang)}</span>` : '';
    return `<pre>${langLabel}<code>${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`);

  // Headings
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

  // Blockquotes (plain)
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');
  html = html.replace(/\_\_(.+?)\_\_/g,     '<strong>$1</strong>');
  html = html.replace(/\_(.+?)\_/g,         '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g,         '<del>$1</del>');

  // Wiki-links [[page]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, page) =>
    `<span class="wiki-link" title="Wiki link: ${escHtml(page)}">[[${escHtml(page)}]]</span>`
  );

  // Tags #tag
  html = html.replace(/(?<!\w)#([\w-]+)/g, (_, tag) =>
    `<span class="md-tag">#${escHtml(tag)}</span>`
  );

  // Tables
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n');
    if (rows.length < 2) return tableBlock;
    const isHeader = (r) => /^\|[-| :]+\|$/.test(r.trim());
    const parseRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

    let thtml = '<table>';
    let inBody = false;

    for (let i = 0; i < rows.length; i++) {
      if (isHeader(rows[i])) {
        inBody = true;
        thtml += '<tbody>';
        continue;
      }
      const cells = parseRow(rows[i]);
      if (i === 0) {
        thtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
      } else {
        thtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
    }

    if (inBody) thtml += '</tbody>';
    thtml += '</table>';
    return thtml;
  });

  // Checkboxes
  html = html.replace(/^(\s*)- \[x\] (.+)$/gim, '$1<div class="md-check done">☑ $2</div>');
  html = html.replace(/^(\s*)- \[ \] (.+)$/gim, '$1<div class="md-check">☐ $2</div>');

  // Unordered lists (simple)
  html = html.replace(/^(\s*)[-*+] (.+)$/gm, (_, indent, item) => {
    const level = Math.floor(indent.length / 2);
    return `<li style="margin-left:${level * 16}px">${item}</li>`;
  });
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, (block) => `<ul>${block}</ul>`);

  // Ordered lists
  html = html.replace(/^(\s*)\d+\. (.+)$/gm, (_, indent, item) => {
    const level = Math.floor(indent.length / 2);
    return `<li style="margin-left:${level * 16}px">${item}</li>`;
  });

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0;">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" onclick="event.preventDefault();window.ghostvault.openExternal(\'$2\')">$1</a>');

  // Auto-detect IPs
  html = html.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)\b/g,
    '<code class="ip-addr" title="IP Address">$1</code>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<(?:h[1-6]|pre|ul|ol|table|blockquote|div|hr)[^>]*>)/g, '$1');
  html = html.replace(/(<\/(?:h[1-6]|pre|ul|ol|table|blockquote|div|hr)>)<\/p>/g, '$1');

  return html;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── NOTE MANAGEMENT ─────────────────────────────────────────────────────────
function promptNewNote() {
  // Populate folder selector
  const sel = $('nn-folder');
  sel.innerHTML = state.folders.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  $('nn-title').value = '';

  const modal = $('new-note-modal');
  modal.className = 'overlay-visible';
  setTimeout(() => $('nn-title').focus(), 100);
}

function closeNewNoteModal() {
  $('new-note-modal').className = 'overlay-hidden';
}

async function createNewNote() {
  const folder = $('nn-folder').value;
  const title  = $('nn-title').value.trim() || 'Untitled';
  closeNewNoteModal();

  const result = await gv('newNote', state.vaultPath, folder, title);
  if (!result) { toast('Failed to create note', 'error'); return; }

  await refreshVault();
  // Find and open the new note
  const found = state.notes.find(n => n.path === result.path);
  if (found) openNote(found);
  else toast(`Created: ${title}`, 'success');
}

function promptNewFolder() {
  $('nf-name').value = '';
  $('new-folder-modal').className = 'overlay-visible';
  setTimeout(() => $('nf-name').focus(), 100);
}

function closeNewFolderModal() {
  $('new-folder-modal').className = 'overlay-hidden';
}

async function createFolder() {
  const name = $('nf-name').value.trim();
  if (!name) return;
  closeNewFolderModal();
  await gv('createFolder', state.vaultPath, name);
  await refreshVault();
  toast(`Folder created: ${name}`, 'success');
}

async function saveCurrentNote() {
  if (!state.activeNote) return;
  const content   = $('editor').value;
  const noteTitle = state.activeNote.name;
  await gv('writeNote', state.activeNote.path, content);
  state.activeNote.content = content;
  markClean();
  toast('Saved', 'success', 1500);
  if (window.electronAPI && window.electronAPI.ecosystemEmit) {
    window.electronAPI.ecosystemEmit('GhostVault', 'ghostvault.note.created', { title: noteTitle, mode: 'editor' });
  }
}

async function deleteNote(note) {
  if (!confirm(`Delete "${note.name}"? This cannot be undone.`)) return;
  await gv('deleteNote', note.path);
  if (state.activeNote && state.activeNote.path === note.path) {
    state.activeNote = null;
    $('editor').value = '';
    $('preview-content').innerHTML = '';
    $('top-note-title').textContent = 'GhostVault';
    $('top-note-path').textContent  = '';
    markClean();
  }
  state.pinnedPaths.delete(note.path);
  savePins();
  await refreshVault();
  toast(`Deleted: ${note.name}`, 'warn');
}

async function renameNote(note) {
  const newName = prompt('Rename note:', note.name);
  if (!newName || newName === note.name) return;
  const safeName = newName.replace(/[/\\?%*:|"<>]/g, '-');
  const newPath  = note.path.replace(note.filename, `${safeName}.md`);
  const ok = await gv('renameNote', note.path, newPath);
  if (ok) {
    if (state.activeNote && state.activeNote.path === note.path) {
      state.activeNote.path = newPath;
      state.activeNote.name = safeName;
      $('top-note-title').textContent = safeName;
    }
    await refreshVault();
    toast(`Renamed to: ${safeName}`, 'success');
  } else {
    toast('Rename failed', 'error');
  }
}

function togglePin() {
  if (!state.activeNote) return;
  const path = state.activeNote.path;
  if (state.pinnedPaths.has(path)) {
    state.pinnedPaths.delete(path);
    toast('Unpinned', 'info', 1400);
  } else {
    state.pinnedPaths.add(path);
    toast('📌 Pinned', 'success', 1400);
  }
  savePins();
  $('btn-pin').classList.toggle('active', state.pinnedPaths.has(path));
  renderSidebar(state.searchQuery);
}

function savePins() {
  gv('saveConfig', { pins: JSON.stringify([...state.pinnedPaths]) });
}

function revealVault() {
  if (state.vaultPath) gv('revealInFinder', state.vaultPath);
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
function insertTemplate(key) {
  closeMenu('template-menu');
  if (!TEMPLATES || !TEMPLATES[key]) return;
  const content = TEMPLATES[key](ts());
  const ed = $('editor');
  if (state.activeNote) {
    // Append to current note
    ed.value += '\n\n' + content;
  } else {
    // Prompt to create new note with template
    ed.value = content;
  }
  markDirty();
  renderPreview(ed.value);
  updateEditorStats(ed.value);
  if (state.autosave) scheduleAutosave();
}

// ─── TIMESTAMP ───────────────────────────────────────────────────────────────
function insertTimestamp() {
  insertAtCursor(`\`${ts()}\``);
  markDirty();
  renderPreview($('editor').value);
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const si = $('search-input');
  if (!si) return;
  si.addEventListener('input', () => {
    state.searchQuery = si.value;
    renderSidebar(si.value);
  });
});

// ─── AI ACTIONS ──────────────────────────────────────────────────────────────
function toggleAiMenu()       { toggleMenu('ai-menu'); }
function toggleTemplateMenu() { toggleMenu('template-menu'); }

function toggleMenu(id) {
  const menu = $(id);
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  // Close all menus
  document.querySelectorAll('.ai-menu').forEach(m => m.classList.remove('open'));
  if (!wasOpen) menu.classList.add('open');
}

function closeMenu(id) {
  const m = $(id);
  if (m) m.classList.remove('open');
}

// Current AI context mode — persisted in config
let _aiCtx   = 'work'; // 'work' | 'cyber' | 'personal'
let _ollamaModel = 'mistral';

function setAiCtx(ctx) {
  _aiCtx = ctx;
  gv('saveConfig', { aiCtx: ctx }).catch(() => {});
  syncAiCtxButtons();
  toast(`AI context: ${ctx.charAt(0).toUpperCase() + ctx.slice(1)}`, 'success');
}

async function runAi(mode) {
  closeMenu('ai-menu');
  const text = $('editor').value.trim();
  if (!text) { toast('Nothing to process — editor is empty', 'warn'); return; }

  const labels = {
    format:    'Formatting note...',
    terminal:  'Structuring raw input...',
    summarize: 'Summarizing...',
    iocs:      'Extracting key details...',
    todos:     'Generating TODOs...',
    cleanup:   'Cleaning up note...',
    report:    'Building report...'
  };

  const overlay   = $('ai-overlay');
  const procTitle = $('ai-proc-title');
  const procSub   = $('ai-proc-sub');
  overlay.className     = 'overlay-visible';
  procTitle.textContent = labels[mode] || 'Processing...';

  let result;

  // Try Ollama first for format/summarize/report — these benefit most from real AI
  const ollamaEligible = ['format', 'summarize', 'report'].includes(mode);
  if (ollamaEligible && state.config.ollamaEnabled !== false) {
    try {
      procSub.textContent = `Ollama · ${_ollamaModel} · local`;
      const res = await gv('ollamaFormat', {
        text, mode, ctx: _aiCtx, model: _ollamaModel
      });
      if (res.result) {
        result = { result: res.result, source: 'ollama' };
      } else if (res.error === 'ollama_not_running') {
        procSub.textContent = 'Ollama offline — using local engine';
        await sleep(600);
      }
      // other errors fall through to local
    } catch (_) {}
  }

  // Fall back to local engine
  if (!result) {
    procSub.textContent = 'Local engine · offline · instant';
    await sleep(30);
    const local = LocalAI.process(mode, text, _aiCtx);
    result = local;
  }

  overlay.className = 'overlay-hidden';

  if (result.error) {
    toast(`Error: ${result.error}`, 'error', 5000);
    return;
  }

  const ed = $('editor');
  ed.value = result.result;
  markDirty();
  renderPreview(ed.value);
  updateEditorStats(ed.value);
  if (state.autosave) scheduleAutosave();
  const src = result.source === 'ollama' ? '✨ Formatted with Ollama' : '✨ Done';
  toast(src, 'success');
}

// ─── ALWAYS ON TOP ───────────────────────────────────────────────────────────
async function toggleAlwaysOnTop(forcedValue) {
  const newVal = typeof forcedValue === 'boolean' ? forcedValue : !state.alwaysOnTop;
  state.alwaysOnTop = newVal;
  await gv('setAlwaysOnTop', newVal);
  syncAotButton();
  // Sync settings checkbox
  const cb = $('settings-aot');
  if (cb) cb.checked = newVal;
  toast(newVal ? '📌 Always on Top: ON' : 'Always on Top: OFF', 'info', 1800);
}

function syncAotButton() {
  const btn = $('btn-aot');
  if (btn) btn.classList.toggle('active', state.alwaysOnTop);
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function openSettings() {
  // Navigate to settings view pane
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const settingsNav = document.querySelector('.nav-item[data-nav="settings"]');
  if (settingsNav) settingsNav.classList.add('active');
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
  const settingsPane = $('view-settings');
  if (settingsPane) settingsPane.classList.add('active');
  // Populate
  const vp = $('settings-vault-path');
  if (vp) vp.value = state.vaultPath || '';
  const aotCb = $('settings-aot');
  if (aotCb) aotCb.checked = state.alwaysOnTop;
  const asCb = $('settings-autosave');
  if (asCb) asCb.checked = state.autosave;
  // Sync theme picker chips to current live theme
  initSettingsThemePicker();
}

function closeSettings() {
  // Navigate back to notes pane
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const notesNav = document.querySelector('.nav-item[data-nav="notes"]');
  if (notesNav) notesNav.classList.add('active');
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
  const notesPane = $('view-notes');
  if (notesPane) notesPane.classList.add('active');
}

async function changeVault() {
  const p = await gv('pickVaultDir');
  if (p) {
    state.vaultPath = p;
    const vp = $('settings-vault-path');
    if (vp) vp.value = p;
    await refreshVault();
    toast('Vault changed', 'success');
  }
}

// saveSettingsApiKey removed — AI is fully local, no key needed

function setAutosave(val) {
  state.autosave = val;
  gv('saveConfig', { autosave: val });
}

function setUseExistingVault(val) {
  gv('saveConfig', { useExistingStructure: val });
  toast(val ? 'Vault structure: using existing folders' : 'Vault structure: auto-create folders', 'info', 2200);
}

// ─── QUICK CAPTURE ───────────────────────────────────────────────────────────
function openQuickCapture() {
  // Populate folders
  const sel = $('qc-folder');
  if (sel) sel.innerHTML = state.folders.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  $('qc-text').value = '';
  $('quick-capture-overlay').className = 'overlay-visible';
  setTimeout(() => $('qc-text').focus(), 100);
}

function closeQuickCapture() {
  $('quick-capture-overlay').className = 'overlay-hidden';
}

async function saveQuickCapture() {
  const folder  = $('qc-folder').value || 'Notes';
  const rawTitle = $('qc-title').value.trim();
  const text    = $('qc-text').value.trim();
  if (!text) { toast('Nothing to capture', 'warn'); return; }

  const title   = rawTitle || `Quick Note ${ts()}`;
  const content = `# ${title}\n\n*Captured: ${ts()}*\n\n---\n\n${text}\n`;

  const result = await gv('newNote', state.vaultPath, folder, title);
  if (result) {
    await gv('writeNote', result.path, content);
    closeQuickCapture();
    await refreshVault();
    const found = state.notes.find(n => n.path === result.path);
    if (found) openNote(found);
    toast('⚡ Captured!', 'success');
  }
}

// ─── CONTEXT MENU ────────────────────────────────────────────────────────────
function showContextMenu(x, y, note) {
  state.contextTarget = note;
  const menu = $('context-menu');
  menu.style.left = `${Math.min(x, window.innerWidth - 170)}px`;
  menu.style.top  = `${Math.min(y, window.innerHeight - 150)}px`;
  menu.classList.add('open');

  $('ctx-open').onclick   = () => { openNote(note);   closeContextMenu(); };
  $('ctx-rename').onclick = () => { renameNote(note); closeContextMenu(); };
  $('ctx-delete').onclick = () => { deleteNote(note); closeContextMenu(); };
  $('ctx-pin').onclick    = () => {
    if (state.pinnedPaths.has(note.path)) {
      state.pinnedPaths.delete(note.path);
      toast('Unpinned', 'info', 1400);
    } else {
      state.pinnedPaths.add(note.path);
      toast('📌 Pinned', 'success', 1400);
    }
    savePins();
    if (state.activeNote && state.activeNote.path === note.path) {
      $('btn-pin').classList.toggle('active', state.pinnedPaths.has(note.path));
    }
    renderSidebar(state.searchQuery);
    closeContextMenu();
  };
}

function closeContextMenu() {
  $('context-menu').classList.remove('open');
  state.contextTarget = null;
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
function onKeyDown(e) {
  const cmd = e.metaKey || e.ctrlKey;
  if (!cmd) return;

  // ⌘S — Save
  if (e.key === 's' && !e.shiftKey) {
    e.preventDefault();
    saveCurrentNote();
    return;
  }

  // ⌘N — Toggle floating capture window
  if (e.key === 'n' && !e.shiftKey) {
    e.preventDefault();
    gv('toggleCapture');
    return;
  }

  // ⌘/ — Toggle sidebar
  if (e.key === '/') {
    e.preventDefault();
    $('sidebar').classList.toggle('collapsed');
    return;
  }

  // ⌘P — Toggle preview mode
  if (e.key === 'p' && !e.shiftKey) {
    e.preventDefault();
    const modes = ['edit','split','preview'];
    const cur   = modes.indexOf(state.editorMode);
    setEditorMode(modes[(cur + 1) % modes.length]);
    return;
  }

  // ⌘⇧F — AI Format
  if (e.key === 'f' && e.shiftKey) {
    e.preventDefault();
    runAi('format');
    return;
  }

  // ⌘T — Insert timestamp
  if (e.key === 't' && !e.shiftKey) {
    e.preventDefault();
    if (document.activeElement === $('editor')) insertTimestamp();
    return;
  }

  // Escape — close modals
  if (e.key === 'Escape') {
    closeMenu('ai-menu');
    closeMenu('template-menu');
    closeContextMenu();
    closeQuickCapture();
    closeSettings();
    closeNewNoteModal();
    closeNewFolderModal();
  }
}

// ─── DOCUMENT CLICK (close menus) ────────────────────────────────────────────
function onDocClick(e) {
  if (!e.target.closest('.ai-dropdown-wrap')) {
    document.querySelectorAll('.ai-menu').forEach(m => m.classList.remove('open'));
  }
  if (!e.target.closest('.ctx-menu') && !e.target.closest('.note-item')) {
    closeContextMenu();
  }
  if (!e.target.closest('.settings-card') && !e.target.closest('.sb-bottom-btn')) {
    // Don't auto-close settings on any click — only explicit close
  }
}

// ─── RESTORE EDITOR MODE FROM CONFIG ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = state.config.editorMode || 'split';
  // Will be applied after config loads in boot, but default to split on DOM ready
  setEditorMode(saved);
});

// ─── ENTER KEY IN MODALS ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const nnTitle = $('nn-title');
  if (nnTitle) nnTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter') createNewNote(); });
  const nfName = $('nf-name');
  if (nfName) nfName.addEventListener('keydown', (e) => { if (e.key === 'Enter') createFolder(); });
  const qcTitle = $('qc-title');
  if (qcTitle) qcTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('qc-text').focus(); });
});

// ─── WINDOW BEFOREUNLOAD ─────────────────────────────────────────────────────
window.addEventListener('beforeunload', async (e) => {
  if (state.dirty && state.activeNote) {
    await autoSave();
  }
});

// ─── SIDEBAR THEME STRIP ──────────────────────────────────────────────────────
function initSidebarThemeStrip() {
  function syncStrip() {
    const core        = document.documentElement.getAttribute('data-core')        || 'stealth';
    const personality = document.documentElement.getAttribute('data-personality') || 'neutral';
    document.querySelectorAll('.sts-chip[data-core]').forEach(c =>
      c.classList.toggle('active', c.dataset.core === core));
    document.querySelectorAll('.sts-chip[data-personality]').forEach(c =>
      c.classList.toggle('active', c.dataset.personality === personality));
  }

  document.querySelectorAll('.sts-chip[data-core]').forEach(chip => {
    chip.addEventListener('click', async () => {
      const personality = document.documentElement.getAttribute('data-personality') || 'neutral';
      const next = { core: chip.dataset.core, personality };
      applyTheme(next);
      state.config.theme = next;
      syncStrip();
      try { await gv('saveConfig', { theme: next }); } catch (_) {}
    });
  });

  document.querySelectorAll('.sts-chip[data-personality]').forEach(chip => {
    chip.addEventListener('click', async () => {
      const core = document.documentElement.getAttribute('data-core') || 'stealth';
      const next = { core, personality: chip.dataset.personality };
      applyTheme(next);
      state.config.theme = next;
      syncStrip();
      try { await gv('saveConfig', { theme: next }); } catch (_) {}
    });
  });

  syncStrip();
}
