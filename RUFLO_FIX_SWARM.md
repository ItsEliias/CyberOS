# CyberOS — RuFlo Fix Swarm Prompt

Paste everything between ---BEGIN--- and ---END--- into Claude Code.
This fixes all visual and usability issues across 5 apps simultaneously.

---BEGIN---

Use `ruflo-swarm` to spawn 5 parallel fix agents across the CyberOS project. Each agent fixes one app. All agents share the same design rules below.

---

### SHARED FIX RULES — all agents must apply these to every screen in their app

#### 1. Text contrast — mandatory everywhere

Every piece of text must be clearly readable. Apply these minimum contrast rules with no exceptions:

- **Primary text** (headings, labels, values, nav items): `#e2e8f0` — never below `#c9d1d9`
- **Secondary text** (subtitles, descriptions, timestamps): `#8b949e` — never below `#6b7a90`
- **Muted text** (hints, placeholders): `#4a5568` — never below `#3d4a5c`
- **Never** use the app accent color alone as text on a dark background unless the contrast ratio is above 4.5:1
- **Never** use `opacity: 0.3` or lower on any text that carries information
- Buttons must have text that is either `#e2e8f0` (on dark backgrounds) or `#0a0a0f` (on accent-colored backgrounds)
- Input placeholder text: `#4a5568` minimum
- All monospace/code text: `#e2e8f0` on `rgba(10,10,15,0.8)` background

#### 2. Per-app color scheme with user-selectable theme

Each app must implement a theme system with these three user-configurable values stored in the app's settings (persisted to disk):

```typescript
interface AppTheme {
  accentColor: string     // Default: the app's accent color (see per-agent section)
  bgColor: string         // Default: '#0a0a0f'
  textColor: string       // Default: '#e2e8f0'
}
```

Add a **Theme** section to each app's Settings screen with:
- **Accent color** — color picker (or 6 preset swatches: the app default + `#4a9eff` + `#3fb950` + `#d29922` + `#b44fff` + `#f78166`)
- **Background** — 4 preset options: Dark `#0a0a0f` / Graphite `#111318` / Navy `#0d1117` / OLED `#000000`
- **Text brightness** — slider from `#8b949e` (dim) to `#ffffff` (bright), default `#e2e8f0`
- A live preview swatch showing the three colors together
- "Reset to defaults" button

Apply the theme by setting CSS variables on `:root` or the app wrapper:
```css
--app-accent: [accentColor];
--app-bg: [bgColor];
--app-text: [textColor];
```

Then use `var(--app-accent)` throughout instead of hardcoded hex values where accent is used.

#### 3. Launch popup / splash screen spacing

If the app has a launch popup, onboarding modal, or splash screen:
- Padding: minimum `24px` on all sides
- Line height: `1.6` on all body text
- Word spacing: `normal` (do not set custom word-spacing)
- Letter spacing: `0` on body text, `0.05em` only on uppercase labels
- Heading font size: `18px` max for modal titles
- Body font size: `14px`, line height `1.6`
- Button height: minimum `36px`, padding `0 20px`
- Gap between elements: minimum `12px`
- Max modal width: `480px`, centered with `margin: auto`
- No text should be clipped, overlapping, or running outside its container

#### 4. Card and panel structure

All cards and panels must use the glassmorphism standard:
```css
background: rgba(22, 27, 39, 0.75);
backdrop-filter: blur(8px);
border: 1px solid rgba(42, 51, 71, 0.6);
border-radius: 8px;
padding: 16px;
```

Inner content spacing:
- Section headings inside cards: `text-xs font-medium uppercase tracking-wider text-[#4a5568]`, margin-bottom `8px`
- Data rows: `12px` vertical padding each
- Dividers: `1px solid rgba(42, 51, 71, 0.4)`

#### 5. Buttons

All buttons must follow this system:

**Primary** (accent-filled):
```css
background: var(--app-accent);
color: #0a0a0f;
padding: 0 16px;
height: 34px;
border-radius: 6px;
font-size: 13px;
font-weight: 500;
```

