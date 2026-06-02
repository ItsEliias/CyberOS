import { useState } from 'react'

interface NavItem { id: string; label: string; icon: React.ReactNode }

const ITEMS: NavItem[] = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" />
      </svg>
    ),
  },
  {
    id: 'network', label: 'Network',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 2C5.5 4.2 4 6 4 8s1.5 3.8 4 6c2.5-2.2 4-4 4-6s-1.5-3.8-4-6Z" />
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    ),
  },
  {
    id: 'security', label: 'Security',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5 2 4v4c0 3.3 2.7 5.5 6 6 3.3-.5 6-2.7 6-6V4Z" />
      </svg>
    ),
  },
  {
    id: 'analytics', label: 'Analytics',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1.5,11.5 5,7 8,9 11.5,4 14.5,6.5" />
        <line x1="1.5" y1="13.5" x2="14.5" y2="13.5" />
      </svg>
    ),
  },
  {
    id: 'alerts', label: 'Alerts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 0 0 8 1.5Z" />
        <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="8" r="2" />
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const [active, setActive] = useState('dashboard')

  return (
    <div className="w-12 flex flex-col items-center pt-3 pb-2 border-r border-border flex-shrink-0 gap-0.5">
      {ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          title={item.label}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 ${
            active === item.id
              ? 'bg-accent/20 text-accent'
              : 'text-muted/40 hover:text-muted hover:bg-border/40'
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
