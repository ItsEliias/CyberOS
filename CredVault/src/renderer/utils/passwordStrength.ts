// CredVault — Password strength scorer (renderer-only, no Node crypto)

export interface StrengthResult {
  score: number    // 0–100
  label: string    // Weak / Fair / Good / Strong / Very Strong
  color: string
  level: 0 | 1 | 2 | 3 | 4
}

const COMMON_PATTERNS = [
  /^[a-z]+$/i,        // letters only
  /^[0-9]+$/,         // digits only
  /(.)\1{2,}/,        // 3+ repeated chars
  /012|123|234|345|456|567|678|789|890/,   // sequential digits
  /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i,
]

export function scorePassword(pw: string): StrengthResult {
  if (!pw) return { score: 0, label: '', color: 'var(--border)', level: 0 }

  let score = 0

  // Length scoring (0–30)
  if (pw.length >= 8)  score += 10
  if (pw.length >= 12) score += 10
  if (pw.length >= 16) score += 10

  // Character class diversity (0–40)
  if (/[a-z]/.test(pw)) score += 10
  if (/[A-Z]/.test(pw)) score += 10
  if (/[0-9]/.test(pw)) score += 10
  if (/[^A-Za-z0-9]/.test(pw)) score += 10

  // Variety bonus (0–30)
  const uniqueChars = new Set(pw).size
  score += Math.min(30, Math.floor(uniqueChars / pw.length * 30))

  // Deductions for weak patterns
  for (const pat of COMMON_PATTERNS) {
    if (pat.test(pw)) { score = Math.max(0, score - 15); break }
  }

  const clamped = Math.min(100, Math.max(0, score))

  if (clamped < 25)  return { score: clamped, label: 'Weak',      color: '#f85149', level: 1 }
  if (clamped < 50)  return { score: clamped, label: 'Fair',      color: '#d29922', level: 2 }
  if (clamped < 70)  return { score: clamped, label: 'Good',      color: '#4a9eff', level: 3 }
  if (clamped < 90)  return { score: clamped, label: 'Strong',    color: '#3fb950', level: 4 }
  return               { score: clamped, label: 'Very Strong', color: '#3fb950', level: 4 }
}
