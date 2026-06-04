/**
 * CyberOS Design System — Style Reference
 * Accessible via Sidebar: Design System tab (gear icon, bottom)
 * Remove or gate behind dev-only flag before shipping.
 */
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import Panel        from '../components/ui/Panel'
import MetricCard   from '../components/ui/MetricCard'
import StatChip     from '../components/ui/StatChip'
import SectionHeader from '../components/ui/SectionHeader'
import Badge        from '../components/ui/Badge'
import SeverityPill from '../components/ui/SeverityPill'
import Button       from '../components/ui/Button'
import LiveDot      from '../components/ui/LiveDot'
import ChartFrame   from '../components/ui/ChartFrame'
import Tabs         from '../components/ui/Tabs'
import { useState } from 'react'
import { chartPalette, rechartsTheme } from '../design-system-theme'

// ── Sample data ───────────────────────────────────────────────────────────────

const sparkData  = [3, 5, 2, 8, 6, 9, 7, 11, 10, 14, 12, 16]
const areaData   = Array.from({ length: 14 }, (_, i) => ({ day: `D${i+1}`, a: Math.floor(Math.random()*40+20), b: Math.floor(Math.random()*25+10) }))
const barData    = [
  { name: 'Recon', done: 8, open: 2 },
  { name: 'Enum',  done: 6, open: 4 },
  { name: 'Exploit',done:3, open: 5 },
  { name: 'Post',  done: 2, open: 3 },
]
const radarData  = [
  { skill: 'Web',    value: 80 },
  { skill: 'Network',value: 65 },
  { skill: 'AD',     value: 55 },
  { skill: 'Linux',  value: 90 },
  { skill: 'Windows',value: 70 },
  { skill: 'Crypto', value: 45 },
]

const appAccents = [
  { name: 'Dashboard',   color: '#4a9eff' },
  { name: 'ReconDesk',   color: '#d29922' },
  { name: 'GhostVault',  color: '#7bb8ff' },
  { name: 'CyberLab',    color: '#b44fff' },
  { name: 'VaultCore',   color: '#3fb950' },
  { name: 'SignalBoard',  color: '#ff6b6b' },
  { name: 'CredVault',   color: '#f78166' },
  { name: 'TerminalLink',color: '#00ff41' },
]

// ── View ──────────────────────────────────────────────────────────────────────

