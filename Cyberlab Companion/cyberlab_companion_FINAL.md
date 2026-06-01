Build me a complete, production-quality desktop application (Windows, Mac, and Linux) called CYBERLAB COMPANION. It is an AI-powered assistant that helps me work through cybersecurity labs, CTF challenges, HackTheBox machines, TryHackMe rooms, Cisco networking labs, and any other hands-on cybersecurity exercise. It uses the Anthropic Claude API (claude-sonnet-4-20250514) as its AI brain. This must be a fully working app — not a prototype or skeleton. Every feature described below must be implemented and functional.

---

## PERSONAL BRANDING

The app is personalised for ItsEliias.
- Each app in the CyberTools suite has its own assets/logo.png — the user places whichever PNG they choose into each app's assets folder independently. No shared logo — fully customisable per app.
- Splash screen: assets/logo.png centered (max 180px wide, auto height, maintain aspect ratio), "CYBERLAB COMPANION" beneath in app title font, "// ItsEliias" as subtle subtitle. Fades into app after 2 seconds. If logo.png not found, show styled "CC" text mark.
- assets/logo.png displayed at 24px height in top bar. Aspect ratio preserved. If not found, "CC" placeholder in accent colour.
- The progress screen header reads "Welcome back, ItsEliias"
- Achievement unlock notifications address the user as ItsEliias
- All exported writeups include author: ItsEliias in their YAML frontmatter
- The status bar always ends with "ItsEliias // CYBERLAB COMPANION v1.0"
- The app window title bar shows "CYBERLAB COMPANION — ItsEliias"

---

## DESIGN PHILOSOPHY

Before writing a single line of code, internalise this: the app must feel like a professional tool, not a cluttered dashboard. Every feature must earn its place visually. The rule is: if it is not needed right now, it should not be visible right now. Use collapsible panels, tabs, toggleable modes, and contextual visibility to keep the interface clean at all times. When the user is deep in a lab, nothing should distract them. When they are reviewing progress, the stats screen takes over completely. Every screen has one job. Do not compromise on this under any circumstances.

---

## FIRST-TIME SETUP WIZARD

On very first launch (no config file exists), show a clean multi-step setup wizard before the splash screen:

Step 1 — Welcome: App logo, title, "Let's get you set up" message, Next button
Step 2 — API Key: Clean input field for Anthropic API key, explanation of what it is and where to get it (console.anthropic.com), stored via Electron safeStorage, test connection button that fires a minimal API call to verify the key works
Step 3 — Obsidian Vault: Folder picker for the user's Obsidian vault path, saved to ~/cybertools-config.json (shared with Vault Scraper companion app)
Step 4 — Theme: Four theme previews — Cyberpunk, Terminal, Stealth, Warrior — click to select
Step 5 — Done: "You're ready, ItsEliias" message with Begin button

Setup wizard never shows again after completion unless the user resets from Settings.

---

## AUTO-UPDATE CHECKER

On every launch (after setup), the app silently checks a GitHub releases URL (configurable in settings, default: left as a placeholder URL) for a newer version number. If a newer version is found, show a subtle banner below the top bar: "Update available — v1.x.x" with a "View Release" button that opens the GitHub releases page in the default browser. Never interrupt the user mid-session with update prompts.

---

## NAVIGATION — TOP BAR

A slim, always-visible top bar contains (left to right):
- Logo icon (assets/logo.png at 24px, or "CC" placeholder)
- App title "CYBERLAB COMPANION"
- "// ItsEliias" in accent colour, reduced opacity
- Active session indicator — pulsing green dot + lab name when session running, grey "No active session" when idle (centre)
- VPN status indicator — small shield icon showing: 🟢 VPN Active / 🔴 VPN Off / ⚪ Unknown. Detected by checking for common VPN interface names (tun0, tap0, ppp0) via a periodic Node.js network interface check every 30 seconds. Tooltip shows interface name and IP when active.
- Icon buttons (right): My Progress | Lab Tracker | Settings | Theme Dropdown | Focus Mode
- API status dot: green (connected) / red (error) / amber spinning (processing)

No text labels on top bar icon buttons — icons only with tooltips on hover. Clean and minimal.

Keyboard shortcuts:
Ctrl+Shift+F = Focus Mode
Ctrl+1/2/3 = switch themes
Ctrl+N = new session
Ctrl+T = new tab
Ctrl+W = close tab
Ctrl+Tab = cycle tabs
Ctrl+Enter = send message
Ctrl+[ = toggle left panel
Ctrl+] = toggle right panel
Ctrl+K = global snippet search
Ctrl+M = toggle Teach Me mode
Ctrl+H = hint level up
Ctrl+Shift+H = hint level down
Ctrl+Shift+T = toggle timer/exam mode
Esc = close any open modal

