// Maps plugin type → available actions → param field schemas.
// Used by the script builder to render the right form fields per step.

export const ACTION_REGISTRY = {
  aqmh3615ns: {
    spin: [{ key: 'speed', label: 'Speed', type: 'range', min: -100, max: 100, default: 50 }],
    stop: [],
  },
  dc_motor: {
    spin: [{ key: 'speed', label: 'Speed', type: 'range', min: -100, max: 100, default: 50 }],
    stop: [],
  },
  servo: {
    move:  [{ key: 'angle', label: 'Angle (°)', type: 'number', min: 0, max: 180, default: 90 }],
    open:  [],
    close: [],
  },
  audio: {
    play:   [{ key: 'file',     label: 'Filename',          type: 'string', placeholder: 'e.g. STARTSND.mp3' }],
    random: [{ key: 'category', label: 'Category',          type: 'string', placeholder: 'e.g. happy, whistle' }],
    stop:   [],
    volume: [{ key: 'level',    label: 'Volume (0–100)',     type: 'number', min: 0, max: 100, default: 70 }],
  },
  astropixels: {
    logic: [
      { key: 'target',   label: 'Target',             type: 'select', default: '0',
        options: [
          { value: '0', label: 'All' }, { value: '1', label: 'Front Logic' },
          { value: '3', label: 'Rear Logic' }, { value: '4', label: 'Front PSI' },
          { value: '5', label: 'Rear PSI' },
        ],
      },
      { key: 'effect',   label: 'Effect',             type: 'select', default: 99,
        options: [
          { value: 0,  label: 'Normal' }, { value: 1, label: 'Alarm' },
          { value: 2,  label: 'Failure' }, { value: 3, label: 'Leia' },
          { value: 4,  label: 'March' }, { value: 5, label: 'Single Colour' },
          { value: 6,  label: 'Flashing' }, { value: 7, label: 'Flip Flop' },
          { value: 10, label: 'Rainbow' }, { value: 22, label: 'Fire' },
          { value: 24, label: 'Pulse' }, { value: 99, label: 'Random' },
        ],
      },
      { key: 'colour',   label: 'Colour',             type: 'select', default: 0,
        options: [
          { value: 0, label: 'Default' }, { value: 1, label: 'Red' },
          { value: 2, label: 'Orange' },  { value: 3, label: 'Yellow' },
          { value: 4, label: 'Green' },   { value: 5, label: 'Cyan' },
          { value: 6, label: 'Blue' },    { value: 7, label: 'Purple' },
          { value: 8, label: 'Magenta' }, { value: 9, label: 'Pink' },
        ],
      },
      { key: 'speed',    label: 'Speed (0=fast, 9=slow)', type: 'number', min: 0, max: 9, default: 0 },
      { key: 'duration', label: 'Duration seconds (0=∞)', type: 'number', min: 0, max: 99, default: 0 },
    ],
    holo: [
      { key: 'target',   label: 'Target',             type: 'select', default: 'A',
        options: [
          { value: 'A', label: 'All' }, { value: 'F', label: 'Front' },
          { value: 'R', label: 'Rear' }, { value: 'T', label: 'Top' },
        ],
      },
      { key: 'sequence', label: 'Sequence',           type: 'select', default: 1,
        options: [
          { value: 1, label: 'Leia' }, { value: 2, label: 'Flicker' },
          { value: 3, label: 'Pulse' }, { value: 4, label: 'Cycle' },
          { value: 5, label: 'Single Colour' }, { value: 6, label: 'Rainbow' },
          { value: 7, label: 'Short Circuit' },
        ],
      },
      { key: 'colour',   label: 'Colour',             type: 'select', default: 0,
        options: [
          { value: 0, label: 'Random' }, { value: 1, label: 'Red' },
          { value: 2, label: 'Yellow' }, { value: 3, label: 'Green' },
          { value: 4, label: 'Cyan' },   { value: 5, label: 'Blue' },
          { value: 6, label: 'Magenta' }, { value: 7, label: 'Orange' },
          { value: 8, label: 'Purple' }, { value: 9, label: 'White' },
        ],
      },
      { key: 'duration', label: 'Duration seconds (0=∞)', type: 'number', min: 0, max: 99, default: 0 },
    ],
    command: [{ key: 'cmd', label: 'Raw command', type: 'string', placeholder: 'e.g. LE0000000' }],
  },
}

export function actionsForPlugin(pluginType) {
  return Object.keys(ACTION_REGISTRY[pluginType] || {})
}

export function paramsSchema(pluginType, action) {
  return ACTION_REGISTRY[pluginType]?.[action] ?? []
}

export function defaultParams(pluginType, action) {
  const schema = paramsSchema(pluginType, action)
  return Object.fromEntries(
    schema.map((f) => [f.key, f.default ?? (f.type === 'number' || f.type === 'range' ? 0 : '')])
  )
}
