# MANUS PROMPT — GhostVault
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for GhostVault. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS GHOSTVAULT?

GhostVault is the **note capture and Obsidian vault management layer** of CyberOS. It serves two distinct use cases that must both be excellent:

**Use case 1 — Quick capture (primary):** The operator is mid-session in another app. They hit `Cmd+Shift+G` and a small, focused capture window appears over everything. They type a note, tag it, and save it to the Obsidian vault in under 10 seconds. The window disappears.

**Use case 2 — Vault browser (secondary):** The operator opens GhostVault as a full application to browse their vault, edit notes, manage templates, and use the AI assistant.

GhostVault **does not store its own database** — it writes directly to Markdown files in the operator's Obsidian vault on disk. The vault path is configured in Settings.

**Accent color:** `#7bb8ff` (Soft Blue)

---

## TWO DISTINCT WINDOWS

GhostVault runs two separate Electron windows:

### Window A: Capture Window
- Size: `480 × 400px`
- Frameless, always-on-top, centered on current display
- Opened by global hotkey `Cmd+Shift+G` (registered via `globalShortcut` in main process)
- Closes on: Escape key, clicking outside, successful save, or explicit close button
- Does NOT appear in Dock or Cmd+Tab

### Window B: Main Vault Browser
- Size: minimum `960 × 680px`, resizable
- Standard Electron window with custom title bar
- Opened by clicking GhostVault in the Launcher, or from the Capture Window via "Browse Vault" button
- Appears in Dock normally

---

## DATA SOURCES

### Obsidian Vault (filesystem)
- Path configured in Settings (e.g., `~/Documents/ObsidianVault/`)
- GhostVault reads directory tree and file contents using Node.js `fs`
- Writes `.md` files directly to the vault

### cybertools-config.json
- Reads `shared_context.activeLab`, `shared_context.activeTarget`, `shared_context.activeIP` for session-linked templates
- Reads `ghostvault_status.noteCount` (writes this on each save)

### Clipboard (Capture Window only)
- When clipboard watch mode is on: polls `clipboard.readText()` every 1 second
- Auto-populates capture textarea when clipboard content changes

---

## WINDOW A: CAPTURE WINDOW

### Layout

```
┌────────────────────────────────────────────┐  ← 480px
│  [●●●]  GhostVault Quick Capture    [✕]   │  ← 36px header
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │  ← session banner (conditional)
│  │ 🔴 Active Lab: Pickle Rick           │  │
│  │    Auto-linking to: CyberLab/Pickle  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │  Note content...                     │  │  ← textarea (auto-grow, max 10 lines)
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Tags: [#lab] [#finding] [+]  [clipboard] │  ← tag row
│                                            │
│  Save to: [CyberLab/Pickle Rick ▾]        │  ← path selector
│                                            │
│         [Browse Vault]    [Save Note ↵]   │  ← action buttons
└────────────────────────────────────────────┘
```

### Session Banner
- Only shown when `shared_context.activeLab` is not null
- Background: `#7bb8ff/10`, left border 3px `#7bb8ff`
- Content: pulsing red dot + "Active Lab: [name]" + auto-suggested path below
- "Use template?" link: clicking pre-fills the textarea with the lab note template:
  ```
  **Lab:** Pickle Rick
  **Target:** 10.10.3.164
  **Finding:** 
  **Notes:** 
  ```
  And sets the save path to `CyberLab/Pickle Rick/`

### Note Textarea
- Full-width, auto-grows up to ~10 lines
- Monospace font (JetBrains Mono) — notes are markdown
- Placeholder: "Quick note... (supports Markdown)"
- Focus on open — cursor ready immediately
- Cmd+Enter: save

### Tag Row
- Existing tags shown as chips: `[#lab]` `[#finding]`
- [+] button: inline tag input
- Pre-populated from: session context (adds `#lab`, `#target` if context active) + common tags library
- [clipboard] icon: toggle clipboard watch mode. When on: icon pulses, clipboard changes auto-fill the textarea

### Save Path Selector
- Dropdown showing vault subdirectories
- If session context active: auto-suggests `CyberLab/[lab name]/` as first option
- "Custom path" option: opens a text input
- Recent paths shown in dropdown history (last 5)

### Action Buttons
- "Browse Vault": opens Window B (main vault browser)
- "Save Note": saves to vault, shows brief success state, closes window
- Keyboard: Cmd+Enter = Save, Escape = Cancel

### Success State (brief, 1.5 seconds)
```
┌────────────────────────────────────────────┐
│  ✓ Note saved to CyberLab/Pickle Rick/     │
│    "Quick note content..."                  │
└────────────────────────────────────────────┘
```
Then window closes automatically.

---

## WINDOW B: VAULT BROWSER

### Sidebar Navigation
```
🔵 GhostVault
──────────────────
🔴 Active: Pickle Rick
──────────────────
📓 All Notes
🔍 Search
🏷  Tags
📁 Browse Vault
🔧 Templates
🤖 AI Assistant
──────────────────
⚙ Settings
──────────────────
[Vault: 142 notes]
```

