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

      {/* Search + highlight */}
      <div className="no-drag relative">
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 8, color: searchQuery ? '#ff8c42' : 'var(--text-muted)', pointerEvents: 'none', transition: 'color 150ms' }}
          >
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSearchEnter() }}
            placeholder="Search & highlight nodes…"
            style={{
              background: '#0d0e18',
              border: `1px solid ${searchQuery ? 'rgba(255,140,66,0.5)' : 'rgba(42,51,71,0.75)'}`,
              borderRadius: 8, padding: '4px 8px 4px 26px',
              color: 'var(--text-primary)', fontSize: 11, width: 200,
              fontFamily: 'var(--font-display)',
              transition: 'border-color 150ms, box-shadow 150ms',
              boxShadow: searchQuery ? '0 0 0 2px rgba(255,140,66,0.08), 0 0 8px rgba(255,140,66,0.1)' : 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(255,140,66,0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,140,66,0.08)'
            }}
            onBlur={e => {
              if (!searchQuery) {
                e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              title="Clear search"
              style={{
                position: 'absolute', right: 6,
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, lineHeight: 1,
                display: 'flex', alignItems: 'center', padding: '1px 2px',
                borderRadius: 4, transition: 'color 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff8c42')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >×</button>
          )}
        </div>
        {/* Highlight count badge */}
        {searchQuery && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            fontSize: 10, color: '#ff8c42',
            background: 'rgba(13,14,24,0.96)',
            border: '1px solid rgba(255,140,66,0.25)',
            borderRadius: 6, padding: '3px 8px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 50,
            animation: 'badgePop 0.18s var(--ease)',
          }}>
            <span style={{ opacity: 0.65 }}>Highlighting matches — press </span>
            <kbd style={{
              fontSize: 9, padding: '1px 4px', borderRadius: 3,
              background: 'rgba(255,140,66,0.12)', border: '1px solid rgba(255,140,66,0.28)',
              fontFamily: 'var(--font-mono)',
            }}>Enter</kbd>
            <span style={{ opacity: 0.65 }}> to jump</span>
          </div>
        )}
      </div>

      {/* Layout buttons */}
      <div className="no-drag flex gap-0.5">
        {LAYOUTS.map(l => (
          <button
            key={l.mode}
            onClick={() => onLayoutChange(l.mode)}
            title={l.label}
            style={{
              padding: '4px 7px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
              background: layoutMode === l.mode ? 'rgba(255,140,66,0.13)' : 'transparent',
              color: layoutMode === l.mode ? '#ff8c42' : 'var(--text-secondary)',
              border: `1px solid ${layoutMode === l.mode ? 'rgba(255,140,66,0.38)' : 'rgba(42,51,71,0.6)'}`,
              transition: 'all 180ms var(--ease)',
              boxShadow: layoutMode === l.mode ? '0 0 8px rgba(255,140,66,0.12)' : 'none',
            }}
          >{l.icon}</button>
        ))}
      </div>

      {/* Group divider */}
      <div style={{ width: 1, height: 18, background: 'rgba(42,51,71,0.6)', flexShrink: 0 }} />

      {/* Feature toggles */}
      <div className="no-drag flex gap-1">
        <ToggleBtn label="Subnets" active={showSubnets} onClick={onToggleSubnets} />
        <ToggleBtn label="Vulns"   active={showVulnOverlay} onClick={onToggleVulnOverlay} />
        <ToggleBtn label="Heat"    active={showHeatmap} onClick={onToggleHeatmap} />
        <ToggleBtn label="Diff"    active={compareMode} onClick={onToggleCompare} />
        <FilterToggle filterCount={filterCount} active={filterOpen} onClick={onToggleFilter} />
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
        {/* Animated node/edge stat chips */}
        <span
          key={nodeCount}
          className="badge-animate"
          title="Nodes"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            padding: '2px 7px', borderRadius: 8,
            background: 'rgba(255,140,66,0.07)', border: '1px solid rgba(255,140,66,0.18)',
            color: '#ff8c42',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.7 }}>
            <circle cx="4" cy="4" r="3" />
          </svg>
          {nodeCount}
        </span>
        <span
          title="Edges"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontVariantNumeric: 'tabular-nums',
            padding: '2px 7px', borderRadius: 8,
            color: 'var(--text-muted)',
          }}
        >
          <svg width="8" height="4" viewBox="0 0 8 4" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.6 }}>
            <path d="M0 2h8" />
          </svg>
          {edgeCount}
        </span>
        {saveMsg && (
          <span
            key={saveMsg}
            className="badge-animate"
            style={{ fontSize: 11, color: saveMsg === 'Saved' ? '#3fb950' : '#f85149' }}
          >
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
        padding: '4px 9px', fontSize: 10, fontWeight: active ? 600 : 500, borderRadius: 8, cursor: 'pointer',
        background: active ? 'rgba(255,140,66,0.13)' : 'transparent',
        color: active ? '#ff8c42' : 'var(--text-muted)',
        border: `1px solid ${active ? 'rgba(255,140,66,0.38)' : 'rgba(42,51,71,0.6)'}`,
        letterSpacing: '0.04em',
        transition: 'all 180ms var(--ease)',
        boxShadow: active ? '0 0 8px rgba(255,140,66,0.12)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.9)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(42,51,71,0.2)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.6)'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}
    >{label}</button>
  )
}

function FilterToggle({ filterCount, active, onClick }: { filterCount: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '4px 9px', fontSize: 10, fontWeight: active ? 600 : 500, borderRadius: 8, cursor: 'pointer',
        background: active ? 'rgba(255,140,66,0.13)' : 'transparent',
        color: active ? '#ff8c42' : 'var(--text-muted)',
        border: `1px solid ${active ? 'rgba(255,140,66,0.38)' : 'rgba(42,51,71,0.6)'}`,
        letterSpacing: '0.04em',
        transition: 'all 180ms var(--ease)',
        boxShadow: active ? '0 0 8px rgba(255,140,66,0.12)' : 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.9)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(42,51,71,0.2)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.6)'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 2h8M2.5 5h5M4 8h2" strokeLinecap="round" />
      </svg>
      Filter
      {filterCount > 0 && (
        <span
          key={filterCount}
          className="badge-animate"
          style={{
            fontSize: 9, fontWeight: 700,
            background: active ? 'rgba(255,140,66,0.25)' : 'rgba(255,140,66,0.18)',
            color: '#ff8c42',
            border: '1px solid rgba(255,140,66,0.4)',
            borderRadius: 8, padding: '0 5px',
            lineHeight: '14px', minWidth: 14, textAlign: 'center',
          }}
        >{filterCount}</span>
      )}
    </button>
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
        padding: '5px 10px', borderRadius: 8, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
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
