// VaultCore — Sources Management View (Screen 2)
// Two-panel: source list (left 280px) + source detail (right)

import { useState } from 'react';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import { useStore } from '../../store';
import SourceList from './SourceList';
import SourceDetail from './SourceDetail';
import AddSourceModal from './AddSourceModal';
import type { ScrapingSource } from '../../types/vaultcore';

export default function SourcesView() {
  const { sources, activeSourceId, runs, addSource, updateSource, deleteSource, setActiveSourceId, addRun, updateRun, removeActiveRunId } = useVaultCoreStore();
  const { addLog } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ScrapingSource | null>(null);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const selectedSource = sources.find((s) => s.id === activeSourceId) ?? null;

  function handleSelect(id: string) {
    setActiveSourceId(id);
  }

  function handleAdd() {
    setEditingSource(null);
    setShowAddModal(true);
  }

  function handleEdit() {
    if (!selectedSource) return;
    setEditingSource(selectedSource);
    setShowAddModal(true);
  }

  async function handleSave(data: Omit<ScrapingSource, 'id'>) {
    if (editingSource) {
      updateSource(editingSource.id, data);
      try {
        // Sync to main process using the legacy source API (best-effort)
        await window.electronAPI.updateSource(editingSource.id, {
          name: data.name,
          type: data.type,
          url: data.url,
        });
      } catch {
        // Ignore IPC errors — store already updated
      }
    } else {
      addSource(data);
      try {
        await window.electronAPI.addSource({
          name: data.name,
          type: data.type,
          url: data.url,
          config: {},
        });
      } catch {
        // Ignore IPC errors — store already updated
      }
    }
    setShowAddModal(false);
    setEditingSource(null);
  }

  async function handleScrapeNow() {
    if (!selectedSource) return;
    const id = selectedSource.id;
    setScrapingId(id);

    const runId = Math.random().toString(36).slice(2);
    addRun({
      id: runId,
      sourceId: id,
      sourceName: selectedSource.name,
      startedAt: new Date().toISOString(),
      status: 'running',
    });

    try {
      const res = await window.electronAPI.scrapeSourceNow(id);
      const completedAt = new Date().toISOString();
      if (res.success) {
        updateRun(runId, { status: 'completed', completedAt });
        updateSource(id, {
          lastScrapeAt: completedAt,
          lastSuccessAt: completedAt,
          consecutiveFailures: 0,
          health: 'healthy',
        });
        addLog({ type: 'success', message: `Scraped "${selectedSource.name}"`, time: new Date().toLocaleTimeString() });
      } else {
        updateRun(runId, { status: 'failed', completedAt, error: res.error ?? 'Unknown error' });
        const failures = (selectedSource.consecutiveFailures ?? 0) + 1;
        updateSource(id, {
          consecutiveFailures: failures,
          health: failures >= 3 ? 'error' : failures >= 1 ? 'warning' : 'healthy',
          lastError: res.error,
        });
        addLog({ type: 'error', message: `Failed "${selectedSource.name}": ${res.error}`, time: new Date().toLocaleTimeString() });
      }
    } catch (e) {
      const completedAt = new Date().toISOString();
      const msg = (e as Error).message;
      updateRun(runId, { status: 'failed', completedAt, error: msg });
      const failures = (selectedSource.consecutiveFailures ?? 0) + 1;
      updateSource(id, {
        consecutiveFailures: failures,
        health: failures >= 3 ? 'error' : failures >= 1 ? 'warning' : 'healthy',
        lastError: msg,
      });
    } finally {
      setScrapingId(null);
      removeActiveRunId(runId);
    }
  }

  async function handleDelete(id: string) {
    deleteSource(id);
    if (activeSourceId === id) setActiveSourceId(null);
    try {
      await window.electronAPI.deleteSource(id);
    } catch {
      // Ignore
    }
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel — source list */}
      <SourceList
        sources={sources}
        selectedId={activeSourceId}
        onSelect={handleSelect}
        onAdd={handleAdd}
      />

      {/* Right panel — source detail or empty state */}
      <div className="flex-1 overflow-hidden">
        {selectedSource ? (
          <SourceDetail
            source={selectedSource}
            runs={runs}
            onEdit={handleEdit}
            onScrapeNow={handleScrapeNow}
            onDelete={() => handleDelete(selectedSource.id)}
            scraping={scrapingId === selectedSource.id}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
            {/* Illustrated source network icon */}
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.4 }}>
              <circle cx="28" cy="28" r="5" stroke="#3fb950" strokeWidth="1.5" fill="rgba(63,185,80,0.1)"/>
              <circle cx="10" cy="16" r="4" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <circle cx="46" cy="16" r="4" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <circle cx="10" cy="40" r="4" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <circle cx="46" cy="40" r="4" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <line x1="14" y1="18" x2="23" y2="25" stroke="#484f58" strokeWidth="1" strokeDasharray="3 2"/>
              <line x1="42" y1="18" x2="33" y2="25" stroke="#484f58" strokeWidth="1" strokeDasharray="3 2"/>
              <line x1="14" y1="38" x2="23" y2="31" stroke="#484f58" strokeWidth="1" strokeDasharray="3 2"/>
              <line x1="42" y1="38" x2="33" y2="31" stroke="#484f58" strokeWidth="1" strokeDasharray="3 2"/>
            </svg>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Select a source to view details
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-dim)' }}>
                or add a new source with the <span style={{ color: 'var(--accent)' }}>+ Add Source</span> button
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showAddModal && (
        <AddSourceModal
          initialData={editingSource ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditingSource(null); }}
        />
      )}
    </div>
  );
}
