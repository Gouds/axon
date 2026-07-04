import { useRobot } from '../context/RobotContext'

function dispatch(brainUrl, device_id, action_type, params = {}) {
  return fetch(`${brainUrl}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id, action_type, params }),
  })
}

export default function Control() {
  const { activeProfile, connected } = useRobot()

  if (!connected) {
    return (
      <div className="page">
        <p className="empty">No robot connected.</p>
      </div>
    )
  }

  const brain = activeProfile.brain_url

  return (
    <div className="page">
      <h1>Control</h1>
      <div className="card-grid">
        <div className="card">
          <h3>Virtual Joystick</h3>
          <div className="dpad">
            <button className="dpad-btn dpad-up"    onClick={() => dispatch(brain, 'joystick', 'axis', { ly: 0 })}>▲</button>
            <button className="dpad-btn dpad-left"  onClick={() => dispatch(brain, 'joystick', 'axis', { lx: 0 })}>◀</button>
            <div className="dpad-center" />
            <button className="dpad-btn dpad-right" onClick={() => dispatch(brain, 'joystick', 'axis', { lx: 1023 })}>▶</button>
            <button className="dpad-btn dpad-down"  onClick={() => dispatch(brain, 'joystick', 'axis', { ly: 1023 })}>▼</button>
          </div>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <p className="placeholder">Actions appear here once devices are configured.</p>
        </div>

        <div className="card estop-card">
          <button
            className="btn btn-danger estop"
            onClick={() => dispatch(brain, 'system', 'estop')}
          >
            E-STOP
          </button>
        </div>
      </div>
    </div>
  )
}
