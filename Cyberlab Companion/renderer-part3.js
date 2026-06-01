// =============================================================================
// RENDERER PART 3 — COMMAND BUILDER, SHELLS, ENCODER, CHEATSHEETS, NOTES,
//                   SNIPPET MANAGER, LAB MODAL, PROGRESS SCREEN,
//                   TRACKER SCREEN, SETTINGS SCREEN, IPC, INIT
// Combine with renderer-part1.js + renderer-part2.js
// =============================================================================

'use strict';

// =============================================================================
// SECTION 3A — COMMAND BUILDER PANEL
// =============================================================================

function wireCommandBuilderPanel() {
  // HTML uses <select> dropdowns — wire them accordingly
  const catSel    = $('#tool-category-select');
  const toolSel   = $('#tool-select');
  const descEl    = $('#tool-description');
  const installEl = $('#tool-install');
  const paramsEl  = $('#tool-params');
  const outputEl  = $('#builder-output');
  const outputWrap= $('#builder-output-wrap');
  const copyBtn   = $('#copy-builder-cmd');

  if (!catSel) return;

  // Populate category <select>
  catSel.innerHTML = '<option value="">Select category...</option>' +
    TOOL_CATEGORIES.map(cat =>
      `<option value="${escHtml(cat.id)}">${escHtml(cat.label)}</option>`
    ).join('');

  // Category → populate tool <select>
  function populateTools(catId) {
    if (!toolSel) return;
    const tools = catId ? TOOLS.filter(t => t.category === catId) : [];
    toolSel.innerHTML = '<option value="">Select tool...</option>' +
      tools.map(t => `<option value="${escHtml(t.id)}">${escHtml(t.label)}</option>`).join('');
    if (paramsEl) paramsEl.innerHTML = '';
    if (outputWrap) outputWrap.style.display = 'none';
    if (descEl) descEl.textContent = '';
    if (installEl) installEl.textContent = '';
  }

  catSel.addEventListener('change', () => populateTools(catSel.value));

  // Tool → render params
  if (toolSel) {
    toolSel.addEventListener('change', () => {
      const tool = TOOLS.find(t => t.id === toolSel.value);
      if (!tool) { if (paramsEl) paramsEl.innerHTML = ''; return; }
      if (descEl) descEl.textContent = tool.description || '';
      if (installEl) installEl.textContent = tool.install ? `Install: ${tool.install}` : '';
      renderToolParams(tool);
    });
  }

  function renderParamField(p) {
    const label = `<label class="param-label" for="param-${escHtml(p.id)}">${escHtml(p.label)}${p.required ? ' *' : ''}</label>`;
    let input = '';
    if (p.type === 'select') {
      input = `<select class="tool-select param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}">
        ${(p.options || []).map(o => `<option value="${escHtml(o.value || o)}">${escHtml(o.label || o)}</option>`).join('')}
      </select>`;
    } else if (p.type === 'checkbox') {
      input = `<input type="checkbox" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" ${p.default ? 'checked' : ''}>`;
    } else if (p.type === 'textarea') {
      input = `<textarea class="param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder || '')}" rows="3"></textarea>`;
    } else {
      input = `<input type="text" class="param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder || p.default || '')}" value="${escHtml(p.default || '')}">`;
    }
    return `<div class="param-field" style="margin-bottom:6px">${label}${input}${p.hint ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${escHtml(p.hint)}</div>` : ''}</div>`;
  }

  function renderToolParams(tool) {
    if (!paramsEl) return;
    paramsEl.innerHTML = (tool.params || []).map(p => renderParamField(p)).join('') +
      `<button class="btn primary" id="cmd-build-btn" style="width:100%;margin-top:8px">⚡ Build Command</button>`;

    // Pre-fill target IP
    const activeTab = getActiveTab();
    if (activeTab?.session?.targetIp) {
      const ipInput = paramsEl.querySelector('[data-param="ip"],[data-param="target"],[data-param="host"]');
      if (ipInput) ipInput.value = activeTab.session.targetIp;
    }

    const buildBtn = paramsEl.querySelector('#cmd-build-btn');
    if (buildBtn) {
      buildBtn.addEventListener('click', () => {
        const vals = {};
        paramsEl.querySelectorAll('[data-param]').forEach(el => {
          vals[el.dataset.param] = el.type === 'checkbox' ? el.checked : el.value;
        });
        const cmd = tool.buildCommand ? tool.buildCommand(vals) : (tool.cmd || '');
        if (outputEl) {
          outputEl.textContent = cmd;
          if (typeof hljs !== 'undefined') hljs.highlightElement(outputEl);
        }
        if (outputWrap) outputWrap.style.display = '';
        if (copyBtn) copyBtn.dataset.cmd = cmd;
        if (AppState.config.soundEnabled) Sounds.click();
      });
    }
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cmd = copyBtn.dataset.cmd || outputEl?.textContent || '';
      copyToClipboard(cmd, copyBtn);
    });
  }

  // Click output to copy
  if (outputEl) {
    outputEl.addEventListener('click', () => {
      if (outputEl.textContent) copyToClipboard(outputEl.textContent);
    });
  }
}

// =============================================================================
// SECTION 3B — REVERSE SHELL PANEL
// =============================================================================

function wireRevshellPanel() {
  const langSel = $('#revshell-lang');
  const ipInput = $('#revshell-ip');
  const portInput = $('#revshell-port');
  const encSel = $('#revshell-encoding');
  const generateBtn = $('#generate-revshell-btn');
  const outputEl = $('#revshell-payload-out');
  const copyBtn = $('#copy-revshell-payload');

  if (!langSel) return;

  // Populate language list
  langSel.innerHTML = SHELL_LANGUAGES.map(lang => `
    <option value="${escHtml(lang.id)}">${escHtml(lang.label)}</option>
  `).join('');

  // Pre-fill IP from session
  if (ipInput) {
    const tab = getActiveTab();
    if (tab?.session?.targetIp && !ipInput.value) {
      // Use a common tun0 placeholder
      ipInput.placeholder = tab.session.targetIp || '10.10.14.1';
    }
  }

  function generate() {
    const lang = langSel.value;
    const ip = ipInput?.value?.trim() || '10.10.14.1';
    const port = portInput?.value?.trim() || '4444';
    const encode = encSel?.value || 'raw';

    if (!ip) { showToast('Enter your IP address', 'warning'); return; }
    if (!port) { showToast('Enter a port', 'warning'); return; }

    const shell = generateShell(lang, ip, port);
    const encoded = encodeShell(shell, encode);
    const listener = `nc -lvnp ${port}`;
    const stable = `python3 -c 'import pty;pty.spawn("/bin/bash")'\nexport TERM=xterm\n# Ctrl+Z, then: stty raw -echo; fg`;

    // Populate all three output blocks
    const payloadEl  = $('#revshell-payload-out');
    const listenerEl = $('#revshell-listener-out');
    const stableEl   = $('#revshell-stable-out');
    const outputsEl  = $('#revshell-outputs');
    const labelEl    = $('#revshell-lang-label');

    if (payloadEl)  { payloadEl.textContent  = encoded;  if (typeof hljs !== 'undefined') hljs.highlightElement(payloadEl); }
    if (listenerEl) { listenerEl.textContent = listener; if (typeof hljs !== 'undefined') hljs.highlightElement(listenerEl); }
    if (stableEl)   { stableEl.textContent   = stable;   if (typeof hljs !== 'undefined') hljs.highlightElement(stableEl); }
    if (outputsEl)  { outputsEl.style.display = ''; }
    if (labelEl)    { labelEl.textContent = lang; }
    if (copyBtn)    { copyBtn.dataset.shell = encoded; }

    // Wire stable copy button
    const stableCopy = $('#copy-revshell-stable');
    if (stableCopy && !stableCopy._wired) {
      stableCopy.addEventListener('click', () => copyToClipboard(stable));
      stableCopy._wired = true;
    }
  }

  if (generateBtn) generateBtn.addEventListener('click', generate);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const shell = copyBtn.dataset.shell || outputEl?.textContent || '';
      copyToClipboard(shell, copyBtn);
    });
  }

  // Send to chat
  const chatBtn = $('#revshell-note');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      const shell = chatBtn.dataset.shell || outputEl?.textContent || '';
      if (shell) sendChatMessage(`Here is my reverse shell payload:\n\`\`\`bash\n${shell}\n\`\`\`\nHow should I set up my listener and deliver this?`);
    });
  }

  // NC listener button
  const listenerBtn = $('#copy-revshell-listener');
  if (listenerBtn) {
    listenerBtn.addEventListener('click', () => {
      const port = portInput?.value?.trim() || '4444';
      const cmd = `nc -lvnp ${port}`;
      if (outputEl) outputEl.textContent = cmd;
      if (copyBtn) copyBtn.dataset.shell = cmd;
      copyToClipboard(cmd);
      showToast('Listener command copied!', 'success', 1500);
    });
  }

  // Auto-generate on change
  [langSel, encSel].forEach(el => el?.addEventListener('change', generate));
}

// =============================================================================
// SECTION 3C — ENCODER PANEL
// =============================================================================

function wireEncoderPanel() {
  const inputEl = $('#encode-input');
  const outputEl = $('#encode-output');
  const opSel = $('#encode-operation');
  const runBtn = $('#encode-run-btn');
  const copyBtn = $('#copy-encode-output');
  const swapBtn = $('#encode-swap-btn');
  const clearBtn = $('#enc-clear-placeholder');

  // Chain mode selects
  const chain1 = $('#chain-op-1');
  const chain2 = $('#chain-op-2');
  const chain3 = $('#chain-op-3');
  const chainRunBtn = $('#chain-run-btn');

  const ENCODER_OPS = [
    { id: '', label: '— Select Operation —' },
    { id: 'b64-encode', label: 'Base64 Encode' },
    { id: 'b64-decode', label: 'Base64 Decode' },
    { id: 'url-encode', label: 'URL Encode' },
    { id: 'url-decode', label: 'URL Decode' },
    { id: 'html-encode', label: 'HTML Encode' },
    { id: 'html-decode', label: 'HTML Decode' },
    { id: 'hex-encode', label: 'Hex Encode' },
    { id: 'hex-decode', label: 'Hex Decode' },
    { id: 'rot13', label: 'ROT13' },
    { id: 'binary-encode', label: 'Text → Binary' },
    { id: 'binary-decode', label: 'Binary → Text' },
    { id: 'decimal-to-hex', label: 'Decimal → Hex' },
    { id: 'hex-to-decimal', label: 'Hex → Decimal' },
    { id: 'md5', label: 'MD5 Hash' },
    { id: 'sha1', label: 'SHA1 Hash' },
    { id: 'sha256', label: 'SHA256 Hash' },
    { id: 'jwt-decode', label: 'JWT Decode' },
  ];

  const optionsHtml = ENCODER_OPS.map(o => `<option value="${o.id}">${escHtml(o.label)}</option>`).join('');

  if (opSel) opSel.innerHTML = optionsHtml;
  [chain1, chain2, chain3].forEach(sel => { if (sel) sel.innerHTML = optionsHtml; });

  async function runEncoder() {
    const input = inputEl?.value || '';
    const op = opSel?.value;
    if (!op) { showToast('Select an operation', 'warning'); return; }
    if (!input && op !== 'jwt-decode') { showToast('Enter input text', 'warning'); return; }
    try {
      const result = await applyEncoderOp(op, input);
      if (outputEl) outputEl.value = result;
      if (copyBtn) copyBtn.dataset.result = result;
    } catch (e) {
      if (outputEl) outputEl.value = `Error: ${e.message}`;
    }
  }

  if (runBtn) runBtn.addEventListener('click', runEncoder);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const result = copyBtn.dataset.result || outputEl?.value || '';
      copyToClipboard(result, copyBtn);
    });
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      if (!inputEl || !outputEl) return;
      const tmp = inputEl.value;
      inputEl.value = outputEl.value;
      outputEl.value = tmp;
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (inputEl) inputEl.value = '';
      if (outputEl) outputEl.value = '';
    });
  }

  // Chain mode
  if (chainRunBtn) {
    chainRunBtn.addEventListener('click', async () => {
      const input = inputEl?.value || '';
      const ops = [chain1?.value, chain2?.value, chain3?.value].filter(Boolean);
      if (ops.length === 0) { showToast('Select at least one chain operation', 'warning'); return; }
      try {
        const { final, steps } = await applyEncoderChain(ops, input);
        if (outputEl) {
          outputEl.value = final || '';
        }
        // Show steps
        const stepsEl = $('#chain-mode-panel');
        if (stepsEl) {
          stepsEl.innerHTML = steps.map((s, i) => `
            <div class="chain-step ${s.error ? 'chain-step-err' : ''}">
              <span class="chain-step-num">${i + 1}</span>
              <span class="chain-step-op">${escHtml(s.op)}</span>
              ${s.error ? `<span class="chain-step-err-msg">Error: ${escHtml(s.error)}</span>` : `<span class="chain-step-result">${escHtml((s.result || '').slice(0, 60))}${(s.result || '').length > 60 ? '…' : ''}</span>`}
            </div>
          `).join('');
        }
      } catch (e) {
        if (outputEl) outputEl.value = `Chain error: ${e.message}`;
      }
    });
  }

  // Quick action buttons (common patterns)
  const quickBtns = $$('.enc-quick-btn');
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (opSel) opSel.value = btn.dataset.op || '';
      runEncoder();
    });
  });
}

// Helper to delegate to inlined applyEncoderOp
async function applyEncoderChain(ops, input) {
  let result = input;
  const steps = [];
  for (const op of ops) {
    try {
      result = await applyEncoderOp(op, result);
      steps.push({ op, result, error: null });
    } catch (e) {
      steps.push({ op, result: null, error: e.message });
      break;
    }
  }
  return { final: result, steps };
}

// =============================================================================
// SECTION 3D — CHEATSHEET PANEL
// =============================================================================

