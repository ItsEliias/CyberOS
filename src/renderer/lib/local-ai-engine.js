// ═══════════════════════════════════════════════════════════
//   GHOSTVAULT — local-ai.js
//   ItsEliias // v2.0 — General-purpose note processor
//   Zero cost · Offline · Content-preserving
// ═══════════════════════════════════════════════════════════
//
//   Philosophy:
//   - PRESERVE original content — never rewrite, only structure
//   - Keep names, numbers, dates, details EXACTLY as written
//   - Add structure around what's there, not instead of it
//   - No buzzwords, no jargon, no corporate fluff
//   - Output should read like a human organised these notes
//
// ═══════════════════════════════════════════════════════════

'use strict';

/* ─── DETECTION PATTERNS ─────────────────────────────────────────────────── */
const RX = {
  phone:    /(?:\+?[\d\s\-().]{7,20}\d)(?=\s|$|,)/g,
  email:    /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  url:      /https?:\/\/[^\s"'<>\])\n]+/g,
  date:     /\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s*,?\s*\d{4})?)\b/gi,
  time:     /\b(?:\d{1,2}:\d{2}(?:\s*[ap]m)?|\d{1,2}\s*[ap]m)\b/gi,
  relDate:  /\b(?:today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|this\s+week|end\s+of\s+(?:day|week|month)|by\s+(?:eod|eow)|asap|urgent|immediately)\b/gi,
  name:     /\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})\b/g,
  ip4:      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  hash:     /\b[0-9a-fA-F]{32,64}\b/g,
  currency: /(?:£|€|\$|USD|GBP|EUR)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:£|€|\$|USD|GBP|EUR)/g,
  cve:      /CVE-\d{4}-\d{4,7}/gi,
};

