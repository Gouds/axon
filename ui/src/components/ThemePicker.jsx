import { useTheme, PRESETS } from '../context/ThemeContext'
import { useRobot } from '../context/RobotContext'

export default function ThemePicker() {
  const { setTheme, currentTheme } = useTheme()
  const { activeProfile } = useRobot()
  const activePreset = currentTheme?.preset ?? 'dark'
  const activeAccent = currentTheme?.accent ?? '#2563eb'

  if (!activeProfile) return null

  return (
    <div className="theme-picker">
      <div className="theme-presets">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            className={`theme-swatch${activePreset === key ? ' active' : ''}`}
            style={{ background: preset.swatch }}
            title={preset.label}
            onClick={() => setTheme({ preset: key, accent: activeAccent })}
          />
        ))}
        <label className="theme-accent-wrap" title="Accent colour">
          <input
            type="color"
            className="theme-accent-input"
            value={activeAccent}
            onChange={(e) => setTheme({ preset: activePreset, accent: e.target.value })}
          />
          <span className="theme-accent-preview" style={{ background: activeAccent }} />
        </label>
      </div>
    </div>
  )
}