function wireCheatsheetPanel() {
  const topicSel = $('#cheatsheet-select');
  const container = $('#cheatsheet-content');
  const searchInput = $('#cheatsheet-search-placeholder');
  const portLookupInput = $('#port-lookup-input');
  const portLookupResult = $('#port-lookup-result');

  if (!topicSel) return;

  const topics = Object.keys(CHEATSHEETS);
  topicSel.innerHTML = topics.map(t => `<option value="${t}">${escHtml(CHEATSHEETS[t].title || t)}</option>`).join('');

  function renderCheatsheet(topic, query) {
    if (!container) return;
    const sheet = CHEATSHEETS[topic];
    if (!sheet) { container.innerHTML = '<div class="cs-empty">Select a topic</div>'; return; }

    const q = (query || '').toLowerCase();

    let html = `<div class="cs-title">${escHtml(sheet.title)}</div>`;

    (sheet.sections || []).forEach(section => {
      const sectionHeading = section.heading || section.title || '';
      const sectionMatches = !q || sectionHeading.toLowerCase().includes(q);
      const filteredItems = (section.items || []).filter(item => {
        const itemKey = item.flag || item.cmd || '';
        return !q || sectionMatches || itemKey.toLowerCase().includes(q) || (item.desc || '').toLowerCase().includes(q);
      });
      if (filteredItems.length === 0 && !sectionMatches) return;

      html += `<div class="cs-section">
        <div class="cs-section-title">${escHtml(sectionHeading)}</div>
        ${filteredItems.map(item => {
          const itemKey = item.flag || item.cmd || '';
          return `
          <div class="cs-item">
            <div class="cs-item-cmd">
              <code>${escHtml(itemKey)}</code>
              <button class="cs-copy-btn" data-cmd="${escHtml(itemKey)}" title="Copy">⧉</button>
              <button class="cs-chat-btn" data-cmd="${escHtml(itemKey)}" title="Discuss in chat">💬</button>
            </div>
            ${item.desc ? `<div class="cs-item-desc">${escHtml(item.desc)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.cs-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd, btn));
    });
    container.querySelectorAll('.cs-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sendChatMessage(`Explain this command and when I should use it:\n\`\`\`bash\n${btn.dataset.cmd}\n\`\`\``);
      });
    });
  }

  topicSel.addEventListener('change', () => renderCheatsheet(topicSel.value, searchInput?.value));
  if (searchInput) searchInput.addEventListener('input', () => renderCheatsheet(topicSel.value, searchInput.value));

  // Port lookup
  if (portLookupInput) {
    portLookupInput.addEventListener('input', () => {
      const port = portLookupInput.value.trim();
      if (!portLookupResult) return;
      if (!port) { portLookupResult.textContent = ''; return; }
      const service = PORT_SERVICES[port] || 'Unknown service';
      portLookupResult.innerHTML = `<strong>Port ${escHtml(port)}:</strong> ${escHtml(service)}`;
    });
  }

  // Render first topic
  if (topics.length > 0) renderCheatsheet(topics[0]);
}

// =============================================================================
// SECTION 3E — NOTES PANEL
// =============================================================================

function wireNotesPanel() {
  const notesArea = $('#session-notes-area');
  const saveNoteBtn = $('#save-notes-btn');

  if (!notesArea) return;

  // Load notes from active tab's session
  const tab = getActiveTab();
  if (tab?.session?.notes) notesArea.value = tab.session.notes;

  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      if (!tab?.session) return;
      tab.session.notes = notesArea.value;
      await autoSaveTab(tab);
      showToast('Notes saved', 'success', 1500);
    });
  }

  // Auto-save notes on blur
  notesArea.addEventListener('blur', () => {
    const tab = getActiveTab();
    if (tab?.session) {
      tab.session.notes = notesArea.value;
    }
  });

  // When tab switches, update notes
  document.addEventListener('tabSwitched', () => {
    const tab = getActiveTab();
    if (notesArea && tab?.session) notesArea.value = tab.session.notes || '';
  });
}

// =============================================================================
// SECTION 3F — SNIPPET MANAGER
// =============================================================================

function wireSnippetModal() {
  const modal = $('#snippet-modal');
  if (!modal) return;

  const titleInput = modal.querySelector('#snippet-name');
  const contentInput = modal.querySelector('#snippet-command');
  const tagsInput = modal.querySelector('#snippet-tags');
  const saveBtn = modal.querySelector('#save-snippet-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = (titleInput?.value || '').trim();
      const content = (contentInput?.value || '').trim();
      if (!title || !content) { showToast('Title and content required', 'warning'); return; }
      const tags = (tagsInput?.value || '').split(',').map(t => t.trim()).filter(Boolean);

      const editId = modal.dataset.editId;
      if (editId) {
        const idx = AppState.snippetsData.findIndex(s => s.id === editId);
        if (idx !== -1) {
          AppState.snippetsData[idx] = { ...AppState.snippetsData[idx], title, content, tags, updatedAt: Date.now() };
        }
        delete modal.dataset.editId;
      } else {
        AppState.snippetsData.push({ id: generateId(), title, content, tags, createdAt: Date.now() });
      }

      saveSnippetsData();
      renderSnippetsScreen();
      hideModal('snippet-modal');
      showToast('Snippet saved', 'success', 1500);
    });
  }
}

function openSnippetEditModal(snippet) {
  const modal = $('#snippet-modal');
  if (!modal) return;
  const titleInput = modal.querySelector('#snippet-name');
  const contentInput = modal.querySelector('#snippet-command');
  const tagsInput = modal.querySelector('#snippet-tags');

  if (titleInput) titleInput.value = snippet.title || '';
  if (contentInput) contentInput.value = snippet.content || '';
  if (tagsInput) tagsInput.value = (snippet.tags || []).join(', ');
  modal.dataset.editId = snippet.id;

  const heading = modal.querySelector('.modal-title');
  if (heading) heading.textContent = 'Edit Snippet';

  showModal('snippet-modal');
}

function renderSnippetsScreen() {
  const container = $('#snippets-list');
  if (!container) return;

  const q = ($('#snippets-search')?.value || '').toLowerCase();
  const filtered = AppState.snippetsData.filter(s =>
    !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    container.innerHTML = '<div class="snippets-empty">No snippets yet. Create one with the + button above.</div>';
    return;
  }

  container.innerHTML = filtered.map(s => `
    <div class="snippet-card" data-id="${s.id}">
      <div class="snippet-card-header">
        <span class="snippet-card-title">${escHtml(s.title)}</span>
        <div class="snippet-card-actions">
          <button class="snip-copy-btn" data-id="${s.id}" title="Copy">⧉</button>
          <button class="snip-chat-btn" data-id="${s.id}" title="Send to chat">💬</button>
          <button class="snip-edit-btn" data-id="${s.id}" title="Edit">✏️</button>
          <button class="snip-del-btn" data-id="${s.id}" title="Delete">🗑</button>
        </div>
      </div>
      <div class="snippet-card-body"><pre class="snippet-preview">${escHtml((s.content || '').slice(0, 200))}${(s.content || '').length > 200 ? '…' : ''}</pre></div>
      ${s.tags?.length ? `<div class="snippet-tags">${s.tags.map(t => `<span class="snippet-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.snip-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) copyToClipboard(s.content, btn);
    });
  });
  container.querySelectorAll('.snip-chat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) {
        const input = $('#message-input');
        if (input) { input.value += s.content; autoResizeInput(input); input.focus(); }
        switchScreen('lab');
      }
    });
  });
  container.querySelectorAll('.snip-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) openSnippetEditModal(s);
    });
  });
  container.querySelectorAll('.snip-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('Delete this snippet?', (ok) => {
        if (!ok) return;
        AppState.snippetsData = AppState.snippetsData.filter(x => x.id !== btn.dataset.id);
        saveSnippetsData();
        renderSnippetsScreen();
      });
    });
  });
}

function wireSnippetsScreen() {
  const addBtn = $('#add-snippet-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = $('#snippet-modal');
      if (modal) {
        modal.dataset.editId = '';
        const titleInput = modal.querySelector('#snippet-name');
        const contentInput = modal.querySelector('#snippet-command');
        const tagsInput = modal.querySelector('#snippet-tags');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (tagsInput) tagsInput.value = '';
        const heading = modal.querySelector('.modal-title');
        if (heading) heading.textContent = 'New Snippet';
      }
      showModal('snippet-modal');
    });
  }

  const searchInput = $('#snippets-search');
  if (searchInput) searchInput.addEventListener('input', renderSnippetsScreen);

  renderSnippetsScreen();
}

// =============================================================================
// SECTION 3G — LAB MODAL (Kanban Card Detail)
// =============================================================================

function wireLabModal() {
  const modal = $('#lab-modal');
  if (!modal) return;

  const saveBtn = modal.querySelector('#save-lab-confirm');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      if (!id || !col) return;

      const colData = AppState.labsData.columns[col];
      if (!colData) return;
      const card = colData.cards.find(c => c.id === id);
      if (!card) return;

      card.name = modal.querySelector('#lab-name-input')?.value?.trim() || card.name;
      card.platform = modal.querySelector('#lab-platform-input')?.value || card.platform;
      card.difficulty = modal.querySelector('#lab-difficulty-input')?.value || card.difficulty;
      card.ip = modal.querySelector('#lab-notes-input')?.value?.trim() || '';
      card.os = modal.querySelector('#lab-modal-os')?.value?.trim() || '';
      card.notes = modal.querySelector('#lab-notes-input')?.value || '';
      card.url = modal.querySelector('#lab-url-input')?.value?.trim() || '';

      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('lab-modal');
      showToast('Lab updated', 'success', 1500);
    });
  }

  const startBtn = modal.querySelector('#lab-modal-start-placeholder');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      if (!id) return;

      // Find card across all columns
      let card = null;
      for (const colData of Object.values(AppState.labsData.columns)) {
        card = colData.cards.find(c => c.id === id);
        if (card) break;
      }
      if (!card) return;

      // Create new session from lab card
      const sessionData = createSession({
        name: card.name,
        target: card.name,
        platform: card.platform || 'HTB',
        difficulty: card.difficulty || 'Medium',
        targetIp: card.ip || '',
        targetOs: card.os || '',
        notes: card.notes || '',
      });

      hideModal('lab-modal');
      const tabId = createTab(sessionData);
      switchScreen('lab');
      if (tabId) showToast(`Session started for ${card.name}`, 'success');

      // Move card to In Progress
      labMoveCard(id, col, 'inprogress');
    });
  }

  const deleteBtn = modal.querySelector('#lab-modal-delete-placeholder');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      showConfirm('Delete this lab card?', (ok) => {
        if (!ok) return;
        const colData = AppState.labsData.columns[col];
        if (colData) colData.cards = colData.cards.filter(c => c.id !== id);
        saveLabTrackerData();
        renderTrackerScreen();
        hideModal('lab-modal');
      });
    });
  }
}

function openLabModal(cardId, colId) {
  const colData = AppState.labsData.columns[colId];
  if (!colData) return;
  const card = colData.cards.find(c => c.id === cardId);
  if (!card) return;

  const modal = $('#lab-modal');
  if (!modal) return;

  modal.dataset.cardId = cardId;
  modal.dataset.cardCol = colId;

  const nameInput = modal.querySelector('#lab-name-input');
  const platformSel = modal.querySelector('#lab-platform-input');
  const difficultySel = modal.querySelector('#lab-difficulty-input');
  const ipInput = modal.querySelector('#lab-notes-input');
  const osInput = modal.querySelector('#lab-modal-os');
  const notesArea = modal.querySelector('#lab-notes-input');
  const urlInput = modal.querySelector('#lab-url-input');

  if (nameInput) nameInput.value = card.name || '';
  if (platformSel) platformSel.value = card.platform || 'HTB';
  if (difficultySel) difficultySel.value = card.difficulty || 'Medium';
  if (ipInput) ipInput.value = card.ip || '';
  if (osInput) osInput.value = card.os || '';
  if (notesArea) notesArea.value = card.notes || '';
  if (urlInput) urlInput.value = card.url || '';

  showModal('lab-modal');
}

// =============================================================================
// SECTION 3H — BULK IMPORT MODAL
// =============================================================================

function wireBulkImportModal() {
  const modal = $('#bulk-import-modal');
  if (!modal) return;

  const importBtn = modal.querySelector('#bulk-import-btn');
  const textarea = modal.querySelector('#bulk-import-text');
  const platformSel = modal.querySelector('#bulk-import-platform');

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const text = (textarea?.value || '').trim();
      if (!text) { showToast('Paste machine names first', 'warning'); return; }

      const platform = platformSel?.value || 'HTB';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      lines.forEach(line => {
        // Format: "Name,Difficulty" or just "Name"
        const [name, diff] = line.split(',').map(s => s.trim());
        const card = {
          id: generateId(),
          name: name || line,
          platform,
          difficulty: diff || 'Medium',
          ip: '',
          os: '',
          notes: '',
          url: '',
          createdAt: Date.now(),
        };
        AppState.labsData.columns.backlog.cards.push(card);
      });

      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('bulk-import-modal');
      if (textarea) textarea.value = '';
      showToast(`Imported ${lines.length} labs to Backlog`, 'success');
    });
  }
}

// =============================================================================
// SECTION 3I — TRACKER SCREEN (Kanban)
// =============================================================================

function wireTrackerScreen() {
  // ── Back button ───────────────────────────────────────────────────────────────
  const trackerBack = $('#tracker-back-btn');
  if (trackerBack && !trackerBack._wired) {
    trackerBack._wired = true;
    trackerBack.addEventListener('click', () => switchScreen('dashboard'));
  }

  // ── Add Lab button — opens modal for backlog (Want to Do) column ──────────────
  const addBtn = $('#add-lab-btn');
  if (addBtn && !addBtn._wired) {
    addBtn._wired = true;
    addBtn.addEventListener('click', () => showAddLabCardModal('backlog'));
  }

  // ── Bulk Import button ────────────────────────────────────────────────────────
  const bulkBtn = $('#bulk-import-btn');
  if (bulkBtn && !bulkBtn._wired) {
    bulkBtn._wired = true;
    bulkBtn.addEventListener('click', () => showModal('bulk-import-modal'));
  }

  // ── HTB Sync button ───────────────────────────────────────────────────────────
  const syncHTBBtn = $('#sync-htb-btn');
  if (syncHTBBtn && !syncHTBBtn._wired) {
    syncHTBBtn._wired = true;
    syncHTBBtn.addEventListener('click', async () => {
      setButtonLoading(syncHTBBtn, true, 'Syncing…');
      try {
        const labs = await window.electronAPI.syncHTB();
        if (labs && labs.length > 0) {
          labs.forEach(lab => {
            const exists = Object.values(AppState.labsData.columns).some(col => col.cards.some(c => c.name === lab.name));
            if (!exists) {
              AppState.labsData.columns.backlog.cards.push({ id: generateId(), ...lab, createdAt: Date.now() });
            }
          });
          saveLabTrackerData();
          renderTrackerScreen();
          showToast(`Synced ${labs.length} HTB labs`, 'success');
        } else {
          showToast('No new HTB labs found', 'info');
        }
      } catch (e) {
        showToast('HTB sync failed: ' + e.message, 'error');
      }
      setButtonLoading(syncHTBBtn, false);
    });
  }

  // ── THM Sync button ───────────────────────────────────────────────────────────
  const syncTHMBtn = $('#sync-thm-btn');
  if (syncTHMBtn && !syncTHMBtn._wired) {
    syncTHMBtn._wired = true;
    syncTHMBtn.addEventListener('click', async () => {
      setButtonLoading(syncTHMBtn, true, 'Syncing…');
      try {
        const labs = await window.electronAPI.syncTHM();
        if (labs && labs.length > 0) {
          labs.forEach(lab => {
            const exists = Object.values(AppState.labsData.columns).some(col => col.cards.some(c => c.name === lab.name));
            if (!exists) {
              AppState.labsData.columns.backlog.cards.push({ id: generateId(), ...lab, createdAt: Date.now() });
            }
          });
          saveLabTrackerData();
          renderTrackerScreen();
          showToast(`Synced ${labs.length} THM rooms`, 'success');
        } else {
          showToast('No new THM rooms found', 'info');
        }
      } catch (e) {
        showToast('THM sync failed: ' + e.message, 'error');
      }
      setButtonLoading(syncTHMBtn, false);
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  const searchEl = $('#tracker-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', () => renderTrackerScreen(searchEl.value.trim()));
  }

  // ── Platform + Difficulty filters ─────────────────────────────────────────────
  const platFilter = $('#tracker-filter-platform');
  const diffFilter = $('#tracker-filter-difficulty');
  if (platFilter && !platFilter._wired) {
    platFilter._wired = true;
    platFilter.addEventListener('change', () => renderTrackerScreen($('#tracker-search')?.value?.trim() || ''));
  }
  if (diffFilter && !diffFilter._wired) {
    diffFilter._wired = true;
    diffFilter.addEventListener('change', () => renderTrackerScreen($('#tracker-search')?.value?.trim() || ''));
  }

  renderTrackerScreen();
}

function refreshTrackerScreen() {
  renderTrackerScreen();
}

function renderTrackerScreen(searchQ = '') {
  const q = (searchQ || ($('#tracker-search')?.value || '')).toLowerCase().trim();
  const platFilter = ($('#tracker-filter-platform')?.value || '').toLowerCase();
  const diffFilter = ($('#tracker-filter-difficulty')?.value || '').toLowerCase();

  Object.values(AppState.labsData.columns).forEach(col => {
    // Apply filters to a copy of the column so state is unaffected
    if (q || platFilter || diffFilter) {
      const filtered = {
        ...col,
        cards: col.cards.filter(c => {
          const matchQ = !q || (c.name||'').toLowerCase().includes(q) || (c.notes||'').toLowerCase().includes(q);
          const matchPlat = !platFilter || (c.platform||'').toLowerCase() === platFilter;
          const matchDiff = !diffFilter || (c.difficulty||'').toLowerCase() === diffFilter;
          return matchQ && matchPlat && matchDiff;
        })
      };
      renderKanbanColumn(filtered);
    } else {
      renderKanbanColumn(col);
    }
  });

  // Populate platform filter options from existing cards (once)
  const platEl = $('#tracker-filter-platform');
  if (platEl && platEl.options.length <= 1) {
    const platforms = [...new Set(
      Object.values(AppState.labsData.columns).flatMap(c => c.cards.map(card => card.platform)).filter(Boolean)
    )];
    platforms.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      platEl.appendChild(opt);
    });
  }
}

function renderKanbanColumn(col) {
  const container = $(`#kanban-col-${col.id}`);
  if (!container) return;

  const cardsEl = container.querySelector('.kanban-cards');
  const countEl = container.querySelector('.kanban-count');

  if (countEl) countEl.textContent = col.cards.length;

  if (!cardsEl) return;
  cardsEl.innerHTML = '';

  col.cards.forEach(card => {
    const el = createKanbanCard(card, col.id);
    cardsEl.appendChild(el);
  });

  // Drop zone
  cardsEl.addEventListener('dragover', (e) => { e.preventDefault(); cardsEl.classList.add('drag-over'); });
  cardsEl.addEventListener('dragleave', () => cardsEl.classList.remove('drag-over'));
  cardsEl.addEventListener('drop', (e) => {
    e.preventDefault();
    cardsEl.classList.remove('drag-over');
    const { cardId, sourceCol } = AppState.dragState;
    if (cardId && sourceCol && sourceCol !== col.id) {
      labMoveCard(cardId, sourceCol, col.id);
    }
  });
}

function createKanbanCard(card, colId) {
  const el = document.createElement('div');
  el.className = 'kanban-card';
  el.draggable = true;
  el.dataset.cardId = card.id;
  el.dataset.colId = colId;

  const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
  const dotColor = diffColors[card.difficulty] || '#888';

  el.innerHTML = `
    <div class="kanban-card-header">
      <span class="kanban-card-dot" style="background:${dotColor}"></span>
      <span class="kanban-card-name">${escHtml(card.name)}</span>
    </div>
    <div class="kanban-card-meta">
      ${card.platform ? `<span class="kanban-card-platform">${escHtml(card.platform)}</span>` : ''}
      ${card.difficulty ? `<span class="kanban-card-diff">${escHtml(card.difficulty)}</span>` : ''}
      ${card.ip ? `<span class="kanban-card-ip">${escHtml(card.ip)}</span>` : ''}
    </div>
    ${card.notes ? `<div class="kanban-card-notes">${escHtml(card.notes.slice(0, 80))}${card.notes.length > 80 ? '…' : ''}</div>` : ''}
  `;

  el.addEventListener('click', () => openLabModal(card.id, colId));
  el.addEventListener('dragstart', (e) => {
    AppState.dragState = { cardId: card.id, sourceCol: colId };
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    AppState.dragState = { cardId: null, sourceCol: null };
  });

  return el;
}

function labMoveCard(cardId, fromColId, toColId) {
  const fromCol = AppState.labsData.columns[fromColId];
  const toCol = AppState.labsData.columns[toColId];
  if (!fromCol || !toCol) return;

  const idx = fromCol.cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  const [card] = fromCol.cards.splice(idx, 1);
  card.movedAt = Date.now();
  if (toColId === 'completed') card.completedAt = Date.now();
  toCol.cards.push(card);

  saveLabTrackerData();
  renderTrackerScreen();
  if (toColId === 'completed' && AppState.config.soundEnabled) Sounds.sessionComplete();
}

function showAddLabCardModal(colId) {
  // Reuse lab-modal in create mode
  const modal = $('#lab-modal');
  if (!modal) return;

  modal.dataset.cardId = '';
  modal.dataset.cardCol = colId;

  // Clear fields
  ['#lab-name-input', '#lab-notes-input', '#lab-modal-os', '#lab-url-input'].forEach(sel => {
    const el = modal.querySelector(sel);
    if (el) el.value = '';
  });
  const notesArea = modal.querySelector('#lab-notes-input');
  if (notesArea) notesArea.value = '';

  const saveBtn = modal.querySelector('#save-lab-confirm');
  if (saveBtn) {
    // Override save for create mode
    saveBtn.onclick = () => {
      const name = (modal.querySelector('#lab-name-input')?.value || '').trim();
      if (!name) { showToast('Enter a lab name', 'warning'); return; }

      const card = {
        id: generateId(),
        name,
        platform: modal.querySelector('#lab-platform-input')?.value || 'HTB',
        difficulty: modal.querySelector('#lab-difficulty-input')?.value || 'Medium',
        ip: modal.querySelector('#lab-notes-input')?.value?.trim() || '',
        os: modal.querySelector('#lab-modal-os')?.value?.trim() || '',
        notes: modal.querySelector('#lab-notes-input')?.value || '',
        url: modal.querySelector('#lab-url-input')?.value?.trim() || '',
        createdAt: Date.now(),
      };

      AppState.labsData.columns[colId].cards.push(card);
      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('lab-modal');
      showToast('Lab added', 'success', 1500);

      // Restore original save handler
      if (saveBtn) saveBtn.onclick = null;
    };
  }

  showModal('lab-modal');
}

// =============================================================================
// SECTION 3J — PROGRESS SCREEN
// =============================================================================

function wireProgressScreen() {
  const progressBack = $('#progress-back-btn');
  if (progressBack && !progressBack._wired) {
    progressBack._wired = true;
    progressBack.addEventListener('click', () => switchScreen('dashboard'));
  }

  // Analyse My Progress button
  const analyseBtn = $('#analyse-weakness-btn');
  if (analyseBtn && !analyseBtn._wired) {
    analyseBtn._wired = true;
    analyseBtn.addEventListener('click', async () => {
      const resultEl = $('#weakness-result');
      const lastRunEl = $('#weakness-last-run');
      if (resultEl) {
        resultEl.style.display = '';
        resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px">Analysing your progress…</div>';
      }
      // Build a summary of skills and sessions to send to AI
      const stats = AppState.progressData?.stats || {};
      const sessions = AppState.tabs.filter(t => t.session).length;
      const prompt = `I am a pentester using CyberLab Companion. I have completed ${sessions} session(s).
My progress stats: ${JSON.stringify(stats, null, 2)}

Based on this, please:
1. Identify my weakest areas and skill gaps
2. Suggest 3-5 specific areas I should practice next
3. Recommend HTB machines or TryHackMe rooms that match my current level
4. Give me one actionable training tip

Keep the response concise and practical.`;

      try {
        sendChatMessage(prompt);
        if (resultEl) {
          resultEl.innerHTML = '<div style="color:var(--success);font-size:12px;padding:8px">✓ Analysis sent to AI Chat — switch to Chat to read the response.</div>';
        }
        if (lastRunEl) lastRunEl.textContent = `Last run: ${new Date().toLocaleTimeString()}`;
        showToast('Progress analysis sent to AI', 'info');
        setTimeout(() => switchScreen('lab'), 1200);
      } catch (e) {
        if (resultEl) resultEl.innerHTML = `<div style="color:var(--error);font-size:12px;padding:8px">Error: ${escHtml(e.message)}</div>`;
      }
    });
  }

  // Filter tabs
  $$('.progress-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.progress-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAchievements(btn.dataset.filter || 'all');
    });
  });
}

