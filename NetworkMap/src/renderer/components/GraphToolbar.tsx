// NetworkMap — GraphToolbar.tsx — Orange-accent glass toolbar
import { useRef, useState } from 'react'
import type { LayoutMode } from '@shared/types'
import type { LayerMode } from './GraphSvg'

interface HealthScore { score: number }

interface Props {
  graphName: string
  editingName: boolean
  nodeCount: number
  edgeCount: number
  saveMsg: string
  saving: boolean
  layoutMode: LayoutMode
  showSubnets: boolean
  showVulnOverlay: boolean
  showHeatmap: boolean
  compareMode: boolean
  filterCount: number
  filterOpen: boolean
  searchQuery: string
  healthScore: HealthScore | null
  layerMode?: LayerMode
  onBack: () => void
  onNameEdit: () => void
  onNameChange: (v: string) => void
  onNameBlur: () => void
  onNameKeyDown: (e: React.KeyboardEvent) => void
  onSave: () => void
  onLayoutChange: (mode: LayoutMode) => void
  onToggleSubnets: () => void
  onToggleVulnOverlay: () => void
  onToggleHeatmap: () => void
  onToggleCompare: () => void
  onToggleFilter: () => void
  onSearchChange: (q: string) => void
  onSearchEnter: () => void
  onExport: (format: 'svg' | 'png' | 'json') => void
  onLayerChange?: (mode: LayerMode) => void
}

const LAYOUTS: { mode: LayoutMode; icon: string; label: string }[] = [
  { mode: 'force',        icon: '⊛', label: 'Force'   },
  { mode: 'hierarchical', icon: '⊤', label: 'Tree'    },
  { mode: 'circular',     icon: '◯', label: 'Circle'  },
  { mode: 'grid',         icon: '⊞', label: 'Grid'    },
]

function scoreColor(score: number): string {
  if (score >= 80) return '#3fb950'
  if (score >= 50) return '#ff8c42'
  return '#f85149'
}