export default function StyleReferenceView() {
  const [activeTab, setActiveTab] = useState('components')

  const tabs = [
    { id: 'components', label: 'Components' },
    { id: 'typography', label: 'Typography' },
    { id: 'charts',     label: 'Charts' },
    { id: 'tokens',     label: 'Tokens' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-surface-0">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-2xs font-mono text-text-muted mb-1 tracking-widest uppercase">CyberOS Design System · v2</p>
          <h1 className="text-3xl font-bold text-text-primary">Style Reference</h1>
          <p className="text-text-secondary text-sm mt-1">All primitives, tokens, and chart patterns — source of truth for app redesigns.</p>
        </div>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-8" />

        {/* ── COMPONENTS ── */}
        {activeTab === 'components' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-8"
          >

            {/* MetricCards */}
            <section>
              <SectionHeader title="MetricCard" subtitle="KPI card with count-up, sparkline, delta" className="mb-4" />
              <div className="grid grid-cols-4 gap-3">
                <MetricCard label="Total Targets"  value={24} sparkData={sparkData} accentColor="#4a9eff"  delta="↑ 3 this week" />
                <MetricCard label="Open Findings"  value={7}  sparkData={sparkData.map(v=>v+2)} accentColor="#f85149" delta="↓ 2 vs last" deltaUp={false} />
                <MetricCard label="Flags Captured" value={42} sparkData={sparkData.map(v=>v*2)} accentColor="#3fb950" unit="" sublabel="all-time" />
                <MetricCard label="Day Streak"     value={18} accentColor="#d29922" />
              </div>
            </section>

            {/* StatChips */}
            <section>
              <SectionHeader title="StatChip" subtitle="Compact inline stat" className="mb-4" />
              <div className="flex flex-wrap gap-2">
                <StatChip label="Ports"  value={14}     color="#4a9eff" mono />
                <StatChip label="Creds"  value={3}      color="#f85149" mono />
                <StatChip label="Cards"  value={9}      color="#d29922" />
                <StatChip label="Status" value="Active" color="#3fb950" />
                <StatChip label="Risk"   value="High"   color="#ff8c42" />
                <StatChip label="OS"     value="Linux"  color="#b44fff" mono />
              </div>
            </section>

            {/* Badges + SeverityPills */}
            <section>
              <SectionHeader title="Badge & SeverityPill" subtitle="Status and severity labeling" className="mb-4" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="success" dot>Online</Badge>
                  <Badge variant="warning" dot>Expiring</Badge>
                  <Badge variant="danger"  dot>Critical</Badge>
                  <Badge variant="info"    dot>In Progress</Badge>
                  <Badge variant="purple"  dot>AI Assisted</Badge>
                  <Badge variant="default">Default</Badge>
                  <Badge variant="accent"  dot>Active</Badge>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <SeverityPill severity="critical" />
                  <SeverityPill severity="high" />
                  <SeverityPill severity="medium" />
                  <SeverityPill severity="low" />
                  <SeverityPill severity="info" />
                </div>
              </div>
            </section>

            {/* LiveDot */}
            <section>
              <SectionHeader title="LiveDot" subtitle="Pulsing status indicator" className="mb-4" />
              <div className="flex items-center gap-6">
                {(['online','offline','pending','blocked'] as const).map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <LiveDot status={s} size={8} />
                    <span className="text-xs text-text-secondary capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Buttons */}
            <section>
              <SectionHeader title="Button" subtitle="primary / ghost / danger / subtle" className="mb-4" />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="md">Primary Action</Button>
                <Button variant="ghost"   size="md">Ghost Button</Button>
                <Button variant="danger"  size="md">Delete</Button>
                <Button variant="subtle"  size="md">Subtle</Button>
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="ghost"   size="xs">XS</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="ghost" disabled>Disabled</Button>
              </div>
            </section>

            {/* Panels */}
            <section>
              <SectionHeader title="Panel" subtitle="Surface layers — flat / glass / elevated / active" className="mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {([
                  { label: 'Flat',     props: {} },
                  { label: 'Glass',    props: { glass: true } },
                  { label: 'Elevated', props: { elevated: true } },
                  { label: 'Active',   props: { active: true } },
                ] as const).map(({ label, props }) => (
                  <Panel key={label} {...props} className="h-20 flex items-center justify-center">
                    <span className="text-xs text-text-secondary">{label}</span>
                  </Panel>
                ))}
              </div>
            </section>

            {/* Tabs */}
            <section>
              <SectionHeader title="Tabs" subtitle="Pill-style tab switcher with count badges" className="mb-4" />
              <div className="flex flex-col gap-4">
                <Tabs
                  tabs={[
                    { id: 'a', label: 'Overview' },
                    { id: 'b', label: 'Ports', count: 14 },
                    { id: 'c', label: 'Credentials', count: 3 },
                    { id: 'd', label: 'Cards', count: 9 },
                  ]}
                  active="b"
                  onChange={() => {}}
                />
              </div>
            </section>

            {/* App accent palette */}
            <section>
              <SectionHeader title="App Accent Palette" subtitle="Per-app identity colours" className="mb-4" />
              <div className="flex flex-wrap gap-2">
                {appAccents.map(a => (
                  <div key={a.name} className="flex items-center gap-2 px-3 py-2 rounded-md border" style={{ background: `${a.color}0d`, borderColor: `${a.color}30` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}88` }} />
                    <span className="text-xs font-medium" style={{ color: a.color }}>{a.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── TYPOGRAPHY ── */}
        {activeTab === 'typography' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            <section>
              <SectionHeader title="Type Scale — Geist Sans (display)" className="mb-5" />
              {[
                { label: 'text-3xl (36px)', cls: 'text-3xl font-bold',  sample: 'Ecosystem Health' },
                { label: 'text-2xl (28px)', cls: 'text-2xl font-bold',  sample: 'Operator Profile' },
                { label: 'text-xl  (22px)', cls: 'text-xl  font-semibold', sample: 'Target Overview' },
                { label: 'text-lg  (18px)', cls: 'text-lg  font-semibold', sample: 'Active Session' },
                { label: 'text-md  (15px)', cls: 'text-md  font-medium',   sample: 'Section heading' },
                { label: 'text-base(14px)', cls: 'text-base',              sample: 'Body text. The operator is mid-engagement and expects instant feedback.' },
                { label: 'text-sm  (13px)', cls: 'text-sm  text-text-secondary', sample: 'Secondary label or table cell value' },
                { label: 'text-xs  (12px)', cls: 'text-xs  text-text-muted',     sample: 'Timestamp, metadata, caption' },
                { label: 'text-2xs (11px)', cls: 'text-2xs text-text-muted uppercase tracking-widest', sample: 'SECTION HEADER' },
              ].map(r => (
                <div key={r.label} className="flex items-baseline gap-6 py-2.5 border-b border-border-subtle/40 last:border-0">
                  <span className="text-2xs font-mono text-text-muted w-36 flex-shrink-0">{r.label}</span>
                  <span className={r.cls}>{r.sample}</span>
                </div>
              ))}
            </section>

            <section>
              <SectionHeader title="JetBrains Mono — data, IPs, hashes, terminal" className="mb-5" />
              {[
                { label: 'IP / Port',    sample: '10.10.11.42  :  443/tcp' },
                { label: 'Hash',         sample: 'aad3b435b51404eeaad3b435b51404ee' },
                { label: 'Command',      sample: 'nmap -sV -sC -p- 10.10.11.42 -oX scan.xml' },
                { label: 'Path',         sample: '/home/user/.cyberlab-companion/sessions/' },
                { label: 'Timestamp',    sample: '2026-06-04T14:32:00.000Z' },
                { label: 'CVE',          sample: 'CVE-2024-3400 · CVSS 10.0 · Critical' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-6 py-2.5 border-b border-border-subtle/40 last:border-0">
                  <span className="text-2xs font-mono text-text-muted w-24 flex-shrink-0">{r.label}</span>
                  <span className="text-sm font-mono text-[#4a9eff]/80">{r.sample}</span>
                </div>
              ))}
            </section>
          </motion.div>
        )}

        {/* ── CHARTS ── */}
        {activeTab === 'charts' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-5"
          >
            {/* Area chart */}
            <ChartFrame title="Area Chart" subtitle="Attack card activity over 14 days" height={180}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4a9eff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3fb950" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3fb950" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...rechartsTheme.cartesianGrid} />
                <XAxis dataKey="day" {...rechartsTheme.xAxis} />
                <YAxis {...rechartsTheme.yAxis} />
                <Tooltip {...rechartsTheme.tooltip} />
                <Area type="monotone" dataKey="a" stroke="#4a9eff" strokeWidth={1.5} fill="url(#ga)" dot={false} animationDuration={600} />
                <Area type="monotone" dataKey="b" stroke="#3fb950" strokeWidth={1.5} fill="url(#gb)" dot={false} animationDuration={800} />
              </AreaChart>
            </ChartFrame>

            {/* Bar chart */}
            <ChartFrame title="Bar Chart" subtitle="Cards by stage and completion" height={180}>
              <BarChart data={barData} barGap={2} barCategoryGap="30%">
                <CartesianGrid {...rechartsTheme.cartesianGrid} />
                <XAxis dataKey="name" {...rechartsTheme.xAxis} />
                <YAxis {...rechartsTheme.yAxis} />
                <Tooltip {...rechartsTheme.tooltip} />
                <Bar dataKey="done" fill="#3fb950" radius={[2,2,0,0]} opacity={0.85} animationDuration={600} />
                <Bar dataKey="open" fill="#d29922" radius={[2,2,0,0]} opacity={0.75} animationDuration={700} />
              </BarChart>
            </ChartFrame>

            {/* Radar chart */}
            <ChartFrame title="Radar Chart" subtitle="Operator skill profile" height={220}>
              <RadarChart data={radarData} outerRadius={80}>
                <PolarGrid stroke="rgba(42,51,71,0.35)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#4a9eff" strokeWidth={1.5} fill="#4a9eff" fillOpacity={0.15} animationDuration={800} />
              </RadarChart>
            </ChartFrame>

            {/* Line chart */}
            <ChartFrame title="Line Chart" subtitle="Flags captured over sessions" height={220}>
              <LineChart data={areaData}>
                <CartesianGrid {...rechartsTheme.cartesianGrid} />
                <XAxis dataKey="day" {...rechartsTheme.xAxis} />
                <YAxis {...rechartsTheme.yAxis} />
                <Tooltip {...rechartsTheme.tooltip} />
                <Line type="monotone" dataKey="a" stroke="#b44fff" strokeWidth={2} dot={false} animationDuration={600} />
                <Line type="monotone" dataKey="b" stroke="#d29922" strokeWidth={1.5} dot={false} strokeDasharray="4 2" animationDuration={800} />
              </LineChart>
            </ChartFrame>

            {/* Sparkline showcase */}
            <div className="col-span-2">
              <SectionHeader title="Sparklines in MetricCards" subtitle="Inline trend at-a-glance" className="mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {chartPalette.slice(0,4).map((color, i) => (
                  <MetricCard
                    key={i}
                    label={['Targets','Findings','Sessions','Flags'][i]}
                    value={[24, 7, 12, 42][i]}
                    sparkData={sparkData.map(v => v + i * 2)}
                    accentColor={color}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TOKENS ── */}
        {activeTab === 'tokens' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-8"
          >
            {/* Surfaces */}
            <section>
              <SectionHeader title="Surface Layers" className="mb-4" />
              <div className="flex flex-col gap-2">
                {[
                  { name: '--surface-0', hex: '#07080f',  label: 'Canvas' },
                  { name: '--surface-1', hex: '#0d0e18',  label: 'Card base' },
                  { name: '--surface-2', hex: '#131525',  label: 'Raised / hover' },
                  { name: '--surface-3', hex: '#191c32',  label: 'Modal / popover' },
                ].map(s => (
                  <div key={s.name} className="flex items-center gap-3 py-1.5">
                    <div className="w-10 h-6 rounded border border-border-default/60" style={{ background: s.hex }} />
                    <span className="text-xs font-mono text-text-secondary w-28">{s.name}</span>
                    <span className="text-2xs font-mono text-text-muted">{s.hex}</span>
                    <span className="text-2xs text-text-muted ml-auto">{s.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Severity */}
            <section>
              <SectionHeader title="Severity Palette" className="mb-4" />
              <div className="flex flex-col gap-2">
                {[
                  { name: '--sev-critical', hex: '#f85149', label: 'Critical' },
                  { name: '--sev-high',     hex: '#ff8c42', label: 'High' },
                  { name: '--sev-medium',   hex: '#d29922', label: 'Medium' },
                  { name: '--sev-low',      hex: '#4a9eff', label: 'Low' },
                  { name: '--sev-info',     hex: '#8b949e', label: 'Info' },
                ].map(s => (
                  <div key={s.name} className="flex items-center gap-3 py-1.5">
                    <div className="w-10 h-6 rounded border" style={{ background: s.hex + '22', borderColor: s.hex + '44' }}>
                      <div className="w-2 h-full rounded-l" style={{ background: s.hex }} />
                    </div>
                    <span className="text-xs font-mono text-text-secondary w-28">{s.name}</span>
                    <span className="text-2xs font-mono" style={{ color: s.hex }}>{s.hex}</span>
                    <span className="text-2xs text-text-muted ml-auto">{s.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Elevation */}
            <section>
              <SectionHeader title="Elevation Shadows" className="mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {([1,2,3,4] as const).map(n => (
                  <div
                    key={n}
                    className={`h-16 rounded-md bg-surface-1 border border-border-default/60 flex items-center justify-center shadow-elevation-${n}`}
                  >
                    <span className="text-xs text-text-muted">elevation-{n}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Motion */}
            <section>
              <SectionHeader title="Motion Tokens" className="mb-4" />
              <div className="flex flex-col gap-3">
                {[
                  { name: 'instant', ms: '80ms' },
                  { name: 'fast',    ms: '150ms' },
                  { name: 'base',    ms: '250ms' },
                  { name: 'slow',    ms: '400ms' },
                ].map(m => (
                  <div key={m.name} className="flex items-center gap-4">
                    <span className="text-xs font-mono text-text-muted w-20">--motion-{m.name}</span>
                    <span className="text-2xs font-mono text-accent">{m.ms}</span>
                    <div
                      className="h-1 rounded-full bg-accent/40 transition-all ease-cyber cursor-pointer hover:bg-accent hover:w-full"
                      style={{ width: `${parseInt(m.ms) / 4}px`, transitionDuration: m.ms }}
                    />
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

      </div>
    </div>
  )
}