function refreshProgressScreen() {
  const stats = computeProgressStats(AppState.progressData);
  renderStatsCards(stats);
  renderSkillTree();
  renderAchievements('all');
  renderProgressCharts(stats);
}

function renderStatsCards(stats) {
  const cards = {
    '#stat-labs-pwned': stats.labsPwned || 0,
    '#stat-flags-captured': stats.flags || 0,
    '#stat-total-xp': stats.totalXP || 0,
    '#stat-current-streak': stats.streak || 0,
    '#stat-findings': stats.findings || 0,
    '#stat-sessions': stats.sessions || 0,
  };
  Object.entries(cards).forEach(([sel, val]) => {
    const el = $(sel);
    if (el) el.textContent = val;
  });
}

function renderSkillTree() {
  const container = $('#skill-tree-grid');
  if (!container) return;

  container.innerHTML = '';
  SKILL_TREE.forEach(domain => {
    const domainEl = document.createElement('div');
    domainEl.className = 'skill-domain';

    const unlocked = (AppState.progressData.skillTree?.[domain.id] || []);
    const total = domain.nodes.length;
    const progress = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

    domainEl.innerHTML = `
      <div class="skill-domain-header">
        <span class="skill-domain-icon">${domain.icon || '⚙️'}</span>
        <span class="skill-domain-name">${escHtml(domain.name)}</span>
        <span class="skill-domain-progress">${unlocked.length}/${total}</span>
      </div>
      <div class="skill-progress-bar"><div class="skill-progress-fill" style="width:${progress}%"></div></div>
      <div class="skill-nodes">
        ${domain.nodes.map(node => {
          const isUnlocked = unlocked.includes(node.id);
          return `
            <div class="skill-node ${isUnlocked ? 'unlocked' : 'locked'}" title="${escHtml(node.description || node.name)}">
              <span class="skill-node-icon">${isUnlocked ? (node.icon || '✓') : '🔒'}</span>
              <span class="skill-node-name">${escHtml(node.name)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.appendChild(domainEl);
  });
}

function renderAchievements(filter) {
  const container = $('#achievements-grid');
  if (!container) return;

  const unlocked = AppState.progressData.achievements || [];
  const filtered = ACHIEVEMENTS.filter(a => {
    if (filter === 'unlocked') return unlocked.includes(a.id);
    if (filter === 'locked') return !unlocked.includes(a.id);
    return true;
  });

  container.innerHTML = filtered.map(a => {
    const isUnlocked = unlocked.includes(a.id);
    return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon || '🏆'}</div>
        <div class="achievement-name">${escHtml(a.name)}</div>
        <div class="achievement-desc">${escHtml(a.description)}</div>
        ${isUnlocked ? '<div class="achievement-badge">UNLOCKED</div>' : '<div class="achievement-badge locked">LOCKED</div>'}
      </div>
    `;
  }).join('') || '<div class="achievements-empty">No achievements in this filter</div>';
}

function renderProgressCharts(stats) {
  // Skill Radar Chart
  const radarCanvas = $('#chart-skills');
  if (radarCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.radar) AppState.charts.radar.destroy();
    const domains = SKILL_TREE.map(d => d.name);
    const unlocked = SKILL_TREE.map(d => {
      const u = AppState.progressData.skillTree?.[d.id]?.length || 0;
      const t = d.nodes.length || 1;
      return Math.round((u / t) * 100);
    });
    AppState.charts.radar = new Chart(radarCanvas, {
      type: 'radar',
      data: {
        labels: domains,
        datasets: [{
          label: 'Skill Level',
          data: unlocked,
          backgroundColor: 'rgba(74,158,255,0.2)',
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
          pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
        }]
      },
      options: {
        scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
        plugins: { legend: { display: false } },
        elements: { point: { radius: 4 } }
      }
    });
  }

  // Activity chart (simple bar — sessions per day last 14 days)
  const activityCanvas = $('#chart-time');
  if (activityCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.activity) AppState.charts.activity.destroy();
    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      data.push(stats.activityByDay?.[d.toDateString()] || 0);
    }
    AppState.charts.activity = new Chart(activityCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sessions',
          data,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
          borderRadius: 4,
        }]
      },
      options: {
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// =============================================================================
// SECTION 3K — SETTINGS SCREEN
// =============================================================================

function wireSettingsScreen() {
  // ── Back button ────────────────────────────────────────────────────────────
  const settingsBack = $('#settings-back-btn');
  if (settingsBack && !settingsBack._wired) { settingsBack._wired = true; settingsBack.addEventListener('click', () => switchScreen('dashboard')); }

  // ── Theme picker cards ─────────────────────────────────────────────────────
  $$('.settings-theme-pick').forEach(card => {
    // Mark current theme active on load
    if (card.dataset.theme === (AppState.config.theme || 'stealth')) {
      card.classList.add('active');
    }
    card.addEventListener('click', async () => {
      const theme = card.dataset.theme;
      AppState.config.theme = theme;
      applyTheme(theme);
      // Sync top-bar dropdown
      const themeSel = $('#theme-select');
      if (themeSel) themeSel.value = theme;
      // Update active card
      $$('.settings-theme-pick').forEach(c => c.classList.toggle('active', c === card));
      await window.electronAPI.saveConfig(AppState.config);
      showToast(`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, 'success', 1500);
    });
  });

  // API Key
  const apiKeyInput = $('#settings-apikey');
  const apiKeySaveBtn = $('#settings-save-api');
  const apiKeyTestBtn = $('#settings-test-api');
  const apiKeyStatus = $('#settings-api-result');

  if (apiKeyInput) {
    // Show masked existing key
    window.electronAPI.hasApiKey().then(has => {
      if (has) apiKeyInput.placeholder = '••••••••••••••••••••••••••••••••';
    });
  }

  if (apiKeySaveBtn) {
    apiKeySaveBtn.addEventListener('click', async () => {
      const key = (apiKeyInput?.value || '').trim();
      if (!key) { showToast('Enter an API key', 'warning'); return; }
      setButtonLoading(apiKeySaveBtn, true, 'Saving…');
      try {
        await window.electronAPI.saveApiKey(key);
        showToast('API key saved', 'success');
        if (apiKeyInput) apiKeyInput.value = '';
        if (apiKeyStatus) { apiKeyStatus.textContent = 'Saved'; apiKeyStatus.style.color = 'var(--success)'; }
      } catch (e) {
        showToast('Save failed: ' + e.message, 'error');
      }
      setButtonLoading(apiKeySaveBtn, false);
    });
  }

  if (apiKeyTestBtn) {
    apiKeyTestBtn.addEventListener('click', async () => {
      const key = (apiKeyInput?.value || '').trim();
      setButtonLoading(apiKeyTestBtn, true, 'Testing…');
      try {
        const ok = await window.electronAPI.testApiKey(key || undefined);
        const valid = !!ok;
        updateApiStatusDot(valid);
        if (apiKeyStatus) {
          apiKeyStatus.textContent = valid ? '✓ Connected' : '✗ Invalid';
          apiKeyStatus.style.color = valid ? 'var(--success)' : 'var(--danger)';
        }
        showToast(valid ? 'API key is valid!' : 'API key is invalid', valid ? 'success' : 'error');
      } catch (e) {
        showToast('Test failed: ' + e.message, 'error');
      }
      setButtonLoading(apiKeyTestBtn, false);
    });
  }

  // Obsidian Vault
  const obsidianInput = $('#settings-vault');
  const obsidianPickBtn = $('#settings-browse-vault');
  const obsidianSaveBtn = $('#save-obsidian-btn');
  const obsidianScanBtn = $('#settings-open-vault');

  if (obsidianInput && AppState.config.obsidianVault) {
    obsidianInput.value = AppState.config.obsidianVault;
  }

  if (obsidianPickBtn) {
    obsidianPickBtn.addEventListener('click', async () => {
      const dir = await window.electronAPI.pickFolder();
      if (dir) {
        if (obsidianInput) obsidianInput.value = dir;
        AppState.config.obsidianVault = dir;
      }
    });
  }

  if (obsidianSaveBtn) {
    obsidianSaveBtn.addEventListener('click', async () => {
      AppState.config.obsidianVault = obsidianInput?.value?.trim() || '';
      await window.electronAPI.saveConfig(AppState.config);
      showToast('Obsidian path saved', 'success', 1500);
    });
  }

  if (obsidianScanBtn) {
    obsidianScanBtn.addEventListener('click', async () => {
      if (!AppState.config.obsidianVault) { showToast('Set an Obsidian vault path first', 'warning'); return; }
      setButtonLoading(obsidianScanBtn, true, 'Scanning…');
      try {
        const notes = await window.electronAPI.scanVault(AppState.config.obsidianVault);
        showToast(`Found ${notes.length} notes in vault`, 'success');
      } catch (e) {
        showToast('Scan failed: ' + e.message, 'error');
      }
      setButtonLoading(obsidianScanBtn, false);
    });
  }

  // Theme
  const themeRadios = $$('input[name="settings-theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === (AppState.config.theme || 'stealth');
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      AppState.config.theme = radio.value;
      applyTheme(AppState.config.theme);
      const themeSel = $('#theme-select');
      if (themeSel) themeSel.value = AppState.config.theme;
      await window.electronAPI.saveConfig(AppState.config);
    });
  });

  // Font size
  const fontSel = $('#default-timer');
  if (fontSel) {
    fontSel.value = AppState.config.fontSize || 'medium';
    fontSel.addEventListener('change', async () => {
      AppState.config.fontSize = fontSel.value;
      applyFontSize(fontSel.value);
      await window.electronAPI.saveConfig(AppState.config);
    });
  }

  // Output directory
  const outputDirInput = $('#settings-htb-key');
  const outputDirPickBtn = $('#output-dir-placeholder');

  if (outputDirInput) {
    window.electronAPI.getOutputDir().then(dir => { if (dir && outputDirInput) outputDirInput.value = dir; }).catch(() => {});
  }
  if (outputDirPickBtn) {
    outputDirPickBtn.addEventListener('click', async () => {
      const dir = await window.electronAPI.pickFolder();
      if (dir) {
        if (outputDirInput) outputDirInput.value = dir;
        AppState.config.outputDir = dir;
        await window.electronAPI.saveConfig(AppState.config);
        showToast('Output directory saved', 'success', 1500);
      }
    });
  }

  // Toggles
  const toggleMap = {
    '#sounds-toggle': 'soundEnabled',
    '#autosave-interval': 'autosaveEnabled',
    '#update-check-toggle': 'vpnCheckEnabled',
    '#notif-placeholder': 'notificationsEnabled',
  };
  Object.entries(toggleMap).forEach(([sel, key]) => {
    const el = $(sel);
    if (!el) return;
    el.checked = !!AppState.config[key];
    el.addEventListener('change', async () => {
      AppState.config[key] = el.checked;
      await window.electronAPI.saveConfig(AppState.config);
      if (key === 'vpnCheckEnabled') {
        if (el.checked) startVpnMonitor();
        else { clearInterval(AppState.vpnInterval); AppState.vpnInterval = null; }
      }
    });
  });

  // Version info
  const versionEl = $('#update-version');
  if (versionEl) {
    window.electronAPI.getVersion().then(v => { if (versionEl) versionEl.textContent = `v${v}`; }).catch(() => {});
  }

  // Check for updates button
  const checkUpdateBtn = $('#open-github-btn');
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      setButtonLoading(checkUpdateBtn, true, 'Checking…');
      try {
        const hasUpdate = await window.electronAPI.checkUpdate();
        if (hasUpdate) {
          AppState.updateAvailable = true;
          checkUpdateBanner();
          showToast('Update available! See banner above.', 'success', 4000);
        } else {
          showToast('You are on the latest version', 'info');
        }
      } catch (e) {
        showToast('Update check failed', 'error');
      }
      setButtonLoading(checkUpdateBtn, false);
    });
  }

  // Clear data
  const clearProgressBtn = $('#factory-reset-btn');
  if (clearProgressBtn) {
    clearProgressBtn.addEventListener('click', () => {
      showConfirm('Clear all progress data? This cannot be undone.', async (ok) => {
        if (!ok) return;
        AppState.progressData = { skillTree: {}, achievements: [], totalXP: 0, stats: {} };
        await saveProgressData();
        showToast('Progress cleared', 'info');
      });
    });
  }

  // Export sessions
  const exportBtn = $('#export-snippets-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const sessions = await window.electronAPI.listSessions();
        showToast(`${sessions.length} sessions available for export`, 'info');
      } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
      }
    });
  }
}

