import { createContext, useContext, useEffect, useCallback } from 'react'
import { useRobot } from './RobotContext'

const ThemeContext = createContext(null)

export const PRESETS = {
  dark: {
    label: 'Dark',
    swatch: '#1a1a1a',
    vars: {
      '--bg-primary':    '#0c0c0c',
      '--bg-secondary':  '#141414',
      '--bg-card':       '#1a1a1a',
      '--border':        '#2a2a2a',
      '--text-primary':  '#ffffff',
      '--text-secondary':'#888888',
    },
  },
  light: {
    label: 'Light',
    swatch: '#f0f0f0',
    vars: {
      '--bg-primary':    '#f4f5f7',
      '--bg-secondary':  '#ffffff',
      '--bg-card':       '#ffffff',
      '--border':        '#e2e8f0',
      '--text-primary':  '#0f172a',
      '--text-secondary':'#64748b',
    },
  },
  'droid-blue': {
    label: 'Droid',
    swatch: '#0d1f38',
    vars: {
      '--bg-primary':    '#060d1a',
      '--bg-secondary':  '#0a1628',
      '--bg-card':       '#0d1f38',
      '--border':        '#1a3458',
      '--text-primary':  '#e8f4ff',
      '--text-secondary':'#6b9fd4',
    },
  },
  'high-contrast': {
    label: 'Hi-Con',
    swatch: '#000000',
    vars: {
      '--bg-primary':    '#000000',
      '--bg-secondary':  '#0a0a0a',
      '--bg-card':       '#111111',
      '--border':        '#555555',
      '--text-primary':  '#ffffff',
      '--text-secondary':'#bbbbbb',
    },
  },
}

function applyTheme(preset, accent) {
  const base = PRESETS[preset] ?? PRESETS.dark
  const root = document.documentElement
  Object.entries(base.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.style.setProperty('--btn-primary', accent ?? '#2563eb')
  root.style.setProperty('--accent', accent ?? '#2563eb')
}

export function ThemeProvider({ children }) {
  const { activeProfile, setActiveProfile } = useRobot()

  // Apply theme whenever profile changes
  useEffect(() => {
    const t = activeProfile?.theme
    applyTheme(t?.preset ?? 'dark', t?.accent ?? '#2563eb')
  }, [activeProfile])

  // Apply dark default on first render before any profile loads
  useEffect(() => {
    if (!activeProfile) applyTheme('dark', '#2563eb')
  }, [])

  const setTheme = useCallback(async (updates) => {
    if (!activeProfile) return
    const updated = {
      ...activeProfile,
      theme: { ...activeProfile.theme, ...updates },
    }
    applyTheme(updated.theme.preset, updated.theme.accent)
    setActiveProfile(updated)
    await fetch(`/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [activeProfile, setActiveProfile])

  return (
    <ThemeContext.Provider value={{ setTheme, currentTheme: activeProfile?.theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
