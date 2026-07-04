import { useState, useEffect } from 'react'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

const LOGIC_TARGETS = [
  { value: '0', label: 'All' },
  { value: '1', label: 'Front Logic' },
  { value: '3', label: 'Rear Logic' },
  { value: '4', label: 'Front PSI' },
  { value: '5', label: 'Rear PSI' },
]

const LOGIC_EFFECTS = [
  { value: 0,  label: 'Normal' },
  { value: 1,  label: 'Alarm' },
  { value: 2,  label: 'Failure' },
  { value: 3,  label: 'Leia' },
  { value: 4,  label: 'March' },
  { value: 5,  label: 'Single Colour' },
  { value: 6,  label: 'Flashing' },
  { value: 7,  label: 'Flip Flop' },
  { value: 10, label: 'Rainbow' },
  { value: 22, label: 'Fire' },
  { value: 24, label: 'Pulse' },
  { value: 99, label: 'Random' },
]

const HOLO_TARGETS = [
  { value: 'A', label: 'All' },
  { value: 'F', label: 'Front' },
  { value: 'R', label: 'Rear' },
  { value: 'T', label: 'Top' },
]

const HOLO_SEQUENCES = [
  { value: 1, label: 'Leia' },
  { value: 2, label: 'Flicker' },
  { value: 3, label: 'Pulse' },
  { value: 4, label: 'Cycle' },
  { value: 5, label: 'Single Colour' },
  { value: 6, label: 'Rainbow' },
  { value: 7, label: 'Short Circuit' },
]

const COLOURS = [
  { value: 0, label: 'Default', swatch: '#888' },
  { value: 1, label: 'Red',     swatch: '#e84040' },
  { value: 2, label: 'Orange',  swatch: '#f07030' },
  { value: 3, label: 'Yellow',  swatch: '#e8d020' },
  { value: 4, label: 'Green',   swatch: '#40c040' },
  { value: 5, label: 'Cyan',    swatch: '#20d8d8' },
  { value: 6, label: 'Blue',    swatch: '#4060e8' },
  { value: 7, label: 'Purple',  swatch: '#9040e0' },
  { value: 8, label: 'Magenta', swatch: '#d840a0' },
  { value: 9, label: 'Pink',    swatch: '#f080b0' },
]

const HOLO_COLOURS = [
  { value: 0, label: 'Random',  swatch: '🎲' },
  ...COLOURS.slice(1),
  { value: 9, label: 'White',   swatch: '#f0f0f0' },
]

function TargetPills({ targets, value, onChange }) {
  return (
    <div className="lights-pills">
      {targets.map((t) => (
        <button
          key={t.value}
          className={`lights-pill${value === t.value ? ' active' : ''}`}
          onClick={() => onChange(t.value)}
        >{t.label}</button>
      ))}
    </div>
  )
}

function ColourPicker({ colours, value, onChange }) {
  return (
    <div className="lights-colours">
      {colours.map((c) => (
        <button
          key={c.value}
          className={`lights-swatch${value === c.value ? ' active' : ''}`}
          title={c.label}
          onClick={() => onChange(c.value)}
          style={{ background: c.swatch?.startsWith('#') ? c.swatch : undefined }}
        >
          {!c.swatch?.startsWith('#') && c.swatch}
        </button>
      ))}
    </div>
  )
}

