import { useState, useEffect } from 'react'
import { useRobot } from '../context/RobotContext'
import DeviceForm from '../components/DeviceForm'
import { useNavigate } from 'react-router-dom'

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
  const { activeProfile, activate } = useRobot()
  const [plugins, setPlugins] = useState([])

  // Add state
  const [addingPlugin, setAddingPlugin] = useState(null)   // plugin.type being added
  const [addValues, setAddValues]       = useState({})
  const [addDeviceId, setAddDeviceId]   = useState('')
  const [addIdTouched, setAddIdTouched] = useState(false)

  // Edit state
  const [editingId, setEditingId]   = useState(null)       // device.id being edited
  const [editValues, setEditValues] = useState({})

  // Confirm-remove state
  const [removingId, setRemovingId] = useState(null)

  const [saving, setSaving]     = useState(false)
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    fetch('/plugins').then((r) => r.json()).then(setPlugins).catch(() => {})
  }, [])

  const devices = activeProfile?.devices || []

  // ── Helpers ─────────────────────────────────────────────

  async function persistAndActivate(updatedDevices) {
    const updated = { ...activeProfile, devices: updatedDevices }
    await fetch(`/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    await activate(updated)
  }

  // ── Add ──────────────────────────────────────────────────

  function startAdd(plugin) {
    setAddingPlugin(plugin.type)
    setAddValues(defaultValues(plugin.config_schema))
    setAddDeviceId('')
    setAddIdTouched(false)
    setEditingId(null)
    setRemovingId(null)
  }

  function handleAddFieldChange(key, value) {
    setAddValues((prev) => ({ ...prev, [key]: value }))
    if (key === 'name' && !addIdTouched) setAddDeviceId(slugify(value))
  }

  async function confirmAdd() {
    setSaving(true)
    const existingIds = devices.map((d) => d.id)
    const id = addDeviceId.trim() || uniqueId(addValues.name || addingPlugin, existingIds)
    await persistAndActivate([
      ...devices,
      { id, plugin: addingPlugin, config: { ...addValues } },
    ])
    setAddingPlugin(null)
    setSaving(false)
  }

  // ── Edit ─────────────────────────────────────────────────

  function startEdit(device) {
    setEditingId(device.id)
    setEditValues({ ...device.config })
    setAddingPlugin(null)
    setRemovingId(null)
  }

  async function confirmEdit(deviceId) {
    setSaving(true)
    await persistAndActivate(
      devices.map((d) => d.id === deviceId ? { ...d, config: { ...editValues } } : d)
    )
    setEditingId(null)
    setSaving(false)
  }

  // ── Remove ───────────────────────────────────────────────

  async function confirmRemove(deviceId) {
    setSaving(true)
    await persistAndActivate(devices.filter((d) => d.id !== deviceId))
    setRemovingId(null)
    setSaving(false)
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Build{activeProfile ? ` — ${activeProfile.label}` : ''}</h1>
          <p className="text-secondary" style={{ marginTop: '4px' }}>
            Select the hardware components fitted to this robot.
          </p>
        </div>
      </div>

      {!activeProfile && (
        <div className="alert alert-err" style={{ marginBottom: '20px' }}>
          No profile active — go to <a href="/profiles">Profiles</a> to activate one first.
        </div>
      )}

      {plugins.length === 0 && <p className="empty">Loading components…</p>}

      <div className="plugin-grid">

        {plugins.map((plugin) => {
          const installed = devices.filter((d) => d.plugin === plugin.type)
          const isAdding  = addingPlugin === plugin.type

          return (
            <div key={plugin.type} className={`plugin-card${installed.length > 0 ? ' installed' : ''}`}>

              {/* ── Card header ── */}
              <div className="plugin-card-header">
                <div>
                  <div className="plugin-card-title-row">
                    <h3>{plugin.label}</h3>
                    {installed.length > 0 && (
                      <span className="plugin-installed-badge">{installed.length} installed</span>
                    )}
                  </div>
                  <div className="plugin-capabilities">
                    {plugin.capabilities?.map((c) => (
                      <span key={c} className="capability-chip">{c}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Installed instances ── */}
              {installed.length > 0 && (
                <div className="plugin-instances">
                  {installed.map((device) => (
                    <div key={device.id}>

                      {/* Confirm-remove row */}
                      {removingId === device.id ? (
                        <div className="plugin-instance-confirm">
                          <span>Remove <strong>{device.config?.name || device.id}</strong>?</span>
                          <div className="instance-confirm-actions">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => confirmRemove(device.id)}
                              disabled={saving}
                            >Remove</button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setRemovingId(null)}
                            >Cancel</button>
                          </div>
                        </div>
                      ) : editingId === device.id ? (
                        /* Inline edit form */
                        <div className="plugin-instance-edit">
                          <DeviceForm
                            schema={plugin.config_schema}
                            values={editValues}
                            onChange={(k, v) => setEditValues((prev) => ({ ...prev, [k]: v }))}
                          />
                          <div className="instance-edit-id">
                            <span className="field-hint">ID: <code>{device.id}</code></span>
                          </div>
                          <div className="form-actions" style={{ marginTop: '12px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => confirmEdit(device.id)}
                              disabled={saving}
                            >{saving ? 'Saving…' : 'Save'}</button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingId(null)}
                            >Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* Normal instance row */
                        <div className="plugin-instance-row">
                          <div className="instance-info">
                            <span className="instance-name">{device.config?.name || device.id}</span>
                            <code className="instance-id">{device.id}</code>
                          </div>
                          <div className="instance-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => startEdit(device)}
                            >Edit</button>
                            <button
                              className="btn btn-ghost btn-sm instance-remove"
                              onClick={() => setRemovingId(device.id)}
                              title="Remove"
                            >✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Inline add form ── */}
              {isAdding ? (
                <div className="plugin-instance-edit">
                  <div className="form-field">
                    <label className="form-label">Device ID</label>
                    <input
                      type="text"
                      className="form-input form-input-mono"
                      value={addDeviceId}
                      placeholder="auto-generated from name"
                      onChange={(e) => { setAddDeviceId(e.target.value); setAddIdTouched(true) }}
                    />
                  </div>
                  <div className="form-divider" />
                  <DeviceForm
                    schema={plugin.config_schema}
                    values={addValues}
                    onChange={handleAddFieldChange}
                  />
                  <div className="form-actions" style={{ marginTop: '12px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={confirmAdd}
                      disabled={saving || !activeProfile}
                    >{saving ? 'Adding…' : 'Add to Robot'}</button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAddingPlugin(null)}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  className={`btn btn-sm ${installed.length > 0 ? 'btn-secondary' : 'btn-primary'} plugin-add-btn`}
                  onClick={() => startAdd(plugin)}
                  disabled={!activeProfile}
                >
                  {installed.length > 0 ? '+ Add Another' : '+ Add'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {activeProfile && (
        <div className="raw-json-toggle" style={{ marginTop: '32px' }}>
          <button className="btn-link" onClick={() => setShowJson((v) => !v)}>
            {showJson ? 'Hide' : 'Show'} raw profile JSON
          </button>
          {showJson && (
            <div className="card" style={{ marginTop: '12px' }}>
              <pre className="json-preview">{JSON.stringify(activeProfile, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
