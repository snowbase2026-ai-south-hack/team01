import React from 'react'
import Gauge from './Gauge'
import Sparkline from './Sparkline'

export default function MetricsSidebar({ metrics }) {
  const { confidence, pressure, turn, history } = metrics

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

      <div className="turn-card">
        <span className="turn-label">Ход</span>
        <span className="turn-value">{turn}</span>
      </div>
    </aside>
  )
}
