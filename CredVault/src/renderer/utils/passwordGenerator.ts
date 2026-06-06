// CredVault — Password generator (renderer-only; uses Web Crypto for randomness)

export interface GenOptions {
  length:     number
  upper:      boolean
  lower:      boolean
  digits:     boolean
  symbols:    boolean
  noAmbiguous: boolean
}

const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER   = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS  = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?'
const AMBIGUOUS = /[O0Il1|`'"]/g

export function buildCharset(opts: GenOptions): string {
  let cs = ''
  if (opts.upper)   cs += UPPER
  if (opts.lower)   cs += LOWER
  if (opts.digits)  cs += DIGITS
  if (opts.symbols) cs += SYMBOLS
  if (opts.noAmbiguous) cs = cs.replace(AMBIGUOUS, '')
  return cs
}

export function generatePassword(opts: GenOptions): string {
  const cs = buildCharset(opts)
  if (cs.length === 0) return ''
  const len = Math.max(1, Math.min(128, Math.floor(opts.length)))

  // Use crypto.getRandomValues for unbiased random picks. Reject indices
  // above the largest multiple of cs.length that fits in Uint32 to avoid
  // modulo bias.
  const out: string[] = new Array(len)
  const ceiling = Math.floor(0xFFFFFFFF / cs.length) * cs.length
  const buf = new Uint32Array(len * 2) // overhead for rejection sampling

  let bi = 0
  let i  = 0
  while (i < len) {
    if (bi >= buf.length) {
      crypto.getRandomValues(buf)
      bi = 0
    } else if (bi === 0) {
      crypto.getRandomValues(buf)
    }
    const v = buf[bi++]
    if (v < ceiling) {
      out[i++] = cs[v % cs.length]
    }
  }

  return out.join('')
}