**Secondary** (ghost):
```css
background: rgba(42, 51, 71, 0.4);
color: #e2e8f0;
border: 1px solid rgba(42, 51, 71, 0.6);
padding: 0 16px;
height: 34px;
border-radius: 6px;
font-size: 13px;
```

**Danger**:
```css
background: rgba(248, 81, 73, 0.15);
color: #f85149;
border: 1px solid rgba(248, 81, 73, 0.3);
```

Hover states: increase background opacity by 20%, 150ms transition.

---

### AGENT ASSIGNMENTS

---

#### Agent 1 — `credvault-fix`
- **Working directory:** `./CredVault`
- **Accent color:** `#f78166` (Coral)
- **Default theme:** `{ accentColor: '#f78166', bgColor: '#0a0a0f', textColor: '#e2e8f0' }`

**Specific fixes:**

1. **Post-login UI** — the vault browser shown after unlocking is messy. Rebuild it with this clear layout:
   - Left panel (260px): search bar at top, then credential list below. Each list item: service name in `text-sm text-[#e2e8f0]`, username in `text-xs text-[#8b949e]`, category chip. Active item: coral left border + `bg-[rgba(247,129,102,0.08)]`.
   - Right panel (flex-1): credential detail card. Show service, username, password (masked with reveal toggle), notes, copy buttons per field. Use `.glass-card` for the detail panel.
   - Header bar above both panels: search scope toggle (All / Logins / Cards / Notes) as pill tabs in coral accent.

2. **Password field**: masked by default (`••••••••`), reveal icon button on right side of field. Copy button beside it. Both clearly visible against the background.

3. **Category sidebar or filter**: if categories exist in the sidebar, ensure the text labels are `#e2e8f0` and selected state uses coral accent left border.

4. **Add/Edit form**: all input labels `text-xs text-[#8b949e]`, input fields `bg-[rgba(10,10,15,0.8)] border border-[rgba(42,51,71,0.6)] text-[#e2e8f0] rounded-md px-3 py-2`. No invisible text in any field.

5. **Implement theme settings** per shared rules above.

---

#### Agent 2 — `signalboard-fix`
- **Working directory:** `./SignalBoard`
- **Accent color:** `#ff6b6b` (Red-Orange)
- **Default theme:** `{ accentColor: '#ff6b6b', bgColor: '#0a0a0f', textColor: '#e2e8f0' }`

**Specific fixes:**

1. **Feed layout** — rebuild the article list with clear visual hierarchy:
   - Article card: `.glass-card` with `padding: 14px 16px`. Title: `text-sm font-semibold text-[#e2e8f0]` (max 2 lines, ellipsis). Source + timestamp: `text-xs text-[#8b949e] font-mono`. Description/excerpt: `text-xs text-[#8b949e]` (max 3 lines). Relevance score badge: pill in accent color at top-right of card.
   - Ensure article titles are always `#e2e8f0` — never the accent color or a dark color that blends into the background.

2. **Sidebar / filter panel**: Feed source names `text-sm text-[#e2e8f0]`. Active feed: `#ff6b6b` left border. Unread count badge: `bg-[rgba(255,107,107,0.2)] text-[#ff6b6b] text-xs rounded-full px-2`.

3. **Buttons**: "Mark read", "Bookmark", "Open" buttons must all follow the button system above. No invisible or low-contrast button text.

4. **Article reader pane** (if present): body text `text-sm text-[#e2e8f0] leading-relaxed`, links `text-[#ff6b6b]` underline on hover, code blocks `bg-[rgba(10,10,15,0.8)] text-[#e2e8f0]`.

5. **Empty state**: when no feeds or no articles, show centered empty state with icon, `text-[#4a5568]` message, and a clearly visible "Add Feed" button in accent color.

6. **Implement theme settings** per shared rules above.

---

#### Agent 3 — `networkmap-fix`
- **Working directory:** `./NetworkMap`
- **Accent color:** `#d29922` (Amber)
- **Default theme:** `{ accentColor: '#d29922', bgColor: '#0a0a0f', textColor: '#e2e8f0' }`

**Specific fixes:**

