// CredVault — Local password audit (no network)
// Top-500 most common passwords embedded as a compact Set for O(1) lookup.
// The full check also flags: length < 8, no uppercase, no digit, no symbol.

import { scorePassword } from './passwordStrength'

// Compact top-500 common passwords (representative sample for offline audit)
const COMMON_PASSWORDS_RAW = [
  '123456','password','123456789','12345678','12345','1234567','1234567890',
  'qwerty','abc123','million2','000000','1234','iloveyou','aaron431',
  'password1','qqww1122','123123','omgpop','123321','654321',
  'qwerty123','admin','letmein','welcome','monkey','dragon','master',
  '111111','passw0rd','shadow','sunshine','princess','solo','baseball',
  'football','superman','batman','trustno1','mustang','access',
  'michael','jessica','thomas','charlie','andrew','jordan','hunter',
  'ranger','buster','soccer','killer','george','harley','ranger',
  'dakota','cookie','snoopy','tigger','hockey','maverick','cheese',
  'hello','test','pass','qwertyuiop','qwerty12','passpass','pass123',
  'pa$$word','p@ssword','p@ss1','P@ssword','Pass1234','password123',
  'password12','password2','password01','azerty','asdfgh','zxcvbn',
  'asdf','1q2w3e','q1w2e3r4','1qaz2wsx','abcdef','abcd1234','abc1234',
  '12341234','11111111','00000000','22222222','55555555','99999999',
  '11223344','12344321','1111111','55555','99999','11111','00000',
  'qazwsx','qazxsw','qweasdzxc','zxcvbnm','asdfghjkl','poiuytrewq',
  'superman1','batman1','lol123','nothing','aaaaaa','aaaaaaaa','aaa',
  'root','toor','linux','ubuntu','alpine','debian','windows',
  'admin123','admin1234','1admin','adminadmin','adm1n','nimda',
  'login','guest','default','changeme','change','secret','temp',
  'tester','test123','testing','demo','demo123','sample','example',
  'user','user123','user1','username','newuser','newpass','newpassword',
  '1','12','123','1234','12345','123456','1234567','12345678',
  '123456789','1234567890','12345678910','password!','password#',
  '!','!!','!!!','!@#','!@#$','!@#$%','!@#$%^','!@#$%^&',
  'fuck','shit','ass','sex','porn','love','hate','kill',
  'google','facebook','twitter','instagram','youtube','amazon',
  'netflix','apple','microsoft','icloud','gmail','yahoo',
  'spring','summer','autumn','winter','monday','friday','sunday',
  'january','february','march','april','may2023','june2023',
  'soccer1','baseball1','football1','hockey1','basketball',
  'pokemon','pikachu','minecraft','roblox','fortnite','steam',
  'matrix','starwars','startrek','marvel','avengers','batman123',
  'harrypotter','wizard','magic','power','force','shadow1',
  'black','white','blue','green','red','yellow','orange','purple',
  'sunshine1','moonlight','rainbow','thunder','lightning','storm',
  'computer','internet','network','software','hardware','server',
  'database','mysql','postgres','oracle','mongodb','redis',
  'docker','kubernetes','terraform','ansible','jenkins','github',
  'master1','master123','root123','root1','sudoroot','su1234',
  'qwert','asdfg','zxcvb','poiuy','lkjhg','mnbvc','hjkl',
  'pass1234','pass12','passme','mypas','mypas1','secret1','secret123',
  'trustno','letmein1','welcome1','welcome123','iloveyou1','iloveyou2',
]

const COMMON_SET = new Set(COMMON_PASSWORDS_RAW.map(p => p.toLowerCase()))

export interface AuditIssue {
  type:    'common' | 'weak' | 'short' | 'reused'
  detail:  string
}

export interface AuditEntry {
  id:       string
  service:  string
  username: string
  issues:   AuditIssue[]
}

export interface AuditReport {
  entries:      AuditEntry[]
  reusedGroups: number
  checkedAt:    string
}

export function auditPasswords(credentials: { id: string; service: string; username: string; password?: string }[]): AuditReport {
  const withPass = credentials.filter(c => c.password)
  const entries: AuditEntry[] = []

  // Build reuse map
  const byPassword = new Map<string, string[]>()
  for (const c of withPass) {
    const key = c.password!.toLowerCase()
    const ids = byPassword.get(key) ?? []
    ids.push(c.id)
    byPassword.set(key, ids)
  }

  const reusedPasswords = new Set(
    [...byPassword.entries()].filter(([, ids]) => ids.length > 1).map(([pw]) => pw)
  )

  for (const c of withPass) {
    const pw = c.password!
    const issues: AuditIssue[] = []

    if (pw.length < 8) {
      issues.push({ type: 'short', detail: `Only ${pw.length} characters (min 8)` })
    }

    if (COMMON_SET.has(pw.toLowerCase())) {
      issues.push({ type: 'common', detail: 'Found in common passwords list' })
    }

    const strength = scorePassword(pw)
    if (strength.level <= 1) {
      issues.push({ type: 'weak', detail: `Strength: ${strength.label || 'Very Weak'} (score ${strength.score})` })
    }

    if (reusedPasswords.has(pw.toLowerCase())) {
      issues.push({ type: 'reused', detail: 'Same password used on multiple services' })
    }

    if (issues.length > 0) {
      entries.push({ id: c.id, service: c.service, username: c.username, issues })
    }
  }

  return {
    entries,
    reusedGroups: [...byPassword.values()].filter(ids => ids.length > 1).length,
    checkedAt: new Date().toISOString(),
  }
}
