import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import HelpTip from '../ui/HelpTip'
import type { Platform, TargetStatus, Difficulty, AttackStage, CardStatus } from '../../types/recondesk'

const PLATFORMS: Platform[] = ['HTB', 'THM', 'CTF', 'Client', 'Internal']
const OS_OPTIONS = ['Linux', 'Windows', 'macOS', 'FreeBSD', 'Unknown']
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Insane']
const STATUSES: TargetStatus[] = ['active', 'paused', 'completed', 'abandoned']

interface TemplateCard { title: string; description: string; stage: AttackStage; status: CardStatus }
interface Template { id: string; name: string; cards: TemplateCard[] }

const METHODOLOGY_TEMPLATES: Template[] = [
  { id: 'webapp', name: 'Web App Pentest', cards: [
    { title: 'Passive recon', description: 'OSINT, whois, DNS enumeration', stage: 'recon', status: 'todo' },
    { title: 'Service fingerprinting', description: 'whatweb, wappalyzer, headers', stage: 'enum', status: 'todo' },
    { title: 'Directory fuzzing', description: 'gobuster / ffuf directory scan', stage: 'enum', status: 'todo' },
    { title: 'Vulnerability scan', description: 'nikto, nuclei scan', stage: 'enum', status: 'todo' },
    { title: 'Auth bypass', description: 'SQLi, broken auth, JWT attacks', stage: 'exploit', status: 'todo' },
    { title: 'OWASP Top 10', description: 'XSS, IDOR, SSRF, SSTI, XXE', stage: 'exploit', status: 'todo' },
    { title: 'Post-exploitation', description: 'Data exfiltration, persistence', stage: 'post', status: 'todo' },
  ]},
  { id: 'network', name: 'Network Pentest', cards: [
    { title: 'Host discovery', description: 'Ping sweep, arp-scan', stage: 'recon', status: 'todo' },
    { title: 'Port scan', description: 'nmap full TCP + UDP scan', stage: 'enum', status: 'todo' },
    { title: 'Service enum', description: 'SMB, LDAP, SNMP, NFS', stage: 'enum', status: 'todo' },
    { title: 'Vuln scan', description: 'nessus / openvas / nmap scripts', stage: 'enum', status: 'todo' },
    { title: 'Exploitation', description: 'CVE exploitation, password attacks', stage: 'exploit', status: 'todo' },
    { title: 'Pivoting', description: 'Tunnel, lateral movement', stage: 'post', status: 'todo' },
    { title: 'Domain privesc', description: 'Kerberoasting, AS-REP, Pass-the-hash', stage: 'privesc', status: 'todo' },
  ]},
  { id: 'api', name: 'API Security', cards: [
    { title: 'Endpoint discovery', description: 'Swagger, postman, JS parsing', stage: 'recon', status: 'todo' },
    { title: 'Auth testing', description: 'JWT, OAuth, API keys', stage: 'enum', status: 'todo' },
    { title: 'BOLA / IDOR', description: 'Object-level authorization flaws', stage: 'exploit', status: 'todo' },
    { title: 'Mass assignment', description: 'Parameter pollution', stage: 'exploit', status: 'todo' },
    { title: 'Rate limiting', description: 'Brute force, enumeration via API', stage: 'exploit', status: 'todo' },
  ]},
  { id: 'activedirectory', name: 'Active Directory', cards: [
    { title: 'Domain enum', description: 'BloodHound, ldapdomaindump', stage: 'recon', status: 'todo' },
    { title: 'User enum', description: 'kerbrute, SMB null sessions', stage: 'enum', status: 'todo' },
    { title: 'Password attacks', description: 'AS-REP roasting, spray, brute', stage: 'exploit', status: 'todo' },
    { title: 'Kerberoasting', description: 'GetUserSPNs, hashcat', stage: 'exploit', status: 'todo' },
    { title: 'DCSync / Pass-the-Hash', description: 'Secretsdump, mimikatz', stage: 'privesc', status: 'todo' },
    { title: 'Domain admin', description: 'DA access, domain dominance', stage: 'loot', status: 'todo' },
  ]},
  { id: 'mobile', name: 'Mobile App', cards: [
    { title: 'Static analysis', description: 'APKTool, jadx, strings', stage: 'recon', status: 'todo' },
    { title: 'Traffic interception', description: 'Frida, Burp proxy setup', stage: 'enum', status: 'todo' },
    { title: 'Hardcoded secrets', description: 'API keys, credentials in code', stage: 'enum', status: 'todo' },
    { title: 'Backend API testing', description: 'Auth, IDOR, injection', stage: 'exploit', status: 'todo' },
    { title: 'Local storage', description: 'SQLite, shared prefs, keystore', stage: 'loot', status: 'todo' },
  ]},
  { id: 'wireless', name: 'Wireless', cards: [
    { title: 'Scan & discovery', description: 'airodump-ng, kismet', stage: 'recon', status: 'todo' },
    { title: 'WPA handshake capture', description: 'airodump, aireplay deauth', stage: 'enum', status: 'todo' },
    { title: 'WPA crack', description: 'hashcat, aircrack-ng', stage: 'exploit', status: 'todo' },
    { title: 'Evil twin / MITM', description: 'hostapd-wpe, responder', stage: 'exploit', status: 'todo' },
    { title: 'Post-connect enum', description: 'Internal network enumeration', stage: 'post', status: 'todo' },
  ]},
]

