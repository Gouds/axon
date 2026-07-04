import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

const EventBusContext = createContext(null)

export function EventBusProvider({ children }) {
  const listenersRef = useRef({})
  const [lastEvents, setLastEvents] = useState([])

  // Always connect to same-origin WebSocket — no robot state dependency
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/events`)

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      setLastEvents((prev) => [event, ...prev].slice(0, 100))
      const subs = listenersRef.current[event.channel]
      if (subs) subs.forEach((cb) => cb(event.data))
    }

    return () => ws.close()
  }, [])

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
