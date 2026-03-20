import React, { useState, useCallback, useRef, useEffect } from 'react'
import MetricsSidebar from './components/MetricsSidebar'
import Chat from './components/Chat'

const API_BASE = '/api'

function generateSessionId() {
  return 'sess-' + Math.random().toString(36).slice(2, 10)
}

function getStoredSessionId() {
  try {
    return localStorage.getItem('caito_session_id') || generateSessionId()
  } catch {
    return generateSessionId()
  }
}

function storeSessionId(id) {
  try {
    localStorage.setItem('caito_session_id', id)
  } catch {
    // ignore
  }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(getStoredSessionId)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const [metrics, setMetrics] = useState({
    confidence: 0,
    pressure: 0,
    turn: 0,
    history: { confidence: [], pressure: [] },
  })
  const abortRef = useRef(null)

  // Persist session ID
  useEffect(() => {
    storeSessionId(sessionId)
  }, [sessionId])

  // Load history for current session on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/history`)
        if (!res.ok) return
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages)
        }
        if (data.metrics) {
          setMetrics((prev) => ({
            ...prev,
            confidence: data.metrics.confidence ?? prev.confidence,
            pressure: data.metrics.pressure ?? prev.pressure,
            turn: data.metrics.turn ?? prev.turn,
          }))
        }
      } catch {
        // ignore — fresh session
      }
    }
    loadHistory()
  }, [sessionId])

  // Load session list
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`)
      if (!res.ok) return
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      // ignore
    }
  }, [])

  const updateMetrics = useCallback((newMetrics) => {
    if (!newMetrics) return
    setMetrics((prev) => ({
      confidence: newMetrics.confidence ?? prev.confidence,
      pressure: newMetrics.pressure ?? prev.pressure,
      turn: newMetrics.turn ?? prev.turn,
      history: {
        confidence: [...prev.history.confidence, newMetrics.confidence ?? prev.confidence],
        pressure: [...prev.history.pressure, newMetrics.pressure ?? prev.pressure],
      },
    }))
  }, [])

  const sendMessage = useCallback(async (text) => {
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ''
        let buffer = ''

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
        setIsLoading(false)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.metrics) {
                updateMetrics(parsed.metrics)
              }

              const token =
                parsed.choices?.[0]?.delta?.content ||
                parsed.token ||
                parsed.content ||
                ''

              if (token) {
                assistantText += token
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantText,
                  }
                  return updated
                })
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      } else {
        const data = await res.json()
        const reply = data.response || data.answer || data.message || data.content || data.text || ''
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        if (data.metrics) {
          updateMetrics(data.metrics)
        }
        setIsLoading(false)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Ошибка: ${err.message}` },
        ])
      }
      setIsLoading(false)
    }
  }, [sessionId, updateMetrics])

  const handleNewSession = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setMessages([])
    const newId = generateSessionId()
    setSessionId(newId)
    setMetrics({
      confidence: 0,
      pressure: 0,
      turn: 0,
      history: { confidence: [], pressure: [] },
    })
    setShowSessions(false)
  }, [])

  const handleReset = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    try {
      await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
    } catch {
      // ignore
    }
    handleNewSession()
  }, [sessionId, handleNewSession])

  const handleSwitchSession = useCallback((newSessionId) => {
    if (abortRef.current) abortRef.current.abort()
    setMessages([])
    setSessionId(newSessionId)
    setMetrics({
      confidence: 0,
      pressure: 0,
      turn: 0,
      history: { confidence: [], pressure: [] },
    })
    setShowSessions(false)
  }, [])

  const handleToggleSessions = useCallback(() => {
    setShowSessions((prev) => {
      if (!prev) loadSessions()
      return !prev
    })
  }, [loadSessions])

  const positionLabels = {
    scenario_b: 'Сценарий Б',
    scenario_b_adjusted: 'Сценарий Б (скорр.)',
    reconsider: 'Пересмотр',
    halt: 'Остановка',
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">CAITO</span>
          <span className="logo-sub">Chief AI & Technology Officer</span>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={handleToggleSessions}>Сессии</button>
          <button className="btn" onClick={handleReset}>Сброс</button>
          <button className="btn btn-primary" onClick={handleNewSession}>Новая сессия</button>
        </div>
      </header>

      {showSessions && (
        <div className="sessions-panel">
          <div className="sessions-title">История сессий</div>
          {sessions.length === 0 && <div className="sessions-empty">Нет сохранённых сессий</div>}
          {sessions.map((s) => (
            <div
              key={s.session_id}
              className={`sessions-item ${s.session_id === sessionId ? 'sessions-item-active' : ''}`}
              onClick={() => handleSwitchSession(s.session_id)}
            >
              <div className="sessions-item-id">{s.session_id}</div>
              <div className="sessions-item-meta">
                {s.message_count} сообщ. · ход {s.turn || 0}
                {s.position && ` · ${positionLabels[s.position] || s.position}`}
              </div>
              {s.last_active && (
                <div className="sessions-item-time">
                  {new Date(s.last_active).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="main">
        <MetricsSidebar metrics={metrics} />
        <Chat messages={messages} onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
}
