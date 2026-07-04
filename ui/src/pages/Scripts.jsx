import { useState, useEffect, useCallback } from 'react'
import { useRobot } from '../context/RobotContext'
import { useEventBus } from '../context/EventBusContext'
import { actionsForPlugin, paramsSchema, defaultParams } from '../utils/actionRegistry'

// ── Trigger types ─────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'manual',  label: 'Manual',  desc: 'Run from the UI' },
  { value: 'startup', label: 'Startup', desc: 'Run when the brain starts' },
  { value: 'schedule', label: 'Schedule', desc: 'Run on a repeating interval' },
]

// ── Param field renderer ──────────────────────────────────

function ParamField({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select className="form-input form-input-sm" value={value ?? field.default}
        onChange={(e) => {
          const v = e.target.value
          onChange(isNaN(Number(v)) || v === '' ? v : Number(v))
        }}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'range') {
    return (
      <div className="script-range-row">
        <input type="range" min={field.min} max={field.max}
          value={value ?? field.default ?? 0}
          onChange={(e) => onChange(Number(e.target.value))} />
        <span className="script-range-val">{value ?? field.default ?? 0}</span>
      </div>
    )
  }
  if (field.type === 'number') {
    return (
      <input type="number" className="form-input form-input-sm"
        min={field.min} max={field.max}
        value={value ?? field.default ?? 0}
        onChange={(e) => onChange(Number(e.target.value))} />
    )
  }
  return (
    <input type="text" className="form-input form-input-sm"
      placeholder={field.placeholder || ''}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)} />
  )
}

// ── Step editor ───────────────────────────────────────────

