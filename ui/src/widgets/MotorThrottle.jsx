import { useState, useCallback } from 'react'
import { dispatch } from '../utils/dispatch'

export default function MotorThrottle({ device }) {
  const [speed, setSpeed] = useState(0)
  const name = device.config?.name || device.id

  const send = useCallback((val) => {
    if (val === 0) {
      dispatch(device.id, 'stop')
    } else {
      dispatch(device.id, 'spin', { speed: val })
    }
  }, [device.id])

  function handleChange(e) {
    const val = parseInt(e.target.value)
    setSpeed(val)
    send(val)
  }

  function handleRelease() {
    setSpeed(0)
    send(0)
  }

  const pct = Math.abs(speed)
  const dir = speed > 0 ? 'FWD' : speed < 0 ? 'REV' : 'STOP'
  const dirClass = speed > 0 ? 'fwd' : speed < 0 ? 'rev' : ''

  return (
    <div className="widget-motor">
      <div className="widget-motor-label">
        <span className="widget-name">{name}</span>
        <span className={`motor-dir ${dirClass}`}>{dir}</span>
      </div>
      <div className="widget-motor-track">
        <span className="motor-mark motor-mark-top">F</span>
        <input
          type="range"
          className="motor-slider"
          min="-100"
          max="100"
          step="1"
          value={speed}
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
        />
        <span className="motor-mark motor-mark-bot">R</span>
      </div>
      <span className="motor-speed">{pct}%</span>
    </div>
  )
}