---

## TABBED SESSIONS

Tabs displayed just below the top bar:
- Each tab: lab name + coloured difficulty dot (green=Easy, yellow=Medium, red=Hard, purple=Insane)
- "+" button opens new session tab
- Tabs closeable with X (confirms before closing if session active)
- Maximum 5 tabs
- Each tab: completely independent session state, chat history, findings, and notes
- Unsaved/active tabs show a subtle dot indicator

---

## FOUR SCREENS

1. Lab Screen — main working screen (default when session active)
2. My Progress Screen — stats, skill tree, achievements, weakness analysis
3. Lab Tracker Screen — wishlist and completion board
4. Settings Screen — API key, themes, preferences, keyboard shortcuts reference

Screen transitions: 200ms fade.

---

## SCREEN 1 — LAB SCREEN

### Three-column layout

**LEFT PANEL (collapsible, 240px, Ctrl+[)**

Section 1 — Session Info:
- Lab name, platform badge, difficulty dot, elapsed time (live clock, green monospace)
- Target Profile (editable inline fields):
  - IP Address (auto-fills into all command builder fields)
  - Hostname
  - OS (dropdown: Linux / Windows / Unknown)
  - Additional notes (one line)
- These values persist for the session and auto-populate the command builder

Section 2 — Findings Log (scrollable, auto-populated via [FINDING:type] parser):
Collapsible subsections:
- 🔌 Ports & Services
- 👤 Users & Credentials (values blurred by default, click to reveal — security conscious)
- 🚩 Flags (with format validator and status badges: User Flag ✓ / Root Flag ✓)
- ⚠️ CVEs (rendered as clickable links)
- 📁 Files of Interest
- 📝 Personal Notes (free text scratchpad — never included in writeup, never sent to AI)
Each finding: edit button + delete button. "Add Finding +" button at bottom of section.
When both flags captured: auto-prompt "Mark this session complete?"

Section 3 — Methodology Tracker (checklist, user ticks off phases):
Reconnaissance → Enumeration → Exploitation → Post-Exploitation → Privilege Escalation → Lateral Movement → Flag Capture
Active phase highlighted in amber. Completed phases in accent colour with checkmark.
The AI references this tracker to suggest what phase to focus on next.

Section 4 — Hint Level Slider (pinned to bottom of left panel):
Level 1 (Nudge) through Level 5 (Full Solution)
Colour-coded track: green (1-2) → amber (3) → red (4-5)
Current level label shown: "Level 2 — Hint"
Keyboard: Ctrl+H / Ctrl+Shift+H to cycle

**CENTRE PANEL — Main Chat (flexible width)**

Chat history (scrollable, auto-scrolls to bottom on new message):

User messages:
- Right-aligned
- Accent-tinted background bubble
- Rounded corners, flat on bottom-right
- Timestamp below

AI messages:
- Left-aligned
- Panel background with subtle accent-coloured left border (3px)
- Structured format:
  - Summary line (bold, larger)
  - [TOOLS] section: tool cards with name, one-line description, install command, exact pre-filled command in code block with copy button, reference link button
  - [COMMANDS] section: fenced code blocks, syntax highlighted via highlight.js, language tag, copy button top-right of each block
  - [EXPLANATION] section: collapsible toggle "▶ Show explanation" — expands inline
  - [REFERENCES] section: inline pill buttons — [HackTricks] [GTFOBins] [ExploitDB] [CVE-XXXX] — only shown when relevant, open in default browser
- Auto-extracted findings shown as coloured badge pills below the message (e.g. 📌 PORT:445, 👤 USER:admin)
- Timestamp below

Typing indicator: three animated dots while API is processing.

Message Input Area (bottom of centre panel):
- Quick prompt pills (horizontally scrollable row):
  "What next?" | "Give me a hint" | "Analyse this output" | "Explain this" | "Full solution" | "What tool?" | "Build a command" | "I'm stuck" | "Teach me" | [+ Add custom pill]
- Large textarea: placeholder "Ask anything or describe what you found..."
- Send button (Ctrl+Enter to send, Shift+Enter for new line)
- Image drop zone: drag-and-drop or paste screenshots directly into the input. Thumbnail preview shown. Image sent as base64 to Claude API alongside the message. Supported formats: PNG, JPG, WEBP.
- Command output paste area: a secondary collapsible input labelled "Paste terminal output (optional)" — when filled, this output is stored in session history alongside the message for complete input+output logging

SESSION AUTOSAVE:
Every 60 seconds, the entire session state (chat history, findings, notes, methodology progress, target profile) is automatically saved to a session file in the output folder. On launch, if an autosave exists for a session, offer to restore it. User never loses work to a crash.

**RIGHT PANEL (collapsible, 270px, Ctrl+])**

