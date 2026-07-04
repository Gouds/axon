import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const RobotContext = createContext(null)

export function RobotProvider({ children }) {
  const [activeProfile, setActiveProfile] = useState(null)
  const [ready, setReady] = useState(false) // devices loaded in registry

  // On mount: check if brain already has a profile loaded
  useEffect(() => {
    fetch('/status')
      .then((r) => r.json())
      .then(async (status) => {
        if (status.profile_id) {
          const profile = await fetch(`/profiles/${status.profile_id}`).then((r) => r.json())
          setActiveProfile(profile)
          setReady((status.devices?.length ?? 0) > 0)
        }
      })
      .catch(() => {})
  }, [])

  // Activate a profile: save it and load it into the device registry
  const activate = useCallback(async (profile) => {
    const full = await fetch(`/profiles/${profile.id}`).then((r) => r.json())
    const res = await fetch('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(full),
    })
    const data = await res.json()
    setActiveProfile(full)
    setReady(data.devices_loaded > 0)
  }, [])

  // Re-read profile from disk (after saves)
  const refreshProfile = useCallback(async () => {
    if (!activeProfile) return
    const p = await fetch(`/profiles/${activeProfile.id}`).then((r) => r.json())
    setActiveProfile(p)
  }, [activeProfile])

  return (
    <RobotContext.Provider value={{ activeProfile, ready, activate, refreshProfile, setActiveProfile }}>
      {children}
    </RobotContext.Provider>
  )
}

export const useRobot = () => useContext(RobotContext)
