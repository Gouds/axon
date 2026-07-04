import { useState, useEffect, useRef } from 'react'
import { dispatch } from '../utils/dispatch'

export default function AudioBrowser({ device, profile }) {
  const [index, setIndex] = useState({})
  const [selectedCat, setSelectedCat] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [volume, setVolume] = useState(device.config?.volume ?? 70)
  const audioRef = useRef(null)

  const name = device.config?.name || device.id
  const categories = profile?.audio_categories || []

  useEffect(() => {
    fetch(`/profiles/${profile.id}/audio/index`)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {})
  }, [profile.id])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const allFiles = Object.entries(index)
  const filtered = selectedCat
    ? allFiles.filter(([, meta]) => meta?.category === selectedCat)
    : allFiles

  function playFile(filename) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(`/profiles/${profile.id}/assets/${filename}`)
    audio.volume = volume / 100
    audio.play().catch(() => {})
    audioRef.current = audio
    setPlaying(filename)
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null
        setPlaying(null)
      }
    }
    dispatch(device.id, 'play', { file: filename })
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(null)
    dispatch(device.id, 'stop')
  }

  function handleVolume(e) {
    const val = parseInt(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val / 100
    dispatch(device.id, 'volume', { level: val })
  }

  return (
    <div className="widget-audiobrowser">
      <div className="widget-audiobrowser-header">
        <span className="widget-name">{name}</span>
        {playing && (
          <span className="audio-now-playing" title={playing}>♪ {playing}</span>
        )}
      </div>

      {/* Category filters */}
      <div className="audiobrowser-cats">
        <button
          className={`audiobrowser-cat${!selectedCat ? ' active' : ''}`}
          onClick={() => setSelectedCat(null)}
        >All</button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`audiobrowser-cat${selectedCat === cat ? ' active' : ''}`}
            onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* File list */}
      <div className="audiobrowser-list">
        {filtered.length === 0 ? (
          <p className="audiobrowser-empty">No files in this category.</p>
        ) : (
          filtered.map(([filename]) => (
            <button
              key={filename}
              className={`audiobrowser-file${playing === filename ? ' playing' : ''}`}
              onClick={() => playing === filename ? stopPlayback() : playFile(filename)}
            >
              <span className="audiobrowser-icon">{playing === filename ? '■' : '▶'}</span>
              <span className="audiobrowser-filename">{filename}</span>
            </button>
          ))
        )}
      </div>

      {/* Volume */}
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