### Screen 1: All Notes (Default View)

Two-panel: note list left (320px), note content right.

**Left panel — Note list:**
- Search bar at top (filters list in real-time)
- Sort: Recent / Alphabetical / By tag
- Note list items:
  - File name (without .md extension)
  - First line of content (truncated)
  - Tags as small chips (first 2 tags visible)
  - Modified date in monospace `text-xs text-muted`
  - Hover: show "Edit" and "Delete" actions

**Right panel — Note content:**
- Default: rendered Markdown preview
- Edit mode: split view (editor left, preview right) or full editor (toggle)
- Top bar: note title (editable), tag editor, save button
- Editor uses a `<textarea>` with Markdown syntax highlighting (or a lightweight editor component like CodeMirror if available)
- Auto-save on edit (500ms debounce)

### Screen 2: Search

- Large search input at top, full-width
- Real-time search across all vault files (file name + content)
- Results grouped by: Best match / In CyberLab / In tags
- Each result: file path, matched content snippet (highlighted match text), tags
- Click result: opens in the note editor pane

### Screen 3: Tags

- Tag cloud or sorted list of all unique tags across the vault
- Each tag shows: name, count of notes with that tag
- Click tag: filter note list to only notes with that tag
- Most-used tags larger or more prominent

### Screen 4: Browse Vault (File Tree)

- Filesystem tree of the configured vault directory
- Expand/collapse folders
- File icons: `.md` = note icon, others = generic file icon
- Click `.md` file: open in note editor
- Right-click: delete, rename, move (within vault)
- "New Note" button: creates a new `.md` in the selected folder

### Screen 5: Templates

- List of saved templates (built-in + user-created)
- Built-in templates:
  - **Lab Session** — pre-fills with Lab/Target/Finding/Notes fields using `{{LAB}}`, `{{TARGET}}`, `{{IP}}` placeholders
  - **Recon Finding** — structured finding template
  - **Quick Note** — blank with date header
  - **Credential Record** — username/password/service/notes structure
- Each template card: name, preview of first 3 lines, "Use" and "Edit" buttons
- "New Template" button: opens template editor
- When using a template: placeholders replaced with current `shared_context` values

### Screen 6: AI Assistant (Ollama)

- Chat panel layout
- Chat history: scrollable, messages from user and AI clearly differentiated
- Input area at bottom with send button and Cmd+Enter shortcut
- "Attach current note" button: sends current open note as context
- Model selector: lists installed Ollama models from `http://localhost:11434/api/tags`
- Connection status: green dot if Ollama reachable, red if not
- "Test connection" button

**AI actions available:**
- "Format this note" — reformats current note into clean Markdown
- "Summarise" — generates a summary of the current note
- "Suggest tags" — AI suggests relevant tags based on content
- "Expand" — expands bullet points into full prose

All AI responses: appear as assistant messages. User must explicitly click "Apply" to replace note content with AI output.

### Screen 7: Settings

**Vault:**
- Vault path input + "Browse" button (opens directory picker)
- "Reveal vault in Finder" button
- Note count display (live)

**Capture Window:**
- Global hotkey configuration (currently `Cmd+Shift+G`) — show current, "Change" button
- Output directory (default subdirectory for quick captures)
- Auto-link lab sessions (toggle)
- Clipboard watch default state (toggle)
- Auto-close after save (toggle)

**Templates:**
- Lab template body (editable textarea with placeholder docs)
- Manage template library

**AI / Ollama:**
- Ollama base URL (default: `http://localhost:11434`)
- Default model selector
- "Test connection" button + connection status

**Appearance:**
- Note preview: rendered / raw / split (default)

---

## ZUSTAND STORES

### `useVaultStore`
```typescript
interface VaultState {
  vaultPath: string | null;
  notes: VaultNote[];          // metadata only, not full content
  tags: TagStats[];
  isLoading: boolean;
  
  // Current note
  activeNote: VaultNote | null;
  activeNoteContent: string;
  isDirty: boolean;
  
  // Ecosystem context
  sharedContext: SharedContext | null;
  
  // UI
  activeView: 'notes' | 'search' | 'tags' | 'browse' | 'templates' | 'ai' | 'settings';
  searchQuery: string;
  searchResults: SearchResult[];
  
  // Actions
  loadNotes: () => Promise<void>;
  openNote: (path: string) => Promise<void>;
  saveNote: () => Promise<void>;
  createNote: (path: string, content: string, tags: string[]) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  loadSharedContext: () => Promise<void>;
}
```

### `useCaptureStore`
```typescript
interface CaptureState {
  content: string;
  tags: string[];
  savePath: string;
  clipboardWatchActive: boolean;
  lastClipboardContent: string;
  sessionContext: SharedContext | null;
  isSaving: boolean;
  
  setContent: (content: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setSavePath: (path: string) => void;
  toggleClipboardWatch: () => void;
  save: () => Promise<void>;
  loadSessionContext: () => Promise<void>;
}
```

