// encoder.js — Local encode/decode/hash operations
// 100% local — no API calls — all operations run synchronously in renderer

'use strict';

// Operations registry
const OPERATIONS = [
  { id: 'b64-encode', label: 'Base64 Encode', group: 'Base64' },
  { id: 'b64-decode', label: 'Base64 Decode', group: 'Base64' },
  { id: 'url-encode', label: 'URL Encode', group: 'URL' },
  { id: 'url-decode', label: 'URL Decode', group: 'URL' },
  { id: 'html-encode', label: 'HTML Encode', group: 'HTML' },
  { id: 'html-decode', label: 'HTML Decode', group: 'HTML' },
  { id: 'hex-encode', label: 'Hex Encode', group: 'Hex' },
  { id: 'hex-decode', label: 'Hex Decode', group: 'Hex' },
  { id: 'rot13', label: 'ROT13', group: 'Cipher' },
  { id: 'binary-encode', label: 'Text → Binary', group: 'Binary' },
  { id: 'binary-decode', label: 'Binary → Text', group: 'Binary' },
  { id: 'decimal-to-hex', label: 'Decimal → Hex', group: 'Numeric' },
  { id: 'hex-to-decimal', label: 'Hex → Decimal', group: 'Numeric' },
  { id: 'md5', label: 'MD5 Hash', group: 'Hash' },
  { id: 'sha1', label: 'SHA1 Hash', group: 'Hash' },
  { id: 'sha256', label: 'SHA256 Hash', group: 'Hash' },
  { id: 'jwt-decode', label: 'JWT Decode', group: 'JWT' },
];

