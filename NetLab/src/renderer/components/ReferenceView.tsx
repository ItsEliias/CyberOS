// NetLab — ReferenceView.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'

type Vendor = 'Cisco IOS' | 'Junos' | 'FortiOS' | 'Linux'
type RefCategory = 'Routing' | 'Switching' | 'VLANs' | 'ACL' | 'NAT' | 'Monitoring' | 'Troubleshooting'

interface RefCommand {
  command: string
  description: string
  example?: string
}

const REFERENCE: Record<Vendor, Partial<Record<RefCategory, RefCommand[]>>> = {
  'Cisco IOS': {
    Routing: [
      { command: 'show ip route', description: 'Display the IPv4 routing table', example: 'R1# show ip route' },
      { command: 'show ip ospf neighbor', description: 'OSPF neighbor adjacencies', example: 'R1# show ip ospf neighbor' },
      { command: 'show ip eigrp neighbors', description: 'EIGRP neighbor table', example: 'R1# show ip eigrp neighbors' },
      { command: 'ip route {net} {mask} {nh}', description: 'Add static route', example: 'ip route 10.0.0.0 255.0.0.0 192.168.1.1' },
      { command: 'router ospf {pid}', description: 'Enter OSPF router mode', example: 'router ospf 1' },
    ],
    Switching: [
      { command: 'show vlan brief', description: 'VLAN database summary', example: 'SW1# show vlan brief' },
      { command: 'show spanning-tree', description: 'STP topology for all VLANs', example: 'SW1# show spanning-tree' },
      { command: 'show mac address-table', description: 'CAM table entries', example: 'SW1# show mac address-table' },
      { command: 'show etherchannel summary', description: 'Port-channel bundle status', example: 'SW1# show etherchannel summary' },
    ],
    VLANs: [
      { command: 'vlan {id}', description: 'Create VLAN', example: 'SW1(config)# vlan 10' },
      { command: 'name {name}', description: 'Name the VLAN', example: 'SW1(config-vlan)# name Sales' },
      { command: 'switchport mode access', description: 'Set port to access mode', example: 'SW1(config-if)# switchport mode access' },
      { command: 'switchport access vlan {id}', description: 'Assign access VLAN', example: 'switchport access vlan 10' },
      { command: 'switchport mode trunk', description: 'Set port to trunk mode', example: 'SW1(config-if)# switchport mode trunk' },
    ],
    ACL: [
      { command: 'access-list {1-99} permit {src} {wild}', description: 'Standard ACL permit entry', example: 'access-list 10 permit 192.168.1.0 0.0.0.255' },
      { command: 'ip access-list extended {name}', description: 'Create named extended ACL', example: 'ip access-list extended BLOCK_WEB' },
      { command: 'show access-lists', description: 'Display ACLs with match counts', example: 'R1# show access-lists' },
      { command: 'ip access-group {name} {in|out}', description: 'Apply ACL to interface', example: 'ip access-group BLOCK_WEB out' },
    ],
    NAT: [
      { command: 'ip nat inside', description: 'Mark interface as NAT inside', example: 'interface g0/0 → ip nat inside' },
      { command: 'ip nat outside', description: 'Mark interface as NAT outside', example: 'interface g0/1 → ip nat outside' },
      { command: 'ip nat inside source list {acl} interface {int} overload', description: 'PAT overload', example: 'ip nat inside source list 1 interface g0/1 overload' },
      { command: 'show ip nat translations', description: 'Active NAT translation table', example: 'R1# show ip nat translations' },
    ],
    Monitoring: [
      { command: 'show interfaces', description: 'All interface stats and counters', example: 'R1# show interfaces' },
      { command: 'show ip interface brief', description: 'Interface IP and state summary', example: 'R1# show ip interface brief' },
      { command: 'show version', description: 'IOS version, uptime, hardware', example: 'R1# show version' },
      { command: 'show cdp neighbors detail', description: 'Adjacent Cisco devices via CDP', example: 'R1# show cdp neighbors detail' },
    ],
    Troubleshooting: [
      { command: 'ping {host}', description: 'ICMP echo test', example: 'R1# ping 8.8.8.8' },
      { command: 'traceroute {host}', description: 'Hop-by-hop path trace', example: 'R1# traceroute 8.8.8.8' },
      { command: 'debug ip ospf events', description: 'Real-time OSPF debugging', example: 'R1# debug ip ospf events' },
      { command: 'undebug all', description: 'Stop all debug output', example: 'R1# undebug all' },
    ],
  },
  Junos: {
    Routing: [
      { command: 'show route', description: 'Display routing table', example: 'user@R1> show route' },
      { command: 'show ospf neighbor', description: 'OSPF neighbor adjacencies', example: 'user@R1> show ospf neighbor' },
      { command: 'show bgp summary', description: 'BGP peer summary', example: 'user@R1> show bgp summary' },
    ],
    Monitoring: [
      { command: 'show interfaces terse', description: 'Interface status summary', example: 'user@R1> show interfaces terse' },
      { command: 'show version', description: 'Junos version info', example: 'user@R1> show version' },
    ],
  },
  FortiOS: {
    Routing: [
      { command: 'get router info routing-table all', description: 'Full routing table', example: 'FG# get router info routing-table all' },
    ],
    Monitoring: [
      { command: 'get system status', description: 'FortiOS version and status', example: 'FG# get system status' },
      { command: 'diagnose sys session list', description: 'Active firewall sessions', example: 'FG# diagnose sys session list' },
      { command: 'get system interface physical', description: 'Physical interface status', example: 'FG# get system interface physical' },
    ],
    Troubleshooting: [
      { command: 'diagnose debug flow trace start 100', description: 'Packet flow debug', example: 'FG# diagnose debug flow trace start 100' },
      { command: 'diagnose debug disable', description: 'Stop all debug output', example: 'FG# diagnose debug disable' },
    ],
  },
  Linux: {
    Routing: [
      { command: 'ip route show', description: 'Display kernel routing table', example: '$ ip route show' },
      { command: 'ip route add {net}/{pfx} via {gw}', description: 'Add static route', example: 'ip route add 10.0.0.0/8 via 192.168.1.1' },
    ],
    Monitoring: [
      { command: 'ip addr show', description: 'All interfaces and IP addresses', example: '$ ip addr show' },
      { command: 'ss -tulnp', description: 'Listening ports and processes', example: '$ ss -tulnp' },
    ],
    Troubleshooting: [
      { command: 'ping -c 4 {host}', description: 'ICMP echo test (4 packets)', example: '$ ping -c 4 8.8.8.8' },
      { command: 'traceroute {host}', description: 'Path trace', example: '$ traceroute 8.8.8.8' },
      { command: 'tcpdump -i {int} -n', description: 'Capture packets on interface', example: '$ tcpdump -i eth0 -n' },
    ],
  },
}

