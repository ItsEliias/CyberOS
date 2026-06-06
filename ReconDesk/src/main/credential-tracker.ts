// ReconDesk — credential change detection helper (extracted from main.ts)
import fs from 'fs'
import type { ReconDeskData } from '../shared/types'

const CYBERTOOLS_CONFIG = require('path').join(require('os').homedir(), 'cybertools-config.json')

// Atomic write — tmp + rename so a crash mid-write can't leave a
// half-written cybertools-config.json that breaks every cooperating app.
function writeSharedAtomic(cfg: unknown): void {
  const tmp = `${CYBERTOOLS_CONFIG}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CYBERTOOLS_CONFIG)
}

function updateOperatorProfile(updates: Record<string, unknown>): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const existing = (shared.operator_profile as Record<string, unknown>) || {}
    shared.operator_profile = { ...existing, ...updates }
    writeSharedAtomic(shared)
  } catch {}
}

export function detectCredentialChanges(prev: ReconDeskData, data: ReconDeskData): void {
  let credentialDelta = 0
  for (const target of data.targets) {
    const prevTarget   = prev.targets.find(t => t.id === target.id)
    const prevCredCount = prevTarget ? prevTarget.credentials.length : 0
    const currCredCount = target.credentials.length
    if (currCredCount > prevCredCount) credentialDelta += currCredCount - prevCredCount
  }

  if (credentialDelta <= 0) return

  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const profile = (shared.operator_profile as Record<string, unknown>) || {}
    const current  = typeof profile.totalCredentials === 'number' ? profile.totalCredentials : 0
    updateOperatorProfile({ totalCredentials: current + credentialDelta })
  } catch {}

  // Collect new cred objects and push to credvault_pending
  try {
    // Read shared_context.activeLab once so every new cred gets tagged with the
    // current lab. Falls back to the target name when no active lab is set.
    let activeLab: string | undefined
    try {
      if (fs.existsSync(CYBERTOOLS_CONFIG)) {
        const shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
        const ctx = (shared.shared_context as Record<string, unknown>) || {}
        if (typeof ctx.activeLab === 'string' && ctx.activeLab.trim()) activeLab = ctx.activeLab.trim()
      }
    } catch {}

    const newCreds: Array<{
      targetName: string; targetIP: string; username?: string; password?: string; hash?: string;
      type: string; service?: string; queuedAt: string; lab?: string; suggestedFolder?: string
    }> = []

    for (const target of data.targets) {
      const prevTarget  = prev.targets.find(t => t.id === target.id)
      const prevCredIds = new Set(prevTarget?.credentials.map(c => c.id) ?? [])
      for (const cred of target.credentials) {
        if (!prevCredIds.has(cred.id)) {
          const lab = activeLab || target.name
          newCreds.push({
            targetName: target.name,
            targetIP:   target.ip,
            username:   cred.username,
            password:   (cred as { password?: string }).password,
            hash:       cred.hash,
            type:       cred.type ?? 'unknown',
            service:    cred.service,
            queuedAt:   new Date().toISOString(),
            lab,
            suggestedFolder: `Labs / ${lab}`,
          })
        }
      }
    }

    if (newCreds.length > 0) {
      let shared: Record<string, unknown> = {}
      if (fs.existsSync(CYBERTOOLS_CONFIG)) {
        try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
      }
      const existing = (shared.credvault_pending as typeof newCreds) || []
      shared.credvault_pending = [...existing, ...newCreds]
      writeSharedAtomic(shared)

      // Best-effort ecosystem-bus emit so the Launcher activity feed picks it up.
      try {
        const path = require('path') as typeof import('path')
        const os   = require('os')   as typeof import('os')
        const BUS  = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json')
        const events = fs.existsSync(BUS) ? JSON.parse(fs.readFileSync(BUS, 'utf8')) : []
        for (const c of newCreds) {
          events.unshift({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            appName: 'ReconDesk',
            eventType: 'recondesk.credential.found',
            data: { target: c.targetName, lab: c.lab, count: 1 },
            timestamp: new Date().toISOString(),
          })
        }
        const tmpBus = `${BUS}.tmp`
        fs.writeFileSync(tmpBus, JSON.stringify(events.slice(0, 150), null, 2), 'utf8')
        fs.renameSync(tmpBus, BUS)
      } catch {}
    }
  } catch {}
}
