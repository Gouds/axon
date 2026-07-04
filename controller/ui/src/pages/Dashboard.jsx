import { useRobot } from '../context/RobotContext'
import { useEventBus } from '../context/EventBusContext'

export default function Dashboard() {
  const { activeProfile, connected } = useRobot()
  const { lastEvents } = useEventBus()

  if (!activeProfile) {
    return (
      <div className="page">
        <p className="empty">No robot connected. Go to Robots to connect.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{activeProfile.label}</h1>
        <span className={`status-chip ${connected ? 'ok' : 'err'}`}>
          {connected ? 'Online' : 'Offline'}
        </span>
        <span className="text-secondary">{activeProfile.brain_url}</span>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Devices</h3>
          <p className="placeholder">No devices configured yet.</p>
        </div>
        <div className="card">
          <h3>Active Rules</h3>
          <p className="placeholder">No rules configured yet.</p>
        </div>
      </div>

      <div className="card">
        <h3>Event Log</h3>
        <div className="log-list">
          {lastEvents.length === 0 && (
            <p className="placeholder">Waiting for events…</p>
          )}
          {lastEvents.map((e, i) => (
            <div key={i} className="log-entry">
              <span className="log-channel">{e.channel}</span>
              <span className="log-data">{JSON.stringify(e.data)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