export default function NewTargetModal() {
  const addTarget         = useRecondeskStore(s => s.addTarget)
  const addAttackCard     = useRecondeskStore(s => s.addAttackCard)
  const setNewTargetModal = useRecondeskStore(s => s.setNewTargetModal)
  const settings          = useRecondeskStore(s => s.settings)
  const engagements       = useRecondeskStore(s => s.engagements)

  const [form, setForm] = useState({
    name:         '',
    ip:           '',
    platform:     settings.defaultPlatform as Platform,
    os:           'Unknown',
    difficulty:   '' as Difficulty | '',
    status:       'active' as TargetStatus,
    tags:         '',
    notes:        '',
    engagementId: 'default',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())  e.name = 'Name is required'
    if (!form.ip.trim())    e.ip   = 'IP address is required'
    return e
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    addTarget({
      name:         form.name.trim(),
      ip:           form.ip.trim(),
      platform:     form.platform,
      os:           form.os,
      difficulty:   (form.difficulty || undefined) as Difficulty | undefined,
      status:       form.status,
      tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes:        form.notes,
      engagementId: form.engagementId,
    })

    // Apply methodology template cards after target is created
    if (selectedTemplate) {
      const tpl = METHODOLOGY_TEMPLATES.find(t => t.id === selectedTemplate)
      if (tpl) {
        // Give store a tick to create the target
        setTimeout(() => {
          const newTargets = useRecondeskStore.getState().targets
          const created = newTargets[newTargets.length - 1]
          if (created) {
            tpl.cards.forEach(card => addAttackCard(created.id, {
              title: card.title, description: card.description,
              stage: card.stage, status: card.status,
              linkedPortIds: [], linkedCredentialIds: [], notes: '',
            }))
          }
        }, 50)
      }
    }

    setNewTargetModal(false)
  }

  function field(label: string, key: keyof typeof form, content: React.ReactNode) {
    return (
      <div>
        <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">{label}</label>
        {content}
        {errors[key] && <p className="text-[10px] text-[#f85149] mt-0.5">{errors[key]}</p>}
      </div>
    )
  }

  const inputCls = "w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors"
  const selectCls = "w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#d29922] transition-colors"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => setNewTargetModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-[#12131a] border border-[#2a3347] rounded-lg w-[440px] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3347]">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
              New Target
              <HelpTip
                title="New Target"
                body="Create a target to track. Name + IP are required; platform, OS, difficulty, tags, and a methodology template are optional but speed up setup. The target appears in the sidebar immediately."
              />
            </h2>
            <p className="text-[11px] text-[#4a5568] mt-0.5">Add a machine, domain, or scope to track</p>
          </div>
          <button
            onClick={() => setNewTargetModal(false)}
            className="text-[#4a5568] hover:text-[#e2e8f0] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5 p-4 overflow-y-auto">
          {field('Name', 'name',
            <input
              autoFocus
              placeholder="e.g. Pickle Rick, client-webapp"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`${inputCls} ${errors.name ? 'border-[#f85149]' : ''}`}
            />
          )}

          {field('IP Address', 'ip',
            <input
              placeholder="e.g. 10.10.3.164"
              value={form.ip}
              onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
              className={`${inputCls} font-mono ${errors.ip ? 'border-[#f85149]' : ''}`}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                className={selectCls}
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">OS</label>
              <select
                value={form.os}
                onChange={e => setForm(f => ({ ...f, os: e.target.value }))}
                className={selectCls}
              >
                {OS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty | '' }))}
                className={selectCls}
              >
                <option value="">—</option>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TargetStatus }))}
                className={selectCls}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {field('Tags', 'tags',
            <input
              placeholder="web, linux, easy (comma-separated)"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className={inputCls}
            />
          )}

          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Engagement</label>
            <select
              value={form.engagementId}
              onChange={e => setForm(f => ({ ...f, engagementId: e.target.value }))}
              className={selectCls}
            >
              {engagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Initial Notes</label>
            <textarea
              placeholder="Markdown notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Methodology Template */}
          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1.5">Methodology Template</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className={`text-[10px] py-1.5 px-2 rounded border text-left transition-colors ${
                  !selectedTemplate ? 'bg-[#2a3347]/60 border-[#d29922]/30 text-[#d29922]' : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
                }`}
              >
                None (blank)
              </button>
              {METHODOLOGY_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tpl.id === selectedTemplate ? null : tpl.id)}
                  className={`text-[10px] py-1.5 px-2 rounded border text-left transition-colors ${
                    selectedTemplate === tpl.id ? 'bg-[#d29922]/10 border-[#d29922]/30 text-[#d29922]' : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <p className="text-[9px] text-[#4a5568] mt-1">
                {METHODOLOGY_TEMPLATES.find(t => t.id === selectedTemplate)?.cards.length} cards will be pre-created
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setNewTargetModal(false)}
              className="flex-1 bg-[#2a3347]/40 hover:bg-[#2a3347]/70 text-[#8b949e] text-xs py-2 rounded border border-[#2a3347] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs py-2 rounded transition-colors font-medium"
            >
              Create Target
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
