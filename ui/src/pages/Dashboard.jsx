import { useRobot } from '../context/RobotContext'
import { useEventBus } from '../context/EventBusContext'

export default function Dashboard() {
  const { activeProfile, ready } = useRobot()
  const { lastEvents } = useEventBus()

  return (
    <div className="page">
      <div className="page-header">
        <h1>{activeProfile ? activeProfile.label : 'Axon'}</h1>
        <span className={`status-chip ${ready ? 'ok' : 'err'}`}>
          {activeProfile ? (ready ? 'Running' : 'No devices') : 'No profile active'}
        </span>
      </div>

      {!activeProfile && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <p className="placeholder">
            No profile active.{' '}
            <a href="/profiles" style={{ color: 'var(--btn-primary)' }}>Go to Profiles →</a>
          </p>
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <h3>Devices</h3>
          {activeProfile?.devices?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeProfile.devices.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{d.config?.name || d.id}</span>
                  <span className="device-plugin-badge">{d.plugin}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="placeholder">No devices configured.</p>
          )}
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