Five tabs within the panel:

Tab 1 — Builder (Command Builder):
- Tool selector dropdown grouped by category:
  - Recon: nmap, masscan, rustscan
  - Web: gobuster, ffuf, feroxbuster, dirb, nikto, wpscan, sqlmap
  - SMB/AD: smbclient, enum4linux, crackmapexec, bloodhound, impacket suite
  - Auth: hydra, john, hashcat
  - Exploit: metasploit, msfvenom, searchsploit
  - Post-Exploit: linpeas, winpeas, pwncat, evil-winrm
  - Net: netcat, curl, wget, ssh, ftp
  - Misc: openssl, base64, python one-liners
- Dynamic parameter inputs appear based on selected tool
- Target IP auto-filled from session target profile (shown in accent colour to indicate auto-filled)
- Generated command in syntax-highlighted code block
- Copy button + "Add to Snippets" button
- Command History panel below: all copied commands this session, timestamped, re-copy button on each

Tab 2 — RevShell (Reverse Shell Builder):
- Shell language selector: Bash, Python2, Python3, PHP, PowerShell, Perl, Ruby, Java, Golang, NodeJS, Socat, Awk, Lua
- Your IP (auto-detected if possible, editable)
- Your Port (default 4444, editable)
- Encoding: Raw / Base64 / URL Encoded
- Generates two panels side by side:
  Left: Payload to run on target (copy button)
  Right: Listener command for your machine e.g. nc -lvnp 4444 (copy button)
- Both panels have syntax highlighting

Tab 3 — Encode (Encoder/Decoder):
Runs 100% locally — no API calls, instant:
- Input textarea
- Operation selector: Base64 Encode/Decode, URL Encode/Decode, HTML Encode/Decode, Hex Encode/Decode, ROT13, MD5 Hash, SHA1 Hash, SHA256 Hash, Binary↔Text, Decimal↔Hex, JWT Decode (read-only)
- Output textarea (updates instantly as you type)
- Copy output button
- Swap input/output button
- Chain mode: apply up to 3 operations in sequence

Tab 4 — Snippets (Personal Snippet Library):
- Searchable by keyword or tag (Ctrl+K opens global spotlight search overlay)
- Each snippet: name, command, tags, notes, copy button, edit, delete
- "Add Snippet" button + import from any command block via "Save to Snippets" button
- Export all as JSON / Import from JSON
- Sorted by: Most Recent / Most Used / Alphabetical

Tab 5 — Refs (Quick References):
Icon + name links, open in default browser:
HackTricks | GTFOBins | ExploitDB | RevShells.com | CyberChef | PayloadsAllTheThings | LOLBAS | PentestMonkey | HackTricks Cloud | CVE Details | OffSec Exploit DB | Shodan

---

## FOCUS MODE

Ctrl+Shift+F or top bar button:
- Hides: left panel, right panel, top bar, tabs completely
- Shows only: slim 28px session strip at top (lab name + elapsed time + VPN dot), the chat history, the message input area
- Floating "EXIT FOCUS" pill bottom-right
- Hint slider as a minimal floating element bottom-left (collapsed to just the level number, click to expand)
- 200ms smooth transition in and out
- All keyboard shortcuts still work in focus mode

---

## TIMER / EXAM MODE (Ctrl+Shift+T, toggleable)

Off by default. When activated:
- Replaces elapsed time in left panel with a countdown timer
- Default 2 hours, user sets duration before starting
- At 50% remaining: amber visual pulse on timer
- At 20% remaining: red pulse, more prominent
- At 0: notification sound + "Time's Up" banner, session continues but timer shows overtime
- Timer can be paused and reset independently of session
- Time pressure recorded in session data and reflected in writeup stats and progress screen

---

## OFFLINE MODE

App detects API unreachable or no internet:
- Banner shown: "OFFLINE MODE — AI guidance unavailable"
- These features work fully offline (no API):
  - Command Builder (all local)
  - Reverse Shell Builder (all local)
  - Encoder/Decoder (all local)
  - Snippets Library (all local)
  - Findings panel (manual entry)
  - Lab Tracker (all local)
  - VPN status indicator (all local)
  - All previously saved sessions and writeups
- Bundled offline cheat sheets (static data built into the app, accessible via "Cheat Sheets" button that appears in right panel when offline):
  - Common nmap flags and scan types
  - Linux privilege escalation checklist
  - Windows privilege escalation checklist
  - Web enumeration checklist
  - Active Directory attack checklist
  - Reverse shell quick reference
  - Hash identification guide
  - Common ports and services reference
  - Port number lookup: type any port number, get the common service, typical vulnerabilities, and what to enumerate

---

## VPN STATUS INDICATOR

