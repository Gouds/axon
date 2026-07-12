import { useState, useEffect, useRef } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

const storageKey = (deviceId) => `axon.volume.${deviceId}`

export default function AudioPlayer({ device, profile }) {
  const { subscribe } = useEventBus()
  const [playing, setPlaying] = useState(null)
  const audioRef = useRef(null)

  // Initialise from localStorage so there is never a flash back to the config default
  const [volume, setVolume] = useState(() => {
    const cached = localStorage.getItem(storageKey(device.id))
    return cached !== null ? parseInt(cached, 10) : (device.config?.volume ?? 70)
  })

  const categories = profile?.audio_categories || []
  const name = device.config?.name || device.id

  function saveVolume(val) {
    setVolume(val)
    localStorage.setItem(storageKey(device.id), String(val))
  }

  // On mount, sync with the brain's live state (beats localStorage if different)
  useEffect(() => {
    fetch('/status')
      .then(r => r.json())
      .then(data => {
        const state = data.devices?.find(d => d.id === device.id)?.state
        if (state?.volume !== undefined) saveVolume(state.volume)
      })
      .catch(() => {})
  }, [device.id])

  // Keep in sync with brain state events
  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      if (data.volume !== undefined) saveVolume(data.volume)

      if (data.mock) {
        if (data.playing) {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
          }
          const audio = new Audio(`/profiles/${profile.id}/assets/${data.playing}`)
          audio.volume = (data.volume ?? volume) / 100
          audio.play().catch(() => {})
          audioRef.current = audio
          setPlaying(data.playing)
          audio.onended = () => {
            if (audioRef.current === audio) {
              audioRef.current = null
              setPlaying(null)
            }
          }
        } else {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
          }
          setPlaying(null)
        }
      } else {
        setPlaying(data.playing ?? null)
      }
    })
  }, [device.id, subscribe, profile.id])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  function playRandom(cat = '') {
    dispatch(device.id, 'random', cat ? { category: cat } : {})
  }

  function stop() {
    dispatch(device.id, 'stop')
  }

  // Drag: update state + brain continuously
  function handleVolume(e) {
    const val = parseInt(e.target.value, 10)
    saveVolume(val)
    if (audioRef.current) audioRef.current.volume = val / 100
    dispatch(device.id, 'volume', { level: val })
  }

  // Release: persist the final value back to the profile so it survives brain restarts
  function commitVolume(e) {
    const val = parseInt(e.target.value, 10)
    if (!profile?.id) return
    fetch(`/profiles/${profile.id}`)
      .then(r => r.json())
      .then(profileData => {
        const updated = {
          ...profileData,
          devices: profileData.devices.map(d =>
            d.id === device.id
              ? { ...d, config: { ...d.config, volume: val } }
              : d
          ),
        }
        return fetch(`/profiles/${profile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
      })
      .catch(() => {})
  }

  return (
    <div className="widget-audio">
      <div className="widget-audio-header">
        <span className="widget-name">{name}</span>
        {playing && (
          <span className="audio-now-playing" title={playing}>
            ♪ {playing}
          </span>
        )}
      </div>

      <div className="audio-cat-buttons">
        <button className="btn btn-secondary audio-cat-btn" onClick={() => playRandom()}>
          ▶ Random
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className="btn btn-secondary audio-cat-btn"
            onClick={() => playRandom(cat)}
          >
            ▶ {cat}
          </button>
        ))}
        <button
          className={`btn audio-stop-btn${playing ? '' : ' disabled'}`}
          onClick={stop}
          disabled={!playing}
        >
          ■ Stop
        </button>
      </div>

      <div className="audio-volume-row">
        <span className="audio-vol-label">Vol</span>
        <input
          type="range"
          className="audio-volume-slider"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolume}
          onPointerUp={commitVolume}
          onKeyUp={commitVolume}
        />
        <span className="audio-vol-value">{volume}%</span>
      </div>
    </div>
  )
}
