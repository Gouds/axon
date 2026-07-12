import { useState, useEffect, useRef } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

export default function AudioPlayer({ device, profile }) {
  const { subscribe } = useEventBus()
  const [playing, setPlaying] = useState(null)
  const audioRef = useRef(null)

  const categories = profile?.audio_categories || []
  const name = device.config?.name || device.id

  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      if (data.mock) {
        if (data.playing) {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
          }
          // Use current system volume from localStorage for browser playback
          const sysVol = parseInt(localStorage.getItem('axon.system.volume') ?? '70', 10)
          const audio = new Audio(`/profiles/${profile.id}/assets/${data.playing}`)
          audio.volume = sysVol / 100
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
    </div>
  )
}