Checks Node.js os.networkInterfaces() every 30 seconds for interfaces named: tun0, tun1, tap0, tap1, ppp0, ppp1, utun0-5, wg0.
- If found and has an IPv4 address: 🟢 VPN Active (tooltip: interface name + IP)
- If not found: 🔴 VPN Off
- Unknown/error: ⚪ Unknown
Displayed in top bar. Clicking it opens a tooltip with full interface details.
This is especially important for HTB/THM which require VPN to reach target machines.

---

## OSINT MODE

Activatable per session from new session screen (lab type: OSINT/CTF).
Switches AI system prompt focus and methodology tracker phases to:
Passive Recon → Active Recon → Username/Identity Enumeration → Metadata Analysis → Domain/Infrastructure Intel → Social Engineering Analysis → Reporting

Right panel command builder switches to OSINT tools:
theHarvester, sherlock, maltego CLI, exiftool, whois, dig, nslookup, recon-ng, spiderfoot, shodan CLI, censys, waybackurls, Google dorking templates, Metagoofil

---

## MISTAKE PATTERN TRACKER

Separate from weakness analysis. Passively monitors the session for these patterns and logs them:
- Same scan/command run more than once without new parameters
- A common enumeration step skipped (e.g. robots.txt not checked on web boxes)
- Hint level escalated more than twice on the same topic (indicates repeated struggle)
- A phase marked incomplete but a later phase was completed (methodology order broken)
At session end, the session summary includes a "Patterns Noticed" section listing any flagged items. These feed into the Weakness Analysis on the progress screen over time. This is educational, not critical — shown gently, not as errors.

---

## OBSIDIAN WRITEUP GENERATOR

"Mark Complete" checkbox/button in left panel → "Generate Writeup" button appears.

What the writeup IS:
- Clean, neutral-voice technical account of the successful path only
- Neutral voice: "nmap revealed...", "directory enumeration uncovered...", "the service was vulnerable to..."
- Written as if ItsEliias documented it personally after completing the lab
- A reference to redo the lab later and measure improvement over time

What the writeup is NOT:
- Not a chat log or AI conversation transcript
- Zero references to hints, AI, suggestions, failed attempts, or dead ends
- No "the AI told me..." — completely invisible AI involvement
- No wrong turns — only the clean, successful methodology

Writeup generation system prompt (injected automatically, never shown):
"You are a technical writer producing a cybersecurity lab writeup for ItsEliias. Using only the successful findings, commands, and methodology phases from the session state provided, write a clean technical writeup in neutral voice. Rules: write only what succeeded — omit all failed attempts and hints received. Never reference any AI or assistant. Write as if ItsEliias worked through this methodically. Infer logical thought process between steps for narrative coherence. Every command in a fenced code block with correct language tag. Include actual output snippets where session data contains them. Be technical and precise — this is a reference document. Write sections in exactly the order specified."

Writeup sections (always in this exact order):

YAML Frontmatter:
---
title: [Lab Name]
date: [completion date]
platform: [HTB/THM/CTF/etc]
difficulty: [difficulty]
author: ItsEliias
tags: [platform, difficulty, techniques used e.g. nmap, privilege-escalation, sql-injection — auto-generated]
completed: true
ip: [target IP]
time_to_complete: [session duration]
---

1. ## Overview — 2-3 sentences: box type, OS, key vulnerability theme
2. ## Reconnaissance — initial scans, exact commands in code blocks, what was found
3. ## Enumeration — deeper service enumeration, all commands in code blocks, key discoveries
4. ## Exploitation — vulnerability identified, exact exploit, how initial access gained
5. ## Post-Exploitation / Privilege Escalation — how root/admin achieved, all commands
6. ## Flags — user flag and root flag, values and file paths where found
7. ## If I Did This Again — 2-3 sentences: what could have been faster or more efficient
8. ## Lessons Learned — 3-5 bullet points of key technical takeaways

Auto-wikilinks:
After generating the writeup, scan the user's Obsidian vault (from ~/cybertools-config.json path). For any technique, tool, or CVE mentioned in the writeup that matches a note filename in the vault, automatically convert it to [[wikilink]] format. For example if the vault contains "SQL Injection.md", all references to SQL injection become [[SQL Injection]].

Writeup UI flow:
- Preview modal: rendered Markdown on left, editable textarea on right (split view)
- "Save to Obsidian Vault" — saves to /Writeups/[Platform]/[Lab Name].md, uses vault path from ~/cybertools-config.json
- "Export as PDF" — clean styled PDF with ItsEliias branding in the header
- "Copy to Clipboard"
- Success message: "Writeup saved to your Obsidian vault ✓"

