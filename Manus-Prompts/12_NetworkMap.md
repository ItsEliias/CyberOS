# MANUS PROMPT — NetworkMap
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for NetworkMap. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS NETWORKMAP?

NetworkMap is the **visual network topology mapper**. It parses nmap XML scan output and renders an interactive SVG force-directed graph where nodes are hosts and edges represent inferred network relationships. The operator can explore the network, inspect host details, and export the visualization.

Think: Maltego meets Grafana, in dark mode, purpose-built for a pentester.

**Accent color:** `#d29922` (Amber)

---

## TECHNICAL ARCHITECTURE

### Graph rendering: SVG + D3 force simulation

Do NOT use a pre-built graph library. Render directly to SVG using D3's force simulation:

```typescript
import * as d3 from 'd3'

// Force simulation with:
// - forceManyBody (repulsion, strength: -300)
// - forceLink (spring tension between connected nodes)
// - forceCenter (pull to SVG center)
// - forceCollide (prevent node overlap)
// Run 200 iterations on initial layout
// After: user can drag nodes (positions preserved)
```

### nmap XML parser

**Do NOT use an external XML library.** Parse using the browser's built-in `DOMParser`:

```typescript
const parser = new DOMParser()
const xmlDoc = parser.parseFromString(nmapXml, 'text/xml')

// Extract from:
// //host elements → one node per host
// //host/address[@addrtype="ipv4"] → IP
// //host/hostnames/hostname/@name → hostname
// //host/os/osmatch/@name → OS guess
// //host/ports/port[@protocol][@portid] → ports
// //host/ports/port/state/@state → "open"/"filtered"/"closed"
// //host/ports/port/service/@name → service name
// //host/ports/port/service/@version → version string

// Only include hosts with at least 1 open port
// Handle malformed XML with try/catch
```

### Node coloring by open port count
```
0 ports: #484f58 (text-muted grey)
1–2 ports: #3fb950 (success green)  
3–5 ports: #d29922 (accent amber)
6+ ports:  #f85149 (danger red)
```

### Pan and zoom
- Pan: drag the SVG background
- Zoom: scroll wheel (0.3× to 3.0×)
- Node drag: drag individual nodes to reposition (breaks out of force simulation for that node)

---

## DATA MODEL

```typescript
interface NetworkGraph {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: {
    scanDate?: string;
    subnet?: string;
    importSource: 'nmap-xml' | 'paste' | 'recondesk';
  };
}

interface NetworkNode {
  id: string;
  ip: string;
  hostname?: string;
  os?: string;
  ports: NodePort[];
  openPortCount: number;
  // D3 simulation positions (mutable)
  x?: number;
  y?: number;
  fx?: number | null;   // fixed x (when dragged)
  fy?: number | null;   // fixed y (when dragged)
}

interface NodePort {
  port: number;
  protocol: string;
  service: string;
  version?: string;
  state: 'open' | 'filtered' | 'closed';
}

interface NetworkEdge {
  id: string;
  source: string;   // node ID
  target: string;   // node ID
  type: 'inferred' | 'manual';
}
```

**Edge inference logic:**
- Nodes on the same /24 subnet are connected (inferred relationship)
- If a node has SMB (445) and another has AD ports (88, 389), connect them
- Nodes with services that imply client-server relationships

---

## SCREENS TO BUILD

