import { useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { extractWikiLinks } from '../lib/markdown';
import HelpTip from './ui/HelpTip';
import type { NoteFile } from '@shared/types';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  links: number;
}

interface Edge {
  source: string;
  target: string;
}

interface Props {
  onOpenNote: (note: NoteFile) => void;
}

function buildGraph(notes: NoteFile[], contents: Map<string, string>): { nodes: Node[]; edges: Edge[] } {
  const linkCount: Record<string, number> = {};
  const edges: Edge[] = [];

  for (const note of notes) {
    const content = contents.get(note.path) || '';
    const wikiLinks = extractWikiLinks(content);
    for (const target of wikiLinks) {
      edges.push({ source: note.name, target });
      linkCount[note.name] = (linkCount[note.name] || 0) + 1;
      linkCount[target] = (linkCount[target] || 0) + 1;
    }
  }

  const nodeSet = new Set<string>();
  for (const note of notes) nodeSet.add(note.name);
  for (const e of edges) { nodeSet.add(e.source); nodeSet.add(e.target); }

  const nodes: Node[] = [...nodeSet].map((id, i) => ({
    id,
    label: id,
    x: Math.cos((i / nodeSet.size) * 2 * Math.PI) * 200 + 400,
    y: Math.sin((i / nodeSet.size) * 2 * Math.PI) * 200 + 300,
    vx: 0, vy: 0,
    links: linkCount[id] || 0,
  }));

  return { nodes, edges };
}

function simulate(nodes: Node[], edges: Edge[], iter: number): Node[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (let t = 0; t < iter; t++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 3000 / (dist * dist);
        a.vx -= dx / dist * force;
        a.vy -= dy / dist * force;
        b.vx += dx / dist * force;
        b.vy += dy / dist * force;
      }
    }
    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.05;
      a.vx += dx / dist * force;
      a.vy += dy / dist * force;
      b.vx -= dx / dist * force;
      b.vy -= dy / dist * force;
    }
    // Center pull
    for (const n of nodes) {
      n.vx += (400 - n.x) * 0.002;
      n.vy += (300 - n.y) * 0.002;
      n.x += n.vx * 0.9;
      n.y += n.vy * 0.9;
      n.vx *= 0.85;
      n.vy *= 0.85;
    }
  }
  return nodes;
}

export default function GraphView({ onOpenNote }: Props) {
  const { notes, activeNote } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const contentsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    async function loadContents() {
      for (const note of notes) {
        if (!contentsRef.current.has(note.path)) {
          try {
            const c = await window.ghostvault.readNote(note.path);
            contentsRef.current.set(note.path, c);
          } catch { /* skip */ }
        }
      }
    }
    loadContents();
  }, [notes]);

  const { nodes: rawNodes, edges } = useMemo(
    () => buildGraph(notes, contentsRef.current),
    [notes]
  );

  const nodes = useMemo(() => simulate([...rawNodes], edges, 80), [rawNodes, edges]);

  function handleNodeClick(nodeId: string) {
    const note = notes.find(n => n.name === nodeId);
    if (note) onOpenNote(note);
  }

  const maxLinks = Math.max(1, ...nodes.map(n => n.links));

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-3">
        <div className="text-4xl opacity-20">◎</div>
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No notes to graph</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>Graph View</span>
        <HelpTip
          title="Graph view"
          body="Visualises wikilinks between notes. Each node is a note; edges are [[wikilinks]]. Bigger nodes have more connections. Click any node to jump to that note."
        />
        <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          {nodes.length} nodes · {edges.length} connections
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Click a node to open note
        </span>
      </div>
      <svg ref={svgRef} className="flex-1 w-full" style={{ background: 'var(--bg)' }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(123,184,255,0.3)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const src = nodes.find(n => n.id === e.source);
          const tgt = nodes.find(n => n.id === e.target);
          if (!src || !tgt) return null;
          return (
            <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
              stroke="rgba(123,184,255,0.25)" strokeWidth="1" markerEnd="url(#arrow)" />
          );
        })}
        {nodes.map(n => {
          const r = 8 + (n.links / maxLinks) * 14;
          const isActive = activeNote?.name === n.id;
          return (
            <g key={n.id} onClick={() => handleNodeClick(n.id)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={r}
                fill={isActive ? '#7bb8ff' : 'rgba(123,184,255,0.2)'}
                stroke={isActive ? '#fff' : '#7bb8ff'}
                strokeWidth={isActive ? 2 : 1}
              />
              <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                fontSize="10" fill="var(--text-muted)" fontFamily="Inter, sans-serif">
                {n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