function htmlEntities(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function htmlEntitiesDecode(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

async function sha256Hash(msg) {
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha1Hash(msg) {
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// MD5 implementation (pure JS, no external lib)
function md5Hash(input) {
  function safeAdd(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

  function md5cycle(x, k) {
    let [a, b, c, d] = x;
    a = md5ff(a, b, c, d, k[0], 7, -680876936); d = md5ff(d, a, b, c, k[1], 12, -389564586);
    c = md5ff(c, d, a, b, k[2], 17, 606105819); b = md5ff(b, c, d, a, k[3], 22, -1044525330);
    a = md5ff(a, b, c, d, k[4], 7, -176418897); d = md5ff(d, a, b, c, k[5], 12, 1200080426);
    c = md5ff(c, d, a, b, k[6], 17, -1473231341); b = md5ff(b, c, d, a, k[7], 22, -45705983);
    a = md5ff(a, b, c, d, k[8], 7, 1770035416); d = md5ff(d, a, b, c, k[9], 12, -1958414417);
    c = md5ff(c, d, a, b, k[10], 17, -42063); b = md5ff(b, c, d, a, k[11], 22, -1990404162);
    a = md5ff(a, b, c, d, k[12], 7, 1804603682); d = md5ff(d, a, b, c, k[13], 12, -40341101);
    c = md5ff(c, d, a, b, k[14], 17, -1502002290); b = md5ff(b, c, d, a, k[15], 22, 1236535329);
    a = md5gg(a, b, c, d, k[1], 5, -165796510); d = md5gg(d, a, b, c, k[6], 9, -1069501632);
    c = md5gg(c, d, a, b, k[11], 14, 643717713); b = md5gg(b, c, d, a, k[0], 20, -373897302);
    a = md5gg(a, b, c, d, k[5], 5, -701558691); d = md5gg(d, a, b, c, k[10], 9, 38016083);
    c = md5gg(c, d, a, b, k[15], 14, -660478335); b = md5gg(b, c, d, a, k[4], 20, -405537848);
    a = md5gg(a, b, c, d, k[9], 5, 568446438); d = md5gg(d, a, b, c, k[14], 9, -1019803690);
    c = md5gg(c, d, a, b, k[3], 14, -187363961); b = md5gg(b, c, d, a, k[8], 20, 1163531501);
    a = md5gg(a, b, c, d, k[13], 5, -1444681467); d = md5gg(d, a, b, c, k[2], 9, -51403784);
    c = md5gg(c, d, a, b, k[7], 14, 1735328473); b = md5gg(b, c, d, a, k[12], 20, -1926607734);
    a = md5hh(a, b, c, d, k[5], 4, -378558); d = md5hh(d, a, b, c, k[8], 11, -2022574463);
    c = md5hh(c, d, a, b, k[11], 16, 1839030562); b = md5hh(b, c, d, a, k[14], 23, -35309556);
    a = md5hh(a, b, c, d, k[1], 4, -1530992060); d = md5hh(d, a, b, c, k[4], 11, 1272893353);
    c = md5hh(c, d, a, b, k[7], 16, -155497632); b = md5hh(b, c, d, a, k[10], 23, -1094730640);
    a = md5hh(a, b, c, d, k[13], 4, 681279174); d = md5hh(d, a, b, c, k[0], 11, -358537222);
    c = md5hh(c, d, a, b, k[3], 16, -722521979); b = md5hh(b, c, d, a, k[6], 23, 76029189);
    a = md5hh(a, b, c, d, k[9], 4, -640364487); d = md5hh(d, a, b, c, k[12], 11, -421815835);
    c = md5hh(c, d, a, b, k[15], 16, 530742520); b = md5hh(b, c, d, a, k[2], 23, -995338651);
    a = md5ii(a, b, c, d, k[0], 6, -198630844); d = md5ii(d, a, b, c, k[7], 10, 1126891415);
    c = md5ii(c, d, a, b, k[14], 15, -1416354905); b = md5ii(b, c, d, a, k[5], 21, -57434055);
    a = md5ii(a, b, c, d, k[12], 6, 1700485571); d = md5ii(d, a, b, c, k[3], 10, -1894986606);
    c = md5ii(c, d, a, b, k[10], 15, -1051523); b = md5ii(b, c, d, a, k[1], 21, -2054922799);
    a = md5ii(a, b, c, d, k[8], 6, 1873313359); d = md5ii(d, a, b, c, k[15], 10, -30611744);
    c = md5ii(c, d, a, b, k[6], 15, -1560198380); b = md5ii(b, c, d, a, k[13], 21, 1309151649);
    a = md5ii(a, b, c, d, k[4], 6, -145523070); d = md5ii(d, a, b, c, k[11], 10, -1120210379);
    c = md5ii(c, d, a, b, k[2], 15, 718787259); b = md5ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = safeAdd(a, x[0]); x[1] = safeAdd(b, x[1]); x[2] = safeAdd(c, x[2]); x[3] = safeAdd(d, x[3]);
    return x;
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  let str = unescape(encodeURIComponent(input));
  let n = str.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i;
  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(str.substring(i - 64, i)));
  }
  str = str.substring(i - 64);
  const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (i = 0; i < str.length; i++) tail[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) { md5cycle(state, tail); tail.fill(0); }
  tail[14] = n * 8;
  md5cycle(state, tail);

  function rhex(n) {
    let s = '';
    for (let j = 0; j < 4; j++) s += ('0' + ((n >>> (j * 8)) & 0xFF).toString(16)).slice(-2);
    return s;
  }
  return state.map(rhex).join('');
}

async function applyOperation(op, input) {
  try {
    switch (op) {
      case 'b64-encode':
        return btoa(unescape(encodeURIComponent(input)));
      case 'b64-decode':
        return decodeURIComponent(escape(atob(input)));
      case 'url-encode':
        return encodeURIComponent(input);
      case 'url-decode':
        return decodeURIComponent(input);
      case 'html-encode':
        return htmlEntities(input);
      case 'html-decode':
        return htmlEntitiesDecode(input);
      case 'hex-encode':
        return Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      case 'hex-decode': {
        const hex = input.replace(/\s+/g, '');
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
        return new TextDecoder().decode(new Uint8Array(bytes));
      }
      case 'rot13':
        return rot13(input);
      case 'binary-encode':
        return Array.from(new TextEncoder().encode(input)).map(b => b.toString(2).padStart(8, '0')).join(' ');
      case 'binary-decode': {
        const bits = input.trim().split(/\s+/);
        const bytes2 = bits.map(b => parseInt(b, 2));
        return new TextDecoder().decode(new Uint8Array(bytes2));
      }
      case 'decimal-to-hex': {
        const parts = input.trim().split(/\s+/);
        return parts.map(p => parseInt(p).toString(16).toUpperCase()).join(' ');
      }
      case 'hex-to-decimal': {
        const parts2 = input.trim().split(/\s+/);
        return parts2.map(p => parseInt(p, 16)).join(' ');
      }
      case 'md5':
        return md5Hash(input);
      case 'sha1':
        return await sha1Hash(input);
      case 'sha256':
        return await sha256Hash(input);
      case 'jwt-decode': {
        const parts3 = input.split('.');
        if (parts3.length !== 3) throw new Error('Not a valid JWT (must have 3 parts)');
        const decodeB64 = (s) => {
          const pad = s.length % 4;
          const padded = s + '===='.slice(0, pad ? 4 - pad : 0);
          return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
        };
        const header = decodeB64(parts3[0]);
        const payload = decodeB64(parts3[1]);
        return `=== HEADER ===\n${JSON.stringify(header, null, 2)}\n\n=== PAYLOAD ===\n${JSON.stringify(payload, null, 2)}\n\n=== SIGNATURE ===\n${parts3[2]}\n\n[Note: Signature verification requires the secret key]`;
      }
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  } catch (e) {
    throw new Error(`${op} failed: ${e.message}`);
  }
}

// Chain mode — apply up to 3 operations in sequence
async function applyChain(operations, input) {
  let result = input;
  const steps = [];
  for (const op of operations) {
    if (!op) continue;
    try {
      result = await applyOperation(op, result);
      steps.push({ op, result, error: null });
    } catch (e) {
      steps.push({ op, result: null, error: e.message });
      break;
    }
  }
  return { final: result, steps };
}

module.exports = { OPERATIONS, applyOperation, applyChain };
