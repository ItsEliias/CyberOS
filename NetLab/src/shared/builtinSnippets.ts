import type { CommandSnippet } from './types'

export const BUILTIN_SNIPPETS: CommandSnippet[] = [
  // ─── Cisco Routing ────────────────────────────────────────────────────────
  { id: 'cr-01', title: 'Show routing table', command: 'show ip route', category: 'Cisco Routing', description: 'Display the full IPv4 routing table.' },
  { id: 'cr-02', title: 'Show specific route', command: 'show ip route {network}', category: 'Cisco Routing', description: 'Show routing table entry for a specific network.', variables: ['{network}'] },
  { id: 'cr-03', title: 'OSPF neighbors', command: 'show ip ospf neighbor', category: 'Cisco Routing', description: 'List all OSPF neighbors and their state.' },
  { id: 'cr-04', title: 'OSPF database', command: 'show ip ospf database', category: 'Cisco Routing', description: 'Display the OSPF LSDB.' },
  { id: 'cr-05', title: 'EIGRP neighbors', command: 'show ip eigrp neighbors', category: 'Cisco Routing', description: 'List all EIGRP neighbors.' },
  { id: 'cr-06', title: 'EIGRP topology', command: 'show ip eigrp topology', category: 'Cisco Routing', description: 'Show EIGRP topology table (successors and FSs).' },
  { id: 'cr-07', title: 'Configure OSPF area 0', command: 'router ospf 1\nnetwork {network} {wildcard} area 0', category: 'Cisco Routing', description: 'Enable OSPF process and advertise a network.', variables: ['{network}', '{wildcard}'] },
  { id: 'cr-08', title: 'Configure EIGRP', command: 'router eigrp {asn}\nnetwork {network}\nno auto-summary', category: 'Cisco Routing', description: 'Enable EIGRP with given AS number.', variables: ['{asn}', '{network}'] },
  { id: 'cr-09', title: 'Static route', command: 'ip route {network} {mask} {next-hop}', category: 'Cisco Routing', description: 'Add a static route.', variables: ['{network}', '{mask}', '{next-hop}'] },
  { id: 'cr-10', title: 'Default route', command: 'ip route 0.0.0.0 0.0.0.0 {gateway}', category: 'Cisco Routing', description: 'Configure a default route (gateway of last resort).', variables: ['{gateway}'] },
  { id: 'cr-11', title: 'BGP configure', command: 'router bgp {asn}\nneighbor {peer-ip} remote-as {remote-asn}\nnetwork {network} mask {mask}', category: 'Cisco Routing', description: 'Basic BGP peer configuration.', variables: ['{asn}', '{peer-ip}', '{remote-asn}', '{network}', '{mask}'] },
  { id: 'cr-12', title: 'BGP neighbors', command: 'show bgp summary', category: 'Cisco Routing', description: 'Show BGP neighbor summary and state.' },

  // ─── Cisco Switching ──────────────────────────────────────────────────────
  { id: 'cs-01', title: 'Show VLANs', command: 'show vlan brief', category: 'Cisco Switching', description: 'List all VLANs and port assignments.' },
  { id: 'cs-02', title: 'Show spanning tree', command: 'show spanning-tree', category: 'Cisco Switching', description: 'Show STP topology for all VLANs.' },
  { id: 'cs-03', title: 'Show spanning tree VLAN', command: 'show spanning-tree vlan {vlan-id}', category: 'Cisco Switching', description: 'Show STP for specific VLAN.', variables: ['{vlan-id}'] },
  { id: 'cs-04', title: 'Show EtherChannel', command: 'show etherchannel summary', category: 'Cisco Switching', description: 'Show EtherChannel bundle status.' },
  { id: 'cs-05', title: 'Create VLAN', command: 'vlan {vlan-id}\nname {name}', category: 'Cisco Switching', description: 'Create a VLAN and assign it a name.', variables: ['{vlan-id}', '{name}'] },
  { id: 'cs-06', title: 'Access port', command: 'interface {int}\nswitchport mode access\nswitchport access vlan {vlan-id}', category: 'Cisco Switching', description: 'Configure a port as access and assign to VLAN.', variables: ['{int}', '{vlan-id}'] },
  { id: 'cs-07', title: 'Trunk port', command: 'interface {int}\nswitchport mode trunk\nswitchport trunk encapsulation dot1q', category: 'Cisco Switching', description: 'Configure a trunk port.', variables: ['{int}'] },
  { id: 'cs-08', title: 'VTP server', command: 'vtp mode server\nvtp domain {domain}\nvtp password {password}', category: 'Cisco Switching', description: 'Configure VTP server mode.', variables: ['{domain}', '{password}'] },
  { id: 'cs-09', title: 'MAC address table', command: 'show mac address-table', category: 'Cisco Switching', description: 'Show learned MAC addresses.' },
  { id: 'cs-10', title: 'Port security', command: 'switchport port-security\nswitchport port-security maximum {max}\nswitchport port-security violation {action}\nswitchport port-security mac-address sticky', category: 'Cisco Switching', description: 'Enable port security with sticky MACs.', variables: ['{max}', '{action}'] },

  // ─── ACL ──────────────────────────────────────────────────────────────────
  { id: 'acl-01', title: 'Show access lists', command: 'show access-lists', category: 'ACL', description: 'Display all configured ACLs and match counts.' },
  { id: 'acl-02', title: 'Standard ACL permit', command: 'access-list {1-99} permit {network} {wildcard}', category: 'ACL', description: 'Permit a source network in a standard ACL.', variables: ['{1-99}', '{network}', '{wildcard}'] },
  { id: 'acl-03', title: 'Standard ACL deny', command: 'access-list {1-99} deny {network} {wildcard}', category: 'ACL', description: 'Deny a source network in a standard ACL.', variables: ['{1-99}', '{network}', '{wildcard}'] },
  { id: 'acl-04', title: 'Named extended ACL', command: 'ip access-list extended {name}\ndeny tcp {src} {src-wild} {dst} {dst-wild} eq {port}\npermit ip any any', category: 'ACL', description: 'Create a named extended ACL.', variables: ['{name}', '{src}', '{src-wild}', '{dst}', '{dst-wild}', '{port}'] },
  { id: 'acl-05', title: 'Apply ACL inbound', command: 'interface {int}\nip access-group {name} in', category: 'ACL', description: 'Apply ACL inbound on an interface.', variables: ['{int}', '{name}'] },
  { id: 'acl-06', title: 'Apply ACL outbound', command: 'interface {int}\nip access-group {name} out', category: 'ACL', description: 'Apply ACL outbound on an interface.', variables: ['{int}', '{name}'] },

  // ─── NAT ──────────────────────────────────────────────────────────────────
  { id: 'nat-01', title: 'Show NAT translations', command: 'show ip nat translations', category: 'NAT', description: 'Display active NAT translation table.' },
  { id: 'nat-02', title: 'Show NAT statistics', command: 'show ip nat statistics', category: 'NAT', description: 'NAT translation statistics and hit/miss counts.' },
  { id: 'nat-03', title: 'PAT overload', command: 'ip nat inside source list {acl} interface {int} overload', category: 'NAT', description: 'Configure PAT using the outside interface IP.', variables: ['{acl}', '{int}'] },
  { id: 'nat-04', title: 'Static NAT', command: 'ip nat inside source static {inside-local} {inside-global}', category: 'NAT', description: 'Map a specific inside IP to a specific public IP.', variables: ['{inside-local}', '{inside-global}'] },
  { id: 'nat-05', title: 'NAT inside/outside', command: 'interface {int}\nip nat inside\ninterface {ext-int}\nip nat outside', category: 'NAT', description: 'Mark inside and outside NAT interfaces.', variables: ['{int}', '{ext-int}'] },
  { id: 'nat-06', title: 'Clear NAT translations', command: 'clear ip nat translation *', category: 'NAT', description: 'Flush all NAT translation entries.' },

  // ─── Linux Networking ─────────────────────────────────────────────────────
  { id: 'ln-01', title: 'Show interfaces', command: 'ip addr show', category: 'Linux Networking', description: 'List all network interfaces and IP addresses.' },
  { id: 'ln-02', title: 'Show routing table', command: 'ip route show', category: 'Linux Networking', description: 'Display the Linux kernel routing table.' },
  { id: 'ln-03', title: 'Add static route', command: 'ip route add {network}/{prefix} via {gateway}', category: 'Linux Networking', description: 'Add a static route.', variables: ['{network}', '{prefix}', '{gateway}'] },
  { id: 'ln-04', title: 'Show listening ports', command: 'ss -tulnp', category: 'Linux Networking', description: 'Show all listening TCP/UDP ports and their processes.' },
  { id: 'ln-05', title: 'iptables list rules', command: 'iptables -L -n -v', category: 'Linux Networking', description: 'List all iptables rules with packet counts.' },
  { id: 'ln-06', title: 'iptables block port', command: 'iptables -A INPUT -p tcp --dport {port} -j DROP', category: 'Linux Networking', description: 'Block incoming traffic on a specific port.', variables: ['{port}'] },
  { id: 'ln-07', title: 'traceroute', command: 'traceroute {host}', category: 'Linux Networking', description: 'Trace the route to a remote host.', variables: ['{host}'] },
  { id: 'ln-08', title: 'DNS lookup', command: 'dig {hostname} @{dns-server}', category: 'Linux Networking', description: 'Perform a DNS lookup against a specific server.', variables: ['{hostname}', '{dns-server}'] },
  { id: 'ln-09', title: 'Set interface IP', command: 'ip addr add {ip}/{prefix} dev {interface}', category: 'Linux Networking', description: 'Assign an IP address to an interface.', variables: ['{ip}', '{prefix}', '{interface}'] },
  { id: 'ln-10', title: 'Enable IP forwarding', command: 'echo 1 > /proc/sys/net/ipv4/ip_forward', category: 'Linux Networking', description: 'Enable packet forwarding (routing) on Linux.' },

  // ─── FortiGate ────────────────────────────────────────────────────────────
  { id: 'fg-01', title: 'System status', command: 'get system status', category: 'FortiGate', description: 'Show FortiGate firmware version and system info.' },
  { id: 'fg-02', title: 'Show full config', command: 'show full-configuration', category: 'FortiGate', description: 'Display complete FortiOS configuration.' },
  { id: 'fg-03', title: 'Firewall policy config', command: 'config firewall policy\nedit {id}\nset name {name}\nset srcintf {int}\nset dstintf {int}\nset srcaddr all\nset dstaddr all\nset action accept\nnext\nend', category: 'FortiGate', description: 'Create a firewall policy.', variables: ['{id}', '{name}', '{int}'] },
  { id: 'fg-04', title: 'Session list', command: 'diagnose sys session list', category: 'FortiGate', description: 'List active firewall sessions.' },
  { id: 'fg-05', title: 'Interface status', command: 'get system interface physical', category: 'FortiGate', description: 'Show physical interface status and IPs.' },
  { id: 'fg-06', title: 'Routing table', command: 'get router info routing-table all', category: 'FortiGate', description: 'Display the FortiGate routing table.' },

  // ─── Verification ─────────────────────────────────────────────────────────
  { id: 'v-01', title: 'Ping', command: 'ping {host}', category: 'Verification', description: 'Test reachability to a host.', variables: ['{host}'] },
  { id: 'v-02', title: 'Extended ping', command: 'ping {host} source {source-int} repeat 100', category: 'Verification', description: 'Ping with specific source and repeat count.', variables: ['{host}', '{source-int}'] },
  { id: 'v-03', title: 'Traceroute', command: 'traceroute {host}', category: 'Verification', description: 'Trace route to a destination.', variables: ['{host}'] },
  { id: 'v-04', title: 'Show interfaces', command: 'show interfaces', category: 'Verification', description: 'Show all interface stats, errors, and status.' },
  { id: 'v-05', title: 'Interface brief', command: 'show ip interface brief', category: 'Verification', description: 'Quick view of all interface IPs and states.' },
  { id: 'v-06', title: 'Debug OSPF events', command: 'debug ip ospf events', category: 'Verification', description: 'Real-time OSPF event debugging. Use "undebug all" to stop.' },
  { id: 'v-07', title: 'Disable all debug', command: 'undebug all', category: 'Verification', description: 'Stop all active debug output.' },
  { id: 'v-08', title: 'Show CDP neighbors', command: 'show cdp neighbors detail', category: 'Verification', description: 'List directly connected Cisco devices via CDP.' },
  { id: 'v-09', title: 'Show LLDP neighbors', command: 'show lldp neighbors detail', category: 'Verification', description: 'List LLDP neighbors (multi-vendor).' },
  { id: 'v-10', title: 'Show ARP table', command: 'show arp', category: 'Verification', description: 'Display the ARP cache.' },
]
