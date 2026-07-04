import { useState } from 'react'
import { useRobot } from '../context/RobotContext'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WIDGET_REGISTRY, widgetsForPlugin, defaultWidgetConfig } from '../widgets/index'

// ── Shared config form fields ─────────────────────────────

function ConfigFields({ schema, values, onChange }) {
  return (
    <div className="add-widget-config">
      {schema.map((field) => (
        <div key={field.key} className="form-field">
          <label className="form-label">{field.label}</label>

          {field.type === 'select' && (
            <select
              className="form-input"
              value={values[field.key] ?? field.default}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {field.type === 'boolean' && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={values[field.key] ?? field.default}
                onChange={(e) => onChange(field.key, e.target.checked)}
              />
              <span className="toggle-text">
                {(values[field.key] ?? field.default) ? 'Yes' : 'No'}
              </span>
            </label>
          )}

          {field.type === 'string' && (
            <input
              type="text"
              className="form-input"
              value={values[field.key] ?? field.default}
              placeholder={field.placeholder || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Edit widget config panel ──────────────────────────────

function EditWidgetPanel({ widget, device, onSave, onClose }) {
  const schema = WIDGET_REGISTRY[widget.type]?.configSchema ?? []
  const [cfg, setCfg] = useState({ ...defaultWidgetConfig(widget.type), ...(widget.config || {}) })

  function setField(key, value) {
    setCfg((prev) => ({ ...prev, [key]: value }))
  }

  const deviceName = device?.config?.name || device?.id || widget.device

  return (
    <div className="add-widget-overlay" onClick={onClose}>
      <div className="add-widget-panel" onClick={(e) => e.stopPropagation()}>
        <div className="add-widget-header">
          <h3>Edit Widget</h3>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="edit-widget-meta">
          <span className="add-widget-device">{deviceName}</span>
          <span className="add-widget-type">{WIDGET_REGISTRY[widget.type]?.label || widget.type}</span>
        </div>

        {schema.length > 0 ? (
          <ConfigFields schema={schema} values={cfg} onChange={setField} />
        ) : (
          <p className="edit-widget-no-config">This widget has no configurable options.</p>
        )}

        <div className="form-actions" style={{ padding: '8px 0 4px' }}>
          <button className="btn btn-primary" onClick={() => onSave(cfg)}>Save</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Sortable widget wrapper ───────────────────────────────

function SortableWidget({ widget, device, profile, editMode, onRemove, onResize, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const entry = WIDGET_REGISTRY[widget.type]
  const WidgetComponent = entry?.component
  if (!device || !WidgetComponent) return null

  const size = widget.size ?? 1
  const hasConfig = !!entry?.configSchema?.length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`widget-cell size-${size}${editMode ? ' edit-mode' : ''}`}
    >
      {editMode && (
        <div className="widget-edit-bar">
          <span className="drag-handle" {...attributes} {...listeners} title="Drag">⠿</span>
          <div className="widget-size-btns">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`size-btn${size === n ? ' active' : ''}`}
                onClick={() => onResize(widget.id, n)}
              >{n}</button>
            ))}
          </div>
          {hasConfig && (
            <button
              className="widget-edit-cfg-btn"
              onClick={() => onEdit(widget.id)}
              title="Edit settings"
            >✎</button>
          )}
          <button className="widget-remove-btn" onClick={() => onRemove(widget.id)} title="Remove">×</button>
        </div>
      )}
      <div className="widget-card">
        <WidgetComponent
          device={device}
          profile={profile}
          widgetConfig={widget.config || {}}
        />
      </div>
    </div>
  )
}

// ── Add widget panel (2-step) ─────────────────────────────

function AddWidgetPanel({ profile, onAdd, onClose }) {
  const [pending, setPending]     = useState(null)
  const [widgetCfg, setWidgetCfg] = useState({})

  function selectWidget(deviceId, widgetType) {
    const schema = WIDGET_REGISTRY[widgetType]?.configSchema
    if (schema?.length) {
      setPending({ deviceId, widgetType })
      setWidgetCfg(defaultWidgetConfig(widgetType))
    } else {
      onAdd(deviceId, widgetType, {})
      onClose()
    }
  }

  function setField(key, value) {
    setWidgetCfg((prev) => ({ ...prev, [key]: value }))
  }

  const schema = pending ? WIDGET_REGISTRY[pending.widgetType]?.configSchema : null

  return (
    <div className="add-widget-overlay" onClick={onClose}>
      <div className="add-widget-panel" onClick={(e) => e.stopPropagation()}>

        {!pending ? (
          <>
            <div className="add-widget-header">
              <h3>Add Widget</h3>
              <button className="btn-icon" onClick={onClose}>×</button>
            </div>
            <div className="add-widget-list">
              {(profile?.devices || []).flatMap((device) =>
                widgetsForPlugin(device.plugin).map((wt) => (
                  <button
                    key={`${device.id}-${wt.type}`}
                    className="add-widget-item"
                    onClick={() => selectWidget(device.id, wt.type)}
                  >
                    <span className="add-widget-device">{device.config?.name || device.id}</span>
                    <span className="add-widget-type">{wt.label}</span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="add-widget-header">
              <button className="btn-icon" onClick={() => setPending(null)} title="Back">←</button>
              <h3>Configure Widget</h3>
              <button className="btn-icon" onClick={onClose}>×</button>
            </div>

            <ConfigFields schema={schema} values={widgetCfg} onChange={setField} />

            <div className="form-actions" style={{ padding: '0 0 4px' }}>
              <button
                className="btn btn-primary"
                onClick={() => { onAdd(pending.deviceId, pending.widgetType, widgetCfg); onClose() }}
              >Add Widget</button>
              <button className="btn btn-secondary" onClick={() => setPending(null)}>Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Control page ─────────────────────────────────────

export default function Control() {
  const { activeProfile, setActiveProfile } = useRobot()
  const [activeScreenId, setActiveScreenId] = useState(null)
  const [editMode, setEditMode]             = useState(false)
  const [showAddPanel, setShowAddPanel]     = useState(false)
  const [editingWidgetId, setEditingWidgetId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  if (!activeProfile) {
    return <div className="page"><p className="empty">No profile active.</p></div>
  }

  const screens = activeProfile.screens || []
  const currentScreen = screens.find((s) => s.id === activeScreenId) ?? screens[0]
  const widgets = currentScreen?.widgets ?? []

  const editingWidget = editingWidgetId
    ? widgets.find((w) => w.id === editingWidgetId)
    : null
  const editingDevice = editingWidget
    ? activeProfile.devices?.find((d) => d.id === editingWidget.device)
    : null

  async function saveScreens(updatedScreens) {
    const updated = { ...activeProfile, screens: updatedScreens }
    setActiveProfile(updated)
    await fetch(`/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }

  function patchCurrentScreen(updatedWidgets) {
    saveScreens(screens.map((s) =>
      s.id === currentScreen.id ? { ...s, widgets: updatedWidgets } : s
    ))
  }

  function addScreen() {
    const id = `screen-${Date.now()}`
    saveScreens([...screens, { id, label: 'New Screen', widgets: [] }])
    setActiveScreenId(id)
  }

  function renameScreen(id, label) {
    saveScreens(screens.map((s) => s.id === id ? { ...s, label } : s))
  }

  function deleteScreen(id) {
    if (screens.length <= 1) return
    const updated = screens.filter((s) => s.id !== id)
    if (currentScreen?.id === id) setActiveScreenId(updated[0]?.id ?? null)
    saveScreens(updated)
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id || !currentScreen) return
    const oldIdx = widgets.findIndex((w) => w.id === active.id)
    const newIdx = widgets.findIndex((w) => w.id === over.id)
    patchCurrentScreen(arrayMove(widgets, oldIdx, newIdx))
  }

  function addWidget(deviceId, widgetType, config) {
    patchCurrentScreen([
      ...widgets,
      { id: `w-${Date.now()}`, device: deviceId, type: widgetType, size: 1, config },
    ])
  }

  function removeWidget(widgetId) {
    patchCurrentScreen(widgets.filter((w) => w.id !== widgetId))
  }

  function resizeWidget(widgetId, size) {
    patchCurrentScreen(widgets.map((w) => w.id === widgetId ? { ...w, size } : w))
  }

  function saveWidgetConfig(widgetId, config) {
    patchCurrentScreen(widgets.map((w) => w.id === widgetId ? { ...w, config } : w))
    setEditingWidgetId(null)
  }

  return (
    <div className="page control-page">

      <div className="control-header">
        <div className="screen-tabs">
          {screens.map((s) => {
            const isActive = currentScreen?.id === s.id
            return (
              <div key={s.id} className={`screen-tab-wrap${isActive ? ' active' : ''}`}>
                {editMode && isActive ? (
                  <input
                    className="screen-tab-input"
                    value={s.label}
                    onChange={(e) => renameScreen(s.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                  />
                ) : (
                  <button
                    className={`screen-tab${isActive ? ' active' : ''}`}
                    onClick={() => setActiveScreenId(s.id)}
                  >
                    {s.label}
                  </button>
                )}
                {editMode && screens.length > 1 && (
                  <button
                    className="screen-tab-del"
                    onClick={() => deleteScreen(s.id)}
                    title="Delete screen"
                  >×</button>
                )}
              </div>
            )
          })}
          {editMode && (
            <button className="screen-tab screen-tab-add" onClick={addScreen}>+ Screen</button>
          )}
        </div>

        <div className="control-header-actions">
          {editMode && (
            <button className="btn btn-secondary" onClick={() => setShowAddPanel(true)}>
              + Widget
            </button>
          )}
          <button
            className={`btn ${editMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setEditMode((v) => !v); setShowAddPanel(false); setEditingWidgetId(null) }}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="widget-empty">
          <p>No widgets on this screen.</p>
          {!editMode && (
            <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
              Edit to add widgets →
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="widget-grid">
              {widgets.map((widget) => {
                const device = activeProfile.devices?.find((d) => d.id === widget.device)
                return (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    device={device}
                    profile={activeProfile}
                    editMode={editMode}
                    onRemove={removeWidget}
                    onResize={resizeWidget}
                    onEdit={setEditingWidgetId}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAddPanel && (
        <AddWidgetPanel
          profile={activeProfile}
          onAdd={addWidget}
          onClose={() => setShowAddPanel(false)}
        />
      )}

      {editingWidget && (
        <EditWidgetPanel
          widget={editingWidget}
          device={editingDevice}
          onSave={(cfg) => saveWidgetConfig(editingWidget.id, cfg)}
          onClose={() => setEditingWidgetId(null)}
        />
      )}
    </div>
  )
}
