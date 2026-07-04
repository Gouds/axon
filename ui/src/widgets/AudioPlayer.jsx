import { useState, useEffect, useRef } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

export default function AudioPlayer({ device, profile }) {
  const { subscribe } = useEventBus()
  const [playing, setPlaying] = useState(null)
  const [volume, setVolume] = useState(device.config?.volume ?? 70)
  const audioRef = useRef(null)

  const categories = profile?.audio_categories || []
  const name = device.config?.name || device.id

  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      if (data.volume !== undefined) setVolume(data.volume)

      if (data.mock) {
        if (data.playing) {
          // Stop any current browser audio before starting new
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
        // Real hardware plays through its own speakers — just track state
        setPlaying(data.playing ?? null)
      }
    })
  }, [device.id, subscribe, profile.id])

  // Stop browser audio on unmount
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

  function handleVolume(e) {
    const val = parseInt(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val / 100
    dispatch(device.id, 'volume', { level: val })
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
        />
        <span className="audio-vol-value">{volume}%</span>
      </div>
    </div>
  )
}