### Screen 1: Graph View (Primary / Default)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●●●] 🗺 NetworkMap    [Graphs ▾] [Import ▾] [Export SVG] [?]  │
├────────────────────────────────────────────────────────────────── │
│  SIDEBAR (260px)          │  SVG GRAPH CANVAS (flex-1)           │
│                           │                                      │
│  GRAPH INFO               │  ┌────────────────────────────────┐  │
│  Pickle Rick Scan         │  │                                │  │
│  2026-06-03 • 4 nodes     │  │  [Interactive SVG graph]       │  │
│                           │  │                                │  │
│  FILTERS                  │  │  ●──────────●                  │  │
│  Min ports: [0 ──●────ₙ]  │  │  │          │                  │  │
│  Services: [All ▾]        │  │  ●          ●──────●           │  │
│                           │  │         [large red]            │  │
│  LEGEND                   │  │                                │  │
│  ● 1-2 ports (green)      │  │                                │  │
│  ● 3-5 ports (amber)      │  └────────────────────────────────┘  │
│  ● 6+ ports (red)         │                                      │
│  ● Unresponsive (grey)    │  [+] [-] [⟳ Reset View] [⊞ Fit]    │
│                           │  (zoom controls — bottom left)       │
│  GRAPH LIBRARY            │                                      │
│  ○ Pickle Rick Scan       │                                      │
│  ○ Blue Machine Scan      │                                      │
│  [+ New]                  │                                      │
└───────────────────────────┴──────────────────────────────────────┘
│  NetworkMap • Pickle Rick Scan • 4 nodes • 5 edges               │
└──────────────────────────────────────────────────────────────────┘
```

**SVG Graph Canvas:**
- Full-size SVG element that fills the right panel
- Dark background (`bg-surface`)
- Nodes: circles, radius proportional to open port count (min 12px, max 28px)
- Node color: by open port count (see coloring rules above)
- Node labels: IP below node, hostname in smaller text below IP
- Edges: lines between connected nodes, `stroke: border-default`, width 1.5px
- Hover node: node brightens + tooltip appears (IP, hostname, port count)
- Click node: opens Node Detail Panel (right side or inline)

**Zoom controls (bottom-left of canvas):**
- [+] Zoom in
- [-] Zoom out
- [⟳ Reset] — return to initial position/zoom
- [⊞ Fit] — fit all nodes in viewport

**Sidebar — Filters:**
- Min ports slider: filter out nodes with fewer than N open ports (0 = show all)
- Services filter: dropdown to show only nodes with a specific service (http, smb, ssh, etc.)
- Filtered-out nodes: fade to 20% opacity, don't remove (so layout doesn't shift)

**Sidebar — Graph library:**
- List of all saved graphs
- Click to load
- Active graph: amber left border
- Delete button per graph

---

### Screen 2: Node Detail Panel

Opens when clicking a node. Right-aligned panel (320px) that slides in over the canvas.

```
┌──────────────────────────────────────────────┐
│  Host: 10.10.3.164                  [✕]      │
│  pickle.thm.labs                             │
│  OS: Linux 4.x                              │
├──────────────────────────────────────────────┤
│  OPEN PORTS (5)                             │
│                                             │
│  PORT    SERVICE         STATE             │
│   22/tcp  ssh            open  ●           │
│   80/tcp  http (Apache)  open  ●           │
│  443/tcp  https          open  ●           │
│ 8080/tcp  http-alt       open  ●           │
│  445/tcp  microsoft-ds   open  ●           │
│                                             │
├──────────────────────────────────────────────┤
│  [📋 Copy IP]                               │
│  [→ Open in ReconDesk]                     │
│  [+ Add to ReconDesk target]               │
└──────────────────────────────────────────────┘
```

- Port table: port (monospace), service, state colored dot
- "Copy IP" button
- "Open in ReconDesk" — if this IP matches an existing ReconDesk target, open it
- "Add to ReconDesk target" — adds these ports to the active ReconDesk target

---

### Screen 3: Import Modal

Accessed from the [Import ▾] button in the title bar.

**Three import methods shown as tabs:**

**Tab 1: Import nmap XML File**
```
[Select nmap XML file...]   ← file picker dialog

OR drag & drop here

Preview: [after file selected]
✓ Found 4 hosts
✓ Found 18 open ports
✗ 2 hosts with no open ports (excluded)
[Import (4 nodes)]
```

**Tab 2: Paste XML**
```
Paste nmap XML output (-oX format):
┌────────────────────────────────────────┐
│ <?xml version="1.0"...                │
│ <nmaprun ...>                         │
│ [scrollable textarea]                 │
└────────────────────────────────────────┘
[Parse →]   [Preview: 4 nodes found]   [Import]
```

**Tab 3: Import from ReconDesk**
```
Import ports for the active ReconDesk target:

Target: Pickle Rick (10.10.3.164)   ← from shared_context

Ports available: 5 open ports
[22/tcp ssh] [80/tcp http] [443/tcp https]
[8080/tcp http-alt] [445/tcp microsoft-ds]

This will create a single-node graph.
[Import from ReconDesk]
```

After import: show "Save graph as:" text input with a default name, then [Save].

---

### Screen 4: Graph Library

Full-page list of all saved graphs. Alternative to the sidebar library list.

**Table:**
| Name | Import Source | Date | Nodes | Edges | Actions |
|---|---|---|---|---|---|
| Pickle Rick Scan | nmap-xml | 2026-06-03 | 4 | 5 | Open / Delete |
| Blue Machine Scan | nmap-xml | 2026-06-02 | 1 | 0 | Open / Delete |

- Click row or "Open" → loads graph
- Delete with confirmation
- Empty state if no graphs saved

---

### Screen 5: Settings

**Display:**
- Node label: IP only / IP + hostname / hostname only
- Edge type display: show/hide inferred edges
- Animation: enable/disable force simulation animation

**Import:**
- Default graph name format: date-based / target-based
- Auto-import from ReconDesk when target changes (toggle)

---

## ZUSTAND STORE

```typescript
interface NetworkMapState {
  graphs: NetworkGraph[];
  activeGraphId: string | null;
  
  // Active graph derived data (computed from activeGraph.nodes/edges + D3)
  simulationReady: boolean;
  
  // Selected node
  selectedNodeId: string | null;
  
  // UI
  activeView: 'graph' | 'library' | 'settings';
  importModalOpen: boolean;
  importTab: 'file' | 'paste' | 'recondesk';
  
  // Filters
  minPorts: number;
  serviceFilter: string | null;
  
  // Viewport
  transform: { x: number; y: number; scale: number };
  
  // Ecosystem
  sharedContext: SharedContext | null;
  
