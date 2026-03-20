import React from 'react'

function getColor(value, type) {
  if (type === 'confidence') {
    if (value >= 0.7) return '#22c55e'
    if (value >= 0.4) return '#eab308'
    return '#ef4444'
  }
  // pressure
  if (value <= 0.3) return '#3b82f6'
  if (value <= 0.6) return '#f97316'
  return '#ef4444'
}

export default function Gauge({ value, type }) {
  const radius = 40
  const cx = 60
  const cy = 55
  const startAngle = Math.PI
  const endAngle = 0
  const arcLength = Math.PI * radius
  const filled = arcLength * Math.max(0, Math.min(1, value))
  const color = getColor(value, type)

  const x1 = cx + radius * Math.cos(startAngle)
  const y1 = cy + radius * Math.sin(startAngle)
  const x2 = cx + radius * Math.cos(endAngle)
  const y2 = cy + radius * Math.sin(endAngle)

  const d = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 120 70">
        <path d={d} className="gauge-bg" />
        <path
          d={d}
          className="gauge-fill"
          stroke={color}
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength - filled}
        />
        <text x={cx} y={cy - 2} className="gauge-value">
          {Math.round(value * 100)}
        </text>
        <text x={cx} y={cy + 12} className="gauge-percent">%</text>
      </svg>
    </div>
  )
}
