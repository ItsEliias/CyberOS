// SettingsTheme — appearance / theme section for SettingsView
import { useThemeStore, ACCENT_SWATCHES, BG_SWATCHES } from '../../store/themeStore'

export default function ThemeSection() {
  const theme      = useThemeStore(s => s.theme)
  const setAccent  = useThemeStore(s => s.setAccent)
  const setBg      = useThemeStore(s => s.setBg)
  const setText    = useThemeStore(s => s.setText)
  const reset      = useThemeStore(s => s.reset)

  // Text brightness slider: map 0–100 to #8b949e–#ffffff
  function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }
  const MIN_RGB: [number, number, number] = [139, 148, 158]
  const MAX_RGB: [number, number, number] = [255, 255, 255]
  function brightnessToColor(val: number): string {
    const t = val / 100
    return rgbToHex(
      Math.round(MIN_RGB[0] + (MAX_RGB[0] - MIN_RGB[0]) * t),
      Math.round(MIN_RGB[1] + (MAX_RGB[1] - MIN_RGB[1]) * t),
      Math.round(MIN_RGB[2] + (MAX_RGB[2] - MIN_RGB[2]) * t),
    )
  }
  function colorToBrightness(hex: string): number {
    const [r] = hexToRgb(hex)
    const t = (r - MIN_RGB[0]) / (MAX_RGB[0] - MIN_RGB[0])
    return Math.round(Math.max(0, Math.min(100, t * 100)))
  }

  return (
    <div className="space-y-5">
      {/* Live preview swatch */}
      <div
        className="rounded-lg p-3 flex items-center gap-3 border"
        style={{
          background: theme.bgColor,
          borderColor: `${theme.accentColor}40`,
          boxShadow: `0 0 0 1px ${theme.accentColor}20`,
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: theme.accentColor }} />
        <span className="text-[11px] font-semibold" style={{ color: theme.textColor }}>SignalBoard preview</span>
        <span className="text-[10px] ml-auto font-mono" style={{ color: theme.accentColor }}>{theme.accentColor}</span>
      </div>

      {/* Accent color */}
      <div>
        <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2">Accent Color</p>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_SWATCHES.map(s => (
            <button
              key={s.value}
              onClick={() => setAccent(s.value)}
              title={s.label}
              className="w-7 h-7 rounded-full border-2 transition-all duration-150"
              style={{
                background: s.value,
                borderColor: theme.accentColor === s.value ? '#e2e8f0' : 'transparent',
                boxShadow: theme.accentColor === s.value ? `0 0 0 1px ${s.value}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2">Background</p>
        <div className="flex items-center gap-2 flex-wrap">
          {BG_SWATCHES.map(s => (
            <button
              key={s.value}
              onClick={() => setBg(s.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] transition-all duration-150"
              style={{
                background: s.value,
                borderColor: theme.bgColor === s.value ? theme.accentColor : 'rgba(42,51,71,0.5)',
                color: '#e2e8f0',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text brightness */}
      <div>
        <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2">
          Text Brightness
          <span className="ml-2 font-mono normal-case" style={{ color: theme.textColor }}>{theme.textColor}</span>
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={colorToBrightness(theme.textColor)}
          onChange={e => setText(brightnessToColor(Number(e.target.value)))}
          className="w-full h-1.5 rounded appearance-none cursor-pointer no-drag"
          style={{ accentColor: theme.accentColor }}
        />
        <div className="flex justify-between text-[9px] mt-1">
          <span style={{ color: '#8b949e' }}>Dim</span>
          <span style={{ color: '#ffffff' }}>Bright</span>
        </div>
      </div>

      <button
        onClick={reset}
        className="text-[11px] px-3 py-1.5 rounded border transition-colors"
        style={{ borderColor: 'rgba(42,51,71,0.6)', color: '#8b949e', background: 'rgba(42,51,71,0.2)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(42,51,71,0.9)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)' }}
      >
        Reset to defaults
      </button>
    </div>
  )
}
