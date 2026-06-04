// ReconDesk — credential change detection helper (extracted from main.ts)
import fs from 'fs'
import type { ReconDeskData } from '../shared/types'

const CYBERTOOLS_CONFIG = require('path').join(require('os').homedir(), 'cybertools-config.json')

function updateOperatorProfile(updates: Record<string, unknown>): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const existing = (shared.operator_profile as Record<string, unknown>) || {}
    shared.operator_profile = { ...existing, ...updates }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
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
    const newCreds: Array<{
      targetName: string; targetIP: string; username?: string; hash?: string; type: string; service?: string; queuedAt: string
    }> = []

    for (const target of data.targets) {
      const prevTarget  = prev.targets.find(t => t.id === target.id)
      const prevCredIds = new Set(prevTarget?.credentials.map(c => c.id) ?? [])
      for (const cred of target.credentials) {
        if (!prevCredIds.has(cred.id)) {
          newCreds.push({
            targetName: target.name,
            targetIP:   target.ip,
            username:   cred.username,
            hash:       cred.hash,
            type:       cred.type ?? 'unknown',
            service:    cred.service,
            queuedAt:   new Date().toISOString(),
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
      fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
    }
  } catch {}
}