1. **Graph canvas** — the SVG graph view is the primary screen and must look professional:
   - Canvas background: `#0a0a0f` (solid, no gradient on the SVG itself)
   - Node circles: filled with the node color (per port count rules), `stroke: rgba(255,255,255,0.15)`, `stroke-width: 1.5`
   - Node labels: IP address in `font-family: JetBrains Mono, monospace`, `font-size: 11px`, `fill: #e2e8f0`, positioned 18px below node center. Hostname (if present) in `font-size: 9px`, `fill: #8b949e`, below IP.
   - Edges: `stroke: rgba(42, 51, 71, 0.8)`, `stroke-width: 1.5`
   - Selected node: amber outer ring `stroke: #d29922`, `stroke-width: 2.5`, glow `filter: drop-shadow(0 0 6px rgba(210,153,34,0.6))`
   - Hover node: brighten fill + show tooltip

2. **Node tooltip on hover**: glass card style, `position: absolute`, `z-index: 50`. Show IP, hostname, OS, open port count. Background `rgba(22,27,39,0.95)`, border `rgba(42,51,71,0.8)`, text `#e2e8f0`. Arrow pointer at bottom.

3. **Node detail panel** (slide-in from right, 320px): clear section headings, port table with columns PORT / SERVICE / STATE. State dot: green for open, amber for filtered, red for closed. All text clearly visible. "Copy IP" and "Open in ReconDesk" buttons styled per button system.

4. **Sidebar** — graph info, filters, legend, and graph library:
   - All sidebar text: labels `text-xs text-[#8b949e]`, values `text-sm text-[#e2e8f0]`
   - Legend dots: properly colored with labels in `text-xs text-[#e2e8f0]`
   - Graph library list items: name `text-sm text-[#e2e8f0]`, date `text-xs text-[#8b949e] font-mono`, active graph: amber left border
   - Min ports slider: styled with amber accent on the thumb and filled track

5. **Import modal**: tab buttons clearly visible, textarea `bg-[rgba(10,10,15,0.8)] text-[#e2e8f0] border-[rgba(42,51,71,0.6)]`, parse result summary in green/amber/red for success/warning/error counts.

6. **Zoom controls** (bottom-left of canvas): small glass buttons `+` `-` `Reset` `Fit` — `text-[#e2e8f0]`, hover amber.

7. **Implement theme settings** per shared rules above.

---

#### Agent 4 — `playbookstudio-fix`
- **Working directory:** `./PlaybookStudio`
- **Accent color:** `#4a9eff` (Blue)
- **Default theme:** `{ accentColor: '#4a9eff', bgColor: '#0a0a0f', textColor: '#e2e8f0' }`

**Specific fixes:**

The app is currently unusable. Do a full UI rebuild of all screens while keeping the existing data model and IPC handlers intact. Do not touch `src/main/`. Rebuild only renderer components.

1. **Playbook library (home screen)**:
   - Grid of playbook cards (2 columns). Each card: `.glass-card`, title `text-sm font-semibold text-[#e2e8f0]`, step count `text-xs text-[#8b949e]`, category chip, "Run" button (blue accent, primary style) + "Edit" button (secondary style). Hover: card border brightens to `rgba(74,158,255,0.4)`.
   - "+ New Playbook" button: top-right of header, primary blue button style.
   - Empty state: centered, clearly visible "Create your first playbook" message + button.

2. **Playbook editor**:
   - Left panel (280px): playbook metadata (name input, description textarea, category select). Below: ordered step list — each step is a draggable card with step number, name truncated, drag handle icon. Add step button at bottom.
   - Right panel: step editor. Fields: Step Name, Command (monospace textarea with `$TARGET` and `$TARGET_IP` highlighted), Expected Output (textarea), Notes (textarea). All inputs styled with dark background, `#e2e8f0` text, `rgba(42,51,71,0.6)` border.
   - Save button: top-right, blue primary style.

