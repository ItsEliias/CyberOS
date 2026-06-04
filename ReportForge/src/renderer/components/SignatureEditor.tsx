import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import type { ReportSection, SignatureBlock } from '@shared/types';

interface Props {
  section: ReportSection;
}

export default function SignatureEditor({ section }: Props) {
  const { updateSection } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');

  const block: SignatureBlock = section.signatureBlock ?? {
    preparedBy    : '',
    role          : '',
    date          : new Date().toISOString().slice(0, 10),
    signatureData : undefined,
  };

  function patch(p: Partial<SignatureBlock>) {
    updateSection(section.id, { signatureBlock: { ...block, ...p } });
  }

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (block.signatureData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = block.signatureData;
    }
  }, [signMode]);

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function stopDraw() {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current!;
    patch({ signatureData: canvas.toDataURL() });
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    patch({ signatureData: undefined });
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Preview */}
      <SignaturePreview block={block} />

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SF label="Prepared By">
          <input value={block.preparedBy} onChange={e => patch({ preparedBy: e.target.value })} style={{ width: '100%' }} />
        </SF>
        <SF label="Role / Title">
          <input value={block.role} onChange={e => patch({ role: e.target.value })} style={{ width: '100%' }} />
        </SF>
      </div>

      <SF label="Date">
        <input type="date" value={block.date} onChange={e => patch({ date: e.target.value })} style={{ width: 200 }} />
      </SF>

      <SF label="Signature">
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {(['draw', 'type'] as const).map(m => (
            <button
              key={m}
              onClick={() => setSignMode(m)}
              style={{
                padding: '3px 10px', fontSize: 11,
                background: signMode === m ? 'var(--accent)' : 'var(--bg)',
                color: signMode === m ? '#000' : 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
              }}
            >
              {m === 'draw' ? 'Draw' : 'Type'}
            </button>
          ))}
        </div>

        {signMode === 'draw' ? (
          <div>
            <canvas
              ref={canvasRef}
              width={360}
              height={80}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              style={{
                border: '1px solid var(--border)', borderRadius: 4,
                background: '#fff', cursor: 'crosshair', display: 'block',
              }}
            />
            <button
              className="btn-ghost"
              style={{ marginTop: 4, padding: '3px 10px', fontSize: 11 }}
              onClick={clearCanvas}
            >
              Clear
            </button>
          </div>
        ) : (
          <input
            value={block.signatureData?.startsWith('data:') ? '' : (block.signatureData ?? '')}
            onChange={e => patch({ signatureData: e.target.value })}
            placeholder="Type name as signature"
            style={{ width: '100%', fontFamily: 'cursive', fontSize: 18, letterSpacing: '0.03em' }}
          />
        )}
      </SF>
    </div>
  );
}

function SignaturePreview({ block }: { block: SignatureBlock }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 6, padding: '20px 24px', color: '#1a1a1a',
      border: '1px solid var(--border)',
    }}>
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 10, marginTop: 10 }}>
        {block.signatureData ? (
          block.signatureData.startsWith('data:') ? (
            <img src={block.signatureData} alt="signature" style={{ height: 40, marginBottom: 4 }} />
          ) : (
            <div style={{ fontSize: 22, fontFamily: 'cursive', marginBottom: 4 }}>{block.signatureData}</div>
          )
        ) : (
          <div style={{ height: 40, marginBottom: 4 }} />
        )}
        <div style={{ fontSize: 12, fontWeight: 700 }}>{block.preparedBy || 'Name'}</div>
        <div style={{ fontSize: 11, color: '#555' }}>{block.role || 'Role'}</div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{block.date}</div>
      </div>
    </div>
  );
}

function SF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}
