import React from 'react'

/**
 * Renders inline bar charts for metric comparisons found in messages.
 * Detects patterns like "payback X мес", "ROI X×", "Precision X" etc.
 * and renders visual bars next to them.
 */

function MetricBar({ label, value, max, unit, color, threshold }) {
  const pct = Math.min(100, (value / max) * 100)
  const isOver = threshold && value > threshold
  const barColor = isOver ? '#ef4444' : color || '#3b82f6'

  return (
    <div className="inline-metric">
      <div className="inline-metric-header">
        <span className="inline-metric-label">{label}</span>
        <span className="inline-metric-value" style={{ color: barColor }}>
          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{unit}
        </span>
      </div>
      <div className="inline-metric-track">
        <div
          className="inline-metric-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
        {threshold && (
          <div
            className="inline-metric-threshold"
            style={{ left: `${Math.min(100, (threshold / max) * 100)}%` }}
            title={`Порог: ${threshold}${unit}`}
          />
        )}
      </div>
    </div>
  )
}

function ComparisonChart({ before, after, label, unit, max, lowerIsBetter }) {
  const beforePct = Math.min(100, (before / max) * 100)
  const afterPct = Math.min(100, (after / max) * 100)
  const improved = lowerIsBetter ? after < before : after > before
  const afterColor = improved ? '#22c55e' : '#ef4444'

  return (
    <div className="inline-comparison">
      <div className="inline-comparison-label">{label}</div>
      <div className="inline-comparison-bars">
        <div className="inline-comparison-row">
          <span className="inline-comparison-tag">ДО</span>
          <div className="inline-metric-track">
            <div className="inline-metric-fill" style={{ width: `${beforePct}%`, background: '#64748b' }} />
          </div>
          <span className="inline-comparison-val">{before}{unit}</span>
        </div>
        <div className="inline-comparison-row">
          <span className="inline-comparison-tag" style={{ color: afterColor }}>ПОСЛЕ</span>
          <div className="inline-metric-track">
            <div className="inline-metric-fill" style={{ width: `${afterPct}%`, background: afterColor }} />
          </div>
          <span className="inline-comparison-val" style={{ color: afterColor }}>{after}{unit}</span>
        </div>
      </div>
    </div>
  )
}

export function StatusBlock({ text }) {
  // Parse the structured block
  const posMatch = text.match(/\*\*ТЕКУЩАЯ ПОЗИЦИЯ:\*\*\s*(.+?)(?:\n|$)/)
  const metricsMatch = text.match(/\*\*КЛЮЧЕВЫЕ МЕТРИКИ:\*\*\s*(.+?)(?:\n|$)/)
  const assumptionsMatch = text.match(/\*\*ДОПУЩЕНИЯ:\*\*\s*(.+?)(?:\n|$)/)
  const conditionsMatch = text.match(/\*\*УСЛОВИЯ ПЕРЕСМОТРА:\*\*\s*(.+?)(?:\n|$)/)

  if (!posMatch) return null

  const position = posMatch[1].trim()
  const isRed = /пересмотр|остановка|halt/i.test(position)
  const isYellow = /скорректированный|adjusted/i.test(position)
  const statusColor = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e'

  // Parse metrics
  const metrics = metricsMatch ? metricsMatch[1] : ''
  const payback = metrics.match(/payback\s+(\d+)/)?.[1]
  const roi = metrics.match(/ROI\s+([\d.]+)/)?.[1]
  const revenue = metrics.match(/выручка\s+Y1\s+(\d+)/)?.[1]
  const losses = metrics.match(/потери\s+(\d+)/)?.[1]

  return (
    <div className="status-block">
      <div className="status-block-header">
        <div className="status-block-badge" style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '44' }}>
          {position}
        </div>
      </div>

      {payback && roi && (
        <div className="status-block-metrics">
          <MetricBar label="Payback" value={Number(payback)} max={24} unit=" мес" color={Number(payback) > 18 ? '#ef4444' : '#3b82f6'} threshold={18} />
          <MetricBar label="ROI 24 мес" value={Number(roi)} max={5} unit="×" color={Number(roi) < 2 ? '#ef4444' : '#22c55e'} />
          {revenue && <MetricBar label="Доп. выручка Y1" value={Number(revenue)} max={500} unit=" млн ₽" color="#3b82f6" />}
          {losses && <MetricBar label="Операц. потери" value={Number(losses)} max={2500} unit=" млн ₽/год" color="#ef4444" />}
        </div>
      )}

      {assumptionsMatch && (
        <div className="status-block-section">
          <span className="status-block-label">Допущения:</span> {assumptionsMatch[1]}
        </div>
      )}
      {conditionsMatch && (
        <div className="status-block-section">
          <span className="status-block-label">Условия пересмотра:</span> {conditionsMatch[1]}
        </div>
      )}
    </div>
  )
}

export function extractAndRenderCharts(content) {
  // Find the structured block at the end
  const blockMatch = content.match(/\n---\n\n\*\*ТЕКУЩАЯ ПОЗИЦИЯ:\*\*[\s\S]*?---\s*$/)
  if (!blockMatch) return { mainText: content, statusBlock: null }

  const mainText = content.slice(0, blockMatch.index).trimEnd()
  const blockText = blockMatch[0]

  // Only show full chart block for substantive responses (>200 chars)
  // Short responses just get a compact position line
  if (mainText.length < 200) {
    const posMatch = blockText.match(/\*\*ТЕКУЩАЯ ПОЗИЦИЯ:\*\*\s*(.+?)(?:\n|$)/)
    if (posMatch) {
      const position = posMatch[1].trim()
      const isRed = /пересмотр|остановка|halt/i.test(position)
      const isYellow = /скорректированный|adjusted/i.test(position)
      const color = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e'
      return {
        mainText,
        statusBlock: (
          <div style={{ marginTop: 8, fontSize: 12, color: color, opacity: 0.8 }}>
            ■ {position}
          </div>
        ),
      }
    }
  }

  return { mainText, statusBlock: <StatusBlock text={blockText} /> }
}
