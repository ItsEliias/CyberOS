// CyberOS Dashboard — Toast Notification Component

import { motion } from 'framer-motion'

interface ToastProps {
  variant: 'success' | 'warning' | 'error' | 'info'
  message: string
  onDismiss: () => void
}

const variantStyles = {
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
  error: 'border-danger/30 bg-danger/10',
  info: 'border-info/30 bg-info/10',
}

const variantIcons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

export default function Toast({ variant, message, onDismiss }: ToastProps) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-[320px] p-3 rounded-lg border ${variantStyles[variant]} flex items-start gap-3`}
    >
      <span className="mt-0.5">{variantIcons[variant]}</span>
      <p className="text-sm text-text-primary flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  )
}
