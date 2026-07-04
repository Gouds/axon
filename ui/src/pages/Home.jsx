import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRobot } from '../context/RobotContext'

export default function Home() {
  const [profiles, setProfiles] = useState([])
  const [connecting, setConnecting] = useState(null)
  const { connect, simulate, activeProfile, simulated } = useRobot()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/profiles').then((r) => r.json()).then(setProfiles)
  }, [])

  async function handleConnect(profile) {
    setConnecting(profile.id)
    await connect(profile)
    setConnecting(null)
    navigate('/dashboard')
  }

  async function handleSimulate(profile) {
    setConnecting(`sim:${profile.id}`)
    await simulate(profile)
    setConnecting(null)
    navigate('/dashboard')
  }

  return (
    <div className="page">
      <h1>Robots</h1>
      <div className="profile-list">
        {profiles.length === 0 && (
          <p className="empty">No profiles found. Add a profile.json to the profiles/ directory.</p>
        )}
        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id
          const isConnecting = connecting === p.id || connecting === `sim:${p.id}`
          return (
            <div key={p.id} className={`profile-card${isActive ? ' active' : ''}`}>
              <div className="profile-info">
                <h2>{p.label}</h2>
                <span className="profile-url">{p.brain_url}</span>
              </div>
              <div className="profile-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSimulate(p)}
                  disabled={isConnecting || (isActive && simulated)}
                >
                  {connecting === `sim:${p.id}` ? 'Loading…' : isActive && simulated ? 'Simulating' : 'Simulate'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleConnect(p)}
                  disabled={isConnecting || (isActive && !simulated)}
                >
                  {connecting === p.id ? 'Connecting…' : isActive && !simulated ? 'Connected' : 'Connect'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