export default function GraphToolbar({
  graphName, editingName, nodeCount, edgeCount, saveMsg, saving,
  layoutMode, showSubnets, showVulnOverlay, showHeatmap, compareMode,
  filterCount, filterOpen, searchQuery, healthScore, layerMode = 'all',
  onBack, onNameEdit, onNameChange, onNameBlur, onNameKeyDown,
  onSave, onLayoutChange, onToggleSubnets, onToggleVulnOverlay,
  onToggleHeatmap, onToggleCompare, onToggleFilter,
  onSearchChange, onSearchEnter, onExport, onLayerChange,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="drag-region flex items-center gap-1.5 px-3.5 flex-wrap"
      style={{
        minHeight: 48,
        rowGap: 4,
        background: 'rgba(7,8,15,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,140,66,0.18) 40%, rgba(255,140,66,0.18) 60%, transparent 100%)' }}
      />

      {/* Back */}
      <div className="no-drag" style={{ paddingLeft: 70 }}>
        <TbBtn onClick={onBack}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 2L4 6l4 4" />
          </svg>
          Library
        </TbBtn>
      </div>

      {/* Graph name */}
      <div className="flex-1 no-drag min-w-0">
        {editingName ? (
          <input
            autoFocus value={graphName}
            onChange={e => onNameChange(e.target.value)}
            onBlur={onNameBlur} onKeyDown={onNameKeyDown}
            style={{
              background: '#0d0e18', border: '1px solid rgba(255,140,66,0.4)',
              color: 'var(--text-primary)', borderRadius: 6,
              padding: '3px 8px', fontSize: 13, fontWeight: 600, width: 220,
              fontFamily: 'var(--font-display)',
            }}
          />
        ) : (
          <span
            onClick={onNameEdit} title="Click to rename"
            style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', cursor: 'text' }}
          >{graphName}</span>
        )}
      </div>

      {/* Search */}
      <div className="no-drag relative">
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 8, color: 'var(--text-muted)', pointerEvents: 'none' }}
          >
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSearchEnter() }}
            placeholder="Search IP / host / port…"
            style={{
              background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)',
              borderRadius: 6, padding: '4px 8px 4px 26px',
              color: 'var(--text-primary)', fontSize: 11, width: 190,
              fontFamily: 'var(--font-display)',
              transition: 'border-color 150ms',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)')}
          />
        </div>
      </div>

      {/* Layout buttons */}
      <div className="no-drag flex gap-0.5">
        {LAYOUTS.map(l => (
          <button
            key={l.mode}
            onClick={() => onLayoutChange(l.mode)}
            title={l.label}
            style={{
              padding: '4px 7px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
              background: layoutMode === l.mode ? 'rgba(255,140,66,0.12)' : '#0d0e18',
              color: layoutMode === l.mode ? '#ff8c42' : 'var(--text-secondary)',
              border: `1px solid ${layoutMode === l.mode ? 'rgba(255,140,66,0.35)' : 'rgba(42,51,71,0.75)'}`,
              transition: 'all 150ms',
            }}
          >{l.icon}</button>
        ))}
      </div>

      {/* Feature toggles */}
      <div className="no-drag flex gap-1">
        <ToggleBtn label="Subnets" active={showSubnets} onClick={onToggleSubnets} />
        <ToggleBtn label="Vulns"   active={showVulnOverlay} onClick={onToggleVulnOverlay} />
        <ToggleBtn label="Heat"    active={showHeatmap} onClick={onToggleHeatmap} />
        <ToggleBtn label="Diff"    active={compareMode} onClick={onToggleCompare} />
        <ToggleBtn
          label={filterCount > 0 ? `Filter (${filterCount})` : 'Filter'}
          active={filterOpen}
          onClick={onToggleFilter}
        />
      </div>

      {/* Layer view */}
      {onLayerChange && (
        <div className="no-drag flex gap-0.5">
          {(['all', 2, 3, 4] as LayerMode[]).map(lm => (
            <button
              key={lm}
              onClick={() => onLayerChange(lm)}
              title={`Layer ${lm}`}
              style={{
                padding: '4px 6px', fontSize: 10, borderRadius: 5, cursor: 'pointer',
                background: layerMode === lm ? 'rgba(255,140,66,0.12)' : '#0d0e18',
                color: layerMode === lm ? '#ff8c42' : 'var(--text-muted)',
                border: `1px solid ${layerMode === lm ? 'rgba(255,140,66,0.35)' : 'rgba(42,51,71,0.75)'}`,
              }}
            >{lm === 'all' ? 'All' : `L${lm}`}</button>
          ))}
        </div>
      )}

      {/* Health score */}
      {healthScore !== null && (
        <div className="no-drag">
          <span style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 5, fontWeight: 600,
            background: `${scoreColor(healthScore!.score)}14`,
            border: `1px solid ${scoreColor(healthScore!.score)}44`,
            color: scoreColor(healthScore!.score),
          }}>
            Health {healthScore!.score}%
          </span>
        </div>
      )}

      {/* Stats + actions */}
      <div className="no-drag flex items-center gap-2">
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {nodeCount}n · {edgeCount}e
        </span>
        {saveMsg && (
          <span style={{ fontSize: 11, color: saveMsg === 'Saved' ? '#3fb950' : '#f85149' }}>
            {saveMsg}
          </span>
        )}
        <TbBtn onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </TbBtn>

        {/* Export dropdown */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <TbBtn onClick={() => setExportOpen(o => !o)}>
            Export
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ marginLeft: 2 }}>
              <path d="M0 2l4 4 4-4z" />
            </svg>
          </TbBtn>
          {exportOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0,
              background: 'rgba(13,14,24,0.98)', border: '1px solid rgba(42,51,71,0.75)',
              borderRadius: 8, zIndex: 100, minWidth: 120,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              {(['svg', 'png', 'json'] as const).map(fmt => (
                <div
                  key={fmt}
                  onClick={() => { onExport(fmt); setExportOpen(false) }}
                  style={{
                    padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', transition: 'all 120ms',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.06)'
                    ;(e.currentTarget as HTMLElement).style.color = '#ff8c42'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }}
                >{fmt}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
        background: active ? 'rgba(255,140,66,0.12)' : '#0d0e18',
        color: active ? '#ff8c42' : 'var(--text-muted)',
        border: `1px solid ${active ? 'rgba(255,140,66,0.35)' : 'rgba(42,51,71,0.75)'}`,
        letterSpacing: '0.04em', transition: 'all 150ms',
      }}
    >{label}</button>
  )
}

function TbBtn({
  children, onClick, disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
        background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)',
        color: 'var(--text-secondary)', opacity: disabled ? 0.45 : 1,
        transition: 'all 150ms', fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,1)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
      }}
    >{children}</button>
  )
}