Writeup templates:
Different default section emphasis based on lab type:
- HTB/THM Linux or Windows box: standard sections as above
- CTF: Overview, Challenge Description, Solution, Flag, Techniques Used, Lessons Learned
- Cisco/Networking Lab: Overview, Topology, Configuration Steps, Verification Commands, Lessons Learned
- Web App (PortSwigger/PentesterLab): Overview, Reconnaissance, Vulnerability Discovery, Exploitation, Impact, Remediation Notes, Lessons Learned

---

## SESSION SUMMARY (separate from writeup)

At session end (before writeup generation), show a session summary panel:
- Lab name, platform, difficulty, duration
- Findings count (ports, credentials, flags)
- Tools used
- Commands copied
- Methodology phases completed
- Patterns noticed (from mistake tracker)
- "Areas to Review" — AI-generated 2-3 bullet points on topics to study based on where hints were needed most
This summary is saved as a JSON file alongside the session. It feeds the progress screen data. It is NOT the writeup — it is internal data.

---

## AI GUIDANCE SYSTEM

Hint Ladder (strictly enforced in every AI response):
Level 1 — Nudge: one sentence, zero tool or technique names
Level 2 — Hint: general category of technique only
Level 3 — Guidance: name tool/technique, explain why, no exact command
Level 4 — Walkthrough: full steps, exact commands, expected output
Level 5 — Full Solution: every command in order, full explanation

Teach Me Mode (Ctrl+M, toggleable button in chat input area):
When active, AI responds only with Socratic questions guiding the user to the answer. Never gives the answer directly. Chat header shows "TEACH ME MODE — ACTIVE" badge. Hint level still applies as a ceiling on how much the questions reveal.

Nmap Output Analyser (on-demand):
"Analyse this output" quick pill — user pastes nmap output into chat. AI parses it, auto-populates findings panel with ports/services/versions, and suggests next enumeration steps based on what was found. Uses existing Claude API session — no extra cost.

Weakness-aware responses:
AI passively tracks which phases and topics required the most hint escalations. At session end, this data is summarised and stored. Over multiple sessions it builds a weakness profile used by the progress screen.

Flag format validator (in findings panel):
Recognises and validates: HTB{...}, THM{...}, FLAG{...}, picoCTF{...}, ctf{...}, and any curly-brace wrapped string. Invalid format shows a warning. Valid format shows a green checkmark.

---

## AI SYSTEM PROMPT (injected automatically, never shown to user)

"You are CyberLab Companion, an expert cybersecurity assistant for ItsEliias, a cybersecurity student working through hands-on labs and CTF challenges. You have deep expertise in penetration testing, ethical hacking, CTF techniques, networking, web application security, active directory attacks, privilege escalation, reverse engineering, cryptography, and forensics.

Strict behaviour rules:
- Always respect the current hint level (1-5). Never provide more information than the level permits.
- Always reference the complete session context including all findings, attempted approaches, and current methodology phase. Build on previous findings. Never repeat suggestions already tried.
- When suggesting tools, always pre-fill commands with known values from the session target profile (IP, port, username etc.).
- Format every response with clearly labelled sections: Summary | Tools | Commands | Explanation | References.
- Every command must be in a fenced code block with correct language tag.
- When you identify a finding prefix it with [FINDING:type]. Types: PORT, CRED, CVE, FLAG, FILE, SERVICE, USER, HASH.
- When in Teach Me Mode, respond only with Socratic guiding questions — never give the answer.
- Be concise in summaries, detailed only in explanations.
- Be encouraging. ItsEliias is learning to support their family and career growth — every session matters.
- This is an ethical hacking education context. All labs are legal, controlled environments."

---

## CLAUDE API INTEGRATION

- Model: claude-sonnet-4-20250514
- Max tokens: 2000 per response
- Send full conversation history + complete session state with every request
- Images sent as base64 alongside message content when attached
- Command output (from secondary input) included in context when provided
- Typing indicator (animated dots) while processing
- Graceful error handling: clear error message + retry button on failure
- Offline mode activates automatically on API failure
- API key stored via Electron safeStorage — encrypted on disk, never logged, never shown in plaintext after initial entry
- API status dot in top bar: green (connected) / red (error) / amber spinning (processing)

---

## SCREEN 2 — MY PROGRESS

Full screen. "Welcome back, ItsEliias" header with logo. Back button top-left.

Section 1 — Overview Stats Row (metric cards):
Total Labs Completed | Current Streak (days) | Total Time in Labs | Favourite Platform | Hardest Box Completed | Total Flags Captured | Personal Best (fastest hard box)

Section 2 — Skill Tree
Visual node-based map. Nodes light up and fill with accent colour as labs covering those areas are completed.