export default function LightsPanel({ device }) {
  const { subscribe } = useEventBus()
  const [tab, setTab]               = useState('logic')
  const [lastCmd, setLastCmd]       = useState(null)

  // Logic state
  const [logicTarget, setLogicTarget]   = useState('0')
  const [logicEffect, setLogicEffect]   = useState(0)
  const [logicColour, setLogicColour]   = useState(0)
  const [logicSpeed, setLogicSpeed]     = useState(0)
  const [logicDuration, setLogicDuration] = useState(0)

  // Holo state
  const [holoTarget, setHoloTarget]     = useState('A')
  const [holoSequence, setHoloSequence] = useState(1)
  const [holoColour, setHoloColour]     = useState(0)
  const [holoDuration, setHoloDuration] = useState(0)

  useEffect(() => {
    return subscribe(`${device.id}.state`, (data) => {
      setLastCmd(data.last_command ?? null)
    })
  }, [device.id, subscribe])

  function sendLogic() {
    dispatch(device.id, 'logic', {
      target:   logicTarget,
      effect:   logicEffect,
      colour:   logicColour,
      speed:    logicSpeed,
      duration: logicDuration,
    })
  }

  function sendHolo() {
    dispatch(device.id, 'holo', {
      target:   holoTarget,
      sequence: holoSequence,
      colour:   holoColour,
      duration: holoDuration,
    })
  }

  const name = device.config?.name || device.id

  return (
    <div className="widget-lights">
      <div className="lights-header">
        <span className="widget-name">{name}</span>
        {lastCmd && <span className="lights-last-cmd">{lastCmd}</span>}
      </div>

      <div className="lights-tabs">
        <button className={`lights-tab${tab === 'logic' ? ' active' : ''}`} onClick={() => setTab('logic')}>Logic Engines</button>
        <button className={`lights-tab${tab === 'holo'  ? ' active' : ''}`} onClick={() => setTab('holo')}>Holos</button>
      </div>

      {tab === 'logic' && (
        <div className="lights-section">
          <div className="lights-row">
            <span className="lights-label">Target</span>
            <TargetPills targets={LOGIC_TARGETS} value={logicTarget} onChange={setLogicTarget} />
          </div>

          <div className="lights-row">
            <span className="lights-label">Effect</span>
            <select className="form-input" value={logicEffect} onChange={(e) => setLogicEffect(Number(e.target.value))}>
              {LOGIC_EFFECTS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div className="lights-row">
            <span className="lights-label">Colour</span>
            <ColourPicker colours={COLOURS} value={logicColour} onChange={setLogicColour} />
          </div>

          <div className="lights-row">
            <span className="lights-label">Speed <span className="lights-val">{logicSpeed}</span></span>
            <input
              type="range" min="0" max="9" value={logicSpeed}
              className="lights-slider"
              onChange={(e) => setLogicSpeed(Number(e.target.value))}
            />
          </div>

          <div className="lights-row">
            <span className="lights-label">Duration <span className="lights-val">{logicDuration === 0 ? '∞' : `${logicDuration}s`}</span></span>
            <input
              type="range" min="0" max="30" value={logicDuration}
              className="lights-slider"
              onChange={(e) => setLogicDuration(Number(e.target.value))}
            />
          </div>

          <button className="btn btn-primary lights-send" onClick={sendLogic}>Send</button>
        </div>
      )}

      {tab === 'holo' && (
        <div className="lights-section">
          <div className="lights-row">
            <span className="lights-label">Target</span>
            <TargetPills targets={HOLO_TARGETS} value={holoTarget} onChange={setHoloTarget} />
          </div>

          <div className="lights-row">
            <span className="lights-label">Sequence</span>
            <select className="form-input" value={holoSequence} onChange={(e) => setHoloSequence(Number(e.target.value))}>
              {HOLO_SEQUENCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="lights-row">
            <span className="lights-label">Colour</span>
            <ColourPicker colours={HOLO_COLOURS} value={holoColour} onChange={setHoloColour} />
          </div>

          <div className="lights-row">
            <span className="lights-label">Duration <span className="lights-val">{holoDuration === 0 ? '∞' : `${holoDuration}s`}</span></span>
            <input
              type="range" min="0" max="30" value={holoDuration}
              className="lights-slider"
              onChange={(e) => setHoloDuration(Number(e.target.value))}
            />
          </div>

          <button className="btn btn-primary lights-send" onClick={sendHolo}>Send</button>
        </div>
      )}
    </div>
  )
}