const ACTION_VERBS = [
  'follow up', 'call', 'email', 'send', 'contact', 'reach out',
  'check', 'verify', 'confirm', 'review', 'update', 'fix', 'resolve',
  'book', 'schedule', 'arrange', 'set up', 'create', 'prepare',
  'submit', 'complete', 'finish', 'deliver', 'share', 'forward',
  'chase', 'escalate', 'investigate', 'look into', 'find out',
  'remind', 'notify', 'inform', 'tell', 'ask', 'request',
  'cancel', 'close', 'archive', 'delete', 'remove', 'add',
  'refund', 'process', 'approve', 'reject', 'assign', 'move',
];

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function lines(text) { return text.split(/\r?\n/); }
function extractAll(text, rx) {
  const out = [], seen = new Set();
  const r = new RegExp(rx.source, (rx.flags.includes('g') ? rx.flags : rx.flags + 'g'));
  let m;
  while ((m = r.exec(text)) !== null) {
    if (!seen.has(m[0])) { seen.add(m[0]); out.push(m[0]); }
  }
  return out;
}
function isEmpty(l)   { return l.trim() === ''; }
function isHeading(l) { return /^#{1,6}\s/.test(l.trim()); }
function isBullet(l)  { return /^\s*[-*+]\s/.test(l); }
function trimBullet(l){ return l.trim().replace(/^[-*+]\s+/, ''); }

/* ─── NOTE TYPE DETECTOR ─────────────────────────────────────────────────── */
function detectNoteType(text) {
  const t = text.toLowerCase();
  // Ordered from most specific to most general
  if (/\b(customer|client|complaint|angry|caller|complain|refund|billing|account|order|ticket|support\s*call|rang|called\s+in|spoke\s+with)\b/.test(t))
    return 'customer';
  if (/\b(meeting|agenda|attendees?|action\s+items?|minutes|standup|sync|call\s+with|zoom|teams\s+call|discussed)\b/.test(t))
    return 'meeting';
  if (/\b(project|sprint|milestone|deadline|status\s+update|progress|backlog|release|launch|go[- ]live)\b/.test(t))
    return 'project';
  if (/\b(studying|lecture|chapter|course|exam|revision|assignment|homework|module|lesson|quiz|test)\b/.test(t))
    return 'study';
  if (/\b(todo|to-do|checklist|task\s+list|action\s+list|next\s+steps?)\b/.test(t))
    return 'tasks';
  if (/\b(phone\s+number|email|address|contact)\b/.test(t) && extractAll(text, RX.phone).length)
    return 'customer'; // has contact info → treat as customer/contact note
  return 'general';
}

/* ─── CONTACT EXTRACTOR ─────────────────────────────────────────────────── */
function extractContactInfo(text) {
  const info = { phones: [], emails: [], urls: [], names: [], dates: [], times: [], amounts: [] };

  info.phones  = extractAll(text, RX.phone).filter(p => p.replace(/\D/g,'').length >= 7);
  info.emails  = extractAll(text, RX.email);
  info.urls    = extractAll(text, RX.url);
  info.dates   = [...extractAll(text, RX.date), ...extractAll(text, RX.relDate)];
  info.times   = extractAll(text, RX.time);
  info.amounts = extractAll(text, RX.currency);

  // Names: only extract when there's a strong signal this is a contact/person name
  // Use a strict exclusion list to avoid picking up common phrases as names
  const NON_NAMES = new Set([
    // Days/months
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August',
    'September','October','November','December',
    // Common business/note words that get capitalised mid-sentence
    'Action','Internal','Summary','Contact','Notes','Issue','Follow','Next',
    'Steps','Today','Tomorrow','Yesterday','Customer','Client','Meeting',
    'Project','Status','Update','Report','Task','Incident','Problem',
    'Request','Support','Team','Manager','Director','Senior','Junior',
    'Account','Ticket','Order','System','Service','User','Admin',
    'Error','Warning','Success','Failed','Completed','Pending','Open',
    'Closed','Active','Inactive','New','Old','Current','Previous',
    'Work','Personal','Cyber','Mode','Template','Format','Note',
    'Quick','Capture','Vault','Lab','Target','Machine','Server','Host',
    'Port','Hash','Hash','Flag','Root','Shell','Access','Remote','Local',
    'Daily','Weekly','Monthly','Annual','Shift','Log','Diary','Journal',
    'Follow','Up','Key','Point','Item','Detail','Section','Part',
    'Left','Right','First','Last','Main','Primary','Secondary',
  ]);

  // Only extract names when there's explicit name-context nearby
  const rawNames = extractAll(text, RX.name);
  const hasContactContext = info.phones.length > 0 || info.emails.length > 0
    || /\b(spoke\s+with|customer\s+name|contact\s+name|caller|client\s+name|customer\s+is|name\s+is|called\s+by|attended\s+by|with\s+[A-Z])\b/i.test(text);

  info.names = hasContactContext
    ? rawNames.filter(n => {
        const parts = n.split(' ');
        return parts.length >= 2
          && !NON_NAMES.has(parts[0])
          && !NON_NAMES.has(parts[1] || '')
          && parts.every(p => /^[A-Z][a-z]{1,20}$/.test(p));
      }).slice(0, 3) // cap at 3 names max
    : []; // no contact context → don't guess names

  return info;
}

/* ─── ACTION ITEM EXTRACTOR ─────────────────────────────────────────────── */
function extractActions(text) {
  const actions = [];
  const seen    = new Set();

  // Build a flat list of segments: lines as-is when short, or split into
  // sentences when a line is a long prose paragraph (common in dictated notes).
  const segments = [];
  for (const line of lines(text)) {
    const t = line.trim();
    if (!t) continue;
    if (t.length <= 250) {
      segments.push(t);
    } else {
      // Split on sentence boundaries (period/!/? followed by space)
      // Works even when sentences start with lowercase (dictated notes)
      const sents = t.split(/(?<=[.!?])\s+/);
      for (const s of sents) {
        const st = s.trim();
        if (st.length >= 5) segments.push(st);
      }
    }
  }

  for (const seg of segments) {
    if (!seg || seg.length < 5 || seg.length > 600) continue;
    if (isHeading(seg)) continue;

    const lower = seg.toLowerCase();

    // Explicit checkbox
    if (/^-\s*\[[ x]\]/.test(seg)) {
      const clean = seg.replace(/^-\s*\[[ x]\]\s*/, '');
      if (!seen.has(clean.toLowerCase())) { seen.add(clean.toLowerCase()); actions.push(clean); }
      continue;
    }

    // Segment starts with an action verb
    let verbMatched = false;
    for (const verb of ACTION_VERBS) {
      if (lower.startsWith(verb) || lower.match(new RegExp(`^[-*+]\\s+${verb}\\b`))) {
        const clean = isBullet(seg) ? trimBullet(seg) : seg;
        if (!seen.has(clean.toLowerCase())) { seen.add(clean.toLowerCase()); actions.push(clean); }
        verbMatched = true;
        break;
      }
    }
    if (verbMatched) continue;

    // Contains "need to / needs to / must / should / will / have to" + verb
    if (/\b(?:need to|needs to|will|should|must|have to|going to|gonna)\s+\w+/.test(lower)) {
      const clean = isBullet(seg) ? trimBullet(seg) : seg;
      if (!seen.has(clean.toLowerCase()) && clean.length > 8) {
        seen.add(clean.toLowerCase()); actions.push(clean);
      }
    }
  }

  return actions;
}

/* ─── TITLE GUESSER ─────────────────────────────────────────────────────── */
function guessTitle(text, type, contactInfo) {
  // Use explicit H1 if present
  const h1 = lines(text).find(l => /^# /.test(l));
  if (h1) return h1.replace(/^# /, '').trim();

  // Use first non-empty, non-bullet short line
  const first = lines(text).find(l => l.trim() && !isBullet(l) && !isHeading(l) && l.trim().length < 80);

  // Prepend context label based on type + detected name
  const name = contactInfo.names[0] || '';
  switch (type) {
    case 'customer': return name ? `Customer Issue — ${name}` : (first || 'Customer Note');
    case 'meeting':  return first || (name ? `Meeting — ${name}` : 'Meeting Notes');
    case 'project':  return first || 'Project Update';
    case 'study':    return first || 'Study Notes';
    case 'tasks':    return first || 'Task List';
    default:         return first || 'Note';
  }
}

/* ─── REMAINING CONTENT EXTRACTOR ───────────────────────────────────────── */
function getRemainingContent(text, extractedActions, contactInfo) {
  // Return lines that weren't already pulled into Contact Details or Actions
  const actionSet = new Set(extractedActions.map(a => a.toLowerCase().trim()));
  const phoneSet  = new Set(contactInfo.phones);
  const emailSet  = new Set(contactInfo.emails);

  const kept = [];
  let inCode = false;

  for (const line of lines(text)) {
    if (/^```/.test(line)) { inCode = !inCode; kept.push(line); continue; }
    if (inCode) { kept.push(line); continue; }

    const t = line.trim();
    if (!t) { kept.push(''); continue; }

    // Skip lines that are just a phone/email we've already captured
    if (phoneSet.has(t) || emailSet.has(t)) continue;
    // Skip lines identical to an extracted action
    const clean = isBullet(t) ? trimBullet(t) : t;
    if (actionSet.has(clean.toLowerCase())) continue;
    // Skip explicit H1 (becomes the title)
    if (/^# /.test(t)) continue;

    kept.push(line);
  }

  // Trim blank lines at start/end
  while (kept.length && isEmpty(kept[0]))         kept.shift();
  while (kept.length && isEmpty(kept[kept.length - 1])) kept.pop();

  return kept.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. FORMAT  — Structure any note while preserving all content
   Philosophy: only add structure when it adds value. Short notes stay short.
══════════════════════════════════════════════════════════════════════════════ */
function processFormat(raw) {
  const type    = detectNoteType(raw);
  const contact = extractContactInfo(raw);
  const actions = extractActions(raw);
  const title   = guessTitle(raw, type, contact);
  const body    = getRemainingContent(raw, actions, contact);
  const out     = [];
  const now     = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  // Word count to decide how much structure to add
  const wordCount = raw.trim().split(/\s+/).length;
  const isShort   = wordCount < 40;
  const isTiny    = wordCount < 15;

  out.push(`# ${title}`);
  out.push('');

  // ── Tiny notes: just clean body + optional action ──
  if (isTiny) {
    if (body) out.push(body);
    if (actions.length) {
      out.push('');
      actions.forEach(a => out.push(`- [ ] ${a}`));
    }
    out.push('');
    out.push(`---`);
    out.push(`*${now}*`);
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── Contact Details (only when genuine contact info present) ──
  const hasPhone = contact.phones.length > 0;
  const hasEmail = contact.emails.length > 0;
  const hasName  = contact.names.length > 0;
  const hasContact = (hasPhone || hasEmail) && type !== 'tasks';

  if (hasContact || (hasName && (hasPhone || hasEmail))) {
    out.push('## Contact');
    out.push('');
    if (hasName)  contact.names.forEach(n  => out.push(`**${n}**`));
    if (hasPhone) contact.phones.forEach(p => out.push(`📞 ${p.trim()}`));
    if (hasEmail) contact.emails.forEach(e => out.push(`✉️ ${e}`));
    if (contact.urls.length) contact.urls.slice(0,2).forEach(u => out.push(`🔗 ${u}`));
    out.push('');
  }

  // ── Main body ──
  if (body) {
    // For short notes, skip the section header unless it's a specific type
    if (!isShort || type === 'meeting' || type === 'customer' || type === 'project') {
      const sectionLabels = {
        customer: 'Issue', meeting: 'Discussion', project: 'Status',
        study: 'Notes', tasks: 'Tasks', general: 'Notes',
      };
      out.push(`## ${sectionLabels[type] || 'Notes'}`);
      out.push('');
    }
    out.push(body);
    out.push('');
  }

  // ── Dates only if meaningful count ──
  const allDates = [...new Set([...contact.dates, ...contact.times])];
  if (allDates.length >= 2 && type !== 'tasks') {
    out.push('## Dates');
    out.push('');
    allDates.slice(0, 6).forEach(d => out.push(`- ${d}`));
    out.push('');
  }

  // ── Actions — only output if actually detected ──
  if (actions.length) {
    out.push('## Actions');
    out.push('');
    actions.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  // ── Amounts only if 2+ or it's customer/project type ──
  if (contact.amounts.length && (contact.amounts.length >= 2 || type === 'customer' || type === 'project')) {
    out.push('## Amounts');
    out.push('');
    contact.amounts.forEach(a => out.push(`- ${a}`));
    out.push('');
  }

  out.push('---');
  out.push(`*${now}*`);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SUMMARIZE  — Concise summary preserving all key details
══════════════════════════════════════════════════════════════════════════════ */
function processSummarize(raw) {
  const type    = detectNoteType(raw);
  const contact = extractContactInfo(raw);
  const actions = extractActions(raw);
  const title   = guessTitle(raw, type, contact);
  const out     = [];
  const now     = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  out.push(`# Summary — ${title}`);
  out.push('');
  out.push(`> *${now}*`);
  out.push('');

  // Contact details preserved verbatim
  const hasContact = contact.phones.length || contact.emails.length || contact.names.length;
  if (hasContact) {
    out.push('## People & Contacts');
    out.push('');
    contact.names.forEach(n  => out.push(`- **${n}**`));
    contact.phones.forEach(p => out.push(`- Phone: ${p.trim()}`));
    contact.emails.forEach(e => out.push(`- Email: ${e}`));
    out.push('');
  }

  // Dates
  const allDates = [...new Set([...contact.dates, ...contact.times])];
  if (allDates.length) {
    out.push('## Key Dates');
    out.push('');
    allDates.forEach(d => out.push(`- ${d}`));
    out.push('');
  }

  // Main points — pull non-empty, non-heading lines.
  // Long prose paragraphs are split into sentences so single-paragraph
  // notes don't collapse to just one bullet point.
  const mainPoints = [];
  let inCode = false;
  for (const line of lines(raw)) {
    if (/^```/.test(line)) { inCode = !inCode; continue; }
    if (inCode) continue;
    const t = line.trim();
    if (!t || isHeading(t) || /^# /.test(t)) continue;
    if (contact.phones.includes(t) || contact.emails.includes(t)) continue;

    if (t.length > 150) {
      // Split long paragraph into individual sentences
      const sents = t.split(/(?<=[.!?])\s+/);
      for (const s of sents) {
        const clean = isBullet(s.trim()) ? trimBullet(s.trim()) : s.trim();
        if (clean.length > 5 && clean.length < 350) mainPoints.push(clean);
      }
    } else {
      const clean = isBullet(t) ? trimBullet(t) : t;
      if (clean.length > 5 && clean.length < 300) mainPoints.push(clean);
    }
  }

  if (mainPoints.length) {
    out.push('## Key Points');
    out.push('');
    // Show up to 10 most meaningful points
    mainPoints.slice(0, 10).forEach(p => out.push(`- ${p}`));
    out.push('');
  }

  // Actions
  if (actions.length) {
    out.push('## Actions');
    out.push('');
    actions.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  // Amounts
  if (contact.amounts.length) {
    out.push('## Amounts');
    out.push('');
    contact.amounts.forEach(a => out.push(`- ${a}`));
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. EXTRACT KEY DETAILS  — Pull all structured data from the note
══════════════════════════════════════════════════════════════════════════════ */
function processExtract(raw) {
  const contact = extractContactInfo(raw);
  const actions = extractActions(raw);
  const out     = [];
  const now     = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  out.push('# Extracted Details');
  out.push('');
  out.push(`> *Extracted: ${now}*`);
  out.push('');

  const hasAny = contact.names.length || contact.phones.length || contact.emails.length
    || contact.dates.length || contact.times.length || contact.amounts.length || actions.length;

  if (!hasAny) {
    out.push('*No structured details detected. Try the Format or Summarize actions instead.*');
    return out.join('\n');
  }

  // People & contacts
  if (contact.names.length || contact.phones.length || contact.emails.length) {
    out.push('## People & Contacts');
    out.push('');
    out.push('| Type | Value |');
    out.push('|------|-------|');
    contact.names.forEach(n  => out.push(`| Name  | ${n} |`));
    contact.phones.forEach(p => out.push(`| Phone | ${p.trim()} |`));
    contact.emails.forEach(e => out.push(`| Email | ${e} |`));
    contact.urls.forEach(u   => out.push(`| URL   | ${u} |`));
    out.push('');
  }

  // Dates & times
  const allDates = [...new Set([...contact.dates, ...contact.times])];
  if (allDates.length) {
    out.push('## Dates & Times');
    out.push('');
    allDates.forEach(d => out.push(`- ${d}`));
    out.push('');
  }

  // Amounts
  if (contact.amounts.length) {
    out.push('## Amounts');
    out.push('');
    contact.amounts.forEach(a => out.push(`- ${a}`));
    out.push('');
  }

  // Action items
  if (actions.length) {
    out.push('## Action Items');
    out.push('');
    actions.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  // Technical (IPs, hashes, CVEs) — only if present
  const ips    = extractAll(raw, RX.ip4);
  const hashes = extractAll(raw, RX.hash);
  const cves   = extractAll(raw, RX.cve);
  if (ips.length || hashes.length || cves.length) {
    out.push('## Technical References');
    out.push('');
    out.push('| Type | Value |');
    out.push('|------|-------|');
    ips.forEach(i    => out.push(`| IP      | \`${i}\` |`));
    hashes.forEach(h => out.push(`| Hash    | \`${h}\` |`));
    cves.forEach(c   => out.push(`| CVE     | ${c.toUpperCase()} |`));
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. TODOS — Extract and prioritise action items
══════════════════════════════════════════════════════════════════════════════ */
const URGENT_WORDS = /\b(urgent|asap|immediately|today|right now|critical|emergency|eod|by end of day)\b/i;
const HIGH_WORDS   = /\b(tomorrow|this week|eow|important|priority|deadline)\b/i;

function processTODOs(raw) {
  const actions = extractActions(raw);
  const out     = [];
  const now     = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  out.push('# Action Items');
  out.push('');
  out.push(`> *Generated: ${now}*`);
  out.push('');

  // Keep existing checkboxes unchanged
  const existing  = { open: [], done: [] };
  const newItems  = { urgent: [], high: [], normal: [] };

  for (const line of lines(raw)) {
    const t = line.trim();
    if (/^-\s*\[x\]/i.test(t)) { existing.done.push(t.replace(/^-\s*\[x\]\s*/i, '')); continue; }
    if (/^-\s*\[ \]/.test(t))  { existing.open.push(t.replace(/^-\s*\[ \]\s*/, '')); continue; }
  }

  // Bucket new extracted actions
  for (const a of actions) {
    const inExisting = existing.open.some(e => e.toLowerCase().includes(a.toLowerCase().slice(0,20)));
    if (inExisting) continue;
    if (URGENT_WORDS.test(a))     newItems.urgent.push(a);
    else if (HIGH_WORDS.test(a))  newItems.high.push(a);
    else                          newItems.normal.push(a);
  }

  if (existing.open.length) {
    out.push('## Open');
    out.push('');
    existing.open.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  if (newItems.urgent.length) {
    out.push('## 🔴 Urgent');
    out.push('');
    newItems.urgent.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  if (newItems.high.length) {
    out.push('## 🟡 Soon');
    out.push('');
    newItems.high.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  if (newItems.normal.length) {
    out.push('## 🟢 To Do');
    out.push('');
    newItems.normal.forEach(a => out.push(`- [ ] ${a}`));
    out.push('');
  }

  if (!existing.open.length && !actions.length) {
    out.push(`*No action items detected (v2 · ${text.length} chars processed). Write tasks as bullet points starting with a verb (e.g. "- Call John back").*`);
    out.push('');
  }

  if (existing.done.length) {
    out.push('## ✅ Done');
    out.push('');
    existing.done.forEach(a => out.push(`- [x] ${a}`));
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. CLEAN UP — Fix formatting, capitalization and structure without rewriting
══════════════════════════════════════════════════════════════════════════════ */
function processCleanup(raw) {
  let fixes = 0;

  // ── Step 1: Capitalize sentence starts ───────────────────────────────────
  // Applies to every non-code, non-heading line: first letter + after .?!
  let ls = lines(raw).map(l => l.trimEnd());
  let inCodeCap = false;
  ls = ls.map(line => {
    if (/^```/.test(line)) { inCodeCap = !inCodeCap; return line; }
    if (inCodeCap || isHeading(line) || isEmpty(line)) return line;
    const original = line;
    // Capitalize very first letter of the line
    let fixed = line.replace(/^(\s*)([-*+]\s+)?([a-z])/, (_, sp, bullet, letter) =>
      sp + (bullet || '') + letter.toUpperCase()
    );
    // Capitalize after sentence-ending punctuation
    fixed = fixed.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) =>
      punct + letter.toUpperCase()
    );
    if (fixed !== original) fixes++;
    return fixed;
  });

  // ── Step 2: Break long single-line paragraphs into sentences ─────────────
  // A single wall-of-text line becomes multiple readable sentences.
  const broken = [];
  let inCodeBreak = false;
  for (const line of ls) {
    if (/^```/.test(line)) { inCodeBreak = !inCodeBreak; broken.push(line); continue; }
    if (inCodeBreak || isHeading(line) || isEmpty(line) || line.trim().length <= 180) {
      broken.push(line); continue;
    }
    // Split on sentence boundary: punctuation + space + capital letter
    const sents = line.trim().split(/(?<=[.!?])\s+(?=[A-Z])/);
    if (sents.length > 1) {
      fixes += sents.length - 1;
      broken.push(...sents);
    } else {
      broken.push(line);
    }
  }
  ls = broken;

  // ── Step 3: Remove excessive blank lines ─────────────────────────────────
  const out = [];
  let blanks = 0;
  for (const l of ls) {
    if (isEmpty(l)) { if (blanks < 1) { out.push(''); blanks++; } else fixes++; }
    else            { out.push(l); blanks = 0; }
  }

  // ── Step 4: Deduplicate identical non-empty lines ─────────────────────────
  const seen = new Set();
  const deduped = [];
  let inCode = false;
  for (const l of out) {
    if (/^```/.test(l)) { inCode = !inCode; deduped.push(l); continue; }
    if (inCode || isHeading(l) || isEmpty(l)) { deduped.push(l); continue; }
    const key = l.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); deduped.push(l); }
    else fixes++;
  }

  // ── Step 5: Normalise bullets to - ───────────────────────────────────────
  const normalised = deduped.map(l => {
    const fixed = l.replace(/^(\s*)[*+](\s)/, '$1-$2');
    if (fixed !== l) fixes++;
    return fixed;
  });

  // ── Step 6: Ensure blank line before/after headings ──────────────────────
  const spaced = [];
  for (let i = 0; i < normalised.length; i++) {
    const l = normalised[i];
    if (isHeading(l) && spaced.length && !isEmpty(spaced[spaced.length - 1])) {
      spaced.push(''); fixes++;
    }
    spaced.push(l);
    if (isHeading(l) && i + 1 < normalised.length && !isEmpty(normalised[i + 1])) {
      spaced.push(''); fixes++;
    }
  }

  // ── Step 7: Fix unclosed code fences ─────────────────────────────────────
  let depth = 0;
  for (const l of spaced) { if (/^```/.test(l)) depth++; }
  if (depth % 2 !== 0) { spaced.push('```'); fixes++; }

  while (spaced.length && isEmpty(spaced[0]))                 spaced.shift();
  while (spaced.length && isEmpty(spaced[spaced.length - 1])) spaced.pop();

  const msg = fixes > 0
    ? `fixed ${fixes} issue${fixes > 1 ? 's' : ''} (capitalisation, spacing, formatting)`
    : 'no changes needed';

  return spaced.join('\n') + `\n\n---\n*Cleaned up — ${msg}*`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. STRUCTURE RAW INPUT — Paste anything; get structured markdown
      (replaces the old "Terminal → MD"; useful for emails, logs, chat, etc.)
══════════════════════════════════════════════════════════════════════════════ */
function processStructure(raw) {
  const out   = [];
  const ls    = lines(raw);
  const now   = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  // Detect input type
  const head  = raw.slice(0, 400).toLowerCase();
  let inputType = 'Pasted Content';
  if (/^[\$#%>]\s/.test(ls[0]))                        inputType = 'Terminal Output';
  else if (/from:|to:|subject:|date:/i.test(head))     inputType = 'Email';
  else if (/^\[?\d{2}:\d{2}/.test(ls[0]))              inputType = 'Chat / Log';
  else if (/error|exception|traceback|stack trace/i.test(head)) inputType = 'Error Log';
  else if (/starting nmap|nmap scan/i.test(head))      inputType = 'Nmap Output';

  out.push(`## ${inputType}`);
  out.push('');
  out.push(`> *Captured: ${now}*`);
  out.push('');

  if (inputType === 'Email') {
    // Parse email headers
    const headers = {};
    const bodyStart = ls.findIndex((l, i) => i > 0 && isEmpty(l));
    ls.slice(0, bodyStart > 0 ? bodyStart : 6).forEach(l => {
      const m = l.match(/^(from|to|subject|date|cc):\s*(.+)/i);
      if (m) headers[m[1].toLowerCase()] = m[2].trim();
    });
    if (Object.keys(headers).length) {
      out.push('| Field | Value |');
      out.push('|-------|-------|');
      Object.entries(headers).forEach(([k, v]) => out.push(`| **${k[0].toUpperCase() + k.slice(1)}** | ${v} |`));
      out.push('');
      out.push('**Body:**');
      out.push('');
      ls.slice(bodyStart > 0 ? bodyStart : 6).filter(l => l.trim()).forEach(l => out.push(l));
    } else {
      out.push('```'); ls.forEach(l => out.push(l)); out.push('```');
    }
  } else if (inputType === 'Terminal Output' || inputType === 'Nmap Output') {
    // Wrap in code block, extract highlights
    const lang = inputType === 'Nmap Output' ? 'text' : 'bash';
    out.push('```' + lang);
    ls.forEach(l => out.push(l));
    out.push('```');
    out.push('');
    // Pull open ports, errors, findings
    const highlights = ls.filter(l =>
      /\d+\/(tcp|udp)\s+open|error|failed|found|success|password|hash/i.test(l)
      && l.trim().length < 120
    ).slice(0, 10);
    if (highlights.length) {
      out.push('**Highlights:**');
      out.push('');
      highlights.forEach(h => out.push(`- \`${h.trim()}\``));
    }
  } else {
    // General: wrap in a quote block and preserve
    out.push('```');
    ls.forEach(l => out.push(l));
    out.push('```');
    out.push('');
    // Extract any contact info or actions
    const contact = extractContactInfo(raw);
    const actions = extractActions(raw);
    if (contact.emails.length || contact.phones.length) {
      out.push('**Contacts found:**');
      contact.emails.forEach(e => out.push(`- ${e}`));
      contact.phones.forEach(p => out.push(`- ${p.trim()}`));
      out.push('');
    }
    if (actions.length) {
      out.push('**Actions:**');
      actions.forEach(a => out.push(`- [ ] ${a}`));
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. GENERATE REPORT — Clean structured report from any note type
══════════════════════════════════════════════════════════════════════════════ */
function processReport(raw) {
  const type    = detectNoteType(raw);
  const contact = extractContactInfo(raw);
  const actions = extractActions(raw);
  const title   = guessTitle(raw, type, contact);
  const body    = getRemainingContent(raw, actions, contact);
  const out     = [];
  const now     = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });

  const reportTitles = {
    customer: 'Customer Issue Report',
    meeting:  'Meeting Report',
    project:  'Project Status Report',
    study:    'Study Summary',
    tasks:    'Task Report',
    general:  'Report',
  };

  out.push(`# ${reportTitles[type] || 'Report'} — ${title}`);
  out.push('');
  out.push(`| | |`);
  out.push(`|--|--|`);
  out.push(`| **Date** | ${now} |`);
  if (contact.names[0])  out.push(`| **Person** | ${contact.names[0]} |`);
  if (contact.phones[0]) out.push(`| **Phone** | ${contact.phones[0].trim()} |`);
  if (contact.emails[0]) out.push(`| **Email** | ${contact.emails[0]} |`);
  out.push('');
  out.push('---');
  out.push('');

  // Overview — first 2–3 sentences of real content (not a raw dump of all text)
  out.push('## Overview');
  out.push('');
  const bodyLines = lines(raw).filter(l => l.trim() && !isHeading(l) && !isEmpty(l) && !/^# /.test(l.trim()));
  const bodyText  = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
  // Pull up to the first 280 characters, ending on a sentence boundary
  let overview = bodyText;
  if (bodyText.length > 280) {
    const cut = bodyText.slice(0, 280);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    overview = lastStop > 80 ? bodyText.slice(0, lastStop + 1) : cut + '…';
  }
  out.push(overview || '*See details below.*');
  out.push('');

  // Main content
  if (body) {
    const bodyLabel = { customer: 'Issue Details', meeting: 'Discussion Notes', project: 'Status Details', study: 'Content', tasks: 'Tasks', general: 'Details' };
    out.push(`## ${bodyLabel[type] || 'Details'}`);
    out.push('');
    out.push(body);
    out.push('');
  }

  // Contacts
  const hasContact = contact.phones.length || contact.emails.length || contact.names.length;
  if (hasContact) {
    out.push('## Contact Information');
    out.push('');
    contact.names.forEach(n  => out.push(`- **Name:** ${n}`));
    contact.phones.forEach(p => out.push(`- **Phone:** ${p.trim()}`));
    contact.emails.forEach(e => out.push(`- **Email:** ${e}`));
    out.push('');
  }

  // Dates
  const allDates = [...new Set([...contact.dates, ...contact.times])];
  if (allDates.length) {
    out.push('## Dates Referenced');
    out.push('');
    allDates.forEach(d => out.push(`- ${d}`));
    out.push('');
  }

  // Actions
  out.push('## Next Steps');
  out.push('');
  if (actions.length) {
    actions.forEach(a => out.push(`- [ ] ${a}`));
  } else {
    out.push('*No action items detected.*');
  }
  out.push('');

  out.push('---');
  out.push(`*Report generated: ${now}*`);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   CYBER CONTEXT PROCESSORS
   Preserve technical content — commands, IPs, hashes, ports, findings
══════════════════════════════════════════════════════════════════════════════ */

function isCommand(l) {
  return /^[$#%>]\s|^\s*(nmap|gobuster|ffuf|sqlmap|hydra|msfconsole|curl|wget|python3?|ruby|bash|sh|nc|netcat|ssh|enum4linux|nikto|wfuzz|crackmapexec|evil-winrm|dirsearch|feroxbuster|rustscan)\b/i.test(l.trim());
}

function processCyberFormat(raw) {
  const ls  = lines(raw);
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const h1    = ls.find(l => /^# /.test(l));
  const title = h1 ? h1.replace(/^# /, '').trim()
    : (ls.find(l => l.trim() && !/^[#\-*>]/.test(l.trim())) || 'Recon Notes').trim();

  const ips     = extractAll(raw, RX.ip4);
  const hashes  = extractAll(raw, RX.hash);
  const cves    = extractAll(raw, RX.cve);
  const ports   = ls.filter(l => /\d{1,5}\/(tcp|udp)\s+(open|filtered)/i.test(l)).map(l => l.trim());

  // Separate commands from note text
  const cmdLines  = [];
  const noteLines = [];
  let inCode = false, codeBlock = [];

  for (const l of ls) {
    if (/^```/.test(l)) {
      if (inCode) { cmdLines.push({ block: [...codeBlock] }); codeBlock = []; }
      inCode = !inCode; continue;
    }
    if (inCode) { codeBlock.push(l); continue; }
    if (/^# /.test(l.trim())) continue;
    if (isCommand(l)) cmdLines.push(l);
    else if (l.trim()) noteLines.push(l);
  }

  out.push(`# ${title}`);
  out.push('');
  out.push(`> *${now}*`);
  out.push('');

  if (ips.length) {
    out.push('## Target Info');
    out.push('');
    ips.forEach(ip => out.push(`- **IP:** \`${ip}\``));
    out.push('');
  }

  if (ports.length) {
    out.push('## Open Ports / Services');
    out.push('');
    out.push('```text');
    ports.forEach(p => out.push(p));
    out.push('```');
    out.push('');
  }

  if (noteLines.length) {
    out.push('## Findings / Notes');
    out.push('');
    noteLines.forEach(l => {
      const t = l.trim();
      if (isHeading(t)) { out.push(''); out.push(t); out.push(''); }
      else if (isBullet(t)) out.push(t);
      else out.push(`- ${t}`);
    });
    out.push('');
  }

  if (cmdLines.length) {
    out.push('## Commands');
    out.push('');
    out.push('```bash');
    cmdLines.forEach(item => {
      if (typeof item === 'string') out.push(item);
      else { item.block.forEach(l => out.push(l)); out.push(''); }
    });
    out.push('```');
    out.push('');
  }

  if (hashes.length || cves.length) {
    out.push('## Indicators');
    out.push('');
    out.push('| Type | Value |');
    out.push('|------|-------|');
    hashes.forEach(h => out.push(`| Hash | \`${h}\` |`));
    cves.forEach(c   => out.push(`| CVE  | ${c.toUpperCase()} |`));
    out.push('');
  }

  const actions = extractActions(raw);
  out.push('## Next Steps');
  out.push('');
  if (actions.length) actions.forEach(a => out.push(`- [ ] ${a}`));
  else out.push('- [ ] ');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function processCyberIOCs(raw) {
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const ips    = extractAll(raw, RX.ip4);
  const hashes = extractAll(raw, RX.hash);
  const cves   = extractAll(raw, RX.cve);
  const urls   = extractAll(raw, RX.url);
  const ports  = [...new Set(
    (raw.match(/\d{1,5}\/(tcp|udp)\s+(?:open|filtered)[^\n]*/gi) || []).map(m => m.trim())
  )];

  // Domain extraction (basic)
  const domainRx  = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|co|uk|local|htb|thm|lab)\b/gi;
  const domains   = [...new Set(extractAll(raw, domainRx))].filter(d => !ips.includes(d));

  const hasAny = ips.length || hashes.length || cves.length || urls.length || domains.length || ports.length;

  out.push('# IOC Extract');
  out.push('');
  out.push(`> *${now}*`);
  out.push('');

  if (!hasAny) {
    out.push('*No IOCs detected. Paste terminal output, nmap results, or notes containing IPs, hashes, or CVEs.*');
    return out.join('\n');
  }

  if (ips.length) {
    out.push('## IP Addresses');
    out.push('');
    out.push('| IP | Notes |');
    out.push('|----|-------|');
    ips.forEach(ip => out.push(`| \`${ip}\` | |`));
    out.push('');
  }

  if (ports.length) {
    out.push('## Ports / Services');
    out.push('');
    out.push('```text');
    ports.forEach(p => out.push(p));
    out.push('```');
    out.push('');
  }

  if (domains.length) {
    out.push('## Domains / Hostnames');
    out.push('');
    domains.slice(0, 20).forEach(d => out.push(`- \`${d}\``));
    out.push('');
  }

  if (urls.length) {
    out.push('## URLs');
    out.push('');
    urls.forEach(u => out.push(`- \`${u}\``));
    out.push('');
  }

  if (hashes.length) {
    out.push('## Hashes');
    out.push('');
    out.push('| Hash | Type | Cracked |');
    out.push('|------|------|---------|');
    hashes.forEach(h => {
      const len = h.length;
      const t   = len === 32 ? 'MD5' : len === 40 ? 'SHA1' : len === 64 ? 'SHA256' : 'Unknown';
      out.push(`| \`${h}\` | ${t} | |`);
    });
    out.push('');
  }

  if (cves.length) {
    out.push('## CVEs');
    out.push('');
    cves.forEach(c => out.push(`- ${c.toUpperCase()}`));
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function processCyberSummarize(raw) {
  const ls  = lines(raw);
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const h1    = ls.find(l => /^# /.test(l));
  const title = h1 ? h1.replace(/^# /, '').trim() : 'Target';

  const ips     = extractAll(raw, RX.ip4);
  const hashes  = extractAll(raw, RX.hash);
  const cves    = extractAll(raw, RX.cve);
  const ports   = ls.filter(l => /\d{1,5}\/(tcp|udp)\s+(open|filtered)/i.test(l)).slice(0, 15).map(l => l.trim());
  const actions = extractActions(raw);

  const findings = ls.filter(l => {
    const t = l.trim();
    return t && !isHeading(t) && !isCommand(l) && !/^# /.test(t) && t.length > 5 && t.length < 200;
  }).slice(0, 12);

  out.push(`# Summary — ${title}`);
  out.push('');
  out.push(`> *${now}*`);
  out.push('');

  if (ips.length) {
    out.push(`**Target:** ${ips.map(ip => `\`${ip}\``).join(' · ')}`);
    out.push('');
  }

  if (ports.length) {
    out.push('## Open Ports');
    out.push('');
    out.push('```text');
    ports.forEach(p => out.push(p));
    out.push('```');
    out.push('');
  }

  if (findings.length) {
    out.push('## Key Findings');
    out.push('');
    findings.forEach(f => {
      const t = f.trim();
      out.push(isBullet(t) ? t : `- ${t}`);
    });
    out.push('');
  }

  if (hashes.length || cves.length) {
    out.push('## Indicators');
    out.push('');
    hashes.forEach(h => out.push(`- Hash: \`${h}\``));
    cves.forEach(c   => out.push(`- ${c.toUpperCase()}`));
    out.push('');
  }

  out.push('## Next Attack Vectors');
  out.push('');
  if (actions.length) actions.forEach(a => out.push(`- [ ] ${a}`));
  else out.push('- [ ] ');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   PERSONAL CONTEXT PROCESSORS
   Light touch — preserve voice, minimal structure, no aggression
══════════════════════════════════════════════════════════════════════════════ */

function processPersonalFormat(raw) {
  const ls  = lines(raw);
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const h1    = ls.find(l => /^# /.test(l));
  const first = ls.find(l => l.trim() && !/^[#\-*>]/.test(l.trim()));
  const title = h1 ? h1.replace(/^# /, '').trim() : (first ? first.trim().slice(0, 70) : 'Note');

  out.push(`# ${title}`);
  out.push('');
  out.push(`*${now}*`);
  out.push('');

  // Keep everything as-is — just clean whitespace. Don't rewrite or restructure.
  let blanks = 0, inCode = false;
  const checkboxLines = [];
  for (const l of ls) {
    if (/^```/.test(l)) { inCode = !inCode; out.push(l); blanks = 0; continue; }
    if (inCode) { out.push(l); continue; }
    if (/^# /.test(l.trim())) continue; // title already used
    if (l.trim() === '') {
      if (blanks < 1) { out.push(''); blanks++; }
    } else {
      blanks = 0;
      // Normalise bullets to - but don't change anything else
      out.push(l.replace(/^(\s*)[*+](\s)/, '$1-$2'));
      // Track checkboxes for possible dedup
      if (/^-\s*\[[ x]\]/.test(l.trim())) checkboxLines.push(l.trim());
    }
  }

  // If there are tasks/checkboxes buried in prose AND no existing task section, surface them
  const hasTaskSection = /^##\s*(to.?do|task|action|reminder)/im.test(raw);
  if (checkboxLines.length && !hasTaskSection) {
    out.push('');
    out.push('## To Do');
    out.push('');
    checkboxLines.forEach(c => out.push(c));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function processPersonalTODOs(raw) {
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  out.push('# To Do');
  out.push('');
  out.push(`> *${now}*`);
  out.push('');

  const open = [], done = [];
  for (const l of lines(raw)) {
    const t = l.trim();
    if (/^-\s*\[x\]/i.test(t)) done.push(t.replace(/^-\s*\[x\]\s*/i, ''));
    else if (/^-\s*\[ \]/.test(t)) open.push(t.replace(/^-\s*\[ \]\s*/, ''));
  }

  const extracted = extractActions(raw).filter(
    a => !open.some(e => e.toLowerCase().startsWith(a.toLowerCase().slice(0, 15)))
  );
  const all = [...open, ...extracted];

  if (all.length) {
    all.forEach(a => out.push(`- [ ] ${a}`));
  } else if (!done.length) {
    out.push('- [ ] ');
  }

  if (done.length) {
    out.push('');
    out.push('## ✅ Done');
    out.push('');
    done.forEach(a => out.push(`- [x] ${a}`));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function processPersonalSummarize(raw) {
  // Casual, short, no jargon
  const ls  = lines(raw);
  const out = [];
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const h1    = ls.find(l => /^# /.test(l));
  const title = h1 ? h1.replace(/^# /, '').trim() : 'Note';

  const points = ls.filter(l => {
    const t = l.trim();
    return t && !isHeading(t) && !/^# /.test(t) && t.length > 4;
  }).slice(0, 8);

  const actions = extractActions(raw);

  out.push(`# ${title} — Summary`);
  out.push('');
  out.push(`*${now}*`);
  out.push('');

  if (points.length) {
    points.forEach(p => {
      const t = p.trim();
      out.push(isBullet(t) ? t : `- ${t}`);
    });
    out.push('');
  }

  if (actions.length) {
    out.push('## Actions');
    out.push('');
    actions.forEach(a => out.push(`- [ ] ${a}`));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════════════════════ */
const LocalAI = {
  // ctx = 'work' | 'cyber' | 'personal'  (defaults to 'work' for backward compatibility)
  process(mode, text, ctx = 'work') {
    if (!text || !text.trim()) return { error: 'Nothing to process — write some notes first.' };
    try {
      // ── Cyber context ──────────────────────────────────────────────────────
      if (ctx === 'cyber') {
        switch (mode) {
          case 'format':    return { result: processCyberFormat(text) };
          case 'iocs':      return { result: processCyberIOCs(text) };
          case 'summarize': return { result: processCyberSummarize(text) };
          case 'terminal':  return { result: processStructure(text) };
          case 'todos':     return { result: processTODOs(text) };
          case 'cleanup':   return { result: processCleanup(text) };
          case 'report':    return { result: processReport(text) };
          default:          return { error: `Unknown mode: ${mode}` };
        }
      }

      // ── Personal context ───────────────────────────────────────────────────
      if (ctx === 'personal') {
        switch (mode) {
          case 'format':    return { result: processPersonalFormat(text) };
          case 'todos':     return { result: processPersonalTODOs(text) };
          case 'summarize': return { result: processPersonalSummarize(text) };
          case 'iocs':      return { result: processExtract(text) };
          case 'cleanup':   return { result: processCleanup(text) };
          case 'terminal':  return { result: processStructure(text) };
          case 'report':    return { result: processReport(text) };
          default:          return { error: `Unknown mode: ${mode}` };
        }
      }

      // ── Work context (default) ─────────────────────────────────────────────
      switch (mode) {
        case 'format':    return { result: processFormat(text) };
        case 'terminal':  return { result: processStructure(text) };
        case 'summarize': return { result: processSummarize(text) };
        case 'iocs':      return { result: processExtract(text) };
        case 'todos':     return { result: processTODOs(text) };
        case 'cleanup':   return { result: processCleanup(text) };
        case 'report':    return { result: processReport(text) };
        default:          return { error: `Unknown mode: ${mode}` };
      }
    } catch (e) {
      return { error: `Processing error: ${e.message}` };
    }
  }
};
export default LocalAI;