// =============================================================================
// SECTION 3L — SESSION SESSIONS SCREEN (Load / Restore)
// =============================================================================

async function showSessionsModal() {
  await loadSessionList();
  const modal = $('#sessions-list-modal');
  if (!modal) return;

  const container = modal.querySelector('#sessions-list-content');
  if (container) {
    if (AppState.sessionList.length === 0) {
      container.innerHTML = '<div class="sessions-empty">No saved sessions yet</div>';
    } else {
      container.innerHTML = AppState.sessionList.map(s => `
        <div class="session-list-item" data-id="${s.id}">
          <div class="sli-name">${escHtml(s.name)}</div>
          <div class="sli-meta">
            <span class="sli-platform">${escHtml(s.platform || '')}</span>
            <span class="sli-diff">${escHtml(s.difficulty || '')}</span>
            <span class="sli-date">${formatDate(s.savedAt)}</span>
          </div>
          <div class="sli-actions">
            <button class="sli-load-btn" data-id="${s.id}">Resume</button>
            <button class="sli-del-btn" data-id="${s.id}">Delete</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.sli-load-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const data = await window.electronAPI.loadSession(btn.dataset.id);
            if (data) {
              const { session, chatHistory } = deserializeSession(data);
              createTab(session);
              const tab = getActiveTab();
              if (tab) tab.chatHistory = chatHistory || [];
              renderActiveTab();
              hideModal('sessions-list-modal');
              showToast(`Resumed: ${session.name}`, 'success');
            }
          } catch (e) {
            showToast('Load failed: ' + e.message, 'error');
          }
        });
      });

      container.querySelectorAll('.sli-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showConfirm('Delete this session?', async (ok) => {
            if (!ok) return;
            try {
              await window.electronAPI.deleteSession(btn.dataset.id);
              showToast('Session deleted', 'info', 1500);
              await loadSessionList();
              showSessionsModal();
            } catch (e) {
              showToast('Delete failed: ' + e.message, 'error');
            }
          });
        });
      });
    }
  }

  showModal('sessions-list-modal');
}

// =============================================================================
// SECTION 3M — IPC LISTENERS (Electron → Renderer events)
// =============================================================================

function wireIpcListeners() {
  // Autosave tick (every 60s from main process)
  window.electronAPI.onAutosaveTick(() => {
    if (!AppState.config.autosaveEnabled) return;
    AppState.tabs.forEach(tab => {
      if (tab.chatHistory.length > 0) autoSaveTab(tab);
    });
  });

  // VPN status pushed from main
  window.electronAPI.onVpnStatus((status) => {
    updateVpnIndicator(status);
  });

  // Window focus — refresh UI
  window.electronAPI.onFocusWindow(() => {
    // Refresh session duration display
    const tab = getActiveTab();
    if (tab) renderSessionInfo(tab);
  });

  // Update available
  window.electronAPI.onUpdateAvailable(() => {
    AppState.updateAvailable = true;
    checkUpdateBanner();
    showToast('Update available — click the banner to download', 'info', 6000);
  });
}

// =============================================================================
// SECTION 3N-PRE — V2 LAYOUT WIRING (sidebar, tools, notes, terminal)
// =============================================================================

// Default tool catalogue for the right-panel tools section
const DEFAULT_TOOLS = [
  { id:'nmap',        name:'Nmap',         desc:'Network & port scanner',           cat:'recon',   cmd:'nmap -sV -sC -p- {target}' },
  { id:'gobuster',    name:'Gobuster',     desc:'Directory/DNS brute-forcer',        cat:'recon',   cmd:'gobuster dir -u http://{target} -w /usr/share/wordlists/dirb/common.txt' },
  { id:'nikto',       name:'Nikto',        desc:'Web vulnerability scanner',         cat:'recon',   cmd:'nikto -h http://{target}' },
  { id:'whatweb',     name:'WhatWeb',      desc:'Web fingerprinting',                cat:'recon',   cmd:'whatweb http://{target}' },
  { id:'enum4linux',  name:'Enum4linux',   desc:'Windows/Samba enumeration',         cat:'enum',    cmd:'enum4linux -A {target}' },
  { id:'smbclient',   name:'SMBClient',    desc:'SMB share browser',                 cat:'enum',    cmd:'smbclient -L //{target} -N' },
  { id:'ldapsearch',  name:'LDAPSearch',   desc:'LDAP directory enumeration',        cat:'enum',    cmd:'ldapsearch -x -H ldap://{target} -b "dc=domain,dc=local"' },
  { id:'ffuf',        name:'FFUF',         desc:'Web fuzzer (fast)',                  cat:'enum',    cmd:'ffuf -w /usr/share/wordlists/dirb/common.txt -u http://{target}/FUZZ' },
  { id:'sqlmap',      name:'SQLMap',       desc:'SQL injection automation',           cat:'exploit', cmd:'sqlmap -u "http://{target}/page?id=1" --dbs' },
  { id:'metasploit',  name:'Metasploit',   desc:'Exploitation framework console',     cat:'exploit', cmd:'msfconsole' },
  { id:'hydra',       name:'Hydra',        desc:'Network login brute-forcer',         cat:'exploit', cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} ssh' },
  { id:'searchsploit',name:'Searchsploit', desc:'Exploit DB offline search',          cat:'exploit', cmd:'searchsploit {query}' },
  { id:'linpeas',     name:'LinPEAS',      desc:'Linux privesc enumeration script',   cat:'privesc', cmd:'curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh' },
  { id:'winpeas',     name:'WinPEAS',      desc:'Windows privesc enum script',        cat:'privesc', cmd:'winpeas.exe' },
  { id:'sudo-l',      name:'Sudo -l',      desc:'List sudo permissions',              cat:'privesc', cmd:'sudo -l' },
  { id:'suid',        name:'SUID Hunt',    desc:'Find SUID binaries',                 cat:'privesc', cmd:'find / -perm -u=s -type f 2>/dev/null' },
  { id:'mimikatz',    name:'Mimikatz',     desc:'Windows credential dumper',          cat:'post',    cmd:'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit' },
  { id:'bloodhound',  name:'BloodHound',   desc:'AD attack path analysis',            cat:'post',    cmd:'bloodhound-python -u {user} -p {password} -ns {target} -d {domain} -c all' },
  { id:'netcat',      name:'Netcat',       desc:'TCP/UDP utility / reverse shell',    cat:'post',    cmd:'nc -lvnp 4444' },
  { id:'chisel',      name:'Chisel',       desc:'TCP/UDP tunnel over HTTP',           cat:'post',    cmd:'chisel server --reverse --port 8080' },
];

function wireV2Layout() {
  // ── Tool filter tabs — use event delegation to avoid double-bind ─────────────
  const tfilContainer = $('#tools-section') || document.body;
  if (!tfilContainer._tfilWired) {
    tfilContainer._tfilWired = true;
    tfilContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tfil');
      if (!btn) return;
      $$('.tfil').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const search = ($('#tools-search')?.value || '').trim();
      renderToolsPanel(btn.dataset.filter || 'all', search);
    });
  }

  // ── Tools search ─────────────────────────────────────────────────────────────
  const toolSearch = $('#tools-search');
  if (toolSearch && !toolSearch._wired) {
    toolSearch._wired = true;
    toolSearch.addEventListener('input', () => {
      const activeCat = ($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all';
      renderToolsPanel(activeCat, toolSearch.value.trim());
    });
  }

  // ── Manage tools button ───────────────────────────────────────────────────────
  const manageBtn = $('#manage-tools-btn');
  if (manageBtn && !manageBtn._wired) {
    manageBtn._wired = true;
    manageBtn.addEventListener('click', () => showManageToolsModal());
  }

  // ── Notes tabs — event delegation on the notes section ──────────────────────
  // HTML id is "notes-section", fallback to body so delegation always works
  const notesPanel = $('#notes-section') || $('#notes-panel') || document.body;
  if (!notesPanel._notesTabWired) {
    notesPanel._notesTabWired = true;
    notesPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('.notes-tab-btn');
      if (!btn) return;
      $$('.notes-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotesPanel(getActiveTab(), btn.dataset.notesTab || 'notes');
    });
  }

  // ── New note button ───────────────────────────────────────────────────────────
  const newNoteBtn = $('#new-note-btn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      const note = { id: generateId(), text: '', createdAt: Date.now(), bookmark: false };
      if (tab?.session) {
        // Session active — add to session notes
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift(note);
        renderNotesPanel(tab, 'notes');
        autoSaveTab(tab);
      } else {
        // No session — use global notes store
        AppState.globalNotes = AppState.globalNotes || [];
        AppState.globalNotes.unshift(note);
        renderNotesPanel(null, 'notes');
      }
      const firstTA = $('#notes-list textarea');
      if (firstTA) firstTA.focus();
    });
  }

  // ── View all notes button ─────────────────────────────────────────────────────
  const viewAllBtn = $('#view-all-notes-btn');
  if (viewAllBtn) viewAllBtn.addEventListener('click', () => {
    const tab = getActiveTab();
    $$('.notes-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.notesTab === 'notes'));
    renderNotesPanel(tab, 'notes');
  });

  // ── Terminal section buttons ──────────────────────────────────────────────────
  const termClear = $('#terminal-clear-btn');
  if (termClear) {
    termClear.addEventListener('click', () => {
      const disp = $('#terminal-output-display');
      if (disp) {
        disp.innerHTML = '<div class="terminal-welcome-line"><span class="terminal-prompt">itseliias@lame:~$</span> <span style="color:var(--text-muted)">terminal cleared</span></div>';
      }
    });
  }

  const termExpand = $('#terminal-expand-btn');
  if (termExpand) {
    termExpand.addEventListener('click', () => {
      const section = $('#terminal-section');
      if (section) {
        section.classList.toggle('terminal-expanded');
        termExpand.textContent = section.classList.contains('terminal-expanded') ? '⤡' : '⤢';
      }
    });
  }

  // ── Initial render ────────────────────────────────────────────────────────────
  renderToolsPanel('all');
  renderNotesPanel(getActiveTab(), 'notes');

  // ── Tab switched — refresh notes + status bar ─────────────────────────────────
  document.addEventListener('tabSwitched', () => {
    const tab = getActiveTab();
    renderNotesPanel(tab, 'notes');
    if (typeof updateStatusBar === 'function') updateStatusBar(tab);
    if (typeof updateSidebarProgress === 'function') updateSidebarProgress();
  });
}

// =============================================================================
// SECTION 3O — MANAGE TOOLS MODAL
// =============================================================================

function showManageToolsModal() {
  const modal = $('#manage-tools-modal');
  if (!modal) return;
  renderManageToolsList();
  showModal('manage-tools-modal');

  // Wire add button (guard with _mtWired)
  const addBtn = $('#mt-add-btn');
  if (addBtn && !addBtn._mtWired) {
    addBtn._mtWired = true;
    addBtn.addEventListener('click', () => {
      const name = ($('#mt-name')?.value || '').trim();
      const desc = ($('#mt-desc')?.value || '').trim();
      const cat  = $('#mt-cat')?.value || 'recon';
      const cmd  = ($('#mt-cmd')?.value || '').trim();
      if (!name || !cmd) { showToast('Name and Command are required', 'warning'); return; }
      AppState.customTools = AppState.customTools || [];
      const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      AppState.customTools.push({ id, name, desc: desc || name, cat, cmd });
      // Clear inputs
      ['#mt-name','#mt-desc','#mt-cmd'].forEach(sel => { const el = $(sel); if (el) el.value = ''; });
      renderManageToolsList();
      renderToolsPanel(($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all');
      showToast(`"${name}" added to tools`, 'success');
    });
  }
}

function renderManageToolsList() {
  const list = $('#mtool-list');
  if (!list) return;
  const custom = AppState.customTools || [];
  const allTools = [...DEFAULT_TOOLS, ...custom];
  const catColors = { recon:'var(--accent)', enum:'#a371f7', exploit:'var(--danger)', privesc:'var(--warning)', post:'var(--success)' };

  list.innerHTML = allTools.map(tool => {
    const isCustom = custom.some(c => c.id === tool.id);
    return `
    <div class="mtool-row" data-tool-id="${escHtml(tool.id)}">
      <div class="mtool-icon cat-${escHtml(tool.cat)}" style="background:rgba(0,0,0,0.2);color:${catColors[tool.cat]||'var(--text)'}">
        ${escHtml(tool.name.slice(0,2).toUpperCase())}
      </div>
      <div class="mtool-info">
        <div class="mtool-name">${escHtml(tool.name)} ${isCustom ? '<span style="font-size:9px;color:var(--accent);margin-left:4px">CUSTOM</span>' : ''}</div>
        <div class="mtool-desc" title="${escHtml(tool.cmd)}">${escHtml(tool.desc)} — <code style="font-size:9px">${escHtml(tool.cmd.slice(0,40))}${tool.cmd.length>40?'…':''}</code></div>
      </div>
      ${isCustom ? `<button class="mtool-remove-btn" data-tool-id="${escHtml(tool.id)}" title="Remove custom tool">Remove</button>` : '<span style="font-size:10px;color:var(--text-muted);flex-shrink:0">Built-in</span>'}
    </div>`;
  }).join('');

  // Wire remove buttons for custom tools
  list.querySelectorAll('.mtool-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.customTools = (AppState.customTools || []).filter(t => t.id !== btn.dataset.toolId);
      renderManageToolsList();
      renderToolsPanel(($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all');
      showToast('Tool removed', 'info');
    });
  });
}

// Render tool cards into #tools-list
function renderToolsPanel(filterCat = 'all', searchQ = '') {
  const list = $('#tools-list');
  if (!list) return;

  const tools = AppState.customTools ? [...DEFAULT_TOOLS, ...AppState.customTools] : DEFAULT_TOOLS;
  const q = searchQ.toLowerCase();

  const visible = tools.filter(t => {
    const catMatch = filterCat === 'all' || t.cat === filterCat;
    const searchMatch = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  if (visible.length === 0) {
    list.innerHTML = `<div style="padding:16px 8px;text-align:center;font-size:11px;color:var(--text-muted)">No tools match "${escHtml(searchQ || filterCat)}"</div>`;
    return;
  }

  list.innerHTML = visible.map(tool => `
    <div class="tool-card" data-filter="${escHtml(tool.cat)}" data-tool-id="${escHtml(tool.id)}">
      <div class="tool-card-icon cat-${escHtml(tool.cat)}">${escHtml(tool.name.slice(0,2).toUpperCase())}</div>
      <div class="tool-card-body">
        <div class="tool-card-name">${escHtml(tool.name)}</div>
        <div class="tool-card-desc">${escHtml(tool.desc)}</div>
      </div>
      <button class="tool-run-btn" data-tool-id="${escHtml(tool.id)}" title="Ask AI to run ${escHtml(tool.name)}">▶</button>
    </div>
  `).join('');

  // Wire run buttons — send message to AI asking to execute the tool
  list.querySelectorAll('.tool-run-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tool = tools.find(t => t.id === btn.dataset.toolId);
      if (!tool) return;
      const tab = getActiveTab();
      const target = tab?.session?.targetIp || tab?.session?.name || '{target}';
      const cmd = tool.cmd.replace(/\{target\}/g, target);
      if (typeof sendChatMessage === 'function') sendChatMessage(`Run ${tool.name}: \`${cmd}\``);
    });
  });

  // Wire card click — paste command into message input
  list.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('tool-run-btn')) return;
      const tool = tools.find(t => t.id === card.dataset.toolId);
      if (!tool) return;
      const tab = getActiveTab();
      const target = tab?.session?.targetIp || tab?.session?.name || '{target}';
      const cmd = tool.cmd.replace(/\{target\}/g, target);
      const inp = $('#message-input');
      if (inp) { inp.value = cmd; inp.focus(); if (typeof autoResizeInput === 'function') autoResizeInput(inp); }
    });
  });
}

