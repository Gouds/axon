import { useState, useEffect, useRef } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

export default function DomeRotation({ device }) {
  const { subscribe } = useEventBus()
  const [speed, setSpeed]         = useState(0)
  const [direction, setDirection] = useState('stopped')
  const sliderRef = useRef(null)

  const name = device.config?.name || device.id

  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      setSpeed(data.speed ?? 0)
      setDirection(data.direction ?? 'stopped')
    })
  }, [device.id, subscribe])

  function handleChange(e) {
    const val = parseInt(e.target.value)
    setSpeed(Math.abs(val))
    setDirection(val > 0 ? 'right' : val < 0 ? 'left' : 'stopped')
    dispatch(device.id, 'spin', { speed: val })
  }

  function handleRelease() {
    setSpeed(0)
    setDirection('stopped')
    if (sliderRef.current) sliderRef.current.value = 0
    dispatch(device.id, 'stop')
  }

  const dirLabel = direction === 'right' ? '→ RIGHT'
                 : direction === 'left'  ? 'LEFT ←'
                 : 'STOPPED'

  const dirClass = direction === 'right' ? 'dome-dir-right'
                 : direction === 'left'  ? 'dome-dir-left'
                 : 'dome-dir-stopped'

  return (
    <div className="widget-dome">
      <div className="widget-dome-header">
        <span className="widget-name">{name}</span>
        <span className={`dome-direction-label ${dirClass}`}>{dirLabel}</span>
      </div>

      <div className="dome-track-wrap">
        <span className="dome-track-label left">◀ L</span>
        <input
          ref={sliderRef}
          type="range"
          className="dome-slider"
          min="-100"
          max="100"
          defaultValue="0"
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
        />
        <span className="dome-track-label right">R ▶</span>
      </div>

      <div className="dome-speed-bar-wrap">
        <div
          className={`dome-speed-bar ${dirClass}`}
          style={{ width: `${speed}%` }}
        />
      </div>

      <div className="dome-speed-value">{speed > 0 ? `${speed}%` : '—'}</div>
    </div>
  )
}
