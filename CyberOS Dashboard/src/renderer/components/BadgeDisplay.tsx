// BadgeDisplay — earned achievement badges for the operator
// ItsEliias // CyberOS

interface BadgeSpec {
  icon:        string
  name:        string
  description: string
  earned:      (p: BadgeCheckProps) => boolean
}

interface BadgeCheckProps {
  totalFlags:         number
  totalLabsCompleted: number
  currentStreak:      number
  totalCredentials:   number
}

const BADGES: BadgeSpec[] = [
  {
    icon:        '🚩',
    name:        'First Flag',
    description: 'Captured your first flag',
    earned:      p => p.totalFlags >= 1,
  },
  {
    icon:        '🎯',
    name:        'Flag Hunter',
    description: '10 flags captured',
    earned:      p => p.totalFlags >= 10,
  },
  {
    icon:        '🏆',
    name:        'Flag Collector',
    description: '50 flags captured',
    earned:      p => p.totalFlags >= 50,
  },
  {
    icon:        '🧪',
    name:        'First Lab',
    description: 'Completed your first lab',
    earned:      p => p.totalLabsCompleted >= 1,
  },
  {
    icon:        '🔬',
    name:        'Lab Rat',
    description: '10 labs completed',
    earned:      p => p.totalLabsCompleted >= 10,
  },
  {
    icon:        '🔥',
    name:        'On Fire',
    description: '7-day active streak',
    earned:      p => p.currentStreak >= 7,
  },
  {
    icon:        '💀',
    name:        'Committed',
    description: '30-day active streak',
    earned:      p => p.currentStreak >= 30,
  },
  {
    icon:        '🔑',
    name:        'Vaulted',
    description: '5 credentials stored',
    earned:      p => p.totalCredentials >= 5,
  },
]

interface BadgeDisplayProps {
  totalFlags:         number
  totalLabsCompleted: number
  currentStreak:      number
  totalCredentials:   number
}

interface BadgeCardProps {
  spec:    BadgeSpec
  earned:  boolean
  check:   BadgeCheckProps
}

function BadgeCard({ spec, earned }: BadgeCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all duration-200"
      style={{
        background:   earned ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'var(--panel)',
        borderColor:  earned ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border)',
        boxShadow:    earned ? '0 0 8px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
        opacity:      earned ? 1 : 0.4,
      }}
      title={spec.description}
    >
      <span
        className="text-lg leading-none"
        style={{ filter: earned ? 'none' : 'grayscale(1)' }}
      >
        {spec.icon}
      </span>
      <span
        className="text-[8px] font-semibold uppercase tracking-wide text-center leading-tight"
        style={{ color: earned ? 'var(--text)' : 'var(--text-muted)' }}
      >
        {spec.name}
      </span>
    </div>
  )
}

export default function BadgeDisplay({
  totalFlags,
  totalLabsCompleted,
  currentStreak,
  totalCredentials,
}: BadgeDisplayProps) {
  const check: BadgeCheckProps = { totalFlags, totalLabsCompleted, currentStreak, totalCredentials }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-semibold text-muted uppercase tracking-widest">
        Achievements
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {BADGES.map(badge => (
          <BadgeCard
            key={badge.name}
            spec={badge}
            earned={badge.earned(check)}
            check={check}
          />
        ))}
      </div>
    </div>
  )
}
