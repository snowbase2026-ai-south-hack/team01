import React, { useState, useEffect, useMemo } from 'react'

const TYPE_LABELS = {
  llm: 'LLM',
  'image+text-to-text': 'Vision',
  'audio-to-text': 'Audio',
  embedder: 'Embeddings',
  rerank: 'Reranker',
}

const TYPE_ORDER = ['llm', 'image+text-to-text', 'audio-to-text', 'embedder', 'rerank']

export default function Settings({ onClose }) {
  const [providers, setProviders] = useState({})
  const [current, setCurrent] = useState({ provider: '', model: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [filterType, setFilterType] = useState('llm')

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers || {})
        setCurrent(data.current || {})
        setSelectedProvider(data.current?.provider || '')
        setSelectedModel(data.current?.model || '')
      })
      .catch(() => {})
  }, [])

  const currentProviderModels = useMemo(() => {
    const p = providers[selectedProvider]
    if (!p) return []
    return p.models || []
  }, [providers, selectedProvider])

  const filteredModels = useMemo(() => {
    return currentProviderModels.filter((m) => m.type === filterType)
  }, [currentProviderModels, filterType])

  const availableTypes = useMemo(() => {
    const types = new Set(currentProviderModels.map((m) => m.type))
    return TYPE_ORDER.filter((t) => types.has(t))
  }, [currentProviderModels])

  const handleSave = async () => {
    setSaving(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrent(data)
        setTestResult({ ok: true, message: 'Настройки сохранены' })
      } else {
        setTestResult({ ok: false, message: data.error || 'Ошибка' })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Temporarily apply settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
      })
      const start = Date.now()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Какова твоя позиция?', session_id: 'settings-test' }),
      })
      const elapsed = Date.now() - start
      const data = await res.json()
      if (res.ok && data.response) {
        setTestResult({
          ok: true,
          message: `OK (${(elapsed / 1000).toFixed(1)}s) — ${data.response.slice(0, 120)}...`,
        })
        setCurrent({ provider: selectedProvider, model: selectedModel })
      } else {
        setTestResult({ ok: false, message: data.error || `HTTP ${res.status}` })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    }
    setTesting(false)
  }

  const isChanged = selectedProvider !== current.provider || selectedModel !== current.model

  return (
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <h2 className="settings-title">Настройки модели</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-current">
          <span className="settings-current-label">Текущая:</span>
          <span className="settings-current-value">
            {current.provider_name} / {current.model}
          </span>
        </div>

        {/* Provider selector */}
        <div className="settings-section">
          <div className="settings-label">Провайдер</div>
          <div className="settings-provider-tabs">
            {Object.entries(providers).map(([key, val]) => (
              <button
                key={key}
                className={`settings-provider-tab ${selectedProvider === key ? 'active' : ''}`}
                onClick={() => {
                  setSelectedProvider(key)
                  setFilterType('llm')
                  // Auto-select first LLM model
                  const llms = (val.models || []).filter((m) => m.type === 'llm')
                  if (llms.length > 0) setSelectedModel(llms[0].id)
                }}
              >
                {val.name}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter */}
        {availableTypes.length > 1 && (
          <div className="settings-section">
            <div className="settings-label">Тип</div>
            <div className="settings-type-tabs">
              {availableTypes.map((t) => (
                <button
                  key={t}
                  className={`settings-type-tab ${filterType === t ? 'active' : ''}`}
                  onClick={() => setFilterType(t)}
                >
                  {TYPE_LABELS[t] || t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Model list */}
        <div className="settings-section">
          <div className="settings-label">
            Модель ({filteredModels.length})
          </div>
          <div className="settings-model-list">
            {filteredModels.map((m) => (
              <button
                key={m.id}
                className={`settings-model-item ${selectedModel === m.id ? 'active' : ''}`}
                onClick={() => setSelectedModel(m.id)}
              >
                <div className="settings-model-name">{m.name}</div>
                <div className="settings-model-id">{m.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`settings-result ${testResult.ok ? 'settings-result-ok' : 'settings-result-err'}`}>
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="settings-actions">
          <button
            className="btn settings-btn-test"
            onClick={handleTest}
            disabled={testing || saving}
          >
            {testing ? 'Тестирую...' : 'Тест'}
          </button>
          <button
            className="btn btn-primary settings-btn-save"
            onClick={handleSave}
            disabled={!isChanged || saving || testing}
          >
            {saving ? 'Сохраняю...' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  )
}
