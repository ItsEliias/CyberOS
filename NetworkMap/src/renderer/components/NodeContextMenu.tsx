// NetworkMap — NodeContextMenu.tsx — Features 13, 14, 15, 21
import { useRef, useEffect, useState } from 'react'
import type { NetworkNode, NodeSchedule, AclRule } from '@shared/types'

interface Props {
  node: NetworkNode
  x: number
  y: number
  onClose: () => void
  onAnnotate: (nodeId: string, text: string) => void
  onSchedule: (nodeId: string, schedule: NodeSchedule) => void
  onOpenInTerminalLink: (ip: string) => void
}

const MENU_STYLE: React.CSSProperties = {
  position: 'fixed',
  background: 'rgba(22,27,34,0.98)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  minWidth: 200,
  zIndex: 100,
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  overflow: 'hidden',
}

const ITEM_STYLE: React.CSSProperties = {
  padding: '7px 14px', fontSize: 12, cursor: 'pointer',
  color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8,
}

type SubView = 'main' | 'annotate' | 'schedule' | 'acl'

export default function NodeContextMenu({ node, x, y, onClose, onAnnotate, onSchedule, onOpenInTerminalLink }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<SubView>('main')
  const [annotationText, setAnnotationText] = useState(node.annotation ?? '')
  const [scheduleHours, setScheduleHours] = useState('24')
  const [aclRules, setAclRules] = useState<AclRule[]>([])
  const [aclInput, setAclInput] = useState('')
  const [aclAction, setAclAction] = useState<'permit' | 'deny'>('permit')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function copyNmapOneliner() {
    try {
      await navigator.clipboard.writeText(`nmap -sV -sC ${node.ip}`)
      onClose()
    } catch (err) {
      console.error('copy failed', err)
      // Keep the menu open so the user can right-click again and try
      // another action, rather than silently dismissing.
    }
  }

  function submitAnnotation() {
    onAnnotate(node.id, annotationText)
    onClose()
  }

  function submitSchedule() {
    const hours = parseInt(scheduleHours, 10) || 24
    const scheduledAt = new Date(Date.now() + hours * 3600000).toISOString()
    onSchedule(node.id, { scheduledAt, status: 'pending', nmapArgs: `-sV -sC ${node.ip}` })
    onClose()
  }

  const menuStyle = { ...MENU_STYLE, left: x, top: y }

  if (view === 'annotate') {
    return (
      <div ref={ref} style={{ ...menuStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add note for {node.ip}</div>
        <textarea
          autoFocus
          value={annotationText}
          onChange={e => setAnnotationText(e.target.value)}
          rows={3}
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', fontSize: 11, padding: 6, resize: 'none', width: '100%',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={submitAnnotation} style={{ flex: 1, padding: '5px 0', borderRadius: 4, background: 'var(--accent)', border: 'none', color: '#0d1117', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Save</button>
          <button onClick={onClose} style={{ flex: 1, padding: '5px 0', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    )
  }

  if (view === 'schedule') {
    return (
      <div ref={ref} style={{ ...menuStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Schedule re-scan for {node.ip}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" value={scheduleHours} onChange={e => setScheduleHours(e.target.value)} min={1}
            style={{ width: 60, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', color: 'var(--text)', fontSize: 11 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>hours from now</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={submitSchedule} style={{ flex: 1, padding: '5px 0', borderRadius: 4, background: 'var(--accent)', border: 'none', color: '#0d1117', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Schedule</button>
          <button onClick={onClose} style={{ flex: 1, padding: '5px 0', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    )
  }

  if (view === 'acl') {
    function addRule() {
      if (!aclInput.trim()) return
      const rule: AclRule = {
        id: `acl-${Date.now()}`,
        action: aclAction,
        srcIp: 'any',
        dstIp: node.ip,
        description: aclInput.trim(),
      }
      setAclRules(r => [...r, rule])
      setAclInput('')
    }

    return (
      <div ref={ref} style={{ ...menuStyle, padding: 12, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{node.ip} — ACL Rules</div>
        <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {aclRules.length === 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No rules defined.</div>}
          {aclRules.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: r.action === 'permit' ? '#3fb950' : '#f85149', minWidth: 42 }}>{r.action.toUpperCase()}</span>
              <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
              <button onClick={() => setAclRules(rs => rs.filter(x => x.id !== r.id))} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 13, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <select value={aclAction} onChange={e => setAclAction(e.target.value as 'permit' | 'deny')}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: aclAction === 'permit' ? '#3fb950' : '#f85149', fontSize: 11, padding: '3px 6px' }}>
            <option value="permit">permit</option>
            <option value="deny">deny</option>
          </select>
          <input value={aclInput} onChange={e => setAclInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addRule() }}
            placeholder="Description…"
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11, padding: '3px 6px' }} />
          <button onClick={addRule} style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--accent)', border: 'none', color: '#0d1117', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+</button>
        </div>
        <button onClick={onClose} style={{ padding: '4px 0', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Close</button>
      </div>
    )
  }

  return (
    <div ref={ref} style={menuStyle}>
      <div style={{ padding: '6px 14px 5px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{node.ip}</div>
      {[
        { label: 'Add Note', icon: '📝', action: () => setView('annotate') },
        { label: 'Schedule Re-scan', icon: '⏰', action: () => setView('schedule') },
        { label: 'View ACL Rules', icon: '🛡', action: () => setView('acl') },
        { label: 'Open in TerminalLink', icon: '⚡', action: () => { onOpenInTerminalLink(node.ip); onClose() } },
        { label: 'Copy nmap one-liner', icon: '📋', action: copyNmapOneliner },
      ].map(item => (
        <div
          key={item.label}
          style={ITEM_STYLE}
          onClick={item.action}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
