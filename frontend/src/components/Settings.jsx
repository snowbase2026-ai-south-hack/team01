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
  const [current, setCurrent] = useState({ provider: '', model: '', openrouter_env: 'prod' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [filterType, setFilterType] = useState('llm')
  const [openrouterEnv, setOpenrouterEnv] = useState('prod')

  const loadCurrent = () => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers || {})
        const c = data.current || {}
        setCurrent(c)
        setSelectedProvider(c.provider || '')
        setSelectedModel(c.model || '')
        setOpenrouterEnv(c.openrouter_env || 'prod')
      })
      .catch(() => {})
  }

  useEffect(() => { loadCurrent() }, [])

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

  // Save settings to backend
  const applySettings = async (overrides = {}) => {
    const payload = {
      provider: overrides.provider ?? selectedProvider,
      model: overrides.model ?? selectedModel,
      openrouter_env: overrides.openrouter_env ?? openrouterEnv,
    }
    setSaving(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrent(data)
        setTestResult({ ok: true, message: `Сохранено: ${data.model}` })
      } else {
        setTestResult({ ok: false, message: data.error || 'Ошибка' })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    }
    setSaving(false)
  }

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId)
    applySettings({ model: modelId })
  }

  const handleSelectProvider = (key) => {
    setSelectedProvider(key)
    setFilterType('llm')
    const llms = (providers[key]?.models || []).filter((m) => m.type === 'llm')
    const firstModel = llms.length > 0 ? llms[0].id : ''
    setSelectedModel(firstModel)
    applySettings({ provider: key, model: firstModel })
  }

  const handleSelectEnv = (env) => {
    setOpenrouterEnv(env)
    applySettings({ openrouter_env: env })
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
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
      } else {
        setTestResult({ ok: false, message: data.error || `HTTP ${res.status}` })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    }
    setTesting(false)
  }

  return (
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <h2 className="settings-title">Настройки модели</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-current">
          <span className="settings-current-label">Активная:</span>
          <span className="settings-current-value">
            {current.provider_name}
            {current.openrouter_env && (
              <span className={`settings-env-badge settings-env-badge-${current.openrouter_env}`}>
                {current.openrouter_env}
              </span>
            )}
            {' / '}{current.model}
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
                onClick={() => handleSelectProvider(key)}
              >
                {val.name}
              </button>
            ))}
          </div>
        </div>

        {/* OpenRouter env toggle */}
        {selectedProvider === 'openrouter' && (
          <div className="settings-section">
            <div className="settings-label">Окружение</div>
            <div className="settings-env-tabs">
              <button
                className={`settings-env-tab ${openrouterEnv === 'prod' ? 'active' : ''}`}
                onClick={() => handleSelectEnv('prod')}
              >
                <span className="settings-env-dot settings-env-dot-prod" />
                Prod
              </button>
              <button
                className={`settings-env-tab ${openrouterEnv === 'test' ? 'active' : ''}`}
                onClick={() => handleSelectEnv('test')}
              >
                <span className="settings-env-dot settings-env-dot-test" />
                Test
              </button>
            </div>
          </div>
        )}

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
                onClick={() => handleSelectModel(m.id)}
              >
                <div className="settings-model-name">{m.name}</div>
                <div className="settings-model-id">{m.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Test result / save status */}
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
            {testing ? 'Тестирую...' : 'Тест модели'}
          </button>
        </div>
      </div>
    </div>
  )
}
