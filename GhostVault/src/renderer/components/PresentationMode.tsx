import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { parseMarkdown } from '../lib/markdown';

interface Props {
  content: string;
  noteName: string;
  onClose: () => void;
}

export default function PresentationMode({ content, noteName, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'F5') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const html = parseMarkdown(content);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(123,184,255,0.06) 0%, #080b12 60%)',
      }}
    >
      {/* Minimal toolbar */}
      <div className="flex items-center justify-between px-8 py-3 shrink-0"
        style={{ background: 'rgba(10,10,15,0.7)', borderBottom: '1px solid rgba(42,51,71,0.5)' }}>
        <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{noteName}</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-xs border transition-colors hover:bg-white/10"
          style={{ borderColor: 'rgba(42,51,71,0.5)', color: '#8b949e' }}
        >
          Exit (Esc)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex justify-center px-8 py-12"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(42,51,71,0.5) transparent' }}>
        <div
          className="markdown-preview w-full"
          style={{ maxWidth: 760, fontSize: 18, lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </motion.div>
  );
}
