export function dispatch(deviceId, actionType, params = {}) {
  return fetch('/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, action_type: actionType, params }),
  })
}
