import { useState, useEffect } from 'react'
import { useRobot } from '../context/RobotContext'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

const STORAGE_KEY = 'axon.system.volume'

function save(val) {
  localStorage.setItem(STORAGE_KEY, String(val))
}

export default function SystemVolume() {
  const { activeProfile } = useRobot()
  const { subscribe } = useEventBus()

  const audioDevice = activeProfile?.devices?.find(d => d.plugin === 'audio')

  const [volume, setVolume] = useState(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached !== null) return parseInt(cached, 10)
    return audioDevice?.config?.volume ?? 70
  })

  // Sync from brain whenever the profile (and therefore device) changes
  useEffect(() => {
    if (!audioDevice) return
    fetch('/status')
      .then(r => r.json())
      .then(data => {
        const state = data.devices?.find(d => d.id === audioDevice.id)?.state
        if (state?.volume !== undefined) {
          setVolume(state.volume)
          save(state.volume)
        }
      })
      .catch(() => {})
  }, [audioDevice?.id])

  // Stay in sync with any volume events from the brain (scripts, other clients, etc.)
  useEffect(() => {
    if (!audioDevice) return
    return subscribe(`${audioDevice.id}.state`, data => {
      if (data.volume !== undefined) {
        setVolume(data.volume)
        save(data.volume)
      }
    })
  }, [audioDevice?.id, subscribe])

  if (!audioDevice) return null

  function handleChange(e) {
    const val = parseInt(e.target.value, 10)
    setVolume(val)
    save(val)
    dispatch(audioDevice.id, 'volume', { level: val })
  }

  function handleRelease(e) {
    const val = parseInt(e.target.value, 10)
    if (!activeProfile?.id) return
    // Write back to profile so the value survives a brain restart
    fetch(`/profiles/${activeProfile.id}`)
      .then(r => r.json())
      .then(profileData => {
        const updated = {
          ...profileData,
          devices: profileData.devices.map(d =>
            d.id === audioDevice.id
              ? { ...d, config: { ...d.config, volume: val } }
              : d
          ),
        }
        return fetch(`/profiles/${activeProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
      })
      .catch(() => {})
  }

  return (
    <div className="system-volume">
      <div className="system-vol-row">
        <svg className="system-vol-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 7h3l4-4v14l-4-4H3V7z" fill="currentColor"/>
          {volume > 0  && <path d="M13 6.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
          {volume > 40 && <path d="M15.5 4a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
        </svg>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleChange}
          onPointerUp={handleRelease}
          onKeyUp={handleRelease}
          className="system-vol-slider"
          title={`Volume: ${volume}%`}
        />
        <span className="system-vol-value">{volume}%</span>
      </div>
    </div>
  )
}
