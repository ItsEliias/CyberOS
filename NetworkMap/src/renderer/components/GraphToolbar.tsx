// NetworkMap — GraphToolbar.tsx — Top toolbar with all feature toggles
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
  { mode: 'force',        icon: '⊛', label: 'Force'       },
  { mode: 'hierarchical', icon: '⊤', label: 'Tree'         },
  { mode: 'circular',     icon: '◯', label: 'Circle'       },
  { mode: 'grid',         icon: '⊞', label: 'Grid'         },
]

export default function GraphToolbar({
  graphName, editingName, nodeCount, edgeCount, saveMsg, saving,
  layoutMode, showSubnets, showVulnOverlay, showHeatmap, compareMode, filterCount, filterOpen,
  searchQuery, healthScore, layerMode = 'all',
  onBack, onNameEdit, onNameChange, onNameBlur, onNameKeyDown,
  onSave, onLayoutChange, onToggleSubnets, onToggleVulnOverlay, onToggleHeatmap, onToggleCompare,
  onToggleFilter, onSearchChange, onSearchEnter, onExport, onLayerChange,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const b = toolbarBtnStyle
  const scoreColor = healthScore
    ? healthScore.score >= 80 ? '#3fb950'
    : healthScore.score >= 50 ? '#d29922'
    : '#f85149'
    : 'var(--text-muted)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
      minHeight: 48, flexWrap: 'wrap', rowGap: 4,
    }}>
      <div style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'], paddingLeft: 70 }}>
        <button onClick={onBack} style={b}>← Library</button>
      </div>

      <div style={{ flex: 1, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
        {editingName ? (
          <input autoFocus value={graphName} onChange={e => onNameChange(e.target.value)}
            onBlur={onNameBlur} onKeyDown={onNameKeyDown}
            style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', borderRadius: 4, padding: '3px 8px', fontSize: 13, fontWeight: 600, width: 220 }} />
        ) : (
          <span onClick={onNameEdit} title="Click to rename"
            style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', cursor: 'text' }}
          >{graphName}</span>
        )}
      </div>

      {/* Search — Feature 8 */}
      <div style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'], position: 'relative' }}>
        <input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearchEnter() }}
          placeholder="Search IP/host/port…"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text)', fontSize: 11, width: 180 }}
        />
      </div>

      {/* Layout buttons — Feature 6 */}
      <div style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
        {LAYOUTS.map(l => (
          <button key={l.mode} onClick={() => onLayoutChange(l.mode)} title={l.label}
            style={{ ...b, background: layoutMode === l.mode ? 'rgba(210,153,34,0.15)' : 'var(--panel)', color: layoutMode === l.mode ? 'var(--accent)' : 'var(--text-dim)', borderColor: layoutMode === l.mode ? 'rgba(210,153,34,0.4)' : 'var(--border)', padding: '4px 7px' }}>
            {l.icon}
          </button>
        ))}
      </div>

      {/* Feature toggles */}
      <div style={{ display: 'flex', gap: 3, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
        <ToggleBtn label="Subnets" active={showSubnets} onClick={onToggleSubnets} title="Toggle subnet grouping bubbles" />
        <ToggleBtn label="Vulns"   active={showVulnOverlay} onClick={onToggleVulnOverlay} title="Vulnerability severity overlay" />
        <ToggleBtn label="Heat"    active={showHeatmap} onClick={onToggleHeatmap} title="Density heatmap overlay" />
        <ToggleBtn label="Diff"    active={compareMode} onClick={onToggleCompare} title="Scan comparison mode" />
        <ToggleBtn label={`Filter${filterCount > 0 ? ` (${filterCount})` : ''}`} active={filterOpen} onClick={onToggleFilter} title="Open filter panel" />
      </div>

      {/* Layer view toggle — Feature 20 */}
      {onLayerChange && (
        <div style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          {(['all', 2, 3, 4] as LayerMode[]).map(lm => (
            <button key={lm} onClick={() => onLayerChange(lm)} title={`Layer ${lm} view`}
              style={{ ...b, padding: '4px 6px', fontSize: 10, background: layerMode === lm ? 'rgba(210,153,34,0.15)' : 'var(--panel)', color: layerMode === lm ? 'var(--accent)' : 'var(--text-muted)', borderColor: layerMode === lm ? 'rgba(210,153,34,0.4)' : 'var(--border)' }}>
              {lm === 'all' ? 'All' : `L${lm}`}
            </button>
          ))}
        </div>
      )}

      {/* Health score — Feature 16 */}
      {healthScore !== null && (
        <div style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`, color: scoreColor, fontWeight: 600 }}>
            Health {healthScore.score}%
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, alignItems: 'center', WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nodeCount}n · {edgeCount}e</span>
        {saveMsg && <span style={{ fontSize: 11, color: saveMsg === 'Saved' ? 'var(--success)' : 'var(--error)' }}>{saveMsg}</span>}
        <button onClick={onSave} disabled={saving} style={b}>{saving ? 'Saving…' : 'Save'}</button>

        {/* Export dropdown — Feature 10 */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <button onClick={() => setExportOpen(o => !o)} style={b}>Export ▾</button>
          {exportOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'rgba(22,27,34,0.98)', border: '1px solid var(--border)',
              borderRadius: 6, zIndex: 100, minWidth: 130,
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            }}>
              {(['svg', 'png', 'json'] as const).map(fmt => (
                <div key={fmt} onClick={() => { onExport(fmt); setExportOpen(false) }}
                  style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', textTransform: 'uppercase' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >{fmt}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleBtn({ label, active, onClick, title }: { label: string; active: boolean; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: '4px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
      background: active ? 'rgba(210,153,34,0.15)' : 'var(--panel)',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      border: `1px solid ${active ? 'rgba(210,153,34,0.4)' : 'var(--border)'}`,
      letterSpacing: '0.04em',
    }}>{label}</button>
  )
}

const toolbarBtnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6,
  background: 'var(--panel)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 11, cursor: 'pointer',
}
