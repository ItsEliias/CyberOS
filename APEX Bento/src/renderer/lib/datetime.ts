// Centralised date/time formatting for APEX Bento cards.
//
// Each card previously hand-rolled its own date formatting:
//   AuditFeedCard:   toLocaleTimeString({hour, minute}) for short, toISOString() for long
//   KillSwitchCard:  toLocaleDateString() + toLocaleTimeString() for short, toISOString() for long
//   GateCard:        toLocaleDateString() for resolved_at
//
// That inconsistency is operator-visible — the same timestamp shows three
// different layouts depending on which card surfaces it. This module exposes a
// single helper per render purpose so cards call into one canonical formatter.
//
// All formatters are pure synchronous; no IPC, no APEX writes. They accept
// either an ISO-8601 string or a Date and gracefully degrade to a literal "—"
// for invalid / missing input rather than throwing.
//
// References:
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
//   https://datatracker.ietf.org/doc/html/rfc3339 — ISO-8601 / RFC 3339 for unambiguous machine timestamps

export type DateInput = string | number | Date | null | undefined;

const MISSING = '—';

function toValidDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Short local time: e.g. `14:32`. Suitable for card body rows where the
 * date is implicit (today) and screen real-estate is tight.
 * Backed by Intl.DateTimeFormat per MDN.
 */
export function formatLocalTimeShort(input: DateInput): string {
  const d = toValidDate(input);
  if (!d) return MISSING;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Local time with seconds: e.g. `14:32:07`. Suitable for "last refresh"
 * indicators where second-level precision is informative.
 */
export function formatLocalTimeWithSeconds(input: DateInput): string {
  const d = toValidDate(input);
  if (!d) return MISSING;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Short local date: e.g. `6/10/2026`. Used for resolved-at on gates.
 */
export function formatLocalDateShort(input: DateInput): string {
  const d = toValidDate(input);
  if (!d) return MISSING;
  return d.toLocaleDateString();
}

/**
 * Local date + time: e.g. `6/10/2026, 14:32:07`. Used in card bodies
 * where both fields are needed.
 */
export function formatLocalDateTime(input: DateInput): string {
  const d = toValidDate(input);
  if (!d) return MISSING;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

/**
 * ISO 8601 / RFC 3339 string: e.g. `2026-06-10T14:32:07.123Z`. Used in
 * detail-drawer bodies where the operator may copy a precise machine
 * timestamp for cross-referencing logs.
 */
export function formatISO(input: DateInput): string {
  const d = toValidDate(input);
  if (!d) return MISSING;
  return d.toISOString();
}

/**
 * Human relative time, e.g. `5 minutes ago`, `in 2 days`. Backed by
 * Intl.RelativeTimeFormat per MDN. The reference time defaults to `now`.
 * Returns MISSING for invalid input.
 */
export function formatRelative(input: DateInput, now: Date = new Date()): string {
  const d = toValidDate(input);
  if (!d) return MISSING;

  const deltaSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(deltaSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (abs < 45) return rtf.format(deltaSec, 'second');
  if (abs < 60 * 45) return rtf.format(Math.round(deltaSec / 60), 'minute');
  if (abs < 60 * 60 * 22) return rtf.format(Math.round(deltaSec / 3600), 'hour');
  if (abs < 60 * 60 * 24 * 26) return rtf.format(Math.round(deltaSec / 86400), 'day');
  if (abs < 60 * 60 * 24 * 320) return rtf.format(Math.round(deltaSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(deltaSec / (86400 * 365)), 'year');
}
