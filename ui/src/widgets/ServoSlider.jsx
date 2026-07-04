import { useState } from 'react'
import { dispatch } from '../utils/dispatch'

export default function ServoSlider({ device }) {
  const cfg = device.config || {}
  const name    = cfg.name || device.id
  const minAng  = Math.min(cfg.close_angle ?? 0,   cfg.open_angle ?? 180)
  const maxAng  = Math.max(cfg.close_angle ?? 0,   cfg.open_angle ?? 180)
  const defAng  = cfg.default_angle ?? Math.round((minAng + maxAng) / 2)

  const [angle, setAngle] = useState(defAng)

  function handleChange(e) {
    const val = parseInt(e.target.value)
    setAngle(val)
    dispatch(device.id, 'move', { angle: val })
  }

  // Visual arc: map angle to a 180° sweep for the indicator line
  const sweep = maxAng - minAng || 1
  const pct = (angle - minAng) / sweep
  const deg = -90 + pct * 180  // −90° (left) → +90° (right)

  return (
    <div className="widget-servo">
      <div className="widget-servo-header">
        <span className="widget-name">{name}</span>
        <span className="servo-angle-label">{angle}°</span>
      </div>

      <div className="servo-arc-wrap">
        <div className="servo-arc">
          <div
            className="servo-needle"
            style={{ transform: `rotate(${deg}deg)` }}
          />
        </div>
      </div>

      <input
        type="range"
        className="servo-slider"
        min={minAng}
        max={maxAng}
        value={angle}
        onChange={handleChange}
      />
      <div className="servo-range-labels">
        <span>{minAng}°</span>
        <span>{maxAng}°</span>
      </div>
    </div>
  )
}