  // Actions
  loadGraphs: () => Promise<void>;
  saveGraphs: () => Promise<void>;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;
  saveCurrentGraph: (name: string) => void;
  
  importFromNmapXml: (xml: string) => { nodes: NetworkNode[]; edges: NetworkEdge[]; errors: string[] };
  importFromReconDesk: () => Promise<void>;
  
  selectNode: (id: string | null) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  releaseNode: (id: string) => void;  // un-fix position (allow force sim to move it again)
  
  setMinPorts: (n: number) => void;
  setServiceFilter: (service: string | null) => void;
  setTransform: (t: NetworkMapState['transform']) => void;
  resetView: () => void;
  
  exportSVG: () => Promise<void>;
  
  loadSharedContext: () => Promise<void>;
  writeStatus: () => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
}
```

---

## IPC HANDLERS

```typescript
ipcMain.handle('networkmap:graphs:read', async () => { /* read from app data */ })
ipcMain.handle('networkmap:graphs:write', async (_, graphs) => { /* atomic write */ })
ipcMain.handle('networkmap:config:read', async () => { /* read shared_context + recondesk ports from config */ })
ipcMain.handle('networkmap:config:write', async (_, patch) => { /* write networkmap_status */ })
ipcMain.handle('networkmap:xml:import-file', async () => {
  // Show open file dialog (filter: .xml)
  // Read file content
  // Return: { content: string }
})
ipcMain.handle('networkmap:export:svg', async (_, svgContent: string) => {
  // Show save dialog
  // Write SVG file
})
ipcMain.handle('networkmap:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
```

---

## COMPONENT ARCHITECTURE

```
src/
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── graph/
│   │   │   ├── GraphCanvas.tsx        # SVG element + D3 simulation
│   │   │   ├── GraphNode.tsx          # Individual SVG node (circle + label)
│   │   │   ├── GraphEdge.tsx          # Individual SVG edge (line)
│   │   │   ├── NodeDetailPanel.tsx    # Slide-in detail panel
│   │   │   ├── ZoomControls.tsx       # +/-/reset/fit buttons
│   │   │   └── GraphLegend.tsx
│   │   ├── library/
│   │   │   └── GraphLibrary.tsx
│   │   └── import/
│   │       ├── ImportModal.tsx
│   │       ├── ImportFileTab.tsx
│   │       ├── ImportPasteTab.tsx
│   │       └── ImportRecondeskTab.tsx
│   ├── stores/
│   │   └── useNetworkMapStore.ts
│   ├── hooks/
│   │   ├── useForceSimulation.ts      # D3 force simulation management
│   │   └── usePanZoom.ts              # Pan and zoom interaction handling
│   ├── utils/
│   │   ├── nmapParser.ts              # nmap XML → NetworkNode[]
│   │   └── edgeInference.ts           # Infer edges from node data
│   └── types/
│       └── networkmap.ts
```

---

## D3 FORCE SIMULATION HOOK

```typescript
// useForceSimulation.ts
export function useForceSimulation(nodes: NetworkNode[], edges: NetworkEdge[]) {
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge>>()
  
  useEffect(() => {
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d: NetworkNode) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))
    
    sim.tick(200)  // Run to equilibrium
    sim.stop()
    
    simulationRef.current = sim
    // Update node positions in store
  }, [/* nodes and edges change */])
  
  return simulationRef
}
```

---

## ANIMATIONS

- **Node detail panel:** slide in from right (250ms)
- **Import modal:** scale + fade in
- **Graph loading:** nodes fade in and "settle" from center (brief simulation run animation, 500ms)
- **Node hover:** scale to 1.1, brightness increase (CSS transition, 100ms)
- **Node click:** selected node gets amber ring (`stroke: #d29922, stroke-width: 2`)
- **Filter change:** filtered nodes fade to 20% opacity (CSS transition, 200ms)

---

## CRITICAL REQUIREMENTS

1. D3 force simulation must run in 200 tick iterations before rendering — do not animate the force layout settling (it looks cheap). Show the graph already settled.
2. nmap XML parser must handle both `<nmaprun>` and `<host>` elements and gracefully skip malformed entries
3. Node dragging must correctly set `fx`/`fy` to pin the node position and `null` on release to unpin
4. Pan and zoom must use SVG `transform` attribute, not CSS transforms (better performance for large graphs)
5. The graph SVG must be exportable as a clean standalone SVG file (strip D3 simulation data, keep only visual elements)
6. For large scans (50+ nodes), the layout must still be usable — enforce minimum node spacing and add zoom-to-fit on initial load
7. When loading a previously saved graph, restore user-dragged node positions (`fx`/`fy`)
8. The nmap parser must only include hosts with at least 1 open port — hosts with only filtered/closed ports are noise

---

## DELIVERABLES

1. All component files
2. Zustand store
3. D3 force simulation hook
4. Pan/zoom hook
5. nmap XML parser utility
6. Edge inference utility
7. IPC handlers
8. Type definitions
9. `IMPLEMENTATION_PLAN.md` for NetworkMap

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