3. **Run mode** (when "Run" is clicked):
   - Full-screen step-by-step view. Top: playbook name + progress bar (step X of Y) in blue accent.
   - Current step card (large, centered): step name as heading, command in monospace code block `bg-[rgba(10,10,15,0.8)] text-[#e2e8f0] p-4 rounded-md border border-[rgba(42,51,71,0.6)]`. `$TARGET` and `$TARGET_IP` replaced with live values from shared context and highlighted in blue.
   - Notes/expected output below in collapsible sections.
   - Bottom action bar: "← Previous" (secondary) | "✓ Mark Complete" (primary blue) | "Skip →" (secondary). All clearly visible.
   - Left sidebar: step checklist showing all steps, completed in green with checkmark, current in blue, pending in muted.

4. **Built-in playbooks**: ensure all 4 (Web App Recon, SMB Enumeration, AD Enumeration, Linux PrivEsc) are present with real, useful steps pre-populated.

5. **Implement theme settings** per shared rules above.

---

#### Agent 5 — `terminallink-fix`
- **Working directory:** `./TerminalLink`
- **Accent color:** `#00ff41` (Matrix Green)
- **Default theme:** `{ accentColor: '#00ff41', bgColor: '#0a0a0f', textColor: '#e2e8f0' }`

**Specific fixes:**

1. **DevTools open on launch** — this is a main process issue. In `src/main/main.ts` (or equivalent), find the `BrowserWindow` creation and ensure:
   ```typescript
   // Remove or guard this line:
   mainWindow.webContents.openDevTools()
   // It should only open in dev mode:
   if (process.env.NODE_ENV === 'development') {
     mainWindow.webContents.openDevTools()
   }
   ```
   Check all window creation calls (`mainWindow`, any secondary windows) and apply the same guard. This is the top priority fix.

2. **Context bar** (below title bar): shows `$TARGET`, `$TARGET_IP`, session name. Ensure:
   - Background `rgba(10,10,15,0.6)`, border-bottom `rgba(42,51,71,0.4)`
   - Label text: `text-xs font-mono text-[#4a5568]`
   - Value text: `text-xs font-mono text-[#e2e8f0]`
   - Status dot: green pulse when context set, grey when not
   - If no context: "No active target — $TARGET not set" in `text-xs text-[#4a5568]`

3. **Terminal pane**: confirm xterm.js theme is:
   ```typescript
   theme: {
     background: '#0a0a0f',
     foreground: '#e2e8f0',
     cursor: '#00ff41',
     cursorAccent: '#0a0a0f',
     selection: 'rgba(0, 255, 65, 0.25)',
     black: '#0a0a0f',
     brightBlack: '#4a5568',
     red: '#f85149',
     brightRed: '#ff6b6b',
     green: '#3fb950',
     brightGreen: '#00ff41',
     yellow: '#d29922',
     brightYellow: '#f0b429',
     blue: '#4a9eff',
     brightBlue: '#7bb8ff',
     magenta: '#b44fff',
     brightMagenta: '#d68cff',
     cyan: '#39c5cf',
     brightCyan: '#56d3db',
     white: '#c9d1d9',
     brightWhite: '#e2e8f0',
   }
   ```

4. **History panel** (slide-in 300px from right):
   - Header: "Command History" in `text-sm font-semibold text-[#e2e8f0]`, close button top-right
   - Search input: full width, `bg-[rgba(10,10,15,0.8)] text-[#e2e8f0] placeholder-[#4a5568] border-[rgba(42,51,71,0.6)]`
   - Command entries: timestamp `text-xs font-mono text-[#4a5568]`, command `text-xs font-mono text-[#e2e8f0]`, copy button on hover in green
   - "Export as .txt" button at bottom: secondary style, full width

5. **Split mode** toggle button and title bar buttons: must be clearly visible `text-[#e2e8f0]` with `hover:bg-[rgba(42,51,71,0.4)]`.

6. **Implement theme settings** per shared rules above.

---

### EXECUTION INSTRUCTIONS FOR ALL AGENTS

1. Read the existing source files in your working directory before making any changes
2. Apply all shared fix rules AND the app-specific fixes above
3. Do not touch `src/main/` except for the TerminalLink DevTools fix
4. Do not reinstall or change `package.json` dependencies
5. After all fixes, run `npm run build` and fix any TypeScript errors until it compiles clean
6. Write completion status to RuFlo memory: `cyberos:[appname]:fix-status` = `complete` or `failed:[reason]`

---END---
