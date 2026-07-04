import { useState, useEffect } from 'react'
import { useRobot } from '../context/RobotContext'

export default function Profiles() {
  const [profiles, setProfiles] = useState([])
  const [activating, setActivating] = useState(null)
  const { activeProfile, ready, activate } = useRobot()

  useEffect(() => {
    fetch('/profiles').then((r) => r.json()).then(setProfiles)
  }, [])

  async function handleActivate(profile) {
    setActivating(profile.id)
    await activate(profile)
    setActivating(null)
  }

  return (
    <div className="page">
      <h1>Profiles</h1>
      <p className="text-secondary" style={{ marginBottom: '20px' }}>
        Select a profile to load into the device registry.
      </p>
      <div className="profile-list">
        {profiles.length === 0 && (
          <p className="empty">No profiles found. Add a profile.json to the profiles/ directory.</p>
        )}
        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id
          return (
            <div key={p.id} className={`profile-card${isActive ? ' active' : ''}`}>
              <div className="profile-info">
                <h2>{p.label}</h2>
                <span className="profile-url">{p.id}</span>
              </div>
              <button
                className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handleActivate(p)}
                disabled={activating === p.id}
              >
                {activating === p.id ? 'Loading…' : isActive && ready ? 'Active' : 'Activate'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
