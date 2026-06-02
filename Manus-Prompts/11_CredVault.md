# MANUS PROMPT — CredVault
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for CredVault. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS CREDVAULT?

CredVault is the **encrypted credential manager** for the CyberOS ecosystem. Every username, password, hash, and token found during an engagement is stored here, encrypted at rest using AES-256-GCM. The vault is locked by a master password on each launch and can be auto-locked on idle.

Security is the primary concern. The UI must reinforce this: the operator should feel confident that credentials are protected, and the master password must never touch the renderer process or any log.

**Accent color:** `#f78166` (Soft Red)

---

## ENCRYPTION ARCHITECTURE

This is non-negotiable. Implement exactly as described.

```
Master Password → PBKDF2 (100,000 iterations, SHA-256, 32-byte key, random 32-byte salt)
                → AES-256-GCM encryption of JSON vault data
                → Wire format: [IV (12 bytes)] [Auth Tag (16 bytes)] [Ciphertext]

Salt file:     ~/Library/Application Support/CredVault/salt.bin
Vault file:    ~/Library/Application Support/CredVault/vault.enc

On unlock:     Read salt → Derive key from (master_password + salt) → Decrypt vault.enc
On lock:       Clear derived key from memory → keep only the locked status
On setup:      Generate random salt → Derive key → Create empty vault → Encrypt and save
```

**Critical:** The master password and derived key must NEVER be sent from the main process to the renderer. Only the decrypted vault data (after authentication) passes to the renderer. All crypto operations happen in the main process.

---

## DATA MODEL

```typescript
interface VaultData {
  version: number;
  createdAt: string;
  credentials: Credential[];
}

interface Credential {
  id: string;
  username: string;
  password?: string;
  hash?: string;
  hashType?: 'NTLM' | 'MD5' | 'SHA1' | 'SHA256' | 'bcrypt' | 'other';
  service: string;
  ip: string;
  port?: number;
  protocol?: string;
  source: string;              // "Metasploit hashdump", "gobuster", "manual"
  targetName: string;          // Lab/engagement name
  tags: string[];
  notes: string;
  verified: boolean;
  status: 'active' | 'rotated' | 'invalid';
  createdAt: string;
  lastAccessedAt?: string;     // Updated when credential is viewed/copied
}

// For cross-app queries (non-sensitive response only)
interface CredentialPublic {
  id: string;
  username: string;
  service: string;
  ip: string;
  targetName: string;
  status: string;
}
```

---

## SCREENS TO BUILD

### Screen 1: Setup (First Launch)

Only shown on first launch (no `salt.bin` exists).

```
┌──────────────────────────────────────────────┐
│                                              │
│  🔐 CredVault Setup                         │
│                                              │
│  Create a master password to protect your   │
│  credential vault. This password is never   │
│  stored — it encrypts your data using       │
│  AES-256-GCM.                               │
│                                              │
│  Master Password                            │
│  [••••••••••••••••••••] [👁]               │
│                                              │
│  Confirm Password                           │
│  [••••••••••••••••••••] [👁]               │
│                                              │
│  Password strength: [████████░░] Strong     │
│                                              │
│  ⚠ If you forget this password, your       │
│    credentials cannot be recovered.         │
│                                              │
│  [Create Vault]                             │
│                                              │
└──────────────────────────────────────────────┘
```

- Password strength meter (based on length + complexity)
- Show/hide toggle
- Passwords must match before "Create Vault" is enabled
- Warning about irrecoverability (not dismissible)

---

### Screen 2: Unlock Screen

Shown on every launch (after first setup) and after auto-lock.

```
┌──────────────────────────────────────────────┐
│                                              │
│  🔒 CredVault Locked                        │
│                                              │
│  [lock icon — large, centered, soft red]    │
│                                              │
│  Enter your master password to continue.    │
│                                              │
│  Master Password                            │
│  [••••••••••••••••••••] [👁]               │
│                                              │
│  [Unlock]                                   │
│                                              │
│  5 failed attempts → 60 second lockout      │
│  Attempt 1 of 5                             │
│                                              │
└──────────────────────────────────────────────┘
```

