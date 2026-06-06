import { useEffect, useState, useCallback, useRef } from 'react';
import type { HtbStats, ThmStats } from '@shared/types';

interface FetchResult<T> { success: boolean; data?: T; error?: string; status?: number; }

interface PlatformStatsState {
  htbConnected: boolean;
  thmConnected: boolean;
  htbStats: HtbStats | null;
  thmStats: ThmStats | null;
  htbError: string | null;
  thmError: string | null;
  loading: boolean;
  lastSyncAt: string | null;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Polls HTB + THM connection state and pulls stats every `intervalMs`.
 * - Pulls once on mount and whenever `refresh()` is called.
 * - Surfaces errors per-platform without crashing the renderer.
 * - When an HTB active machine is detected, writes shared_context.activeLab via setActiveLab.
 */
export function usePlatformStats(intervalMs: number = DEFAULT_INTERVAL_MS) {
  const [state, setState] = useState<PlatformStatsState>({
    htbConnected: false,
    thmConnected: false,
    htbStats: null,
    thmStats: null,
    htbError: null,
    thmError: null,
    loading: true,
    lastSyncAt: null,
  });
  const mountedRef = useRef(true);
  const lastActiveLabRef = useRef<string | null>(null);

  const syncOnce = useCallback(async () => {
    if (!window.electronAPI) return;
    setState(s => ({ ...s, loading: true }));
    try {
      const api = window.electronAPI as Record<string, Function>;
      const [hasHtb, hasThm] = await Promise.all([
        api.hasHtbToken?.().catch(() => false),
        api.hasThmToken?.().catch(() => false),
      ]);

      let htbStats: HtbStats | null = null;
      let thmStats: ThmStats | null = null;
      let htbError: string | null = null;
      let thmError: string | null = null;

      if (hasHtb) {
        try {
          const r = await api.fetchHtbStats() as FetchResult<HtbStats>;
          if (r?.success && r.data) htbStats = r.data;
          else htbError = r?.error || 'Unknown HTB error';
        } catch (e) {
          htbError = (e as Error).message || 'HTB fetch failed';
        }
      }
      if (hasThm) {
        try {
          const r = await api.fetchThmStats() as FetchResult<ThmStats>;
          if (r?.success && r.data) thmStats = r.data;
          else thmError = r?.error || 'Unknown THM error';
        } catch (e) {
          thmError = (e as Error).message || 'THM fetch failed';
        }
      }

      // Propagate HTB active machine to CyberOS shared_context
      const activeName = htbStats?.activeMachines?.[0]?.name || null;
      if (activeName !== lastActiveLabRef.current) {
        try {
          await api.setActiveLab?.({
            name: activeName,
            platform: 'HTB',
            ip: htbStats?.activeMachines?.[0]?.ip,
          });
        } catch {}
        lastActiveLabRef.current = activeName;
      }

      if (!mountedRef.current) return;
      setState({
        htbConnected: !!hasHtb,
        thmConnected: !!hasThm,
        htbStats, thmStats,
        htbError, thmError,
        loading: false,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setState(s => ({ ...s, loading: false, htbError: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    syncOnce();
    const id = setInterval(syncOnce, intervalMs);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [syncOnce, intervalMs]);

  return { ...state, refresh: syncOnce };
}