// Render notes list into #notes-list
function renderNotesPanel(tab, tabName = 'notes') {
  const list = $('#notes-list');
  if (!list) return;

  // Migrate legacy .notes string into .notesList array
  if (tab?.session) {
    tab.session.notesList = tab.session.notesList || [];
    if (tab.session.notes && tab.session.notesList.length === 0) {
      tab.session.notesList.push({ id: generateId(), text: tab.session.notes, createdAt: Date.now(), bookmark: false });
    }
  }

  // Determine note source: session notes if session active, else global notes
  const isGlobal = !tab?.session;
  const notes = tab?.session?.notesList || (AppState.globalNotes = AppState.globalNotes || []);
  const showBookmarks = tabName === 'bookmarks';
  const filtered = showBookmarks ? notes.filter(n => n.bookmark) : notes;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding:12px 8px;font-size:11px;color:var(--text-muted);text-align:center">${showBookmarks ? 'No bookmarks yet' : 'No notes — click + New Note'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(note => `
    <div class="note-card" data-note-id="${escHtml(note.id)}">
      <div class="note-card-meta" style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
        <span class="note-card-date" style="font-size:9px;color:var(--text-muted);flex:1">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="note-bookmark-btn${note.bookmark ? ' bookmarked' : ''}" data-note-id="${escHtml(note.id)}" title="${note.bookmark ? 'Unbookmark' : 'Bookmark'}" style="background:none;border:none;cursor:pointer;font-size:12px;color:${note.bookmark ? 'var(--warning)' : 'var(--text-muted)'}">★</button>
        <button class="note-del-btn" data-note-id="${escHtml(note.id)}" title="Delete" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-muted)">×</button>
      </div>
      <textarea class="note-card-text" data-note-id="${escHtml(note.id)}" rows="3" placeholder="Write your note here..." style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:11px;padding:6px;resize:vertical;font-family:inherit">${escHtml(note.text)}</textarea>
    </div>
  `).join('');

  // Wire textarea auto-save on blur
  list.querySelectorAll('.note-card-text').forEach(ta => {
    ta.addEventListener('blur', () => {
      const n = notes.find(n => n.id === ta.dataset.noteId);
      if (n) {
        n.text = ta.value;
        if (tab?.session) autoSaveTab(tab);
      }
    });
  });

  // Wire bookmark buttons
  list.querySelectorAll('.note-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = notes.find(n => n.id === btn.dataset.noteId);
      if (n) {
        n.bookmark = !n.bookmark;
        renderNotesPanel(tab, tabName);
        if (tab?.session) autoSaveTab(tab);
      }
    });
  });

  // Wire delete buttons
  list.querySelectorAll('.note-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = notes.findIndex(n => n.id === btn.dataset.noteId);
      if (idx !== -1) {
        notes.splice(idx, 1);
        if (isGlobal) AppState.globalNotes = notes;
        else if (tab?.session) { tab.session.notesList = notes; autoSaveTab(tab); }
        renderNotesPanel(tab, tabName);
      }
    });
  });
}

// =============================================================================
// SECTION 3S2 — OVERVIEW SCREEN
// =============================================================================

function wireOverviewScreen() {
  const backBtn = $('#overview-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      // Go back to dashboard or lab depending on what's active
      const tab = getActiveTab();
      switchScreen(tab?.session ? 'lab' : 'dashboard');
    });
  }

  const newSessionBtn = $('#overview-new-session-btn');
  if (newSessionBtn && !newSessionBtn._wired) {
    newSessionBtn._wired = true;
    newSessionBtn.addEventListener('click', () => showNewSessionModal());
  }

  // Quick action buttons use event delegation
  const ovBody = $('#overview-body');
  if (ovBody && !ovBody._wired) {
    ovBody._wired = true;
    ovBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.ov-action-btn');
      if (!btn) return;
      const screen = btn.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (screen === 'recon')    { if (typeof wireReconScreen === 'function') wireReconScreen(); }
        if (screen === 'commands') { if (typeof wireCommandsScreen === 'function') wireCommandsScreen(); }
        if (['exploits','enum','privesc','postex','loot'].includes(screen)) {
          if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
        }
      }
    });
  }

  renderOverviewScreen();
}

function renderOverviewScreen() {
  const tab = getActiveTab();
  const s = tab?.session;

  const bodyEl    = $('#overview-body');
  const noSessEl  = $('#overview-no-session');

  if (!s) {
    if (bodyEl)   bodyEl.style.display   = 'none';
    if (noSessEl) noSessEl.style.display = 'flex';
    return;
  }
  if (bodyEl)   bodyEl.style.display   = 'grid';
  if (noSessEl) noSessEl.style.display = 'none';

  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val || '—'; };

  // Target info
  const sessionName = s.name || s.labName || (typeof s.target === 'object' ? s.target?.ip : s.target) || 'Unnamed Session';
  setTxt('#ov-target-name', sessionName);
  setTxt('#ov-ip',         s.targetIp       || s.target?.ip       || '—');
  setTxt('#ov-hostname',   s.targetHostname  || s.target?.hostname || '—');
  setTxt('#ov-os',         s.targetOs        || s.target?.os       || '—');
  setTxt('#ov-platform',   s.platform || '—');
  setTxt('#ov-difficulty', s.difficulty || '—');
  setTxt('#ov-duration',   s.startTime ? formatDuration(Date.now() - s.startTime) : '—');

  // Findings counters
  setTxt('#ov-ports',  s.findings?.ports?.length  || 0);
  setTxt('#ov-users',  s.findings?.users?.length  || 0);
  setTxt('#ov-creds',  s.findings?.credentials?.length || 0);
  setTxt('#ov-flags',  s.findings?.flags?.length  || 0);
  setTxt('#ov-cves',   s.findings?.cves?.length   || 0);
  setTxt('#ov-hashes', s.findings?.hashes?.length || 0);

  // Methodology phases
  const phasesEl = $('#ov-methodology-phases');
  if (phasesEl) {
    const phases    = s.methodology?.phases    || [];
    const completed = s.methodology?.completed || [];
    const active    = s.methodology?.activePhase;

    if (phases.length === 0) {
      phasesEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px">No methodology phases — start or resume a session to track progress.</div>';
    } else {
      phasesEl.innerHTML = phases.map((phase, i) => {
        const isDone   = completed.includes(phase);
        const isActive = phase === active;
        const cls = isDone ? 'done' : isActive ? 'active' : '';
        const checkContent = isDone ? '✓' : isActive ? '▶' : String(i + 1);
        return `<div class="ov-phase-row ${cls}">
          <div class="ov-phase-check">${checkContent}</div>
          <span class="ov-phase-name">${escHtml(phase)}</span>
          ${isActive ? '<span class="ov-phase-badge">Active</span>' : ''}
          ${isDone   ? '<span class="ov-phase-badge done-badge">Done</span>' : ''}
        </div>`;
      }).join('');
    }
  }
}

// =============================================================================
// SECTION 3T — DASHBOARD SCREEN
// =============================================================================

const PENTEST_TIPS = [
  'Always run nmap with -sV -sC for service version detection and default scripts.',
  'Check robots.txt and sitemap.xml early — they often reveal hidden endpoints.',
  'LinPEAS and WinPEAS are your best friends for automated privesc enumeration.',
  'Look for password reuse: credentials found in one place often work elsewhere.',
  'enumerate SMB shares even if port 445 is filtered — try other ports too.',
  'GTFOBins is the go-to reference for SUID/sudo binary exploitation.',
  'Always check /etc/cron* and /var/spool/cron for scheduled tasks you can abuse.',
  'BloodHound visualises Active Directory attack paths that would take hours to find manually.',
  'Burp Suite\'s Intruder is powerful for fuzzing web params — set up your lists well.',
  'When stuck, ask the AI for a methodology walkthrough for the specific service.',
  'Document everything as you go — flags, credentials, and commands used.',
  'Check for default credentials before anything else on network services.',
  'Feroxbuster with a good wordlist beats dirb for recursive directory enumeration.',
  'Pass-the-hash works on Windows even when you can\'t crack the NTLM hash.',
  'Always pivot through a compromised host to reach internal network segments.',
];

function wireDashboardScreen() {
  // New session button
  const newBtn = $('#dash-new-session-btn');
  if (newBtn && !newBtn._wired) {
    newBtn._wired = true;
    newBtn.addEventListener('click', () => showNewSessionModal());
  }

  // Quick action buttons
  $$('.dash-action-btn').forEach(btn => {
    if (btn._wired) return; btn._wired = true;
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (screen === 'progress')  refreshProgressScreen();
        if (screen === 'tracker')   refreshTrackerScreen();
        if (screen === 'notes')     { if (typeof refreshNotesScreen === 'function') refreshNotesScreen(); }
        if (screen === 'bookmarks') { if (typeof refreshBookmarksScreen === 'function') refreshBookmarksScreen(); }
      }
    });
  });

  // Phase card buttons
  $$('.dash-phase-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.addEventListener('click', () => {
      const screen = card.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
      }
    });
  });

  renderDashboardScreen();
}

function renderDashboardScreen() {
  // Operator name
  const nameEl = $('#dash-operator-name');
  if (nameEl) {
    const opName = AppState.config?.operatorName
      || document.querySelector('.sidebar-username')?.textContent?.trim()
      || 'Operator';
    nameEl.textContent = opName;
  }

  // Stats
  const totalSessions = AppState.tabs.filter(t => t.session).length;
  let totalFlags = 0, totalMachines = 0, totalNotes = 0;
  AppState.tabs.forEach(t => {
    if (t.session) {
      totalFlags += (t.session.findings?.flags?.length || 0);
      if (t.session.findings?.flags?.length > 0) totalMachines++;
      totalNotes += (t.session.notesList?.length || 0);
    }
  });
  totalNotes += (AppState.globalNotes?.length || 0);

  const setStat = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setStat('#dash-stat-sessions', totalSessions);
  setStat('#dash-stat-flags', totalFlags);
  setStat('#dash-stat-machines', totalMachines);
  setStat('#dash-stat-notes', totalNotes);

  // Recent sessions
  const sessionsEl = $('#dash-recent-sessions');
  if (sessionsEl) {
    const sessions = AppState.tabs.filter(t => t.session).slice(-6).reverse();
    if (sessions.length === 0) {
      sessionsEl.innerHTML = '<div class="dash-empty">No sessions yet — click + New Session</div>';
    } else {
      sessionsEl.innerHTML = sessions.map(tab => {
        const s = tab.session;
        const dur = s.startTime ? formatDuration(Date.now() - s.startTime) : '';
        return `
          <div class="dash-session-row" data-tab-id="${escHtml(tab.id)}">
            <div class="dash-session-dot" style="background:${s.platform === 'HTB' ? '#9fef00' : s.platform === 'THM' ? '#e8211d' : 'var(--accent)'}"></div>
            <div class="dash-session-name">${escHtml(s.name || s.labName || (typeof s.target === 'object' ? (s.target?.ip || s.target?.hostname || '') : s.target) || 'Unnamed Session')}</div>
            <div class="dash-session-meta">${escHtml(s.platform || '')} · ${escHtml(dur)}</div>
          </div>`;
      }).join('');

      sessionsEl.querySelectorAll('.dash-session-row').forEach(row => {
        row.addEventListener('click', () => {
          const tabId = row.dataset.tabId;
          const tab = AppState.tabs.find(t => t.id === tabId);
          if (tab) {
            AppState.activeTabId = tabId;
            switchScreen('lab');
            if (typeof renderTabBar === 'function') renderTabBar();
            if (typeof renderSessionInfo === 'function') renderSessionInfo(tab.session);
          }
        });
      });
    }
  }

  // Tip of the day
  const tipEl = $('#dash-tip-text');
  if (tipEl) {
    const idx = new Date().getDate() % PENTEST_TIPS.length;
    tipEl.textContent = PENTEST_TIPS[idx];
  }
}

// =============================================================================
// SECTION 3U — PHASE SCREENS (Exploits, Enum, PrivEsc, Post, Loot)
// =============================================================================

// Per-phase config
const PHASE_CONFIG = {
  exploits: { cats: ['exploit'],           findingsKey: 'exploits',   inputId: 'exploits-new-input', statusId: 'exploits-new-status', saveId: 'exploits-new-save-btn', listId: 'exploits-findings-list', libId: 'exploits-library-list', searchId: 'exploits-lib-search' },
  enum:     { cats: ['enum','recon'],       findingsKey: 'enum',       inputId: 'enum-new-input',     statusId: 'enum-new-status',     saveId: 'enum-new-save-btn',     listId: 'enum-findings-list',     libId: 'enum-library-list',     searchId: 'enum-lib-search' },
  privesc:  { cats: ['privesc'],            findingsKey: 'privesc',    inputId: 'privesc-new-input',  statusId: 'privesc-new-status',  saveId: 'privesc-add-save-btn',  listId: 'privesc-findings-list',  libId: 'privesc-library-list',  searchId: 'privesc-lib-search' },
  postex:   { cats: ['post'],              findingsKey: 'postex',     inputId: 'postex-new-input',   statusId: 'postex-new-status',   saveId: 'postex-new-save-btn',   listId: 'postex-findings-list',   libId: 'postex-library-list',   searchId: 'postex-lib-search' },
  loot:     { cats: [],                    findingsKey: 'loot',       inputId: 'loot-new-input',     statusId: 'loot-new-type',       saveId: 'loot-new-save-btn',     listId: 'loot-findings-list',     libId: 'loot-quick-cmds',       searchId: null },
};

// AppState.phaseFindings[sessionId][phase] = [{id, text, status, createdAt}]
function getPhaseFindings(phase) {
  const tab = getActiveTab();
  const sessionId = tab?.session ? tab.id : '__global__';
  AppState.phaseFindings = AppState.phaseFindings || {};
  AppState.phaseFindings[sessionId] = AppState.phaseFindings[sessionId] || {};
  AppState.phaseFindings[sessionId][phase] = AppState.phaseFindings[sessionId][phase] || [];
  return AppState.phaseFindings[sessionId][phase];
}

function wirePhaseScreens() {
  // Wire .phase-back-btn (all phase screens share this class)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.phase-back-btn')) switchScreen('dashboard');
  });

  // Wire each phase screen's add button and library
  Object.keys(PHASE_CONFIG).forEach(phase => {
    wireSinglePhaseScreen(phase);
  });

  // Wire loot quick command cards (copy to chat)
  $$('.loot-cmd-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.addEventListener('click', () => copyToClipboard(card.dataset.cmd, card));
  });
}

function wireSinglePhaseScreen(phase) {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg) return;

  // Save / add button
  const saveBtn = $(`#${cfg.saveId}`);
  if (saveBtn && !saveBtn._wired) {
    saveBtn._wired = true;
    saveBtn.addEventListener('click', () => {
      const inputEl  = $(`#${cfg.inputId}`);
      const statusEl = $(`#${cfg.statusId}`);
      const text   = (inputEl?.value || '').trim();
      if (!text) { showToast('Enter a value first', 'warning'); return; }
      const status = statusEl?.value || 'found';
      const findings = getPhaseFindings(phase);
      findings.unshift({ id: generateId(), text, status, createdAt: Date.now() });
      if (inputEl) inputEl.value = '';
      renderPhaseFindings(phase);
      savePhaseData();
      showToast('Finding added', 'success', 1200);
    });
    // Also allow Enter key in input
    const inputEl = $(`#${cfg.inputId}`);
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
    }
  }

  // Library search
  if (cfg.searchId) {
    const searchEl = $(`#${cfg.searchId}`);
    if (searchEl && !searchEl._wired) {
      searchEl._wired = true;
      searchEl.addEventListener('input', () => renderPhaseLibrary(phase, searchEl.value));
    }
  }
}

