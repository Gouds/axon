import { useState, useEffect, useRef, useCallback } from 'react'
import { useRobot } from '../context/RobotContext'

export default function Assets() {
  const { activeProfile, connected, assetDiff, checkAssetDiff } = useRobot()
  const [profile, setProfile] = useState(null)
  const [audioIndex, setAudioIndex] = useState({})
  const [localAssets, setLocalAssets] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [showAddCat, setShowAddCat] = useState(false)
  const [nowPlaying, setNowPlaying] = useState(null)
  const [newCatInput, setNewCatInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pushResult, setPushResult] = useState(null)
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)

  // Stop audio on page unmount
  useEffect(() => () => { audioRef.current?.pause() }, [])

  function playPreview(filename) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (nowPlaying === filename) {
      setNowPlaying(null)
      return
    }
    const audio = new Audio(`/api/profiles/${activeProfile.id}/assets/${encodeURIComponent(filename)}`)
    audio.onended = () => setNowPlaying(null)
    audio.play()
    audioRef.current = audio
    setNowPlaying(filename)
  }

  const loadAll = useCallback(async () => {
    if (!activeProfile) return
    const [profileData, indexData, assetsData] = await Promise.all([
      fetch(`/api/profiles/${activeProfile.id}`).then((r) => r.json()),
      fetch(`/api/profiles/${activeProfile.id}/audio/index`).then((r) => r.json()),
      fetch(`/api/profiles/${activeProfile.id}/assets`).then((r) => r.json()),
    ])
    setProfile(profileData)
    setAudioIndex(indexData)
    // Filter out audio_index.json from the display list — it's metadata, not a playable file
    setLocalAssets((assetsData.files || []).filter((f) => f.name !== 'audio_index.json'))
  }, [activeProfile])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveIndex(updated) {
    setAudioIndex(updated)
    await fetch(`/api/profiles/${activeProfile.id}/audio/index`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    checkAssetDiff(activeProfile)
  }

  async function saveProfile(updated) {
    setProfile(updated)
    await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  function handleCategoryChange(filename, category) {
    const updated = { ...audioIndex }
    if (category) {
      updated[filename] = { ...(updated[filename] || {}), category }
    } else {
      delete updated[filename]
    }
    saveIndex(updated)
  }

  async function addCategory() {
    const name = newCatInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const cats = profile.audio_categories || []
    if (!name || cats.includes(name)) return
    await saveProfile({ ...profile, audio_categories: [...cats, name] })
    setNewCatInput('')
    setShowAddCat(false)
  }

  async function removeCategory(cat) {
    const cats = (profile.audio_categories || []).filter((c) => c !== cat)
    // Unassign any files using this category
    const updatedIndex = Object.fromEntries(
      Object.entries(audioIndex).filter(([, meta]) => meta.category !== cat)
    )
    await Promise.all([
      saveProfile({ ...profile, audio_categories: cats }),
      saveIndex(updatedIndex),
    ])
    if (activeCategory === cat) setActiveCategory('all')
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`/api/profiles/${activeProfile.id}/assets`, { method: 'POST', body: fd })
    }
    e.target.value = ''
    setUploading(false)
    await loadAll()
    checkAssetDiff(activeProfile)
  }

  async function handleDelete(filename) {
    await fetch(`/api/profiles/${activeProfile.id}/assets/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    })
    const updatedIndex = { ...audioIndex }
    delete updatedIndex[filename]
    await saveIndex(updatedIndex)
    setLocalAssets((prev) => prev.filter((f) => f.name !== filename))
  }

  async function handleSync() {
    setSyncing(true)
    setPushResult(null)
    const res = await fetch(`/api/profiles/${activeProfile.id}/assets/push`, { method: 'POST' })
    const data = await res.json()
    setPushResult(data)
    await checkAssetDiff(activeProfile)
    setSyncing(false)
  }

  if (!activeProfile) return <div className="page"><p className="empty">No robot connected.</p></div>
  if (!profile) return <div className="page"><p className="empty">Loading…</p></div>

  const categories = profile.audio_categories || []
  const hasDiff = assetDiff && assetDiff.count > 0

  const counts = {
    all: localAssets.length,
    uncategorized: localAssets.filter((f) => !audioIndex[f.name]?.category).length,
  }
  categories.forEach((cat) => {
    counts[cat] = localAssets.filter((f) => audioIndex[f.name]?.category === cat).length
  })

  const filteredFiles = localAssets.filter((f) => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'uncategorized') return !audioIndex[f.name]?.category
    return audioIndex[f.name]?.category === activeCategory
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Assets — {profile.label}</h1>
        <div className="page-header-actions">
          {hasDiff ? (
            <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing…' : `Sync ${assetDiff.count} file${assetDiff.count !== 1 ? 's' : ''}`}
            </button>
          ) : (
            connected && <span className="status-chip ok">In sync</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
            accept=".mp3,.wav,.ogg,.flac"
            onChange={handleUpload}
          />
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
        </div>
      </div>

      {pushResult && (
        <div className="alert alert-ok">
          Pushed {pushResult.count} file{pushResult.count !== 1 ? 's' : ''} to robot.
        </div>
      )}

      {/* Category tabs */}
      <div className="category-tabs">
        {[{ key: 'all', label: 'All' }, ...categories.map((c) => ({ key: c, label: c })), { key: 'uncategorized', label: 'Uncategorized' }].map((tab) => (
          <button
            key={tab.key}
            className={`category-tab${activeCategory === tab.key ? ' active' : ''}`}
            onClick={() => setActiveCategory(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.key] ?? 0}</span>
            {tab.key !== 'all' && tab.key !== 'uncategorized' && (
              <span
                className="tab-remove"
                title="Remove category"
                onClick={(e) => { e.stopPropagation(); removeCategory(tab.key) }}
              >×</span>
            )}
          </button>
        ))}

        {showAddCat ? (
          <div className="new-cat-input">
            <input
              autoFocus
              className="form-input form-input-sm"
              placeholder="category name"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCategory()
                if (e.key === 'Escape') setShowAddCat(false)
              }}
            />
            <button className="btn btn-primary" style={{ padding: '5px 10px' }} onClick={addCategory}>Add</button>
            <button className="btn btn-secondary" style={{ padding: '5px 10px' }} onClick={() => setShowAddCat(false)}>×</button>
          </div>
        ) : (
          <button className="category-tab add-cat" onClick={() => setShowAddCat(true)}>
            + Category
          </button>
        )}
      </div>

      {/* File list */}
      <div className="card">
        {filteredFiles.length === 0 ? (
          <p className="placeholder">
            {localAssets.length === 0
              ? `No audio files — click Upload to add files.`
              : 'No files in this category.'}
          </p>
        ) : (
          <div className="audio-list">
            <div className="audio-list-header">
              <span />
              <span>File</span>
              <span>Category</span>
              <span>Size</span>
              <span />
            </div>
            {filteredFiles.map((f) => {
              const isPlaying = nowPlaying === f.name
              return (
                <div key={f.name} className={`audio-row${isPlaying ? ' playing' : ''}`}>
                  <button
                    className={`play-btn${isPlaying ? ' active' : ''}`}
                    title={isPlaying ? 'Stop' : 'Play'}
                    onClick={() => playPreview(f.name)}
                  >
                    {isPlaying ? '■' : '▶'}
                  </button>
                  <span className="audio-filename" title={f.name}>{f.name}</span>
                  <select
                    className="audio-category-select"
                    value={audioIndex[f.name]?.category || ''}
                    onChange={(e) => handleCategoryChange(f.name, e.target.value)}
                  >
                    <option value="">— Uncategorized —</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="text-secondary">{(f.size / 1024).toFixed(1)} KB</span>
                  <button
                    className="btn-icon"
                    title="Delete"
                    onClick={() => handleDelete(f.name)}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
