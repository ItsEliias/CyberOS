import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

type Tool = 'arrow' | 'rect' | 'draw' | 'text';

interface AnnotatorProps {
  imageBase64: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const COLORS = ['#f85149', '#d29922', '#3fb950', '#4a9eff', '#b44fff'];

function AnnotationCanvas({ imageBase64, onSave, onClose }: AnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('arrow');
  const [color, setColor] = useState('#f85149');
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    };
    img.src = `data:image/png;base64,${imageBase64}`;
  }, [imageBase64]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / r.width;
    const scaleY = canvasRef.current!.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function saveHistory() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) historyRef.current.shift();
  }

  function undo() {
    if (historyRef.current.length < 2) return;
    historyRef.current.pop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool === 'text') {
      setTextPos(getPos(e));
      return;
    }
    setDrawing(true);
    setStartPos(getPos(e));
    saveHistory();
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || tool === 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cur = getPos(e);

    if (tool === 'draw') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      setStartPos(cur);
    }
    if (tool === 'arrow' || tool === 'rect') {
      // Preview — restore last history frame then redraw
      ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, cur.x - startPos.x, cur.y - startPos.y);
      } else {
        drawArrow(ctx, startPos, cur, color);
      }
    }
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || tool === 'text') return;
    setDrawing(false);
    const cur = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (tool === 'arrow') drawArrow(ctx, startPos, cur, color);
    if (tool === 'rect') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(startPos.x, startPos.y, cur.x - startPos.x, cur.y - startPos.y);
    }
    saveHistory();
  }

  function drawArrow(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, c: string) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const len = 16;
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - len * Math.cos(angle - Math.PI / 7), to.y - len * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(to.x - len * Math.cos(angle + Math.PI / 7), to.y - len * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  function commitText() {
    if (!textInput.trim() || !textPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    saveHistory();
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(textInput, textPos.x, textPos.y);
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput('');
    setTextPos(null);
    saveHistory();
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Annotate Screenshot</span>
        <div className="flex gap-1">
          {(['arrow', 'rect', 'draw', 'text'] as Tool[]).map(t => (
            <button key={t} onClick={() => setTool(t)}
              className="text-[10px] px-2 py-1 rounded capitalize transition-colors"
              style={{ background: tool === t ? 'var(--accent)' : 'var(--bg3)', color: tool === t ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
          ))}
        </div>
        <button onClick={undo} className="text-xs btn-ghost px-2 py-1 rounded">Undo</button>
        <div className="flex-1" />
        <button onClick={handleSave} className="btn-accent text-xs px-3 py-1.5">Save</button>
        <button onClick={onClose} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '100%', cursor: tool === 'text' ? 'text' : 'crosshair' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
      </div>

      {/* Text input overlay */}
      {textPos && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[70]">
          <input
            autoFocus
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') { setTextPos(null); setTextInput(''); }}}
            placeholder="Type label, press Enter..."
            className="text-sm font-mono px-3 py-1.5"
            style={{ background: 'var(--bg2)', border: `1px solid ${color}`, color: 'var(--text)', borderRadius: 4, minWidth: 260 }}
          />
          <button onClick={commitText} className="btn-accent text-xs px-3 py-1.5">Add</button>
        </div>
      )}
    </motion.div>
  );
}

interface CaptureAnnotateButtonProps {
  sessionId: string;
  labName: string;
}

export default function CaptureAnnotateButton({ sessionId, labName }: CaptureAnnotateButtonProps) {
  const { tabs, activeTabId, updateSession } = useStore();
  const session = tabs.find(t => t.id === activeTabId)?.session;
  const [capturing, setCapturing] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function capture() {
    setCapturing(true);
    try {
      const result = await window.electronAPI.takeScreenshot() as { success: boolean; data?: string };
      if (result.success && result.data) setImageBase64(result.data);
    } finally {
      setCapturing(false);
    }
  }

  async function handleSave(dataUrl: string) {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const result = await (window.electronAPI as Record<string, Function>).saveAnnotatedScreenshot?.({
      base64,
      sessionId,
      labName,
    }) as { success: boolean; path?: string; id?: string };
    if (result?.success && activeTabId && session) {
      const attachment = { id: result.id || Date.now().toString(), path: result.path || '', timestamp: new Date().toISOString(), sessionId, labName };
      updateSession(activeTabId, { screenshots: [...(session.screenshots || []), attachment] });
    }
    setImageBase64(null);
  }

  return (
    <>
      <button
        className="btn-ghost text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
        onClick={capture}
        disabled={capturing}
        title="Capture and annotate screenshot"
      >
        <span style={{ fontSize: 12 }}>📸</span>
        <span>{capturing ? 'Capturing...' : 'Capture'}</span>
      </button>
      {imageBase64 && (
        <AnnotationCanvas
          imageBase64={imageBase64}
          onClose={() => setImageBase64(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
