import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRobot } from '../context/RobotContext'
import DeviceForm from '../components/DeviceForm'

export default function Configure() {
  const { activeProfile, connected } = useRobot()
  const [profile, setProfile] = useState(null)
  const [manifests, setManifests] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [status, setStatus] = useState(null)
  const [showRaw, setShowRaw] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeProfile) return
    fetch(`/api/profiles/${activeProfile.id}`)
      .then((r) => r.json())
      .then(setProfile)
  }, [activeProfile])

  // Fetch manifests for each plugin type present in the profile
  useEffect(() => {
    if (!profile || !connected || !activeProfile) return
    const types = [...new Set((profile.devices || []).map((d) => d.plugin))]
    types.forEach((type) => {
      if (manifests[type]) return
      fetch(`${activeProfile.brain_url}/plugins/${type}/manifest`)
        .then((r) => r.json())
        .then((m) => setManifests((prev) => ({ ...prev, [type]: m })))
        .catch(() => {})
    })
  }, [profile, connected, activeProfile])

  function flash(msg, type = 'ok') {
    setStatus({ msg, type })
    setTimeout(() => setStatus(null), 3000)
  }

  function updateConfig(deviceId, key, value) {
    setProfile((prev) => ({
      ...prev,
      devices: prev.devices.map((d) =>
        d.id === deviceId ? { ...d, config: { ...d.config, [key]: value } } : d
      ),
    }))
  }

  function confirmRemove(deviceId) {
    setPendingRemove(deviceId)
  }

  function doRemove() {
    setProfile((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== pendingRemove),
    }))
    if (expanded === pendingRemove) setExpanded(null)
    setPendingRemove(null)
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    flash('Profile saved to controller.')
  }

  async function push() {
    setPushing(true)
    await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    const res = await fetch(`${activeProfile.brain_url}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    const data = await res.json()
    setPushing(false)
    flash(`Pushed to robot — ${data.devices_loaded} device(s) loaded.`)
  }

  if (!activeProfile) {
    return <div className="page"><p className="empty">No robot connected.</p></div>
  }
  if (!profile) {
    return <div className="page"><p className="empty">Loading…</p></div>
  }

  const devices = profile.devices || []

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configure — {profile.label}</h1>
        <button className="btn btn-secondary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-primary" onClick={push} disabled={pushing || !connected}>
          {pushing ? 'Pushing…' : 'Push to Robot'}
        </button>
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      {pendingRemove && (
        <div className="confirm-bar">
          <span>Remove <strong>{pendingRemove}</strong>?</span>
          <button className="btn btn-danger" onClick={doRemove}>Remove</button>
          <button className="btn btn-secondary" onClick={() => setPendingRemove(null)}>Cancel</button>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="card">
          <p className="placeholder">
            No devices configured.{' '}
            <button className="btn-link" onClick={() => navigate('/build')}>
              Add devices →
            </button>
          </p>
        </div>
      ) : (
        <div className="device-list">
          {devices.map((device) => {
            const manifest = manifests[device.plugin]
            const isOpen = expanded === device.id
            return (
              <div key={device.id} className={`device-card${isOpen ? ' open' : ''}`}>
                <div
                  className="device-card-header"
                  onClick={() => setExpanded(isOpen ? null : device.id)}
                >
                  <div className="device-card-meta">
                    <span className="device-id">{device.id}</span>
                    <span className="device-plugin-badge">{device.plugin}</span>
                  </div>
                  <div className="device-card-controls">
                    <button
                      className="btn-icon"
                      title="Remove"
                      onClick={(e) => { e.stopPropagation(); confirmRemove(device.id) }}
                    >
                      ×
                    </button>
                    <span className="expand-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="device-card-body">
                    {manifest ? (
                      <>
                        <div className="manifest-capabilities">
                          {manifest.capabilities?.map((c) => (
                            <span key={c} className="capability-chip">{c}</span>
                          ))}
                        </div>
                        <DeviceForm
                          schema={manifest.config_schema}
                          values={device.config}
                          onChange={(key, value) => updateConfig(device.id, key, value)}
                        />
                      </>
                    ) : (
                      <p className="placeholder">
                        {connected ? 'Loading schema…' : 'Connect to robot to load schema.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="raw-json-toggle">
        <button className="btn-link" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? 'Hide' : 'Show'} raw JSON
        </button>
      </div>

      {showRaw && (
        <div className="card" style={{ marginTop: '12px' }}>
          <pre className="json-preview">{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
