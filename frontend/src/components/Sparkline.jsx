import React from 'react'

function getColor(type) {
  return type === 'confidence' ? '#22c55e' : '#3b82f6'
}

export default function Sparkline({ data, type }) {
  if (!data || data.length === 0) return null

  const color = getColor(type)
  const width = 200
  const height = 40
  const padding = 4

  const min = Math.min(...data) * 0.9
  const max = Math.max(...data) * 1.1 || 1
  const range = max - min || 1

  const points = data.map((v, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2),
    y: height - padding - ((v - min) / range) * (height - padding * 2),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <div className="sparkline-container">
      <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={areaPath} className="sparkline-area" fill={color} />
        <path d={linePath} className="sparkline-line" stroke={color} />
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={3}
            fill={color}
            className="sparkline-dot"
          />
        )}
      </svg>
    </div>
  )
}