function StepEditor({ step, devices, scripts, onChange, onRemove, index }) {
  const device = devices.find((d) => d.id === step.device)
  const pluginType = device?.plugin
  const actions = pluginType ? actionsForPlugin(pluginType) : []
  const schema  = (step.type === 'action' && pluginType && step.action)
    ? paramsSchema(pluginType, step.action)
    : []

  function setField(key, val) {
    onChange({ ...step, [key]: val })
  }

  function setParam(key, val) {
    onChange({ ...step, params: { ...(step.params || {}), [key]: val } })
  }

  function changeDevice(deviceId) {
    const dev = devices.find((d) => d.id === deviceId)
    const firstAction = dev ? actionsForPlugin(dev.plugin)[0] : ''
    onChange({
      ...step,
      device: deviceId,
      action: firstAction,
      params: dev && firstAction ? defaultParams(dev.plugin, firstAction) : {},
    })
  }

  function changeAction(action) {
    onChange({
      ...step,
      action,
      params: pluginType ? defaultParams(pluginType, action) : {},
    })
  }

  return (
    <div className="script-step">
      <div className="script-step-header">
        <span className="script-step-num">{index + 1}</span>

        <select className="form-input form-input-sm script-step-type"
          value={step.type}
          onChange={(e) => onChange({ id: step.id, type: e.target.value, ms: 1000, device: '', action: '', params: {}, script_id: '' })}>
          <option value="action">Action</option>
          <option value="wait">Wait</option>
          <option value="run_script">Run Script</option>
        </select>

        <button className="btn-icon script-step-remove" onClick={onRemove} title="Remove step">×</button>
      </div>

      {step.type === 'action' && (
        <div className="script-step-body">
          <div className="script-step-row">
            <label className="script-param-label">Device</label>
            <select className="form-input form-input-sm" value={step.device || ''} onChange={(e) => changeDevice(e.target.value)}>
              <option value="">— choose —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.config?.name || d.id}</option>
              ))}
            </select>
          </div>

          {device && (
            <div className="script-step-row">
              <label className="script-param-label">Action</label>
              <select className="form-input form-input-sm" value={step.action || ''} onChange={(e) => changeAction(e.target.value)}>
                <option value="">— choose —</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {schema.map((field) => (
            <div key={field.key} className="script-step-row">
              <label className="script-param-label">{field.label}</label>
              <ParamField
                field={field}
                value={step.params?.[field.key]}
                onChange={(val) => setParam(field.key, val)}
              />
            </div>
          ))}
        </div>
      )}

      {step.type === 'wait' && (
        <div className="script-step-body">
          <div className="script-step-row">
            <label className="script-param-label">Duration</label>
            <div className="script-wait-row">
              <input type="number" className="form-input form-input-sm" min="0"
                value={step.ms ?? 1000}
                onChange={(e) => setField('ms', Number(e.target.value))} />
              <span className="script-param-label">ms</span>
              <div className="script-wait-presets">
                {[500, 1000, 2000, 5000].map((ms) => (
                  <button key={ms} className="btn btn-secondary btn-xs"
                    onClick={() => setField('ms', ms)}>
                    {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step.type === 'run_script' && (
        <div className="script-step-body">
          <div className="script-step-row">
            <label className="script-param-label">Script</label>
            <select className="form-input form-input-sm"
              value={step.script_id || ''}
              onChange={(e) => setField('script_id', e.target.value)}>
              <option value="">— choose —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Script editor panel ───────────────────────────────────

function ScriptEditor({ script, devices, allScripts, onSave, onRun, onStop, onDelete }) {
  const [draft, setDraft] = useState(script)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(script)

  useEffect(() => { setDraft(script) }, [script])

  function setField(key, val) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function setTriggerField(key, val) {
    setDraft((d) => ({ ...d, trigger: { ...(d.trigger || {}), [key]: val } }))
  }

  function addStep() {
    const id = `step-${Date.now()}`
    setDraft((d) => ({
      ...d,
      steps: [...(d.steps || []), { id, type: 'action', device: '', action: '', params: {} }],
    }))
  }

  function updateStep(index, updated) {
    setDraft((d) => {
      const steps = [...d.steps]
      steps[index] = updated
      return { ...d, steps }
    })
  }

  function removeStep(index) {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }))
  }

  function moveStep(index, dir) {
    setDraft((d) => {
      const steps = [...d.steps]
      const swap = index + dir
      if (swap < 0 || swap >= steps.length) return d;
      [steps[index], steps[swap]] = [steps[swap], steps[index]]
      return { ...d, steps }
    })
  }

  const otherScripts = allScripts.filter((s) => s.id !== draft.id)
  const triggerType  = draft.trigger?.type || 'manual'

  return (
    <div className="script-editor">
      <div className="script-editor-header">
        <input
          className="script-name-input"
          value={draft.name || ''}
          placeholder="Script name"
          onChange={(e) => setField('name', e.target.value)}
        />
        <div className="script-editor-actions">
          {isDirty && (
            <button className="btn btn-primary" onClick={() => onSave(draft)}>Save</button>
          )}
          <button
            className={`btn ${script.running ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => script.running ? onStop(script.id) : onRun(script.id)}
          >
            {script.running ? '■ Stop' : '▶ Run'}
          </button>
          <button className="btn btn-danger-ghost" onClick={() => onDelete(script.id)} title="Delete script">Delete</button>
        </div>
      </div>

      <div className="script-trigger-row">
        <span className="script-section-label">Trigger</span>
        <div className="script-trigger-pills">
          {TRIGGER_TYPES.map((t) => (
            <button
              key={t.value}
              className={`lights-pill${triggerType === t.value ? ' active' : ''}`}
              onClick={() => setTriggerField('type', t.value)}
              title={t.desc}
            >{t.label}</button>
          ))}
        </div>
        {triggerType === 'schedule' && (
          <div className="script-schedule-row">
            <span className="script-param-label">Every</span>
            <input type="number" className="form-input form-input-sm" min="1"
              value={draft.trigger?.interval_seconds || 60}
              onChange={(e) => setTriggerField('interval_seconds', Number(e.target.value))} />
            <span className="script-param-label">seconds</span>
          </div>
        )}
      </div>

      <div className="script-steps-header">
        <span className="script-section-label">Steps</span>
        <button className="btn btn-secondary btn-sm" onClick={addStep}>+ Add Step</button>
      </div>

      {(!draft.steps || draft.steps.length === 0) && (
        <div className="script-empty-steps">No steps yet — add one above.</div>
      )}

      <div className="script-steps-list">
        {(draft.steps || []).map((step, i) => (
          <div key={step.id} className="script-step-wrap">
            <div className="script-step-arrows">
              <button className="btn-icon" onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
              <button className="btn-icon" onClick={() => moveStep(i, 1)} disabled={i === draft.steps.length - 1}>↓</button>
            </div>
            <StepEditor
              step={step}
              index={i}
              devices={devices}
              scripts={otherScripts}
              onChange={(updated) => updateStep(i, updated)}
              onRemove={() => removeStep(i)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Scripts page ─────────────────────────────────────

export default function Scripts() {
  const { activeProfile } = useRobot()
  const { subscribe }     = useEventBus()
  const [scripts, setScripts]         = useState([])
  const [selectedId, setSelectedId]   = useState(null)
  const [runningIds, setRunningIds]   = useState(new Set())

  const fetchScripts = useCallback(async () => {
    const data = await fetch('/scripts').then((r) => r.json()).catch(() => [])
    setScripts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  // Listen for script status events
  useEffect(() => {
    const unsubs = []
    scripts.forEach((s) => {
      unsubs.push(subscribe(`script.${s.id}`, (data) => {
        setRunningIds((prev) => {
          const next = new Set(prev)
          if (data.status === 'running') next.add(s.id)
          else next.delete(s.id)
          return next
        })
      }))
    })
    return () => unsubs.forEach((fn) => fn())
  }, [scripts, subscribe])

  async function createScript() {
    try {
      const res = await fetch('/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Script', trigger: { type: 'manual' }, steps: [] }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const created = await res.json()
      setScripts((prev) => [...prev, created])
      setSelectedId(created.id)
    } catch (e) {
      console.error('Failed to create script:', e)
      alert(`Could not create script: ${e.message}`)
    }
  }

  async function saveScript(draft) {
    const res = await fetch(`/scripts/${draft.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const saved = await res.json()
    setScripts((prev) => prev.map((s) => s.id === saved.id ? saved : s))
  }

  async function runScript(id) {
    await fetch(`/scripts/${id}/run`, { method: 'POST' })
    setRunningIds((prev) => new Set([...prev, id]))
  }

  async function stopScript(id) {
    await fetch(`/scripts/${id}/stop`, { method: 'POST' })
    setRunningIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  async function deleteScript(id) {
    await fetch(`/scripts/${id}`, { method: 'DELETE' })
    setScripts((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const devices   = activeProfile?.devices || []
  const selected  = scripts.find((s) => s.id === selectedId)
  const enriched  = scripts.map((s) => ({ ...s, running: runningIds.has(s.id) }))
  const selectedE = enriched.find((s) => s.id === selectedId)

  return (
    <div className="page scripts-page">
      <div className="scripts-sidebar">
        <div className="scripts-sidebar-header">
          <h2>Scripts</h2>
          <button className="btn btn-primary btn-sm" onClick={createScript}>+ New</button>
        </div>

        {enriched.length === 0 && (
          <p className="scripts-empty">No scripts yet.</p>
        )}

        {enriched.map((s) => (
          <button
            key={s.id}
            className={`script-list-item${selectedId === s.id ? ' active' : ''}`}
            onClick={() => setSelectedId(s.id)}
          >
            <div className="script-list-name">{s.name || 'Untitled'}</div>
            <div className="script-list-meta">
              <span className={`script-trigger-badge ${s.trigger?.type || 'manual'}`}>
                {s.trigger?.type || 'manual'}
              </span>
              {s.running && <span className="script-running-dot" title="Running" />}
            </div>
          </button>
        ))}
      </div>

      <div className="scripts-main">
        {selectedE ? (
          <ScriptEditor
            key={selectedE.id}
            script={selectedE}
            devices={devices}
            allScripts={enriched}
            onSave={saveScript}
            onRun={runScript}
            onStop={stopScript}
            onDelete={deleteScript}
          />
        ) : (
          <div className="scripts-placeholder">
            <p>Select a script or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