function refreshPhaseScreen(phase) {
  renderPhaseFindings(phase);
  renderPhaseLibrary(phase);
}

function renderPhaseFindings(phase) {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg) return;
  const list = $(`#${cfg.listId}`);
  if (!list) return;

  const findings = getPhaseFindings(phase);
  if (findings.length === 0) {
    list.innerHTML = `<div class="phase-empty">No findings yet — add above or pick from the library</div>`;
    return;
  }

  list.innerHTML = findings.map(f => `
    <div class="phase-finding-row" data-finding-id="${escHtml(f.id)}">
      <span class="phase-finding-text">${escHtml(f.text)}</span>
      <span class="phase-finding-status ${escHtml(f.status)}">${escHtml(f.status)}</span>
      <button class="phase-finding-copy-btn" data-text="${escHtml(f.text)}" title="Copy">⧉</button>
      <button class="phase-finding-copy-btn" data-chat="${escHtml(f.text)}" title="Send to AI chat" style="font-size:12px">💬</button>
      <button class="phase-finding-del-btn" data-id="${escHtml(f.id)}" title="Delete">×</button>
    </div>
  `).join('');

  // Wire buttons
  list.querySelectorAll('.phase-finding-copy-btn[data-text]').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.text, btn));
  });
  list.querySelectorAll('.phase-finding-copy-btn[data-chat]').forEach(btn => {
    btn.addEventListener('click', () => {
      sendChatMessage(`Can you help me with this finding: ${btn.dataset.chat}`);
      switchScreen('lab');
    });
  });
  list.querySelectorAll('.phase-finding-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const findings = getPhaseFindings(phase);
      const idx = findings.findIndex(f => f.id === btn.dataset.id);
      if (idx !== -1) { findings.splice(idx, 1); renderPhaseFindings(phase); savePhaseData(); }
    });
  });
}

function renderPhaseLibrary(phase, query = '') {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg || !cfg.libId) return;
  const libEl = $(`#${cfg.libId}`);
  if (!libEl || phase === 'loot') return; // loot has static cards

  const q = query.toLowerCase();
  const tools = DEFAULT_TOOLS.filter(t => {
    const catMatch = cfg.cats.length === 0 || cfg.cats.includes(t.cat);
    const searchMatch = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  if (tools.length === 0) {
    libEl.innerHTML = '<div class="phase-empty">No tools match</div>';
    return;
  }

  libEl.innerHTML = tools.map(tool => `
    <div class="phase-lib-card" data-tool-id="${escHtml(tool.id)}">
      <div class="phase-lib-icon">${escHtml(tool.name.slice(0,2).toUpperCase())}</div>
      <div class="phase-lib-info">
        <div class="phase-lib-name">${escHtml(tool.name)}</div>
        <div class="phase-lib-desc">${escHtml(tool.desc)}</div>
      </div>
      <button class="phase-lib-add-btn" data-tool-id="${escHtml(tool.id)}" title="Add to session findings">+ Add</button>
    </div>
  `).join('');

  libEl.querySelectorAll('.phase-lib-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tool = DEFAULT_TOOLS.find(t => t.id === btn.dataset.toolId);
      if (!tool) return;
      const findings = getPhaseFindings(phase);
      if (findings.some(f => f.text === tool.name)) { showToast('Already in findings', 'info'); return; }
      findings.unshift({ id: generateId(), text: tool.name, status: 'found', createdAt: Date.now() });
      renderPhaseFindings(phase);
      savePhaseData();
      btn.textContent = '✓'; btn.disabled = true;
      showToast(`${tool.name} added`, 'success', 1200);
    });
  });

  libEl.querySelectorAll('.phase-lib-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('phase-lib-add-btn')) return;
      const tool = DEFAULT_TOOLS.find(t => t.id === card.dataset.toolId);
      if (tool) {
        const tab = getActiveTab();
        const target = tab?.session?.targetIp || '{target}';
        const cmd = tool.cmd.replace(/\{target\}/g, target);
        const inp = $('#message-input');
        if (inp) { inp.value = cmd; inp.focus(); if (typeof autoResizeInput === 'function') autoResizeInput(inp); }
        switchScreen('lab');
      }
    });
  });
}

function savePhaseData() {
  // Phase data is in AppState.phaseFindings — auto-saved with session if active
  const tab = getActiveTab();
  if (tab?.session) {
    tab.session.phaseFindings = AppState.phaseFindings?.[tab.id] || {};
    autoSaveTab(tab);
  }
}

// =============================================================================
// SECTION 3P — NOTES SCREEN
// =============================================================================

function wireNotesScreen() {
  const backBtn = $('#notes-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const newBtn = $('#notes-screen-new-btn');
  if (newBtn && !newBtn._wired) {
    newBtn._wired = true;
    newBtn.addEventListener('click', () => {
      const note = { id: generateId(), text: '', createdAt: Date.now(), bookmark: false };
      AppState.globalNotes = AppState.globalNotes || [];
      AppState.globalNotes.unshift(note);
      renderNotesScreen();
      setTimeout(() => {
        const firstTA = document.querySelector('#notes-screen-grid textarea');
        if (firstTA) firstTA.focus();
      }, 50);
    });
  }

  const searchEl = $('#notes-screen-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', renderNotesScreen);
  }

  const filterEl = $('#notes-screen-filter');
  if (filterEl && !filterEl._wired) {
    filterEl._wired = true;
    filterEl.addEventListener('change', renderNotesScreen);
  }
}

function refreshNotesScreenFilter() {
  const filterEl = $('#notes-screen-filter');
  if (!filterEl) return;
  const sessionOptions = AppState.tabs
    .filter(t => t.session)
    .map(t => `<option value="session-${escHtml(t.id)}">${escHtml(t.session.name || t.session.labName || (typeof t.session.target === 'object' ? t.session.target?.ip : t.session.target) || 'Session')}</option>`)
    .join('');
  filterEl.innerHTML = `
    <option value="all">All Notes</option>
    <option value="global">Global Notes</option>
    ${sessionOptions}
  `;
}

function refreshNotesScreen() {
  refreshNotesScreenFilter();
  renderNotesScreen();
}

function renderNotesScreen() {
  const grid = $('#notes-screen-grid');
  if (!grid) return;

  const q = ($('#notes-screen-search')?.value || '').toLowerCase();
  const filter = $('#notes-screen-filter')?.value || 'all';

  let allNotes = [];

  if (filter === 'all' || filter === 'global') {
    (AppState.globalNotes || []).forEach(n => allNotes.push({ ...n, _source: 'Global', _tab: null }));
  }

  if (filter === 'all') {
    AppState.tabs.forEach(tab => {
      if (tab.session?.notesList) {
        tab.session.notesList.forEach(n => {
          allNotes.push({ ...n, _source: tab.session.name || tab.session.labName || (typeof tab.session.target === 'object' ? tab.session.target?.ip : tab.session.target) || 'Session', _tab: tab });
        });
      }
    });
  } else if (filter.startsWith('session-')) {
    const tabId = filter.replace('session-', '');
    const tab = AppState.tabs.find(t => t.id === tabId);
    if (tab?.session?.notesList) {
      tab.session.notesList.forEach(n => {
        allNotes.push({ ...n, _source: tab.session.name || 'Session', _tab: tab });
      });
    }
  }

  if (q) allNotes = allNotes.filter(n => (n.text || '').toLowerCase().includes(q) || (n._source || '').toLowerCase().includes(q));
  allNotes.sort((a, b) => b.createdAt - a.createdAt);

  if (allNotes.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);font-size:13px">${q ? 'No notes match your search' : 'No notes yet — click + New Note to start'}</div>`;
    return;
  }

  grid.innerHTML = allNotes.map(note => `
    <div class="note-full-card" data-note-id="${escHtml(note.id)}" data-tab-id="${note._tab ? escHtml(note._tab.id) : ''}">
      <div class="note-full-card-header">
        <span class="note-full-card-source">${escHtml(note._source)}</span>
        <span class="note-full-card-date">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="note-screen-bookmark-btn${note.bookmark ? ' bookmarked' : ''}" data-note-id="${escHtml(note.id)}" title="${note.bookmark ? 'Unbookmark' : 'Bookmark'}" style="background:none;border:none;cursor:pointer;font-size:14px;color:${note.bookmark ? 'var(--warning)' : 'var(--text-muted)'}">★</button>
        <button class="note-screen-del-btn" data-note-id="${escHtml(note.id)}" title="Delete" style="background:none;border:none;cursor:pointer;font-size:15px;color:var(--text-muted)">×</button>
      </div>
      <textarea class="note-screen-text" data-note-id="${escHtml(note.id)}" rows="5" placeholder="Write your note here...">${escHtml(note.text)}</textarea>
    </div>
  `).join('');

  grid.querySelectorAll('.note-screen-text').forEach(ta => {
    ta.addEventListener('blur', () => {
      const noteId = ta.dataset.noteId;
      const card = ta.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        if (tab?.session?.notesList) {
          const n = tab.session.notesList.find(n => n.id === noteId);
          if (n) { n.text = ta.value; autoSaveTab(tab); }
        }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.text = ta.value;
      }
    });
  });

  grid.querySelectorAll('.note-screen-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        const n = tab?.session?.notesList?.find(n => n.id === noteId);
        if (n) { n.bookmark = !n.bookmark; autoSaveTab(tab); }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.bookmark = !n.bookmark;
      }
      renderNotesScreen();
    });
  });

  grid.querySelectorAll('.note-screen-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      showConfirm('Delete this note?', (ok) => {
        if (!ok) return;
        if (tabId) {
          const tab = AppState.tabs.find(t => t.id === tabId);
          if (tab?.session?.notesList) {
            tab.session.notesList = tab.session.notesList.filter(n => n.id !== noteId);
            autoSaveTab(tab);
          }
        } else {
          AppState.globalNotes = (AppState.globalNotes || []).filter(n => n.id !== noteId);
        }
        renderNotesScreen();
      });
    });
  });
}

