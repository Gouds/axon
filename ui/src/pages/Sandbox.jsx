import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRobot } from '../context/RobotContext'
import { useEventBus } from '../context/EventBusContext'
import { dispatch } from '../utils/dispatch'

// ── Geometry ──────────────────────────────────────────────
// 0° = TOP = REAR   (matches reference diagram orientation)
// 180° = BOTTOM = FRONT
// Clockwise

const CX = 250, CY = 250

const R_DOME    = 235   // dome outer wall
const R_RIM_OUT = 215   // outer panel ring outer edge
const R_RIM_IN  = 178   // outer panel ring inner edge
const R_PIE_OUT = 167   // pie sector outer edge (gap between rim and pie)
const R_PIE_IN  =  60   // pie sector inner edge
const R_CENTER  =  34   // centre decorative circle

function polar(deg, r) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function f(n) { return n.toFixed(1) }

function sectorPath(a1, a2, r1, r2) {
  const span = ((a2 - a1) + 360) % 360
  const [x1, y1] = polar(a1, r2)
  const [x2, y2] = polar(a2, r2)
  const [x3, y3] = polar(a2, r1)
  const [x4, y4] = polar(a1, r1)
  const lg = span > 180 ? 1 : 0
  return `M${f(x1)},${f(y1)} A${r2},${r2} 0 ${lg} 1 ${f(x2)},${f(y2)} L${f(x3)},${f(y3)} A${r1},${r1} 0 ${lg} 0 ${f(x4)},${f(y4)} Z`
}

function midPolar(a1, a2, r) {
  const span = ((a2 - a1) + 360) % 360
  return polar(a1 + span / 2, r)
}

// ── Layout data ───────────────────────────────────────────
// From the reference diagram (rear at top, front at bottom):
//   PP1=front-right, PP2=right, PP3=rear(top), PP4=rear-left, PP5=left, PP6=front-left
//   P8→P7→P6→P5→P4→P3→P2→P1 going clockwise from near-rear to front-right
//   P14→P13→P12→P11→P10→P9 going counterclockwise from front-left to near-rear

const PIE_PANELS = [
  { id: null,         label: 'PP3', servo: false, a1: 330, a2:  30 },  // rear     (top)
  { id: 'dome-pie-2', label: 'PP2', servo: true,  a1:  30, a2:  90 },  // right
  { id: 'dome-pie-1', label: 'PP1', servo: true,  a1:  90, a2: 150 },  // front-right
  { id: 'dome-pie-6', label: 'PP6', servo: true,  a1: 150, a2: 210 },  // front-left
  { id: 'dome-pie-5', label: 'PP5', servo: true,  a1: 210, a2: 270 },  // left
  { id: null,         label: 'PP4', servo: false, a1: 270, a2: 330 },  // rear-left
]

const RIM_PANELS = [
  // ── servo-controlled (interactive) ──
  { id: 'dome-panel-7',  label: 'P7',  servo: true,  a1:  26, a2:  37 },
  { id: 'dome-panel-4',  label: 'P4',  servo: true,  a1:  66, a2:  78 },
  { id: 'dome-panel-3',  label: 'P3',  servo: true,  a1:  79, a2:  91 },
  { id: 'dome-panel-2',  label: 'P2',  servo: true,  a1:  93, a2: 108 },
  { id: 'dome-panel-1',  label: 'P1',  servo: true,  a1: 111, a2: 144 },
  { id: 'dome-panel-13', label: 'P13', servo: true,  a1: 200, a2: 218 },
  { id: 'dome-panel-11', label: 'P11', servo: true,  a1: 231, a2: 250 },
  // ── decorative (no servo) ──
  { id: null, label: 'P8',  servo: false, a1:  14, a2:  24 },
  { id: null, label: 'P6',  servo: false, a1:  39, a2:  52 },
  { id: null, label: 'P5',  servo: false, a1:  54, a2:  65 },
  { id: null, label: 'P14', servo: false, a1: 187, a2: 199 },
  { id: null, label: 'P12', servo: false, a1: 219, a2: 231 },
  { id: null, label: 'P10', servo: false, a1: 255, a2: 278 },
  { id: null, label: 'P9',  servo: false, a1: 316, a2: 337 },
]

