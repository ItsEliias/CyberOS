// CyberOS Dashboard — TimeAgo Component
// Auto-updating relative time display with UTC tooltip

import { useState, useEffect } from 'react'
import { timeAgo, formatUTC } from '../../utils/timeAgo'

interface TimeAgoProps {
  timestamp: string | undefined | null
  className?: string
  updateInterval?: number
}

export default function TimeAgo({ timestamp, className = '', updateInterval = 30000 }: TimeAgoProps) {
  const [display, setDisplay] = useState(timeAgo(timestamp))

  useEffect(() => {
    setDisplay(timeAgo(timestamp))
    const interval = setInterval(() => setDisplay(timeAgo(timestamp)), updateInterval)
    return () => clearInterval(interval)
  }, [timestamp, updateInterval])

  if (!timestamp) return <span className={`text-text-muted ${className}`}>—</span>

  return (
    <span className={`text-text-secondary ${className}`} title={formatUTC(timestamp)}>
      {display}
    </span>
  )
}