// =============================================================================
// SECTION 3Q — BOOKMARKS SCREEN
// =============================================================================

function wireBookmarksScreen() {
  const backBtn = $('#bookmarks-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const searchEl = $('#bookmarks-screen-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', renderBookmarksScreen);
  }
}

function refreshBookmarksScreen() {
  renderBookmarksScreen();
}

function renderBookmarksScreen() {
  const body = $('#bookmarks-screen-body');
  if (!body) return;

  const q = ($('#bookmarks-screen-search')?.value || '').toLowerCase();

  let bookmarks = [];
  (AppState.globalNotes || []).forEach(n => {
    if (n.bookmark) bookmarks.push({ ...n, _source: 'Global', _tab: null });
  });
  AppState.tabs.forEach(tab => {
    if (tab.session?.notesList) {
      tab.session.notesList.filter(n => n.bookmark).forEach(n => {
        bookmarks.push({ ...n, _source: tab.session.name || tab.session.target || 'Session', _tab: tab });
      });
    }
  });

  if (q) bookmarks = bookmarks.filter(n => (n.text || '').toLowerCase().includes(q) || (n._source || '').toLowerCase().includes(q));
  bookmarks.sort((a, b) => b.createdAt - a.createdAt);

  if (bookmarks.length === 0) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">No bookmarks yet — star any note to pin it here</div>`;
    return;
  }

  body.innerHTML = `<div class="bookmarks-grid">${bookmarks.map(note => `
    <div class="bookmark-card" data-note-id="${escHtml(note.id)}" data-tab-id="${note._tab ? escHtml(note._tab.id) : ''}">
      <div class="bookmark-card-header">
        <span class="bookmark-card-source">${escHtml(note._source)}</span>
        <span class="bookmark-card-date">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="bm-unbookmark-btn" data-note-id="${escHtml(note.id)}" title="Remove bookmark" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--warning)">★</button>
      </div>
      <div class="bookmark-card-text">${escHtml((note.text || '').slice(0, 300))}${(note.text || '').length > 300 ? '…' : ''}</div>
    </div>
  `).join('')}</div>`;

  body.querySelectorAll('.bm-unbookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.bookmark-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        const n = tab?.session?.notesList?.find(n => n.id === noteId);
        if (n) { n.bookmark = false; autoSaveTab(tab); }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.bookmark = false;
      }
      renderBookmarksScreen();
    });
  });
}

// =============================================================================
// SECTION 3R — COMMANDS SCREEN
// =============================================================================

function wireCommandsScreen() {
  // ── Tab switching — use event delegation on the tab bar ──────────────────────
  const tabBar = $('.cmd-tab-bar');
  if (tabBar && !tabBar._wired) {
    tabBar._wired = true;
    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.cmd-tab');
      if (!btn) return;
      $$('.cmd-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panelId = `cmd-panel-${btn.dataset.cmdTab}`;
      $$('.cmd-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
    });
  }

  // ── Back button ──────────────────────────────────────────────────────────────
  const cmdBack = $('#commands-back-btn');
  if (cmdBack && !cmdBack._wired) { cmdBack._wired = true; cmdBack.addEventListener('click', () => switchScreen('dashboard')); }

  // ── Command Builder ──────────────────────────────────────────────────────────
  const cmdCatSel   = $('#cmd-tool-category-select');
  const cmdToolSel  = $('#cmd-tool-select');
  const cmdParamsEl = $('#cmd-tool-params');
  const cmdOutputEl = $('#cmd-builder-output');
  const cmdOutputWrap = $('#cmd-builder-output-wrap');

  if (cmdCatSel && !cmdCatSel._wired) {
    cmdCatSel._wired = true;
    cmdCatSel.innerHTML = '<option value="">Select category...</option>' +
      TOOL_CATEGORIES.map(cat =>
        `<option value="${escHtml(cat.id)}">${escHtml(cat.label)}</option>`
      ).join('');

    cmdCatSel.addEventListener('change', () => {
      const catId = cmdCatSel.value;
      if (!cmdToolSel) return;
      const tools = catId ? TOOLS.filter(t => t.category === catId) : [];
      cmdToolSel.innerHTML = '<option value="">Select tool...</option>' +
        tools.map(t => `<option value="${escHtml(t.id)}">${escHtml(t.label)}</option>`).join('');
      if (cmdParamsEl) cmdParamsEl.innerHTML = '';
      if (cmdOutputWrap) cmdOutputWrap.style.display = 'none';
    });
  }

  if (cmdToolSel && !cmdToolSel._wired) {
    cmdToolSel._wired = true;
    cmdToolSel.addEventListener('change', () => {
      const tool = TOOLS.find(t => t.id === cmdToolSel.value);
      if (!tool || !cmdParamsEl) { if (cmdParamsEl) cmdParamsEl.innerHTML = ''; return; }

      function renderCmdParamField(p) {
        const label = `<label class="param-label" for="cmd-param-${escHtml(p.id)}">${escHtml(p.label)}${p.required ? ' *' : ''}</label>`;
        let input = '';
        if (p.type === 'select') {
          input = `<select class="tool-select param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}">${(p.options||[]).map(o=>`<option value="${escHtml(o.value||o)}">${escHtml(o.label||o)}</option>`).join('')}</select>`;
        } else if (p.type === 'checkbox') {
          input = `<input type="checkbox" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" ${p.default?'checked':''}>`;
        } else if (p.type === 'textarea') {
          input = `<textarea class="param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder||'')}" rows="3"></textarea>`;
        } else {
          input = `<input type="text" class="param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder||p.default||'')}" value="${escHtml(p.default||'')}">`;
        }
        return `<div class="param-field" style="margin-bottom:6px">${label}${input}${p.hint?`<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${escHtml(p.hint)}</div>`:''}</div>`;
      }

      cmdParamsEl.innerHTML = (tool.params || []).map(renderCmdParamField).join('') +
        `<button class="btn btn-primary" id="cmd-build-btn" style="width:100%;margin-top:8px">⚡ Build Command</button>`;

      // Pre-fill target from session
      const targetInput = cmdParamsEl.querySelector('[data-param="target"]');
      if (targetInput) {
        const tab = getActiveTab();
        const ip = tab?.session?.targetIp;
        if (ip && !targetInput.value) targetInput.value = ip;
      }

      const buildBtn = $('#cmd-build-btn');
      if (buildBtn) {
        buildBtn.addEventListener('click', () => {
          const params = {};
          cmdParamsEl.querySelectorAll('[data-param]').forEach(el => {
            params[el.dataset.param] = el.type === 'checkbox' ? el.checked : el.value;
          });
          let cmd = tool.buildCommand ? tool.buildCommand(params) : (tool.cmd || '');
          if (!tool.buildCommand) {
            Object.entries(params).forEach(([k, v]) => {
              cmd = cmd.replace(new RegExp(`\\{${k}\\}`, 'g'), v || `{${k}}`);
            });
          }
          if (cmdOutputEl) { cmdOutputEl.textContent = cmd; if (typeof hljs !== 'undefined') hljs.highlightElement(cmdOutputEl); }
          if (cmdOutputWrap) {
            cmdOutputWrap.style.display = '';
            const copyBtn = cmdOutputWrap.querySelector('.copy-btn');
            if (copyBtn && !copyBtn._wired) {
              copyBtn._wired = true;
              copyBtn.addEventListener('click', () => copyToClipboard(cmd, copyBtn));
            }
          }
        });
      }
    });
  }

  // ── Reverse Shell ────────────────────────────────────────────────────────────
  const cmdLangSel  = $('#cmd-revshell-lang');
  const cmdIpInput  = $('#cmd-revshell-ip');
  const cmdPortInput = $('#cmd-revshell-port');
  const cmdEncSel   = $('#cmd-revshell-encoding');

  if (cmdLangSel && !cmdLangSel._wired) {
    cmdLangSel._wired = true;
    cmdLangSel.innerHTML = SHELL_LANGUAGES.map(lang =>
      `<option value="${escHtml(lang.id)}">${escHtml(lang.label)}</option>`
    ).join('');

    // Pre-fill IP hint from active session
    if (cmdIpInput) {
      const tab = getActiveTab();
      if (tab?.session?.targetIp) cmdIpInput.placeholder = tab.session.targetIp;
    }

    function generateCmdRevshell() {
      const lang   = cmdLangSel.value;
      const ip     = (cmdIpInput?.value || '').trim() || '10.10.14.1';
      const port   = (cmdPortInput?.value || '').trim() || '4444';
      const encode = cmdEncSel?.value || 'raw';
      const shell    = generateShell(lang, ip, port);
      const encoded  = encodeShell(shell, encode);
      const listener = `nc -lvnp ${port}`;
      const stable   = `python3 -c 'import pty;pty.spawn("/bin/bash")'\nexport TERM=xterm\n# Ctrl+Z, then: stty raw -echo; fg`;

      const payloadEl  = $('#cmd-revshell-payload-out');
      const listenerEl = $('#cmd-revshell-listener-out');
      const stableEl   = $('#cmd-revshell-stable-out');
      const langLabel  = $('#cmd-revshell-lang-label');
      const outputsEl  = $('#cmd-revshell-outputs');

      if (payloadEl)  { payloadEl.textContent  = encoded;  if (typeof hljs !== 'undefined') hljs.highlightElement(payloadEl); }
      if (listenerEl) { listenerEl.textContent = listener; if (typeof hljs !== 'undefined') hljs.highlightElement(listenerEl); }
      if (stableEl)   { stableEl.textContent   = stable; }
      if (langLabel)  langLabel.textContent = lang;
      if (outputsEl)  outputsEl.style.display = '';

      // Wire copy buttons (idempotent)
      const copyPayload  = $('#cmd-copy-revshell-payload');
      const copyListener = $('#cmd-copy-revshell-listener');
      const copyStable   = $('#cmd-copy-revshell-stable');
      if (copyPayload  && !copyPayload._wired)  { copyPayload._wired  = true; copyPayload.addEventListener('click',  () => copyToClipboard(encoded,  copyPayload)); }
      if (copyListener && !copyListener._wired) { copyListener._wired = true; copyListener.addEventListener('click', () => copyToClipboard(listener, copyListener)); }
      if (copyStable   && !copyStable._wired)   { copyStable._wired   = true; copyStable.addEventListener('click',  () => copyToClipboard(stable,   copyStable)); }
    }

    [cmdLangSel, cmdEncSel].forEach(el => el?.addEventListener('change', generateCmdRevshell));
  }

  // ── Encoder ──────────────────────────────────────────────────────────────────
  const cmdEncInput  = $('#cmd-encode-input');
  const cmdEncOutput = $('#cmd-encode-output');
  const cmdEncOpSel  = $('#cmd-encode-operation');
  const cmdEncRunBtn = $('#cmd-encode-run-btn');
  const cmdEncSwapBtn = $('#cmd-encode-swap-btn');

  if (cmdEncOpSel && !cmdEncOpSel._wired) {
    cmdEncOpSel._wired = true;
    const ENC_OPS = [
      { id: 'base64-encode', label: 'Base64 Encode' },
      { id: 'base64-decode', label: 'Base64 Decode' },
      { id: 'url-encode',    label: 'URL Encode' },
      { id: 'url-decode',    label: 'URL Decode' },
      { id: 'html-encode',   label: 'HTML Encode' },
      { id: 'html-decode',   label: 'HTML Decode' },
      { id: 'hex-encode',    label: 'Hex Encode' },
      { id: 'hex-decode',    label: 'Hex Decode' },
      { id: 'rot13',         label: 'ROT13' },
      { id: 'binary-encode', label: 'Text → Binary' },
      { id: 'binary-decode', label: 'Binary → Text' },
      { id: 'md5',           label: 'MD5 Hash' },
      { id: 'sha1',          label: 'SHA1 Hash' },
      { id: 'sha256',        label: 'SHA256 Hash' },
      { id: 'jwt-decode',    label: 'JWT Decode' },
    ];
    cmdEncOpSel.innerHTML = ENC_OPS.map(o => `<option value="${o.id}">${escHtml(o.label)}</option>`).join('');

    async function runCmdEncoder() {
      const input = cmdEncInput?.value || '';
      const op = cmdEncOpSel?.value;
      if (!op) return;
      try {
        const result = await applyEncoderOp(op, input);
        if (cmdEncOutput) cmdEncOutput.value = result;
      } catch (e) {
        if (cmdEncOutput) cmdEncOutput.value = `Error: ${e.message}`;
      }
    }

    if (cmdEncRunBtn && !cmdEncRunBtn._wired) { cmdEncRunBtn._wired = true; cmdEncRunBtn.addEventListener('click', runCmdEncoder); }
    if (cmdEncSwapBtn && !cmdEncSwapBtn._wired) {
      cmdEncSwapBtn._wired = true;
      cmdEncSwapBtn.addEventListener('click', () => {
        if (!cmdEncInput || !cmdEncOutput) return;
        const tmp = cmdEncInput.value;
        cmdEncInput.value = cmdEncOutput.value;
        cmdEncOutput.value = tmp;
      });
    }
  }

  // ── Cheatsheets ───────────────────────────────────────────────────────────────
  const cmdCsSelect  = $('#cmd-cheatsheet-select');
  const cmdCsContent = $('#cmd-cheatsheet-content');

  if (cmdCsSelect && typeof CHEATSHEETS !== 'undefined' && !cmdCsSelect._wired) {
    cmdCsSelect._wired = true;
    const topics = Object.keys(CHEATSHEETS);
    cmdCsSelect.innerHTML = topics.map(t =>
      `<option value="${t}">${escHtml(CHEATSHEETS[t].title || t)}</option>`
    ).join('');

    function renderCmdCheatsheet(topic) {
      if (!cmdCsContent) return;
      const sheet = CHEATSHEETS[topic];
      if (!sheet) { cmdCsContent.innerHTML = ''; return; }
      let html = `<div class="cs-title">${escHtml(sheet.title)}</div>`;
      (sheet.sections || []).forEach(section => {
        const sectionHeading = section.heading || section.title || '';
        html += `<div class="cs-section"><div class="cs-section-title">${escHtml(sectionHeading)}</div>
          ${(section.items || []).map(item => {
            const itemKey = item.flag || item.cmd || '';
            return `
            <div class="cs-item">
              <div class="cs-item-cmd"><code>${escHtml(itemKey)}</code>
                <button class="cs-copy-btn" data-cmd="${escHtml(itemKey)}" title="Copy">⧉</button>
                <button class="cs-chat-btn" data-cmd="${escHtml(itemKey)}" title="Discuss in chat">💬</button>
              </div>
              ${item.desc ? `<div class="cs-item-desc">${escHtml(item.desc)}</div>` : ''}
            </div>`;
          }).join('')}
        </div>`;
      });
      cmdCsContent.innerHTML = html;
      cmdCsContent.querySelectorAll('.cs-copy-btn').forEach(btn =>
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd, btn))
      );
      cmdCsContent.querySelectorAll('.cs-chat-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          sendChatMessage(`Explain this command and when I should use it:\n\`\`\`bash\n${btn.dataset.cmd}\n\`\`\``);
          switchScreen('lab');
        })
      );
    }

    cmdCsSelect.addEventListener('change', () => renderCmdCheatsheet(cmdCsSelect.value));
    if (topics.length > 0) renderCmdCheatsheet(topics[0]);
  }

  // ── References ────────────────────────────────────────────────────────────────
  $$('.ref-card').forEach(card => {
    if (card._wired) return;
    card._wired = true;
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url && window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    });
  });
}

