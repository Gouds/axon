import { createContext, useContext, useState, useCallback } from 'react'

const RobotContext = createContext(null)

export function RobotProvider({ children }) {
  const [activeProfile, setActiveProfile] = useState(null)
  const [connected, setConnected] = useState(false)
  const [simulated, setSimulated] = useState(false)
  const [assetDiff, setAssetDiff] = useState(null)

  const checkAssetDiff = useCallback(async (profile) => {
    try {
      const res = await fetch(`/api/profiles/${profile.id}/assets/diff`, { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      setAssetDiff(data.count > 0 ? data : null)
    } catch {
      // brain may not be reachable yet — silently skip
    }
  }, [])

  const connect = useCallback(async (profile) => {
    setConnected(false)
    setSimulated(false)
    setAssetDiff(null)

    const res = await fetch(`/api/profiles/${profile.id}`)
    const full = res.ok ? await res.json() : profile
    setActiveProfile(full)

    try {
      const health = await fetch(`${full.brain_url}/health`, { signal: AbortSignal.timeout(4000) })
      if (health.ok) {
        setConnected(true)
        checkAssetDiff(full)
      }
    } catch {
      setConnected(false)
    }
  }, [checkAssetDiff])

  const simulate = useCallback(async (profile) => {
    setConnected(false)
    setSimulated(false)
    setAssetDiff(null)

    const res = await fetch(`/api/profiles/${profile.id}`)
    const full = res.ok ? await res.json() : profile
    setActiveProfile(full)
    setConnected(true)
    setSimulated(true)
  }, [])

  const disconnect = useCallback(() => {
    setActiveProfile(null)
    setConnected(false)
    setSimulated(false)
    setAssetDiff(null)
  }, [])

  return (
    <RobotContext.Provider value={{ activeProfile, connected, simulated, assetDiff, connect, simulate, disconnect, checkAssetDiff }}>
      {children}
    </RobotContext.Provider>
  )
}

export const useRobot = () => useContext(RobotContext)