---

## IPC HANDLERS (main process)

```typescript
// Global hotkey
app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    captureWindow.show()
    captureWindow.focus()
  })
})

ipcMain.handle('ghostvault:vault:list', async (_, vaultPath: string) => { /* recursive file listing */ })
ipcMain.handle('ghostvault:note:read', async (_, filePath: string) => { /* read file content */ })
ipcMain.handle('ghostvault:note:write', async (_, filePath: string, content: string) => { /* write file */ })
ipcMain.handle('ghostvault:note:delete', async (_, filePath: string) => { /* delete file */ })
ipcMain.handle('ghostvault:note:search', async (_, vaultPath: string, query: string) => { /* grep files */ })
ipcMain.handle('ghostvault:config:read', async () => { /* read shared_context from cybertools-config.json */ })
ipcMain.handle('ghostvault:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
ipcMain.handle('ghostvault:clipboard:read', async () => { /* return clipboard.readText() */ })
ipcMain.handle('ghostvault:ollama:models', async () => { /* fetch from localhost:11434/api/tags */ })
ipcMain.handle('ghostvault:ollama:chat', async (_, model, messages) => { /* streaming chat */ })
```

---

## TYPE DEFINITIONS

```typescript
interface VaultNote {
  path: string;           // relative to vault root
  name: string;           // filename without .md
  tags: string[];         // parsed from frontmatter or inline #tags
  modifiedAt: Date;
  createdAt: Date;
  firstLine: string;      // for preview
  wordCount: number;
}

interface SearchResult {
  note: VaultNote;
  matches: { line: number; text: string; highlight: [number, number] }[];
  score: number;
}

interface TagStats {
  tag: string;
  count: number;
}

interface Template {
  id: string;
  name: string;
  content: string;         // Markdown with {{LAB}} {{TARGET}} {{IP}} placeholders
  isBuiltIn: boolean;
  createdAt: string;
}
```

---

## COMPONENT ARCHITECTURE

```
src/
├── main/
│   ├── windows/
│   │   ├── captureWindow.ts
│   │   └── vaultWindow.ts
│   ├── ipc/
│   │   └── ghostvault.ts
│   └── hotkey.ts
├── renderer-capture/            # Separate renderer for capture window
│   ├── App.tsx
│   ├── CaptureWindow.tsx
│   ├── SessionBanner.tsx
│   ├── TagInput.tsx
│   └── PathSelector.tsx
├── renderer/                    # Main vault browser
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── notes/
│   │   │   ├── NoteList.tsx
│   │   │   ├── NoteListItem.tsx
│   │   │   ├── NoteEditor.tsx
│   │   │   └── NotePreview.tsx
│   │   ├── search/
│   │   │   └── SearchView.tsx
│   │   ├── tags/
│   │   │   └── TagsView.tsx
│   │   ├── browse/
│   │   │   ├── FileTree.tsx
│   │   │   └── FileTreeNode.tsx
│   │   ├── templates/
│   │   │   ├── TemplateList.tsx
│   │   │   └── TemplateEditor.tsx
│   │   └── ai/
│   │       └── AIAssistantPanel.tsx
│   ├── stores/
│   │   ├── useVaultStore.ts
│   │   └── useCaptureStore.ts
│   └── types/
│       └── ghostvault.ts
```

---

## ANIMATIONS

- **Capture window open:** fade in (150ms), no position animation (it's already centered)
- **Session banner:** slide down from top when context detected
- **Save success state:** fade in → wait 1.5s → fade out + window close
- **Note list:** stagger items on initial load
- **Search results:** fade in as they arrive
- **AI messages:** stream in character by character (simulated stream from Ollama)
- **Clipboard watch toggle:** pulse animation on the clipboard icon when active

---

## CRITICAL REQUIREMENTS

1. Global hotkey `Cmd+Shift+G` must register on app startup and survive window close/show cycles
2. Vault path must be validated on Settings save — show error if path doesn't exist or isn't a directory
3. File writes must be atomic — never corrupt an existing note
4. Clipboard polling (1s interval) must be cleaned up when clipboard watch is toggled off
5. Tag parsing must handle both frontmatter YAML (`tags: [a, b]`) and inline `#tag` syntax
6. Session context must be loaded fresh each time the capture window opens (not cached from previous open)
7. The main vault browser must handle vaults with 500+ notes without UI jank — virtualize the note list
8. Ollama connection errors must be silent unless the user is actively trying to use AI features

---

## DELIVERABLES

1. All component files (both capture and vault browser renderers)
2. Main process: window managers, IPC handlers, hotkey registration
3. Zustand stores
4. Type definitions
5. `IMPLEMENTATION_PLAN.md` for GhostVault

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