const HOLO_PANELS = [
  { id: 'holo-1-1', id2: 'holo-1-2', label: 'HP1 Front' },
  { id: 'holo-2-1', id2: 'holo-2-2', label: 'HP2 Rear'  },
  { id: 'holo-3-1', id2: 'holo-3-2', label: 'HP3 Top'   },
]

// ── Colour helpers ────────────────────────────────────────

function fill(state, servo, hasDevice) {
  if (!servo || !hasDevice) return '#111'
  return state === 'open' ? '#2563eb' : '#102448'
}

function stroke(state, servo, hasDevice) {
  if (!servo || !hasDevice) return '#1e1e1e'
  return state === 'open' ? '#6699ff' : '#1c3a6e'
}

function labelFill(state, servo, hasDevice) {
  if (!servo || !hasDevice) return '#242424'
  return state === 'open' ? '#fff' : '#2e5090'
}

// ── Component ─────────────────────────────────────────────

export default function Sandbox() {
  const { activeProfile } = useRobot()
  const { subscribe }     = useEventBus()
  const [panelState, setPanelState] = useState({})

  const devices = activeProfile?.devices || []

  const deviceMap = useMemo(() => {
    const m = {}
    for (const d of devices) m[d.id] = d
    return m
  }, [devices])

  const hasDevice = useCallback((id) => !!(id && deviceMap[id]), [deviceMap])

  useEffect(() => {
    const ids = [
      ...PIE_PANELS.map(p => p.id),
      ...RIM_PANELS.map(p => p.id),
      ...HOLO_PANELS.flatMap(h => [h.id, h.id2]),
    ].filter(Boolean)

    const unsubs = ids.map(id => {
      if (!deviceMap[id]) return null
      return subscribe(`${id}.state`, data => {
        if (data.angle === undefined) return
        const cfg = deviceMap[id]?.config || {}
        const toOpen  = Math.abs(data.angle - (cfg.open_angle  ?? 0))
        const toClose = Math.abs(data.angle - (cfg.close_angle ?? 180))
        setPanelState(prev => ({ ...prev, [id]: toOpen <= toClose ? 'open' : 'closed' }))
      })
    }).filter(Boolean)

    return () => unsubs.forEach(fn => fn())
  }, [subscribe, deviceMap])

  function toggle(id) {
    if (!hasDevice(id)) return
    const next = panelState[id] === 'open' ? 'close' : 'open'
    dispatch(id, next)
    setPanelState(prev => ({ ...prev, [id]: next === 'open' ? 'open' : 'closed' }))
  }

  function stateOf(id) { return panelState[id] || 'closed' }

  function openAll() {
    [...PIE_PANELS, ...RIM_PANELS].filter(p => p.id && hasDevice(p.id)).forEach(p => {
      dispatch(p.id, 'open')
      setPanelState(prev => ({ ...prev, [p.id]: 'open' }))
    })
  }
  function closeAll() {
    [...PIE_PANELS, ...RIM_PANELS].filter(p => p.id && hasDevice(p.id)).forEach(p => {
      dispatch(p.id, 'close')
      setPanelState(prev => ({ ...prev, [p.id]: 'closed' }))
    })
  }

  return (
    <div className="page sandbox-page">
      <div className="sandbox-layout">

        {/* ── SVG Dome ── */}
        <div className="sandbox-svg-wrap">
          <div className="sandbox-title-row">
            <h2 className="sandbox-title">Dome</h2>
            <div className="sandbox-actions">
              <button className="btn btn-secondary btn-sm" onClick={openAll}>Open All</button>
              <button className="btn btn-secondary btn-sm" onClick={closeAll}>Close All</button>
            </div>
          </div>

          <svg viewBox="0 0 500 500" className="dome-svg">
            {/* Dome background */}
            <circle cx={CX} cy={CY} r={R_DOME} fill="#080808" stroke="#181818" strokeWidth="2.5" />

            {/* Orientation labels */}
            <text x={CX} y={18} textAnchor="middle" fill="#333" fontSize="10" fontWeight="700" letterSpacing="2">REAR</text>
            <text x={CX} y={490} textAnchor="middle" fill="#333" fontSize="10" fontWeight="700" letterSpacing="2">FRONT</text>

            {/* ── Outer rim panels ── */}
            {RIM_PANELS.map((p, i) => {
              const state = stateOf(p.id)
              const has   = hasDevice(p.id)
              const span  = ((p.a2 - p.a1) + 360) % 360
              const [lx, ly] = midPolar(p.a1, p.a2, (R_RIM_IN + R_RIM_OUT) / 2)
              return (
                <g key={i}
                  style={{ cursor: p.servo && has ? 'pointer' : 'default' }}
                  onClick={() => p.id && toggle(p.id)}
                >
                  <path
                    d={sectorPath(p.a1, p.a2, R_RIM_IN + 1, R_RIM_OUT - 1)}
                    fill={fill(state, p.servo, has)}
                    stroke={stroke(state, p.servo, has)}
                    strokeWidth="1"
                  />
                  {span >= 9 && (
                    <text x={f(lx)} y={f(ly + 3.5)} textAnchor="middle"
                      fill={labelFill(state, p.servo, has)}
                      fontSize="8" fontWeight="700"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{p.label}</text>
                  )}
                </g>
              )
            })}

            {/* ── Pie panel sectors ── */}
            {PIE_PANELS.map((p, i) => {
              const state = stateOf(p.id)
              const has   = hasDevice(p.id)
              const [lx, ly] = midPolar(p.a1, p.a2, (R_PIE_IN + R_PIE_OUT) / 2)
              return (
                <g key={i}
                  style={{ cursor: p.servo && has ? 'pointer' : 'default' }}
                  onClick={() => p.id && toggle(p.id)}
                >
                  <path
                    d={sectorPath(p.a1, p.a2, R_PIE_IN + 1, R_PIE_OUT - 1)}
                    fill={fill(state, p.servo, has)}
                    stroke={stroke(state, p.servo, has)}
                    strokeWidth="1.5"
                  />
                  <text x={f(lx)} y={f(ly + 4)} textAnchor="middle"
                    fill={labelFill(state, p.servo, has)}
                    fontSize="12" fontWeight="700"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >{p.label}</text>
                </g>
              )
            })}

            {/* Centre circle (HP3 area) */}
            <circle cx={CX} cy={CY} r={R_CENTER + 6} fill="#0a0a0a" stroke="#141414" strokeWidth="1.5" />
            <circle cx={CX} cy={CY} r={R_CENTER} fill="#050505" stroke="#0d0d0d" strokeWidth="1" />
            <text x={CX} y={CY + 4} textAnchor="middle" fill="#1a2a3a" fontSize="9" fontWeight="700">HP3</text>

            {/* Guide ring (rim / pie boundary) */}
            <circle cx={CX} cy={CY} r={R_RIM_IN} fill="none" stroke="#0d0d0d" strokeWidth="1" />

            {/* ── HP2 (rear, top) ── */}
            {(() => {
              const [hx, hy] = polar(0, R_DOME - 16)
              return (
                <g>
                  <circle cx={f(hx)} cy={f(hy)} r="13" fill="#070707" stroke="#1a3060" strokeWidth="1.5" />
                  <circle cx={f(hx)} cy={f(hy)} r="7" fill="#030508" stroke="#0d1e35" strokeWidth="1" />
                  <text x={f(hx)} y={f(hy + 18)} textAnchor="middle" fill="#2a4060" fontSize="8" fontWeight="700">HP2</text>
                </g>
              )
            })()}

            {/* ── HP1 (front, lower-right, at ~148°) ── */}
            {(() => {
              const [hx, hy] = polar(148, R_DOME - 16)
              return (
                <g>
                  <circle cx={f(hx)} cy={f(hy)} r="13" fill="#070707" stroke="#1a3060" strokeWidth="1.5" />
                  <circle cx={f(hx)} cy={f(hy)} r="7" fill="#030508" stroke="#0d1e35" strokeWidth="1" />
                  <text x={f(hx)} y={f(hy + 18)} textAnchor="middle" fill="#2a4060" fontSize="8" fontWeight="700">HP1</text>
                </g>
              )
            })()}

            {/* ── FLDs (front logic displays, bottom) ── */}
            {(() => {
              const [fx, fy] = polar(180, R_DOME - 22)
              return (
                <g>
                  <rect x={fx - 32} y={fy - 9} width={64} height={16} rx={3}
                    fill="#050c18" stroke="#0c1e36" strokeWidth="1.5" />
                  <rect x={fx - 29} y={fy - 6} width={25} height={10} rx={2} fill="#08142a" />
                  <rect x={fx + 4}  y={fy - 6} width={25} height={10} rx={2} fill="#08142a" />
                  {[0,1,2].map(j => <circle key={j} cx={fx - 22 + j*10} cy={fy + 0} r={2.5} fill="#0f2a4a" />)}
                  {[0,1,2].map(j => <circle key={j} cx={fx + 11 + j*10} cy={fy + 0} r={2.5} fill="#0f2a4a" />)}
                  <text x={fx} y={fy + 22} textAnchor="middle" fill="#1a3060" fontSize="8" fontWeight="700">FLDs</text>
                </g>
              )
            })()}

            {/* ── RLD (rear logic display, left ~285°) ── */}
            {(() => {
              const [rx, ry] = polar(286, R_DOME - 22)
              return (
                <g>
                  <rect x={rx - 8} y={ry - 16} width={16} height={32} rx={3}
                    fill="#050c18" stroke="#0c1e36" strokeWidth="1.5" />
                  {[0,1,2,3].map(j => <circle key={j} cx={rx} cy={ry - 10 + j*7} r={2} fill="#0f2a4a" />)}
                  <text x={rx - 22} y={ry + 4} textAnchor="end" fill="#1a3060" fontSize="8" fontWeight="700">RLD</text>
                </g>
              )
            })()}

            {/* Dome outer border */}
            <circle cx={CX} cy={CY} r={R_DOME} fill="none" stroke="#111" strokeWidth="3" />
          </svg>
        </div>

        {/* ── Side panel list ── */}
        <div className="sandbox-panel-list">
          <div className="sandbox-section-label">Dome Panels</div>
          {RIM_PANELS.filter(p => p.servo && p.id).map(p => (
            <SandboxRow key={p.id} id={p.id} label={p.label}
              state={stateOf(p.id)} hasDevice={hasDevice(p.id)} onToggle={toggle} />
          ))}

          <div className="sandbox-section-label">Pie Panels</div>
          {PIE_PANELS.filter(p => p.servo && p.id).map(p => (
            <SandboxRow key={p.id} id={p.id} label={p.label}
              state={stateOf(p.id)} hasDevice={hasDevice(p.id)} onToggle={toggle} />
          ))}

          <div className="sandbox-section-label">Holoprojectors</div>
          {HOLO_PANELS.map(h => (
            <div key={h.id} className="sandbox-holo-row">
              <span className="sandbox-panel-name">{h.label}</span>
              <div className="sandbox-holo-btns">
                <button className="btn btn-secondary btn-xs" onClick={() => toggle(h.id)}>
                  {stateOf(h.id) === 'open' ? 'Close Pan' : 'Open Pan'}
                </button>
                <button className="btn btn-secondary btn-xs" onClick={() => toggle(h.id2)}>
                  {stateOf(h.id2) === 'open' ? 'Close Tilt' : 'Open Tilt'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SandboxRow({ id, label, state, hasDevice, onToggle }) {
  const isOpen = state === 'open'
  return (
    <button
      className={`sandbox-panel-row${isOpen ? ' open' : ''}${!hasDevice ? ' no-device' : ''}`}
      onClick={() => onToggle(id)}
      disabled={!hasDevice}
    >
      <span className={`sandbox-indicator${isOpen ? ' open' : ''}`} />
      <span className="sandbox-panel-name">{label}</span>
      <span className="sandbox-panel-state">{hasDevice ? (isOpen ? 'Open' : 'Closed') : 'No device'}</span>
    </button>
  )
}
