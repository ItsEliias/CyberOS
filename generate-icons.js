#!/usr/bin/env node
// generate-icons.js — Creates all icon sizes from scratch (no external deps)
// Run: node generate-icons.js

'use strict';
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, c]);
}

// ── PNG generator ──────────────────────────────────────────────────────────
function makePNG(size) {
  // Colours — Stealth theme: bg #0e1117, accent circle #4a9eff
  const bgR = 14, bgG = 17, bgB = 23;
  const acR = 74, acG = 158, acB = 255;
  const letR = 255, letG = 255, letB = 255; // white "CC" text pixel

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42, innerR = size * 0.28;

  // Build raw rows (filter byte 0 + RGB pixels)
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const off = y * (size * 3 + 1) + 1 + x * 3;

      // Outer ring
      if (dist <= outerR && dist >= outerR - size * 0.06) {
        raw[off] = acR; raw[off+1] = acG; raw[off+2] = acB;
      }
      // Inner circle fill (darker accent)
      else if (dist < innerR) {
        raw[off] = Math.floor(acR * 0.35);
        raw[off+1] = Math.floor(acG * 0.35);
        raw[off+2] = Math.floor(acB * 0.35);
      }
      // Background
      else {
        raw[off] = bgR; raw[off+1] = bgG; raw[off+2] = bgB;
      }

      // "CC" letters — only meaningful at larger sizes
      if (size >= 64) {
        const unit = size / 16;
        // Left C
        const lx = x / unit, ly = y / unit;
        const isLeftC = (
          (lx >= 4 && lx <= 5 && ly >= 5 && ly <= 11) ||   // vertical bar
          (lx >= 5 && lx <= 7 && ly >= 4 && ly <= 5.5) ||   // top bar
          (lx >= 5 && lx <= 7 && ly >= 10.5 && ly <= 12)    // bottom bar
        );
        // Right C (shifted right by 4 units)
        const isRightC = (
          (lx >= 9 && lx <= 10 && ly >= 5 && ly <= 11) ||
          (lx >= 10 && lx <= 12 && ly >= 4 && ly <= 5.5) ||
          (lx >= 10 && lx <= 12 && ly >= 10.5 && ly <= 12)
        );
        if ((isLeftC || isRightC) && dist < outerR) {
          raw[off] = letR; raw[off+1] = letG; raw[off+2] = letB;
        }
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO file format ────────────────────────────────────────────────────────
// ICO = ICONDIR header + ICONDIRENTRY[] + image data[]
function makeICO(sizes) {
  const pngs = sizes.map(s => makePNG(s));
  const headerSize = 6 + sizes.length * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: ICO
  header.writeUInt16LE(sizes.length, 4); // count

  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;   // width (0 = 256)
    e[1] = s >= 256 ? 0 : s;   // height
    e[2] = 0;                   // color count
    e[3] = 0;                   // reserved
    e.writeUInt16LE(1, 4);      // planes
    e.writeUInt16LE(32, 6);     // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

// ── Write all assets ───────────────────────────────────────────────────────
const ASSETS = path.join(__dirname, 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

const SIZES = [1024, 512, 256, 128, 64, 32, 16];
const pngCache = {};
SIZES.forEach(s => {
  const buf = makePNG(s);
  pngCache[s] = buf;
  if (s === 1024) fs.writeFileSync(path.join(ASSETS, 'icon.png'), buf);
});

// Also write as logo.png (referenced by index.html)
fs.writeFileSync(path.join(ASSETS, 'logo.png'), pngCache[1024]);
console.log('✓ assets/icon.png + assets/logo.png (1024x1024)');

// Write individual sizes for iconset
const ICONSET = path.join(ASSETS, 'icon.iconset');
fs.mkdirSync(ICONSET, { recursive: true });
const iconsetMap = {
  'icon_16x16.png':      16,  'icon_16x16@2x.png':   32,
  'icon_32x32.png':      32,  'icon_32x32@2x.png':   64,
  'icon_128x128.png':   128,  'icon_128x128@2x.png': 256,
  'icon_256x256.png':   256,  'icon_256x256@2x.png': 512,
  'icon_512x512.png':   512,  'icon_512x512@2x.png':1024,
};
for (const [name, sz] of Object.entries(iconsetMap)) {
  const buf = pngCache[sz] || makePNG(sz);
  pngCache[sz] = buf;
  fs.writeFileSync(path.join(ICONSET, name), buf);
}
console.log('✓ assets/icon.iconset/ (all sizes — run iconutil to create .icns)');

// ICO for Windows
const ico = makeICO([256, 128, 64, 48, 32, 16]);
fs.writeFileSync(path.join(ASSETS, 'icon.ico'), ico);
console.log('✓ assets/icon.ico (Windows multi-size)');

console.log('\nDone. Now run on macOS:');
console.log('  iconutil -c icns assets/icon.iconset -o assets/icon.icns');
console.log('Then build:');
console.log('  npm run build:mac');
