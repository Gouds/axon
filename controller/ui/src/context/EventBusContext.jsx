import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRobot } from './RobotContext'

const EventBusContext = createContext(null)

export function EventBusProvider({ children }) {
  const { activeProfile, connected } = useRobot()
  const listenersRef = useRef({})
  const [lastEvents, setLastEvents] = useState([])

  useEffect(() => {
    if (!connected || !activeProfile) return

    const wsUrl = activeProfile.brain_url.replace(/^http/, 'ws') + '/ws/events'
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      setLastEvents((prev) => [event, ...prev].slice(0, 100))
      const subs = listenersRef.current[event.channel]
      if (subs) subs.forEach((cb) => cb(event.data))
    }

    return () => ws.close()
  }, [connected, activeProfile])

  const subscribe = useCallback((channel, callback) => {
    if (!listenersRef.current[channel]) listenersRef.current[channel] = new Set()
    listenersRef.current[channel].add(callback)
    return () => listenersRef.current[channel]?.delete(callback)
  }, [])

  return (
    <EventBusContext.Provider value={{ subscribe, lastEvents }}>
      {children}
    </EventBusContext.Provider>
  )
}

export const useEventBus = () => useContext(EventBusContext)
