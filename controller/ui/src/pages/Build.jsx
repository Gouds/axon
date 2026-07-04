import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRobot } from '../context/RobotContext'
import DeviceForm from '../components/DeviceForm'

function slugify(str) {
  return (str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function uniqueId(base, existing) {
  const slug = slugify(base) || 'device'
  if (!existing.includes(slug)) return slug
  let n = 2
  while (existing.includes(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}

function defaultValues(schema) {
  const vals = {}
  schema?.forEach((f) => { if (f.default !== undefined) vals[f.key] = f.default })
  return vals
}

export default function Build() {
  const { activeProfile, connected } = useRobot()
  const [plugins, setPlugins] = useState([])
  const [adding, setAdding] = useState(null)       // manifest being configured
  const [values, setValues] = useState({})          // config field values
  const [deviceId, setDeviceId] = useState('')
  const [idTouched, setIdTouched] = useState(false) // user manually edited id
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!connected || !activeProfile) return
    fetch(`${activeProfile.brain_url}/plugins`)
      .then((r) => r.json())
      .then(setPlugins)
      .catch(() => {})
  }, [connected, activeProfile])

  function startAdd(plugin) {
    setAdding(plugin)
    setValues(defaultValues(plugin.config_schema))
    setDeviceId('')
    setIdTouched(false)
    setSaved(null)
  }

  function handleFieldChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (key === 'name' && !idTouched) {
      setDeviceId(slugify(value))
    }
  }

  async function handleAdd() {
    setSaving(true)
    const profile = await fetch(`/api/profiles/${activeProfile.id}`).then((r) => r.json())
    const existingIds = (profile.devices || []).map((d) => d.id)
    const id = deviceId.trim() || uniqueId(values.name || adding.type, existingIds)

    const updated = {
      ...profile,
      devices: [...(profile.devices || []), { id, plugin: adding.type, config: { ...values } }],
    }

    await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })

    setSaved(id)
    setAdding(null)
    setSaving(false)
  }

  if (!connected) {
    return <div className="page"><p className="empty">No robot connected.</p></div>
  }

  if (adding) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Add — {adding.label}</h1>
          <button className="btn btn-secondary" onClick={() => setAdding(null)}>Cancel</button>
        </div>

        <div className="card" style={{ maxWidth: '520px' }}>
          <div className="form-field">
            <label className="form-label">Device ID</label>
            <input
              type="text"
              className="form-input form-input-mono"
              value={deviceId}
              placeholder="auto-generated from name"
              onChange={(e) => { setDeviceId(e.target.value); setIdTouched(true) }}
            />
            <span className="field-hint">Unique identifier used in rules and events (e.g. dome-servo)</span>
          </div>

          <div className="form-divider" />

          <DeviceForm
            schema={adding.config_schema}
            values={values}
            onChange={handleFieldChange}
          />

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding…' : 'Add Device'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Build — {activeProfile.label}</h1>
      <p className="text-secondary" style={{ marginBottom: '24px' }}>
        Select a module to add to this robot's profile.
      </p>

      {saved && (
        <div className="alert alert-ok" style={{ marginBottom: '20px' }}>
          Added <code>{saved}</code> to profile.{' '}
          <button className="btn-link" onClick={() => navigate('/configure')}>
            Configure &amp; push →
          </button>
        </div>
      )}

      {plugins.length === 0 && (
        <p className="empty">Loading plugins from brain…</p>
      )}

      <div className="plugin-grid">
        {plugins.map((p) => (
          <div key={p.type} className="plugin-card">
            <div className="plugin-card-body">
              <h3>{p.label}</h3>
              <span className="plugin-type-badge">{p.type}</span>
              <div className="plugin-capabilities">
                {p.capabilities?.map((c) => (
                  <span key={c} className="capability-chip">{c}</span>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => startAdd(p)}>
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
