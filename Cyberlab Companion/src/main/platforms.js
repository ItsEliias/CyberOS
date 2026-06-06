/**
 * HTB / THM platform integrations.
 *
 * Uses Node 18+ global `fetch`. All errors are caught and returned as
 * `{ success: false, error }` so the renderer never crashes on a bad token
 * or a network blip.
 */
import { safeStorage } from 'electron';
import fs from 'fs';
// ── Encrypted token storage (Electron safeStorage) ───────────────────────────
export function saveTokenSecure(file, token) {
    try {
        if (!token)
            return false;
        if (!safeStorage.isEncryptionAvailable()) {
            // Base64 is NOT encryption — refuse rather than writing the token in
            // an effectively-plaintext form. Caller surfaces this to the user.
            console.warn('[platforms] safeStorage unavailable — refusing to save token in cleartext');
            return false;
        }
        fs.writeFileSync(file, safeStorage.encryptString(token));
        return true;
    }
    catch (e) {
        console.error('[platforms] saveTokenSecure:', e.message);
        return false;
    }
}
export function loadTokenSecure(file) {
    try {
        if (fs.existsSync(file) && safeStorage.isEncryptionAvailable()) {
            return safeStorage.decryptString(fs.readFileSync(file));
        }
        // Migration: an older version of this file fell back to base64. If any
        // legacy `.b64` files are still on disk, surface the value once so the
        // user isn't locked out, then delete it so we don't keep reading from
        // an insecure location.
        const b64 = file + '.b64';
        if (fs.existsSync(b64)) {
            const value = Buffer.from(fs.readFileSync(b64, 'utf8'), 'base64').toString('utf8');
            try {
                fs.unlinkSync(b64);
            }
            catch { /* ignore */ }
            return value;
        }
    }
    catch { }
    return null;
}
export function clearTokenSecure(file) {
    try {
        if (fs.existsSync(file))
            fs.unlinkSync(file);
        const b64 = file + '.b64';
        if (fs.existsSync(b64))
            fs.unlinkSync(b64);
        return true;
    }
    catch {
        return false;
    }
}
// ── HTB (https://www.hackthebox.com/api/v4) ──────────────────────────────────
const HTB_BASE = 'https://www.hackthebox.com/api/v4';
const HTB_UA = 'Mozilla/5.0 (compatible; CyberLab/1.0)';
async function htbGet(token, endpoint) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${HTB_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': HTB_UA,
            },
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (res.status === 401 || res.status === 403) {
            return { success: false, status: res.status, error: 'HTB token rejected (401/403) — token may be expired' };
        }
        if (!res.ok)
            return { success: false, status: res.status, error: `HTB API returned ${res.status}` };
        try {
            const data = await res.json();
            return { success: true, status: res.status, data };
        }
        catch {
            return { success: false, status: res.status, error: 'HTB returned non-JSON response' };
        }
    }
    catch (e) {
        const msg = e.message || '';
        if (msg.includes('aborted'))
            return { success: false, error: 'HTB request timeout' };
        return { success: false, error: msg };
    }
}
function decodeJwtSub(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        return payload?.sub || payload?.id || payload?.user_id || null;
    }
    catch {
        return null;
    }
}
export async function fetchHtbStats(token) {
    if (!token)
        return { success: false, error: 'No HTB token configured' };
    const info = await htbGet(token, '/user/info');
    if (!info.success)
        return { success: false, error: info.error, status: info.status };
    const infoData = info.data;
    const userBlock = infoData?.info || infoData || {};
    const userId = String(userBlock.id || decodeJwtSub(token) || '') || null;
    const username = userBlock.name || userBlock.username || 'Operator';
    const rank = userBlock.rank || 'Hacker';
    const points = Number(userBlock.points || 0);
    const ranking = userBlock.ranking != null ? Number(userBlock.ranking) : null;
    const activeMachines = [];
    const activeRes = await htbGet(token, '/machine/active');
    if (activeRes.success && activeRes.data) {
        const d = activeRes.data;
        const m = d.info || d.machine || null;
        if (m && (m.name || m.id)) {
            activeMachines.push({
                id: String(m.id || ''),
                name: String(m.name || 'Unknown'),
                difficulty: String(m.difficultyText || m.difficulty || ''),
                os: String(m.os || ''),
                ip: m.ip || undefined,
            });
        }
    }
    let userOwns = 0, rootOwns = 0;
    const recentMachines = [];
    if (userId) {
        const progress = await htbGet(token, `/profile/progress/machines/os/${userId}`);
        if (progress.success && progress.data) {
            const p = progress.data;
            const stats = p.profile?.machines;
            if (stats) {
                userOwns = Number(stats.user_owns || 0);
                rootOwns = Number(stats.root_owns || 0);
            }
        }
        const owns = await htbGet(token, `/profile/activity/${userId}`);
        if (owns.success && owns.data) {
            const d = owns.data;
            const profile = d.profile || d;
            const activity = profile?.activity || [];
            const seen = new Set();
            for (const a of activity.slice(0, 20)) {
                const name = a.name || a.machine_name || '';
                const id = String(a.id || a.object_id || '');
                if (!name || seen.has(name))
                    continue;
                seen.add(name);
                recentMachines.push({
                    id, name,
                    difficulty: a.machine_avatar ? '' : (a.difficulty || ''),
                    os: a.os || '',
                });
                if (recentMachines.length >= 10)
                    break;
            }
        }
    }
    return {
        success: true,
        data: {
            username, rank, points,
            userOwns, rootOwns,
            totalOwns: userOwns + rootOwns,
            ranking,
            activeMachines,
            recentMachines,
            fetchedAt: new Date().toISOString(),
        },
    };
}
// ── THM (no official public API) ─────────────────────────────────────────────
//
// Two modes supported:
//   1. Session cookie ("connect.sid"-style or full `key=value` string) —
//      paste from browser DevTools → Application → Cookies.
//   2. Plain username — uses public endpoints (limited, often blocked).
//
// THM endpoints are unstable; we degrade gracefully with a `partial` note.
export async function fetchThmStats(sessionOrUsername, username) {
    if (!sessionOrUsername)
        return { success: false, error: 'No THM session/username configured' };
    const looksLikeCookie = sessionOrUsername.length > 40 && !/^[a-zA-Z0-9._-]{1,30}$/.test(sessionOrUsername);
    try {
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; CyberLab/1.0)',
        };
        if (looksLikeCookie) {
            headers['Cookie'] = sessionOrUsername.includes('=')
                ? sessionOrUsername
                : `connect.sid=${sessionOrUsername}`;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let resolvedUser = username || (looksLikeCookie ? '' : sessionOrUsername);
        if (looksLikeCookie && !resolvedUser) {
            const meRes = await fetch('https://tryhackme.com/api/user', { headers, signal: controller.signal });
            if (meRes.status === 401) {
                clearTimeout(timer);
                return { success: false, status: 401, error: 'THM session rejected (401) — re-paste cookie' };
            }
            try {
                const meJson = await meRes.json();
                resolvedUser = meJson?.username || meJson?.user?.username || '';
            }
            catch { }
        }
        if (!resolvedUser) {
            clearTimeout(timer);
            return { success: false, error: 'Could not resolve THM username (paste session cookie or username in Settings)' };
        }
        const profileRes = await fetch(`https://tryhackme.com/api/user/${encodeURIComponent(resolvedUser)}`, {
            headers, signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (profileRes.status === 401 || profileRes.status === 403) {
            return {
                success: false,
                status: profileRes.status,
                error: 'THM rejected request (auth required) — paste your session cookie',
            };
        }
        let data = {};
        try {
            data = await profileRes.json();
        }
        catch {
            return {
                success: true,
                data: {
                    username: resolvedUser, completedRooms: 0, inProgressRooms: 0,
                    recentRooms: [], fetchedAt: new Date().toISOString(),
                    partial: 'THM API returned no JSON — public profile may be restricted',
                }
            };
        }
        const rooms = data.completedRooms || [];
        const inProgress = data.inProgressRooms || [];
        const recent = [...inProgress, ...rooms].slice(0, 10).map(r => ({
            code: String(r.code || r.roomCode || ''),
            title: String(r.title || r.roomName || r.name || 'Unknown'),
            difficulty: String(r.difficulty || ''),
        }));
        return {
            success: true,
            data: {
                username: resolvedUser,
                rank: data.rank || undefined,
                points: typeof data.points === 'number' ? data.points : undefined,
                completedRooms: rooms.length || Number(data.completedRoomsCount || 0),
                inProgressRooms: inProgress.length || Number(data.inProgressRoomsCount || 0),
                recentRooms: recent,
                fetchedAt: new Date().toISOString(),
                partial: looksLikeCookie ? undefined : 'Limited public data — paste a session cookie for full stats',
            },
        };
    }
    catch (e) {
        return { success: false, error: e.message || 'THM fetch failed' };
    }
}
// ── Shared CyberOS context writer ────────────────────────────────────────────
export function writeActiveLab(configPath, name, platform, extra = {}) {
    try {
        let shared = {};
        if (fs.existsSync(configPath)) {
            try {
                shared = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            catch { }
        }
        const existingCtx = shared.shared_context || {};
        shared.shared_context = {
            ...existingCtx,
            activeLab: name,
            activeLabPlatform: name ? platform : null,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'CyberLab',
            ...extra,
        };
        fs.writeFileSync(configPath, JSON.stringify(shared, null, 2), 'utf8');
    }
    catch { }
}
