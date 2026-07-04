import { useRobot } from '../context/RobotContext'

export default function ConnectionBadge() {
  const { activeProfile, connected, simulated } = useRobot()

  const dotClass = !connected ? 'disconnected' : simulated ? 'simulated' : 'connected'
  const label = connected && activeProfile
    ? `${activeProfile.label}${simulated ? ' (sim)' : ''}`
    : 'Not connected'

  return (
    <div className="connection-badge">
      <span className={`dot ${dotClass}`} />
      <span className="badge-label">{label}</span>
    </div>
  )
}
