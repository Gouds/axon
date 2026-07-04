import { useState, useEffect, useRef } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

export default function MotorJoystick({ device, widgetConfig = {} }) {
  const { subscribe } = useEventBus()
  const [speed, setSpeed]         = useState(0)
  const [direction, setDirection] = useState('stopped')
  const sliderRef = useRef(null)

  const name     = device.config?.name || device.id
  const axis     = widgetConfig.axis      ?? 'horizontal'
  const snap     = widgetConfig.snap      ?? true
  const labelNeg = widgetConfig.label_neg ?? (axis === 'vertical' ? 'DOWN' : 'LEFT')
  const labelPos = widgetConfig.label_pos ?? (axis === 'vertical' ? 'UP'   : 'RIGHT')
  const invert   = widgetConfig.invert    ?? false

  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      setSpeed(data.speed ?? 0)
      setDirection(data.direction ?? 'stopped')
    })
  }, [device.id, subscribe])

  function handleChange(e) {
    let val = parseInt(e.target.value)
    if (invert) val = -val
    const dir = val > 0 ? 'positive' : val < 0 ? 'negative' : 'stopped'
    setSpeed(Math.abs(val))
    setDirection(dir)
    dispatch(device.id, 'spin', { speed: val })
  }

  function handleRelease() {
    if (!snap) return
    setSpeed(0)
    setDirection('stopped')
    if (sliderRef.current) sliderRef.current.value = 0
    dispatch(device.id, 'stop')
  }

  const isPos     = direction === 'positive'
  const isNeg     = direction === 'negative'
  const activeDir = isPos ? labelPos : isNeg ? labelNeg : 'STOP'

  if (axis === 'vertical') {
    return (
      <div className="widget-joystick widget-joystick-v">
        <div className="joystick-header">
          <span className="widget-name">{name}</span>
          <span className={`joystick-dir-badge ${isPos ? 'pos' : isNeg ? 'neg' : 'stopped'}`}>
            {activeDir}
          </span>
        </div>
        <div className="joystick-v-track">
          <span className="joystick-label">{labelPos}</span>
          <input
            ref={sliderRef}
            type="range"
            className="joystick-slider-v"
            min="-100"
            max="100"
            defaultValue="0"
            onChange={handleChange}
            onMouseUp={handleRelease}
            onTouchEnd={handleRelease}
          />
          <span className="joystick-label">{labelNeg}</span>
        </div>
        <div className="joystick-speed">{speed > 0 ? `${speed}%` : '—'}</div>
      </div>
    )
  }

  return (
    <div className="widget-joystick widget-joystick-h">
      <div className="joystick-header">
        <span className="widget-name">{name}</span>
        <span className={`joystick-dir-badge ${isPos ? 'pos' : isNeg ? 'neg' : 'stopped'}`}>
          {activeDir}
        </span>
      </div>
      <div className="joystick-h-track">
        <span className="joystick-label">{labelNeg}</span>
        <input
          ref={sliderRef}
          type="range"
          className="joystick-slider-h"
          min="-100"
          max="100"
          defaultValue="0"
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
        />
        <span className="joystick-label">{labelPos}</span>
      </div>
      <div className="joystick-speed-bar-wrap">
        <div
          className={`joystick-speed-bar ${isPos ? 'pos' : isNeg ? 'neg' : ''}`}
          style={{ width: `${speed}%` }}
        />
      </div>
      <div className="joystick-speed">{speed > 0 ? `${speed}%` : '—'}</div>
    </div>
  )
}
