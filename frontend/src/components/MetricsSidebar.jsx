import React, { useMemo } from 'react'
import Gauge from './Gauge'
import Sparkline from './Sparkline'

function parsePosition(messages) {
  if (!messages || messages.length === 0) return null
  // Find the last assistant message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    const content = msg.content || ''
    const match = content.match(/\*\*ТЕКУЩАЯ ПОЗИЦИЯ:\*\*\s*(.+?)(?:\n|$)/)
    if (match) return match[1].trim()
  }
  return null
}

function getPositionStyle(position) {
  if (!position) return { color: 'var(--text-muted)', bg: 'var(--bg-input)' }
  const lower = position.toLowerCase()
  if (lower.includes('пересмотр') || lower.includes('остановка')) {
    return { color: '#fef2f2', bg: '#991b1b' }
  }
  if (lower.includes('скорректированн') || lower.includes('скорр')) {
    return { color: '#fefce8', bg: '#854d0e' }
  }
  if (lower.includes('сценарий б') || lower.includes('сценарий')) {
    return { color: '#f0fdf4', bg: '#166534' }
  }
  return { color: 'var(--text-primary)', bg: 'var(--bg-input)' }
}

export default function MetricsSidebar({ metrics, messages }) {
  const { confidence, pressure, turn, history } = metrics
  const maxTurns = 10

  const position = useMemo(() => parsePosition(messages), [messages])
  const posStyle = getPositionStyle(position)

  const turnSteps = []
  for (let i = 1; i <= maxTurns; i++) {
    turnSteps.push(i)
  }

  return (
    <aside className="sidebar">
      <div className="metric-card">
        <div className="metric-label">Уверенность</div>
        <Gauge value={confidence} type="confidence" />
        <Sparkline data={history.confidence} type="confidence" />
      </div>

      <div className="metric-card">
        <div className="metric-label">Давление</div>
        <Gauge value={pressure} type="pressure" />
        <Sparkline data={history.pressure} type="pressure" />
      </div>

      <div className="metric-card turn-progress-card">
        <div className="metric-label">Ход диалога</div>
        <div className="turn-progress-header">
          <span className="turn-progress-current">{turn}</span>
          <span className="turn-progress-total">/ {maxTurns}</span>
        </div>
        <div className="turn-progress-bar">
          <div
            className="turn-progress-fill"
            style={{ width: `${Math.min((turn / maxTurns) * 100, 100)}%` }}
          />
        </div>
        <div className="turn-steps">
          {turnSteps.map((step) => (
            <div
              key={step}
              className={
                'turn-step' +
                (step <= turn ? ' turn-step-done' : '') +
                (step === turn ? ' turn-step-active' : '')
              }
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="metric-card status-card">
        <div className="metric-label">Статус решения</div>
        {position ? (
          <span
            className="status-badge"
            style={{ color: posStyle.color, background: posStyle.bg }}
          >
            {position}
          </span>
        ) : (
          <span className="status-badge status-badge-empty">Ожидание...</span>
        )}
      </div>
    </aside>
  )
}