const FLASH_CARDS = [
  { front: 'OSPF AD value?', back: '110 (Internal)' },
  { front: 'EIGRP AD value?', back: '90 (internal), 170 (external)' },
  { front: 'RIP AD value?', back: '120' },
  { front: 'BGP AD value?', back: '20 (eBGP), 200 (iBGP)' },
  { front: 'OSPF Hello/Dead timers?', back: '10s / 40s (broadcast), 30s / 120s (NBMA)' },
  { front: 'EIGRP Hello/Hold timers?', back: '5s / 15s (broadcast), 60s / 180s (T1 or slower)' },
  { front: 'VLAN range (normal)?', back: '1 – 1005' },
  { front: 'VLAN range (extended)?', back: '1006 – 4094' },
  { front: 'What is STP port priority default?', back: '128' },
  { front: 'PAT uses what for multiplexing?', back: 'Port numbers (Layer 4)' },
  { front: 'NAT Inside Local?', back: 'Private IP of inside host' },
  { front: 'NAT Inside Global?', back: 'Public IP used after translation' },
]

const VENDORS: Vendor[] = ['Cisco IOS', 'Junos', 'FortiOS', 'Linux']
const CATEGORIES: RefCategory[] = ['Routing', 'Switching', 'VLANs', 'ACL', 'NAT', 'Monitoring', 'Troubleshooting']

