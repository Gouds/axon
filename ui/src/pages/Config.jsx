import { useState } from 'react'
import { useRobot } from '../context/RobotContext'

export default function Config() {
  const { activeProfile, connected } = useRobot()
  const [json, setJson] = useState(activeProfile ? JSON.stringify(activeProfile, null, 2) : '')
  const [saved, setSaved] = useState(false)
  const [pushed, setPushed] = useState(false)

  if (!activeProfile) {
    return (
      <div className="page">
        <p className="empty">No robot connected.</p>
      </div>
    )
  }

  async function handleSave() {
    await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handlePush() {
    await fetch(`${activeProfile.brain_url}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
    setPushed(true)
    setTimeout(() => setPushed(false), 2000)
  }

  return (
    <div className="page">
      <h1>Config — {activeProfile.label}</h1>
      <p className="text-secondary" style={{ marginBottom: '16px' }}>
        Manifest-driven config forms coming in a later build. Raw profile editor for now.
      </p>
      <div className="card">
        <textarea
          className="json-editor"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={32}
          spellCheck={false}
        />
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={handleSave}>
            {saved ? 'Saved ✓' : 'Save Profile'}
          </button>
          <button className="btn btn-primary" onClick={handlePush} disabled={!connected}>
            {pushed ? 'Pushed ✓' : 'Push to Robot'}
          </button>
        </div>
      </div>
    </div>
  )
}
