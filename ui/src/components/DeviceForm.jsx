function FieldInput({ field, value, onChange }) {
  const base = 'form-input'

  switch (field.type) {
    case 'int':
      return (
        <input
          type="number"
          className={`${base} form-input-sm`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'gpio_pin':
      return (
        <div className="input-with-hint">
          <input
            type="number"
            className={`${base} form-input-sm`}
            min={0}
            max={27}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <span className="input-hint">BCM</span>
        </div>
      )
    case 'i2c_address':
      return (
        <input
          type="text"
          className={`${base} form-input-mono form-input-sm`}
          placeholder="0x40"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default: // string
      return (
        <input
          type="text"
          className={base}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function DeviceForm({ schema = [], values = {}, onChange }) {
  return (
    <div className="device-form">
      {schema.map((field) => (
        <div key={field.key} className="form-field">
          <label className="form-label">{field.label}</label>
          <FieldInput
            field={field}
            value={values[field.key] ?? field.default ?? ''}
            onChange={(v) => onChange(field.key, v)}
          />
        </div>
      ))}
    </div>
  )
}
