# Pickle Rick — TryHackMe Ecosystem Walkthrough

> **Platform:** TryHackMe | **Room:** Pickle Rick | **Difficulty:** Easy  
> **Objective:** Find the three ingredients Rick needs to turn himself back into a human by exploiting vulnerabilities in a web application.

---

## Table of Contents

1. [Stage 1 — Before You Open a Terminal](#stage-1--before-you-open-a-terminal)
2. [Stage 2 — Enumeration](#stage-2--enumeration)
3. [Stage 3 — Web Exploitation](#stage-3--web-exploitation)
4. [Stage 4 — Finding the Ingredients](#stage-4--finding-the-ingredients)
5. [Stage 5 — Completion and Documentation](#stage-5--completion-and-documentation)
6. [Application Usage Map](#application-usage-map)

---

## Stage 1 — Before You Open a Terminal

### Step 1: Start the Ecosystem

Open the **Cybertools Launcher** from the system tray. Launch:
- **CyberLab Companion** — AI assistant and session tracker
- **ReconDesk** — target and attack surface tracking
- **GhostVault** — quick note capture
- **SignalBoard** — intelligence feed (scan for relevant CVEs before starting)

**CyberOS Dashboard** on the second monitor confirms all four cards flip to online within a few seconds.

### Step 2: Create the Target in ReconDesk

**App: ReconDesk → New Target**

| Field | Value |
|---|---|
| Name | `Pickle Rick` |
| IP | `10.10.3.164` |
| Platform | `THM` |
| OS | `Linux` |
| Tags | `web`, `ctf`, `beginner` |
| Status | `active` |

CyberOS Dashboard updates: ReconDesk card shows `Active target: Pickle Rick`.

### Step 3: Create Attack Cards

**App: ReconDesk → Attack Board**

| Card | Stage | Status |
|---|---|---|
| Port scan (nmap) | recon | todo |
| Directory fuzzing (gobuster) | enum | todo |
| Web source review | enum | todo |
| robots.txt review | enum | todo |
| Login panel access | exploit | todo |
| Command execution | exploit | todo |
| Find ingredient 1 | loot | todo |
| Find ingredient 2 | loot | todo |
| Find ingredient 3 | loot | todo |

### Step 4: Start CyberLab Session

**App: CyberLab Companion → New Session**

| Field | Value |
|---|---|
| Session name | `Pickle Rick` |
| Platform | `THM` |
| Difficulty | `Easy` |
| Target IP | `10.10.3.164` |

Confirm TryHackMe VPN is active (green dot in the CyberLab footer).

---

## Stage 2 — Enumeration

### Step 5: Port Scan

**App: CyberLab Companion → Commands Panel**

Use the nmap template with target IP pre-filled:

```bash
sudo nmap -sS -sV 10.10.3.164
```

**Results:**
- Port 22 — SSH (requires auth key, no password login)
- Port 80 — HTTP

**Back in ReconDesk → Assets → Ports:**

| Port | Protocol | Service | Notes |
|---|---|---|---|
| 22 | TCP | SSH | Key auth only — no password |
| 80 | TCP | HTTP | Web app target |

Move "Port scan (nmap)" attack card to `done`.

### Step 6: Directory Fuzzing

**App: CyberLab Companion → Commands Panel**

```bash
gobuster dir -u http://10.10.3.164/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,txt
```

**Results:**
- `/login.php` — login page
- `/assets/` — directory, accessible
- `/robots.txt` — accessible
- `/server-status` — 403 Forbidden

Move "Directory fuzzing (gobuster)" attack card to `done`.

### Step 7: Web Source Review

**App: GhostVault (capture window)**

Browsing the homepage source code reveals Rick's username hardcoded in the HTML.

Capture in GhostVault:
- Note: `Username found in homepage source: R1ckRul3s`
- Tag: `#finding #credential #username`
- Save to: `/CyberLab/PickleRick/`

Move "Web source review" attack card to `done`.

### Step 8: robots.txt Review

**App: GhostVault (capture window)**

Navigating to `http://10.10.3.164/robots.txt` reveals a suspicious string — not a real disallow entry, but what looks like a password.

Capture:
- Note: `robots.txt contents: Wubba lubba dub dub — likely password`
- Tag: `#finding #credential #password`
- Save to: `/CyberLab/PickleRick/`

**App: ReconDesk → Assets → Credentials**

| Field | Value |
|---|---|
| Username | `R1ckRul3s` |
| Password | `Wubba lubba dub dub` |
| Service | `Web Panel (/login.php)` |
| Source | `Page source + robots.txt` |

Move "robots.txt review" attack card to `done`.

---

## Stage 3 — Web Exploitation

### Step 9: Login Attempt

**App: CyberLab Companion → Chat**

Before trying the credentials, you ask: "I have a login form and a potential username/password. What should I check before assuming they work?"

Claude advises: verify form field names, try basic SQL injection first, then test the discovered credentials.

SQL injection on the login form — no result. Try `R1ckRul3s` / `Wubba lubba dub dub` — login succeeds. Portal page loads with a command input panel.

Move "Login panel access" attack card to `done`.

### Step 10: Confirm Command Execution

Running `whoami` in the command panel returns a result — confirmed remote code execution on the server.

The other portal tabs (potions, beth clone, etc.) all return a denied page with no access.

Move "Command execution" attack card to `done`.

---

## Stage 4 — Finding the Ingredients

### Step 11: Ingredient 1

Running `ls` in the command panel lists files in the web root, including a first ingredient file.

`cat` has been disabled on this machine — trying it returns an error. Use `nl` instead to read the file.

**Ingredient 1: `mr. meeseek hair`**

**App: GhostVault**
- Capture: `Ingredient 1: mr. meeseek hair — web root, read with nl (cat disabled)`
- Tag: `#flag #ingredient1`

**App: ReconDesk** — move "Find ingredient 1" to `done`.

### Step 12: Ingredient 2

`clue.txt` in the web root says to look at other system files for the remaining ingredients.

Running `ls /home` reveals a `rick` folder. Navigating through it turns up the second ingredient file.

**Ingredient 2: `1 jerry tear`**

**App: GhostVault**
- Capture: `Ingredient 2: 1 jerry tear — found in /home/rick/`
- Tag: `#flag #ingredient2`

**App: ReconDesk** — move "Find ingredient 2" to `done`.

### Step 13: Ingredient 3

The `/root` folder is the next target, but direct access is denied.

Run `sudo -l` to check what the current user can execute with elevated privileges. Output shows unrestricted sudo — all commands allowed.

```bash
sudo ls /root
```

A `3rd.txt` ingredient file is visible. Read it:

```bash
sudo nl /root/3rd.txt
```

**Ingredient 3: `fleeb juice`**

**App: GhostVault**
- Capture: `Ingredient 3: fleeb juice — /root/, accessed via unrestricted sudo`
- Tag: `#flag #ingredient3`

**App: ReconDesk** — move "Find ingredient 3" to `done`.

---

## Stage 5 — Completion and Documentation

### Step 14: Mark Target Complete

**App: ReconDesk**

Change target status: `active` → `completed`. All 9 attack cards are in `done`.

CyberOS Dashboard updates: no active target shown on the ReconDesk card.

### Step 15: Generate Writeup

**App: CyberLab Companion → Writeup Panel**

Click "Generate Writeup". Claude uses the session chat, findings, and notes to produce a structured Markdown writeup. Review and save:

```
/CyberLab/Completed/Pickle Rick — THM — Easy.md
```

### Step 16: Organise the Vault

**App: GhostVault → Vault Browser**

Navigate to `/CyberLab/PickleRick/`. All captures are already there — username find, robots.txt password, each flag. Open the generated writeup and link the capture notes using Obsidian `[[wikilinks]]`.

Final vault contents for this project:
- `Pickle Rick — THM — Easy.md` (writeup)
- `Finding — username R1ckRul3s.md`
- `Finding — robots.txt password.md`
- `Flag — Ingredient 1.md`
- `Flag — Ingredient 2.md`
- `Flag — Ingredient 3.md`

---

## Application Usage Map

| App | Role in this Room |
|---|---|
| Cybertools Launcher | Launch all apps at session start |
| CyberOS Dashboard | Live status — confirmed all apps online, monitored ReconDesk active target |
| ReconDesk | Tracked target IP, ports, credentials, and all 9 attack cards through to done |
| GhostVault | Captured username, password, and all three flags as they were found |
| CyberLab Companion | nmap + gobuster commands, AI guidance on login approach + sudo privesc, writeup generation |
| SignalBoard | Pre-session intelligence check |
| VaultCore | Background — vault already seeded with prior knowledge |

### Timeline

```
00:00  Launcher → open all apps. Dashboard goes green.
00:02  ReconDesk: create target 10.10.3.164, add 9 attack cards
00:04  CyberLab: create session, confirm VPN active
00:06  nmap → ports 22 + 80. Add to ReconDesk assets.
00:09  gobuster → /login.php, /robots.txt, /assets discovered
00:11  Homepage source → username R1ckRul3s. GhostVault capture.
00:13  robots.txt → password found. GhostVault capture. Creds added to ReconDesk.
00:15  SQL injection attempt on login → no result
00:16  Login with discovered creds → portal access. Command panel confirmed.
00:18  whoami → RCE confirmed
00:20  ls → files visible. cat disabled. nl works. Ingredient 1 found.
00:23  clue.txt → check other system files
00:25  ls /home/rick → Ingredient 2 found
00:28  sudo -l → unrestricted sudo. sudo ls /root → Ingredient 3 found.
00:30  ReconDesk: all cards done, target marked completed
00:32  CyberLab: writeup generated, saved to vault
00:35  GhostVault: notes linked, vault organised
```

---

## Flags

| # | Ingredient | Location | Method |
|---|---|---|---|
| 1 | `mr. meeseek hair` | Web root | `nl` (cat disabled) |
| 2 | `1 jerry tear` | `/home/rick/` | Directory traversal |
| 3 | `fleeb juice` | `/root/` | Unrestricted sudo |