Domains and sub-nodes:
- Web Security: SQL Injection, XSS, SSRF, File Upload, Auth Bypass, API Hacking, IDOR, SSTI
- Network: Port Scanning, Packet Analysis, MITM, Firewall Bypass, VPN/Tunnelling, Cisco/Networking, Protocol Analysis
- Active Directory: Kerberoasting, AS-REP Roasting, Pass the Hash, BloodHound, GPO Abuse, DCSync, Silver/Golden Ticket
- Privilege Escalation: SUID/SGID, Sudo Misconfig, Cron Jobs, PATH Hijacking, Kernel Exploits, Token Impersonation, DLL Hijacking
- Cryptography: Hash Cracking, Encoding/Decoding, RSA, AES, Classic Ciphers, JWT
- Forensics: File Carving, Steganography, Memory Analysis, Log Analysis, PCAP Analysis
- Reverse Engineering: Static Analysis, Dynamic Analysis, Buffer Overflow, ROP Chains, Debugging
- OSINT: Username Recon, Metadata, Google Dorking, Social Engineering, Domain Intel

Each node: Not Started (dim) / In Progress (partial fill) / Completed (full accent colour glow).
Skill level per domain assigned automatically: Beginner (0-2) / Intermediate (3-6) / Advanced (7+) — shown as a badge on each domain.
Clicking a node lists which of your completed labs touched it.

Section 3 — Weakness Analysis Panel
"Analyse My Progress" button (user-initiated only, one Claude API call):
- Top 3 weak areas based on lab history, hint escalations, and mistake patterns
- Specific actionable suggestions for what to practice next
- Recommended free HTB/THM labs targeting those weak areas
- "Last analysed: [date]" shown
Not automatic. User triggers it when they want it.

Section 4 — Achievements Grid (gaming-style, locked/unlocked)
Unlocked achievements show in full colour. Locked show greyed out with unlock condition.

Achievements list:
- First Blood — Complete your first lab
- Script Kiddie No More — Use 10 different tools across sessions
- Root Hunter — Root your first HTB machine
- Speed Runner — Complete a Medium box under 2 hours
- Persistence — 7 day streak
- On a Roll — 30 day streak
- Unstoppable — 90 day streak
- Web Warrior — Complete 5 web-focused labs
- AD Destroyer — Complete 3 Active Directory labs
- Flag Collector — Capture 25 total flags
- Polyglot — Complete labs on 3 different platforms
- Night Owl — Complete a lab between midnight and 5am
- No Hints Needed — Complete a full lab at hint level 1 throughout
- Teach Yourself — Use Teach Me Mode for an entire session
- Clean Methodology — Complete a lab with all methodology phases ticked in order
- Speed Demon — Complete an Easy box under 30 minutes
- Encyclopaedia — Unlock 15 skill tree nodes
- Veteran — Complete 50 labs total
Each locked achievement shows what is needed. Unlocked shows date achieved.
Achievement unlock: full-screen flash notification with the achievement name and ItsEliias personalisation. Sound effect if enabled.

Section 5 — Progress Charts (Chart.js from CDN, clean and minimal):
- Line graph: time-to-complete over time, grouped by difficulty (shows improvement trend)
- Bar chart: labs completed per month
- Donut chart: platform breakdown
- Radar chart: skill domain coverage (maps to skill tree domains)
All charts adapt colours to active theme.

---

## SCREEN 3 — LAB TRACKER

Kanban-style board. Three columns:
- 📋 Want to Do
- 🔄 In Progress
- ✅ Completed

Each lab card:
- Name, platform badge, difficulty dot, date added
- Tags (free text, e.g. "web", "active-directory", "windows")
- Personal rating 1-5 stars (set on completion)
- Notes field (one line)
- Link to writeup (if generated, clickable)
- URL field (optional link to HTB/THM page)

Drag cards between columns to change status.
"Add Lab" button: name, platform, difficulty, URL, tags, notes.
Bulk import: paste a plain text list of lab names (one per line) to add them all to Want to Do at once. User can import their 500+ lab repository this way.
Filter/sort: by platform, difficulty, tags, date added, rating.
Search bar across all labs.