- Wrong password: shake the input, show "Incorrect password. [N] attempts remaining."
- After 5 failures: 60-second lockout timer with countdown
- During lockout: input disabled, countdown shown
- Successful unlock: smooth fade transition to vault view

---

### Screen 3: Vault View (Main Screen — requires unlock)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●●●] 🔑 CredVault                          [🔒 Lock] [+ Add]  │
├───────────────────────┬──────────────────────────────────────────┤
│  SIDEBAR              │  VAULT CONTENT                           │
│                       │                                          │
│  🔑 All Credentials   │  [🔍 Search credentials...]  [Filter ▾] │
│  📥 Import            │                                          │
│  💾 Backup            │  USERNAME       SERVICE  TARGET  STATUS  │
│  ⚙ Settings          │  ─────────────────────────────────────── │
│                       │  R1ckRul3s      http/80  Pickle  Active  │
│  ─────────────────    │  rabbit         smb/445  Pickle  Active  │
│  BY TARGET            │  Administrator  rdp/3389 Blue    Active  │
│  Pickle Rick    (2)   │  SYSTEM         smb/445  Blue    Active  │
│  Blue Machine   (2)   │                                          │
│                       │  [Credential expanded below — on click]  │
│                       │  ─────────────────────────────────────── │
│                       │  R1ckRul3s                               │
│                       │  Service: http:80 • Target: Pickle Rick  │
│                       │  Password: [••••••••••••] [👁] [📋 30s] │
│                       │  Source: gobuster + robots.txt           │
│                       │  Status: Active ✓ Verified               │
│                       │  [Edit] [Delete] [Mark Rotated]          │
└───────────────────────┴──────────────────────────────────────────┘
│  🔓 Unlocked • 21 credentials • Auto-lock: 15 min               │
└──────────────────────────────────────────────────────────────────┘
```

**Sidebar:**
- Navigation: All Credentials, Import, Backup, Settings
- "By Target" section: lists all unique target names with credential counts
- Clicking a target filters the table to that target's credentials

**Credential table:**
- Columns: Username (monospace), Service/Port (monospace), Target Name, Status badge
- Sorted by: target name, then creation date
- Search: real-time filter across username, service, target
- Filter dropdown: by status (active/rotated/invalid), by target, by service

**Credential expand (inline, below the row):**
- Shows all fields
- Password row: masked by default, [👁 Show] to reveal, [📋 Copy] button
  - Copy triggers a 30-second clipboard timer: "Copied — clears in 30s"
  - After 30 seconds: clipboard is overwritten with empty string
- Hash row (if present): truncated + copy button, full hash on hover
- Edit button: opens edit form inline
- Delete button: confirmation required (shows credential name in the dialog)
- "Mark Rotated" button: changes status to 'rotated'

---

### Screen 4: Add Credential Modal

```
┌──────────────────────────────────────────────────────┐
│  Add Credential                                      │
├──────────────────────────────────────────────────────┤
│  Username*    [R1ckRul3s                           ]  │
│  Password     [••••••••••] [👁] [Generate]          │
│  Hash         [                                    ]  │
│  Hash Type    [NTLM ▾]      (only if hash is set)   │
│  ──────────────────────────────────────────────      │
│  Service*     [http                               ]  │
│  IP*          [10.10.3.164                        ]  │
│  Port         [80                                 ]  │
│  Protocol     [tcp ▾]                               │
│  Target Name  [Pickle Rick                        ]  │
│  Source       [gobuster + robots.txt              ]  │
│  ──────────────────────────────────────────────      │
│  Tags         [#web] [#htb] [+]                     │
│  Notes        [Found in robots.txt disallowed...  ]  │
│  Verified     [●] Yes                               │
│  ──────────────────────────────────────────────      │
│  Status       [Active ▾]                            │
│                           [Cancel]  [Save]           │
└──────────────────────────────────────────────────────┘
```

- Password OR Hash — not required to have both
- "Generate" button: generates a random strong password for storing generated creds
- Target Name auto-filled from `shared_context.activeTarget` if set
- IP auto-filled from `shared_context.activeIP` if set

---

### Screen 5: Import from ReconDesk

```
┌──────────────────────────────────────────────────────┐
│  Import from ReconDesk                               │
├──────────────────────────────────────────────────────┤
│  Select target to import from:                       │
│  [Pickle Rick ▾]                                    │
│                                                      │
│  Preview (2 credentials found):                      │
│                                                      │
│  [✓] R1ckRul3s / http:80 / Active                  │
│  [✓] rabbit / smb:445 / Active                     │
│                                                      │
│  Duplicate check: 0 already exist in vault          │
│                                                      │
│              [Cancel]  [Import Selected (2)]         │
└──────────────────────────────────────────────────────┘
```

- Reads ReconDesk target data from `cybertools-config.json`
- Shows all credentials for the selected target as a selectable list
- Each row: username, service, status — checkable
- Duplicate detection: if credential with same username+service+ip already exists in vault, show "Already in vault" and pre-uncheck
- "Import Selected" adds only the checked items

---

### Screen 6: Encrypted Backup & Restore

**Backup:**
```
┌──────────────────────────────────────────────────────┐
│  Export Encrypted Backup                             │
├──────────────────────────────────────────────────────┤
│  The backup will be encrypted with a separate        │
│  export password (not your master password).        │
│                                                      │
│  Export Password  [••••••••••••••] [👁]             │
│  Confirm          [••••••••••••••] [👁]             │
│                                                      │
│  21 credentials will be exported.                   │
│                                                      │
│              [Cancel]  [Export Backup]               │
└──────────────────────────────────────────────────────┘
```

**Restore:**
```
┌──────────────────────────────────────────────────────┐
│  Import from Backup                                  │
├──────────────────────────────────────────────────────┤
│  [Select .cvcrypt backup file...]                   │
│                                                      │
│  Export Password  [••••••••••••••] [👁]             │
│                                                      │
│  ⚠ This will MERGE with your existing vault.        │
│    Duplicate credentials will be skipped.           │
│                                                      │
│              [Cancel]  [Import Backup]               │
└──────────────────────────────────────────────────────┘
```

---

### Screen 7: Settings

**Security:**
- Auto-lock timeout: Never / 5 min / 15 min / 30 min
- Lock on app hide (toggle)
- Require password to view (vs. showing on expand) — toggle

**Clipboard:**
- Clipboard clear timer: 30s / 60s / Never

**Integration:**
- Allow cross-app credential queries via IPC (toggle, default on)
- Show notification on new credential import (toggle)

---

## ZUSTAND STORE

```typescript
interface CredVaultState {
  // Auth state
  isSetup: boolean;
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil: Date | null;
  autoLockTimer: NodeJS.Timeout | null;
  
  // Vault data (only set when unlocked)
  credentials: Credential[];
  
  // Ecosystem context
  sharedContext: SharedContext | null;
  
  // UI state
  activeView: 'credentials' | 'import' | 'backup' | 'settings';
  searchQuery: string;
  filterTarget: string | null;
  filterStatus: string | null;
  expandedCredId: string | null;
  
  // Clipboard timer
  clipboardCountdown: number;   // seconds remaining (0 = no active copy)
  
  // Actions
  checkSetup: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setup: (password: string) => Promise<void>;
  
  addCredential: (cred: Omit<Credential, 'id' | 'createdAt'>) => Promise<void>;
  updateCredential: (id: string, patch: Partial<Credential>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  
  copyPassword: (credId: string) => Promise<void>;  // copies + starts 30s timer
  
  loadReconDeskTargets: () => Promise<ReconDeskTarget[]>;
  importFromReconDesk: (targetName: string, selectedCredIds: string[]) => Promise<number>;
  
  exportBackup: (exportPassword: string) => Promise<void>;
  importBackup: (filePath: string, exportPassword: string) => Promise<void>;
  
  loadSharedContext: () => Promise<void>;
  writeStatus: () => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
  
  setSearchQuery: (q: string) => void;
  setExpandedCred: (id: string | null) => void;
}
```

---

## IPC HANDLERS (main process)

All crypto runs in main process. Renderer never sees raw keys.

```typescript
ipcMain.handle('credvault:setup:check', async () => {
  // Check if salt.bin exists
  // Return: { isSetup: boolean }
})

ipcMain.handle('credvault:setup:create', async (_, password: string) => {
  // Generate random salt, derive key, create empty vault, encrypt and save
  // Return: { success: boolean }
})

ipcMain.handle('credvault:unlock', async (_, password: string) => {
  // Read salt, derive key, attempt decrypt
  // If success: store key in main process memory, return decrypted vault data (NOT the key)
  // If fail: return { success: false }
})

ipcMain.handle('credvault:lock', async () => {
  // Clear derived key from memory
  // Return: { success: true }
})

ipcMain.handle('credvault:credential:save', async (_, credential: Credential) => {
  // Re-encrypt vault with updated data using stored key
})

ipcMain.handle('credvault:credential:delete', async (_, id: string) => {
  // Remove from vault, re-encrypt
})

ipcMain.handle('credvault:backup:export', async (_, exportPassword: string) => {
  // Decrypt vault using stored key, re-encrypt with export password, save dialog
})

ipcMain.handle('credvault:backup:import', async (_, filePath: string, exportPassword: string) => {
  // Decrypt backup with export password, merge into current vault, re-encrypt
})

ipcMain.handle('credvault:config:read', async () => { /* read recondesk data + shared_context */ })
ipcMain.handle('credvault:config:write', async (_, patch) => { /* write credvault_status */ })
ipcMain.handle('credvault:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
ipcMain.handle('credvault:clipboard:clear', async () => { /* clipboard.writeText('') */ })

// Cross-app credential query (called by other apps via IPC)
ipcMain.handle('credvault-search', async (_, query: { ip?: string; targetName?: string }) => {
  // Returns CredentialPublic[] (no passwords/hashes) if vault is unlocked
  // Returns [] if vault is locked
})
```

---

## COMPONENT ARCHITECTURE

```
src/
├── main/
│   ├── ipc/
│   │   └── credvault.ts        # All IPC handlers + crypto operations
│   └── cryptoManager.ts        # Key storage, PBKDF2, AES-256-GCM functions
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SetupScreen.tsx
│   │   │   ├── UnlockScreen.tsx
│   │   │   └── PasswordStrength.tsx
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── vault/
│   │   │   ├── VaultView.tsx
│   │   │   ├── CredentialTable.tsx
│   │   │   ├── CredentialRow.tsx
│   │   │   ├── CredentialExpand.tsx
│   │   │   ├── AddCredentialModal.tsx
│   │   │   └── ClipboardTimer.tsx
│   │   ├── import/
│   │   │   └── ImportView.tsx
│   │   └── backup/
│   │       └── BackupView.tsx
│   ├── stores/
│   │   └── useCredVaultStore.ts
│   └── types/
│       └── credvault.ts
```

---

## ANIMATIONS

- **Unlock screen:** lock icon transitions from locked to unlocked on success (scale + rotate)
- **Wrong password:** input field shakes (keyframes: translate X ±4px, 3 cycles, 300ms total)
- **Credential expand:** smooth height animation (Framer Motion `AnimatePresence` + layout)
- **Clipboard countdown:** timer counts down, turns amber at 10s, turns red at 5s
- **Add credential modal:** scale + fade in
- **Import success:** brief success toast, credentials row stagger in
- **Lock action:** screen fades to lock screen (250ms)

---

## CRITICAL REQUIREMENTS

1. PBKDF2 and AES-256-GCM must run in the **main process only** — never in the renderer
2. The derived key must be stored as a `Buffer` in a module-level variable in the main process — cleared on lock
3. `vault.enc` must never be written in plaintext at any point — always encrypt before writing
4. Clipboard must be cleared after the configured timer (30s default) — use `setTimeout` in main process, not renderer
5. Failed unlock attempts must persist across app restarts (stored in `salt.bin` directory as a counter file or in the encrypted vault metadata)
6. The `credvault-search` IPC channel must be listed in the preload bridge allowlist so other apps can call it
7. Never log master password, derived key, or decrypted credential data to console or any log file
8. Auto-lock must use an `idle` timer that resets on any user interaction — not just a wall-clock timer

---

## DELIVERABLES

1. All component files
2. Main process: `cryptoManager.ts`, `ipc/credvault.ts`
3. Zustand store
4. Type definitions
5. `IMPLEMENTATION_PLAN.md` for CredVault

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
