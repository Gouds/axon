import MotorThrottle  from './MotorThrottle'
import ServoSlider    from './ServoSlider'
import AudioPlayer    from './AudioPlayer'
import AudioBrowser   from './AudioBrowser'
import MotorJoystick  from './MotorJoystick'
import LightsPanel    from './LightsPanel'

export const WIDGET_REGISTRY = {
  MotorThrottle: {
    label: 'Motor Throttle',
    plugins: ['dc_motor'],
    component: MotorThrottle,
  },
  ServoSlider: {
    label: 'Servo Slider',
    plugins: ['servo'],
    component: ServoSlider,
  },
  AudioPlayer: {
    label: 'Audio Player',
    plugins: ['audio'],
    component: AudioPlayer,
  },
  AudioBrowser: {
    label: 'Audio Browser',
    plugins: ['audio'],
    component: AudioBrowser,
  },
  LightsPanel: {
    label: 'Lights Panel',
    plugins: ['astropixels'],
    component: LightsPanel,
  },
  MotorJoystick: {
    label: 'Motor Joystick',
    plugins: ['aqmh3615ns', 'dc_motor'],
    component: MotorJoystick,
    configSchema: [
      {
        key: 'axis', label: 'Axis', type: 'select',
        options: [
          { value: 'horizontal', label: 'Horizontal  (left / right)' },
          { value: 'vertical',   label: 'Vertical  (up / down)' },
        ],
        default: 'horizontal',
      },
      {
        key: 'snap', label: 'Snap to centre on release', type: 'boolean',
        default: true,
      },
      {
        key: 'label_neg', label: 'Negative direction label', type: 'string',
        placeholder: 'e.g. LEFT, DOWN, REV',
        default: 'LEFT',
      },
      {
        key: 'label_pos', label: 'Positive direction label', type: 'string',
        placeholder: 'e.g. RIGHT, UP, FWD',
        default: 'RIGHT',
      },
      {
        key: 'invert', label: 'Invert direction', type: 'boolean',
        default: false,
      },
    ],
  },
}

export function widgetsForPlugin(pluginType) {
  return Object.entries(WIDGET_REGISTRY)
    .filter(([, w]) => w.plugins.includes(pluginType))
    .map(([type, w]) => ({ type, label: w.label }))
}

export function defaultWidgetConfig(widgetType) {
  const schema = WIDGET_REGISTRY[widgetType]?.configSchema
  if (!schema) return {}
  return Object.fromEntries(schema.map((f) => [f.key, f.default]))
}
