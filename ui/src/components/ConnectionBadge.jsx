import { useRobot } from '../context/RobotContext'

export default function ConnectionBadge() {
  const { activeProfile, ready } = useRobot()

  const dotClass = activeProfile ? (ready ? 'connected' : 'simulated') : 'disconnected'
  const label = activeProfile
    ? `${activeProfile.label}${ready ? '' : ' (no devices)'}`
    : 'No profile active'

  return (
    <div className="connection-badge">
      <span className={`dot ${dotClass}`} />
      <span className="badge-label">{label}</span>
    </div>
  )
}
