// CredVault — CSV import parser (no external libs)

import type { Credential } from '@shared/types'

type PartialCred = Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>

/** Parse a single CSV row respecting quoted fields */
function parseRow(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      i++ // skip opening quote
      let field = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      fields.push(field)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { fields.push(line.slice(i)); break }
      fields.push(line.slice(i, end))
      i = end + 1
    }
  }
  return fields
}

function getHeader(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

export type CsvFormat = '1password' | 'bitwarden' | 'keepass' | 'unknown'

export interface CsvParseResult {
  format: CsvFormat
  rows: PartialCred[]
  errors: string[]
}

function detectFormat(headers: string[]): CsvFormat {
  const h = headers.map(x => x.toLowerCase().trim())
  if (h.includes('login_uri') || h.includes('login_username')) return 'bitwarden'
  if (h.includes('title') && h.includes('username')) return h.includes('url') ? '1password' : 'keepass'
  return 'unknown'
}

export function parseCsv(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { format: 'unknown', rows: [], errors: ['CSV file has no data rows'] }

  const headers = parseRow(lines[0])
  const format  = detectFormat(headers)
  const rows: PartialCred[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i])
    if (cols.every(c => !c.trim())) continue
    try {
      const cred = buildCred(format, headers, cols)
      if (cred) rows.push(cred)
    } catch (e) {
      errors.push(`Row ${i + 1}: ${(e as Error).message}`)
    }
  }

  return { format, rows, errors }
}

function col(cols: string[], idx: number): string {
  return idx >= 0 && idx < cols.length ? cols[idx].trim() : ''
}

function buildCred(format: CsvFormat, headers: string[], cols: string[]): PartialCred | null {
  if (format === 'bitwarden') {
    const nameIdx = getHeader(headers, 'name')
    const uriIdx  = getHeader(headers, 'login_uri')
    const userIdx = getHeader(headers, 'login_username')
    const passIdx = getHeader(headers, 'login_password')
    const noteIdx = getHeader(headers, 'notes')
    const name = col(cols, nameIdx) || 'Imported'
    const username = col(cols, userIdx) || '(none)'
    return {
      username,
      password:   col(cols, passIdx) || undefined,
      service:    name,
      ip:         col(cols, uriIdx)  || undefined,
      source:     'CSV import (Bitwarden)',
      tags:       [],
      notes:      col(cols, noteIdx) || undefined,
      verified:   false,
      status:     'active',
    }
  }

  // 1Password and KeePass share similar column names
  const titleIdx = getHeader(headers, 'title')
  const userIdx  = getHeader(headers, 'username')
  const passIdx  = getHeader(headers, 'password')
  const urlIdx   = getHeader(headers, 'url')
  const noteIdx  = getHeader(headers, 'notes')

  const username = col(cols, userIdx) || '(none)'
  const service  = col(cols, titleIdx) || 'Imported'
  return {
    username,
    password: col(cols, passIdx) || undefined,
    service,
    ip:       col(cols, urlIdx)  || undefined,
    source:   format === '1password' ? 'CSV import (1Password)' : 'CSV import (KeePass)',
    tags:     [],
    notes:    col(cols, noteIdx) || undefined,
    verified: false,
    status:   'active',
  }
}