// =============================================================================
// SECTION 3S — RECON SCREEN
// =============================================================================

function wireReconScreen() {
  const backBtn = $('#recon-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const clearBtn = $('#recon-clear-btn');
  if (clearBtn && !clearBtn._wired) {
    clearBtn._wired = true;
    clearBtn.addEventListener('click', () => {
      ['#recon-ip','#recon-hostname','#recon-ports','#recon-creds','#recon-raw-output'].forEach(sel => {
        const el = $(sel); if (el) el.value = '';
      });
      const osEl = $('#recon-os'); if (osEl) osEl.selectedIndex = 0;
      const aiOut = $('#recon-ai-output');
      if (aiOut) aiOut.innerHTML = '<span class="recon-placeholder">AI analysis of your scan output will appear here. Paste your nmap / gobuster / nikto output on the left and click Analyse.</span>';
      const extracted = $('#recon-extracted-list'); if (extracted) extracted.innerHTML = '';
      const status = $('#recon-ai-status'); if (status) status.textContent = 'Paste scan output and click Analyse';
    });
  }

  const applyBtn = $('#recon-apply-btn');
  if (applyBtn && !applyBtn._wired) {
    applyBtn._wired = true;
    applyBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab?.session) { showToast('No active session — start a session first', 'warning'); return; }

      const ip       = ($('#recon-ip')?.value       || '').trim();
      const hostname = ($('#recon-hostname')?.value  || '').trim();
      const os       = $('#recon-os')?.value         || '';
      const ports    = ($('#recon-ports')?.value     || '').trim();
      const creds    = ($('#recon-creds')?.value     || '').trim();

      if (ip)       tab.session.targetIp       = ip;
      if (hostname) tab.session.targetHostname = hostname;
      if (os)       tab.session.targetOs       = os;

      if (ports) {
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift({ id: generateId(), text: `Open ports:\n${ports}`, createdAt: Date.now(), bookmark: true });
      }
      if (creds) {
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift({ id: generateId(), text: `Credentials:\n${creds}`, createdAt: Date.now(), bookmark: true });
      }

      autoSaveTab(tab);
      if (typeof renderSessionInfo === 'function') renderSessionInfo(tab.session);
      showToast('Recon data applied to session ✓', 'success');
      switchScreen('lab');
    });
  }

  const analyseBtn = $('#recon-analyse-btn');
  if (analyseBtn && !analyseBtn._wired) {
    analyseBtn._wired = true;
    analyseBtn.addEventListener('click', async () => {
      const raw = ($('#recon-raw-output')?.value || '').trim();
      if (!raw) { showToast('Paste scan output first', 'warning'); return; }

      const ip     = ($('#recon-ip')?.value || '').trim();
      const tab    = getActiveTab();
      const target = ip || tab?.session?.targetIp || tab?.session?.name || 'unknown target';
      const status = $('#recon-ai-status');
      const aiOut  = $('#recon-ai-output');

      if (status) status.textContent = 'Sending to AI…';
      if (aiOut)  aiOut.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:16px;text-align:center">Sending to AI…</div>';

      const prompt = `Analyse the following scan output for target: ${target}\n\nIdentify:\n- Open ports and services with version details\n- Potential attack vectors and vulnerabilities\n- Recommended enumeration next steps\n- Any CVEs or known exploits\n- Missing security controls\n\nScan output:\n\`\`\`\n${raw.slice(0, 4000)}\n\`\`\``;

      try {
        sendChatMessage(prompt);
        if (status) status.textContent = 'Sent to AI — check Chat tab';
        if (aiOut)  aiOut.innerHTML = '<div style="color:var(--success);font-size:12px;padding:16px;text-align:center">Analysis sent to AI ✓<br><span style="color:var(--text-muted)">Switch to Chat to see the response.</span></div>';
        showToast('Scan sent to AI for analysis', 'info');
      } catch (e) {
        if (status) status.textContent = 'Error sending';
        if (aiOut)  aiOut.innerHTML = `<div style="color:var(--error);font-size:12px;padding:16px">Error: ${escHtml(e.message)}</div>`;
      }
    });
  }

  const extractBtn = $('#recon-extract-btn');
  if (extractBtn && !extractBtn._wired) {
    extractBtn._wired = true;
    extractBtn.addEventListener('click', () => {
      const raw   = $('#recon-raw-output')?.value || '';
      const ports = $('#recon-ports')?.value       || '';
      const combined = raw + '\n' + ports;
      const extracted = $('#recon-extracted-list');
      if (!extracted) return;

      const findings  = [];
      const seenPorts = new Set();
      const seenIps   = new Set();
      const seenCves  = new Set();
      let m;

      // Open ports  (nmap: "22/tcp  open  ssh")
      const portRe = /(\d+)\/(tcp|udp)\s+open\s+(\S+)/gi;
      while ((m = portRe.exec(combined)) !== null) {
        const entry = `Port ${m[1]}/${m[2]} — ${m[3]}`;
        if (!seenPorts.has(entry)) { seenPorts.add(entry); findings.push({ type:'port', value:entry }); }
      }

      // IP addresses
      const ipRe = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
      while ((m = ipRe.exec(combined)) !== null) {
        if (!seenIps.has(m[1])) { seenIps.add(m[1]); findings.push({ type:'ip', value:m[1] }); }
      }

      // Usernames
      const userRe = /(?:user(?:name)?s?|account|login)[\s:=]+([a-zA-Z0-9_\-\.@]+)/gi;
      while ((m = userRe.exec(combined)) !== null) {
        findings.push({ type:'user', value:m[1] });
      }

      // CVE IDs
      const cveRe = /CVE-\d{4}-\d{4,7}/gi;
      while ((m = cveRe.exec(combined)) !== null) {
        const cve = m[0].toUpperCase();
        if (!seenCves.has(cve)) { seenCves.add(cve); findings.push({ type:'cve', value:cve }); }
      }

      if (findings.length === 0) {
        extracted.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px">No structured findings found — try pasting full nmap -sV -sC output.</div>';
        return;
      }

      const typeIcon  = { port:'🔌', ip:'🌐', user:'👤', cve:'⚠️' };
      const typeColor = { port:'var(--accent)', ip:'var(--success)', user:'var(--warning)', cve:'var(--error)' };

      extracted.innerHTML = findings.map(f => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg3);border-radius:4px;font-size:11px;font-family:var(--font-mono)">
          <span>${typeIcon[f.type]||'•'}</span>
          <span style="color:${typeColor[f.type]||'var(--text)'};flex:1">${escHtml(f.value)}</span>
          <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 6px"
            data-finding-type="${escHtml(f.type)}" data-finding-val="${escHtml(f.value)}"
            title="Save to active session findings">+ Save</button>
        </div>
      `).join('');

      extracted.querySelectorAll('[data-finding-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = getActiveTab();
          if (!tab?.session) { showToast('No active session', 'warning'); return; }
          tab.session.findings = tab.session.findings || { ports:[], users:[], credentials:[], flags:[], cves:[], files:[], hashes:[], services:[] };
          const fType = btn.dataset.findingType;
          const fVal  = btn.dataset.findingVal;
          const listMap = { port:'ports', ip:'services', user:'users', cve:'cves' };
          const listKey = listMap[fType] || 'services';
          tab.session.findings[listKey] = tab.session.findings[listKey] || [];
          if (!tab.session.findings[listKey].includes(fVal)) {
            tab.session.findings[listKey].push(fVal);
            autoSaveTab(tab);
            showToast('Saved to session findings ✓', 'success');
            btn.textContent = '✓'; btn.disabled = true;
          } else {
            showToast('Already in findings', 'info');
          }
        });
      });

      showToast(`Extracted ${findings.length} finding${findings.length !== 1 ? 's' : ''}`, 'success');
    });
  }
}

function refreshReconScreen() {
  const tab = getActiveTab();
  if (!tab?.session) return;
  const ipEl       = $('#recon-ip');
  const hostnameEl = $('#recon-hostname');
  const osEl       = $('#recon-os');
  if (ipEl       && tab.session.targetIp       && !ipEl.value)       ipEl.value       = tab.session.targetIp;
  if (hostnameEl && tab.session.targetHostname && !hostnameEl.value) hostnameEl.value = tab.session.targetHostname;
  if (osEl       && tab.session.targetOs)                            osEl.value       = tab.session.targetOs;
}

// =============================================================================
// SECTION 3N — GLOBAL INIT (DOMContentLoaded)
// =============================================================================

async function init() {
  console.log('[INIT] Starting CyberLab Companion…');

  try {
    // Show splash immediately
    showSplash();
    console.log('[INIT] Splash shown');

    // Load config
    try {
      const config = await window.electronAPI.getConfig();
      if (config) Object.assign(AppState.config, config);
      console.log('[INIT] Config loaded, theme:', AppState.config.theme);
    } catch (e) {
      console.warn('[INIT] Config load failed:', e.message);
    }

    // Check API key
    try {
      AppState.apiKeyValid = await window.electronAPI.hasApiKey();
      console.log('[INIT] API key present:', AppState.apiKeyValid);
    } catch (e) {
      console.warn('[INIT] hasApiKey failed:', e.message);
    }

    // Wire IPC listeners
    wireIpcListeners();
    console.log('[INIT] IPC listeners wired');

    // Apply theme early (no flicker)
    applyTheme(AppState.config.theme || 'stealth', false);
    console.log('[INIT] Theme applied');

    // Wire wizard buttons — use event delegation on the wizard container
    // because .wizard-next and .wizard-back are classes, not IDs
    const wizardEl = $('#setup-wizard');
    if (wizardEl) {
      wizardEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('wizard-next')) wizardNext();
        if (btn.classList.contains('wizard-back')) wizardPrev();
      });
    }
    const wizardFinishBtn = $('#wizard-finish');
    if (wizardFinishBtn) wizardFinishBtn.addEventListener('click', wizardFinish);
    const browseVaultBtn = $('#browse-vault-btn');
    if (browseVaultBtn) browseVaultBtn.addEventListener('click', wizardPickObsidian);
    const testApiBtn = $('#test-api-btn');
    if (testApiBtn) testApiBtn.addEventListener('click', wizardTestApi);
    const openAnthropicLink = $('#open-anthropic-link');
    if (openAnthropicLink) openAnthropicLink.addEventListener('click', () => {
      window.electronAPI.openExternal('https://console.anthropic.com');
    });

    // Wire tab-bar new tab button (HTML: id="new-tab-btn", class="tab-add")
    const newTabBtn = $('#new-tab-btn');
    if (newTabBtn) newTabBtn.addEventListener('click', () => showNewSessionModal());

    // After splash delay, decide: wizard or app
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('[INIT] Splash delay done, setupComplete:', AppState.config.setupComplete);

    hideSplash(() => {
      try {
        if (!AppState.config.setupComplete) {
          console.log('[INIT] Showing setup wizard');
          showWizard();
        } else {
          console.log('[INIT] Showing app');
          showApp();
        }
      } catch (e) {
        console.error('[INIT] Error in hideSplash callback:', e);
        showInitError(e);
      }
    });

    // Wire API status dot click → settings
    const apiDot = $('#api-status-dot');
    if (apiDot) {
      apiDot.addEventListener('click', () => {
        switchScreen('settings');
        const apiKeyInput = $('#settings-apikey');
        if (apiKeyInput) apiKeyInput.focus();
      });
    }

    // Wire VPN indicator click
    const vpnIndicator = $('#vpn-indicator');
    if (vpnIndicator) {
      vpnIndicator.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) sendChatMessage('Check my VPN connection status and advise on next steps.');
      });
    }

    // Wire chat input
    wireChatInput();

    // Wire side panels
    wireChatSidePanel();

    // Wire snippet search overlay
    wireSnippetSearchOverlay();

    // Wire snippets screen
    wireSnippetsScreen();

    // Wire sessions list button
    const sessionsListBtn = $('#sessions-list-btn');
    if (sessionsListBtn) sessionsListBtn.addEventListener('click', showSessionsModal);

    // Wire session nav
    const navSessionsBtn = $('#nav-sessions-btn');
    if (navSessionsBtn) navSessionsBtn.addEventListener('click', showSessionsModal);

    // Duration ticker — update every second for status bar, every minute for side panel
    setInterval(() => {
      const tab = getActiveTab();
      if (!tab?.session?.startTime) return;
      const dur = formatDuration(Date.now() - tab.session.startTime);
      // Legacy elapsed-display (target panel)
      const durEl = $('#elapsed-display');
      if (durEl) durEl.textContent = dur;
      // Also legacy session-duration if present
      const durEl2 = $('#session-duration');
      if (durEl2) durEl2.textContent = dur;
      // v2 status bar
      const statusEl = $('#status-elapsed');
      if (statusEl) statusEl.textContent = dur;
    }, 1000);

    // AI link handler
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.ai-link');
      if (link) {
        e.preventDefault();
        const href = link.dataset.href;
        if (href && href.startsWith('http')) window.electronAPI.openExternal(href);
      }
    });

    // Update API status dot
    updateApiStatusDot(AppState.apiKeyValid);
    console.log('[INIT] Init complete');

  } catch (e) {
    console.error('[INIT] Fatal error during init:', e);
    showInitError(e);
  }
}

function showInitError(e) {
  // Show error on splash screen so user can see what went wrong
  const splash = $('#splash');
  if (splash) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);background:#ff4466;color:#fff;padding:12px 24px;border-radius:8px;font-size:13px;max-width:600px;text-align:center;font-family:monospace;';
    errDiv.textContent = 'Init error: ' + (e && e.message ? e.message : String(e)) + ' — Check DevTools Console (Ctrl+Shift+I)';
    splash.style.position = 'relative';
    splash.appendChild(errDiv);
  }
}

// Boot — handles both cases: DOMContentLoaded not yet fired, or already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// =============================================================================
// END OF RENDERER PART 3
// =============================================================================