function FlashCard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <motion.div
      onClick={() => setFlipped(f => !f)}
      className="cursor-pointer rounded border border-border-default p-4 flex items-center justify-center text-center min-h-[100px]"
      style={{ background: flipped ? 'rgba(94,196,255,0.08)' : '#0f1117', perspective: 400 }}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: 0.35 }}
    >
      {!flipped ? (
        <span className="text-sm text-text-primary font-medium">{front}</span>
      ) : (
        <span className="text-sm font-mono-code" style={{ color: '#5ec4ff', transform: 'rotateY(180deg)', display: 'block' }}>{back}</span>
      )}
    </motion.div>
  )
}

export default function ReferenceView() {
  const [vendor, setVendor]       = useState<Vendor>('Cisco IOS')
  const [category, setCategory]   = useState<RefCategory>('Routing')
  const [search, setSearch]       = useState('')
  const [tab, setTab]             = useState<'commands' | 'flashcards'>('commands')

  const vendorData = REFERENCE[vendor] ?? {}
  const catData = (vendorData[category] ?? []).filter(c =>
    !search || c.command.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full">
      {/* Left — vendor + category tree */}
      <div className="w-52 shrink-0 flex flex-col border-r border-border-subtle pt-4">
        <div className="px-3 mb-2">
          <span className="text-2xs text-text-muted uppercase tracking-wider">Vendor</span>
        </div>
        {VENDORS.map(v => (
          <button
            key={v}
            onClick={() => setVendor(v)}
            className="px-4 py-2 text-sm text-left transition-colors"
            style={vendor === v ? { color: '#5ec4ff', borderLeft: '2px solid #5ec4ff', paddingLeft: 14 } : { color: '#8b949e' }}
          >
            {v}
          </button>
        ))}

        <div className="px-3 mt-4 mb-2">
          <span className="text-2xs text-text-muted uppercase tracking-wider">Category</span>
        </div>
        {CATEGORIES.filter(c => vendorData[c]).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-2 text-sm text-left transition-colors"
            style={category === c ? { color: '#5ec4ff' } : { color: '#8b949e' }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Right — content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs + search */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border-subtle shrink-0">
          <div className="flex gap-2">
            {(['commands', 'flashcards'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-xs px-3 py-1.5 rounded capitalize transition-colors"
                style={tab === t
                  ? { background: 'rgba(94,196,255,0.1)', color: '#5ec4ff' }
                  : { color: '#8b949e' }}
              >
                {t === 'commands' ? 'Command Table' : 'Quick Cards'}
              </button>
            ))}
          </div>
          {tab === 'commands' && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 max-w-xs px-3 py-1.5 rounded text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
            />
          )}
        </div>

        {tab === 'commands' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              {vendor} — {category}
              <span className="ml-2 text-2xs text-text-muted">({catData.length} commands)</span>
            </h3>
            {catData.length === 0 && (
              <p className="text-sm text-text-muted">No commands found.</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border-subtle">
                    <th className="pb-2 text-xs text-text-muted font-medium w-2/5">Command</th>
                    <th className="pb-2 text-xs text-text-muted font-medium w-2/5">Description</th>
                    <th className="pb-2 text-xs text-text-muted font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {catData.map((cmd, i) => (
                    <tr key={i} className="border-b border-border-subtle last:border-0">
                      <td className="py-2.5 pr-4">
                        <code className="text-sm font-mono-code" style={{ color: '#5ec4ff' }}>{cmd.command}</code>
                      </td>
                      <td className="py-2.5 pr-4 text-text-secondary text-sm">{cmd.description}</td>
                      <td className="py-2.5">
                        {cmd.example && (
                          <code className="text-xs font-mono-code text-text-muted">{cmd.example}</code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-xs text-text-muted mb-4">Click a card to flip it and reveal the answer.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {FLASH_CARDS.map((card, i) => (
                <FlashCard key={i} front={card.front} back={card.back} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
