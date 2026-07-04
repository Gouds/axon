import { useState } from 'react'
import { useRobot } from '../context/RobotContext'
import AudioAssets from './assets/AudioAssets'
import ScriptsAssets from './assets/ScriptsAssets'

const TABS = [
  { key: 'audio',   label: 'Audio'   },
  { key: 'scripts', label: 'Scripts' },
]

export default function Assets() {
  const { activeProfile } = useRobot()
  const [tab, setTab] = useState('audio')

  if (!activeProfile) {
    return <div className="page"><p className="empty">No profile active.</p></div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Assets — {activeProfile.label}</h1>
      </div>

      <div className="assets-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`assets-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="assets-tab-content">
        {tab === 'audio'   && <AudioAssets />}
        {tab === 'scripts' && <ScriptsAssets />}
      </div>
    </div>
  )
}