HTB/THM API sync (free, user's own profile):
- Settings: HTB API key field + THM username field
- "Sync HTB" button: pulls completed machines from HTB API into Completed column
- "Sync THM" button: pulls completed rooms from THM API into Completed column
- Sync is manual (button-triggered), never automatic
- No cost — uses the platforms' free public APIs with the user's own credentials

---

## SCREEN 4 — SETTINGS

Sections:
- API Configuration: API key field (masked), test connection button, change key button
- Obsidian Vault: vault path picker, open in Finder/Explorer button
- HTB/THM Integration: API key + username fields, sync buttons
- Themes: four theme preview swatches (Cyberpunk, Terminal, Stealth, Warrior), click to apply
- Sounds: master toggle on/off, volume slider (0-100)
- Timer Defaults: default exam timer duration
- Startup: autosave interval (30s / 60s / 120s), update checker toggle
- Reset: "Reset to factory defaults" (clears config, triggers setup wizard on next launch)
- Keyboard Shortcuts: full reference table, read-only
- About: version number, ItsEliias branding, link to GitHub

---

## SOUND EFFECTS (off by default, toggleable in settings)

Professional, subtle — terminal/system sounds only:
- New finding auto-detected: soft ping (100ms)
- Flag captured: short positive chime (300ms)
- Achievement unlocked: distinct success tone (500ms)
- Session complete: clean completion sound (400ms)
- API error: subtle alert tone (200ms)
- Timer expiry: two-tone alert (600ms)
- Focus mode toggle: soft whoosh (150ms)
- Theme switch: subtle click (50ms)
All sounds built into the app as short base64-encoded audio data — no external audio files needed.

---

## UI DESIGN — THREE THEMES

Four themes selectable via a compact dropdown in the top bar. Selection persists to ~/cybertools-config.json (shared with all CyberTools apps). 300ms smooth CSS transition.

### Theme 1 — Cyberpunk
- Background: #0d0d1a
- Primary accent: #b44fff
- Secondary accent: #00ffe0
- Text: #e8e8ff
- Panels: #13132b
- Borders: #2a2a4a
- Inputs: #1a1a35
- Active/progress: gradient #b44fff → #00ffe0
- Buttons: #b44fff border + text, purple glow box-shadow on hover
- Font: monospace
- Background: subtle CSS repeating grid lines ~0.03 opacity
- Scrollbars: thin, #b44fff thumb
- Code blocks: #0a0a15 background
- Skill tree nodes: glow effect with #b44fff on completion
- Charts: #b44fff primary, #00ffe0 secondary

### Theme 2 — Terminal
- Background: #0a0a0a
- Primary accent: #00ff41
- Secondary accent: #00cc33
- Text: #00ff41
- Panels: #0f0f0f
- Borders: #1a3a1a
- Inputs: #0a0a0a, #00ff41 1px border
- Buttons: #00ff41 text + border, darker on hover
- Font: monospace
- Blinking block cursor on status bar (CSS keyframe 1s blink)
- Scrollbars: thin, #00ff41 thumb
- Code blocks: #050505 background
- Skill tree nodes: green glow on completion
- Charts: #00ff41 primary, #00cc33 secondary

### Theme 3 — Stealth (default)
- Background: #0e1117
- Primary accent: #4a9eff
- Secondary accent: #7bb8ff
- Text: #c9d1d9
- Panels: #161b22
- Borders: #30363d
- Inputs: #0d1117, #21262d border
- Buttons: #4a9eff text + border, blue glow on hover
- Font: system-ui, -apple-system, sans-serif (clean, not monospace)
- No background texture — flat, minimal, corporate
- Scrollbars: thin, #4a9eff thumb
- Code blocks: #1c2128 background
- Skill tree nodes: blue glow on completion
- Charts: #4a9eff primary, #7bb8ff secondary

### Theme 4 — Warrior (ItsEliias signature theme)
Inspired by the ItsEliias logo — armoured knight, black and charcoal with blood red accents and glowing red highlights.
- Background: #0a0000 (near-black with deep red undertone)
- Primary accent: #cc0000 (deep blood red)
- Secondary accent: #ff2a2a (brighter red for highlights and hover)
- Text: #e8e0e0 (warm off-white, slight red tint)
- Panels: #110000 (very dark red-black)
- Borders: #2a0a0a (dark red border)
- Inputs: #150000, #cc0000 1px border
- Buttons: #cc0000 border + text, red glow box-shadow on hover (box-shadow: 0 0 8px rgba(204,0,0,0.4))
- Font: system-ui, -apple-system, sans-serif
- Background texture: subtle CSS radial vignette darkening edges, very low opacity
- Scrollbars: thin, #cc0000 thumb
- Code blocks: #0f0000 background
- Progress bar: gradient #cc0000 → #ff2a2a
- Skill tree nodes: red glow (#cc0000) on completion
- Charts: #cc0000 primary, #ff2a2a secondary
- Achievement cards: dark red border, red glow on unlock

All themes:
- Theme selector: compact dropdown in the top bar showing theme name + coloured dot. Selecting applies instantly. Persists to ~/cybertools-config.json (shared across all CyberTools apps).
- Chat bubbles adapt fully to theme
- Syntax highlighting adapts: Cyberpunk=purple/cyan, Terminal=green-tinted, Stealth=GitHub dark, Warrior=red-tinted dark
- Skill tree, achievements, charts all adapt to active theme
- Difficulty dots always: green=Easy, yellow=Medium, red=Hard, purple=Insane (consistent across all themes)
- 300ms transition applies to every CSS property — nothing should snap

---

## WINDOW & PLATFORM

- Minimum window size: 1100x750px, resizable
- Platforms: Windows, Mac, Linux (all three in package.json electron-builder targets)
- Linux: AppImage + .deb
- Mac: .dmg
- Windows: .exe installer via electron-builder

---

## LAUNCHER INTEGRATION

CyberLab Companion integrates with the CYBERTOOLS unified launcher.

On launch, register the app's presence by writing to ~/cybertools-config.json:
- Add/update a "cyberlab" key containing:
  - installed: true
  - version: "1.0"
  - execPath: the path to the app's executable

Every 10 seconds while running, write a live status object to ~/cybertools-config.json under "cyberlab_status":
  - activeSession: lab name or null
  - elapsedTime: session elapsed time string or null
  - hintLevel: current hint level number
  - streak: current day streak number
  - lastActive: ISO timestamp

Accept a command line argument --launcher-open that brings the app window to focus when triggered by the launcher.

The launcher reads this data to display live session info on the CyberLab app card.

---

## TECH STACK

- Electron (native desktop, Windows, Mac, Linux — all three build targets in electron-builder)
- Vanilla HTML + CSS + JavaScript (renderer — no React, no heavy frameworks)
- Electron IPC with contextBridge and preload.js for all main↔renderer communication
- Anthropic Claude API via fetch in the main process (never in renderer)
- Chart.js from CDN for progress charts
- highlight.js from CDN for syntax highlighting
- Electron safeStorage for API key encryption
- Node.js fs, os, path, crypto modules (all built-in)
- node-fetch or built-in fetch for HTB/THM API calls
- Shared config: ~/cybertools-config.json (Obsidian vault path, shared with Vault Scraper app)
- package.json with all dependencies — runs with: npm install && npm start

---

## FILES TO DELIVER (every file complete — zero placeholders, zero TODOs, zero stubs)

- package.json
- main.js (Electron main, IPC, Claude API, safeStorage, VPN detection, file I/O, HTB/THM API, autosave, update check)
- preload.js (contextBridge API surface — expose only what renderer needs)
- session.js (session state management, autosave, [FINDING:type] parser, mistake tracker, summary + writeup export, auto-wikilink generator)
- commandbuilder.js (all tool definitions, parameter schemas, command generation logic for all tools)
- reverseshell.js (all shell templates for all languages, encoding logic)
- encoder.js (all encode/decode/hash operations, chain mode — 100% local)
- progress.js (stats aggregation, achievement unlock logic, skill tree state, weakness analysis, streak tracking)
- labtracker.js (lab card CRUD, drag state, HTB/THM sync, bulk import)
- snippets.js (snippet CRUD, global search, JSON import/export)
- sounds.js (base64 audio data, playback, volume control)
- cheatsheets.js (all bundled offline cheat sheet data as static JS objects)
- themes.js (CSS variable maps for all four themes — Cyberpunk, Terminal, Stealth, Warrior — transition logic)
- index.html (full app markup: splash screen, setup wizard, all four screens, all panels, all modals)
- style.css (all four themes and transitions, chat bubbles, code blocks, skill tree, achievements, charts, scrollbars, focus mode, tabs, animations)
- renderer.js (all frontend logic, screen navigation, IPC calls, chat rendering, panel management, keyboard shortcuts, drag-and-drop, all UI state)
- README.md (install guide, API key setup, folder structure for assets/logo.png, feature overview, keyboard shortcuts reference)
- assets/logo_placeholder.txt (instructions for where to place the user's logo.png)

---

## QUALITY REQUIREMENTS

- Every feature described works end to end — zero exceptions
- [FINDING:type] parser reliably extracts all finding types and populates the correct panel subsection
- Session state complete and correctly structured on every single API call
- Autosave fires every 60 seconds without blocking the UI
- App never freezes — all API calls, file I/O, and VPN checks are async and non-blocking
- API key never appears in logs, console output, DevTools, or any plaintext file ever
- All external links via shell.openExternal — never inside Electron webview
- All four themes look intentional and polished — not just colour variable swaps
- Focus mode is genuinely distraction-free — test it
- The app looks and feels professional enough to use in a real working environment
- Safe to force-quit at any time — autosave means nothing is lost
- Keyboard shortcuts all work, none conflict
- Drag and drop in Lab Tracker works correctly
- Image drop into chat correctly converts to base64 and includes in API call
- Works identically on Windows and Mac without any platform-specific code branches
- Complete mental model test: ItsEliias opens the app, starts an HTB lab, works through it with AI guidance at hint level 2, roots the box, generates a writeup, saves it to Obsidian with auto-wikilinks, reviews progress on the skill tree, unlocks an achievement — all without leaving the app or hitting a single broken feature
