import React, { useState, useCallback, useRef } from 'react'
import MetricsSidebar from './components/MetricsSidebar'
import Chat from './components/Chat'

const API_BASE = '/api'

function generateSessionId() {
  return 'sess-' + Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(generateSessionId)
  const [metrics, setMetrics] = useState({
    confidence: 0,
    pressure: 0,
    turn: 0,
    history: { confidence: [], pressure: [] },
  })
  const abortRef = useRef(null)

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
    setSessionId(generateSessionId())
    setMetrics({
      confidence: 0,
      pressure: 0,
      turn: 0,
      history: { confidence: [], pressure: [] },
    })
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">CAITO</span>
          <span className="logo-sub">Chief AI & Technology Officer</span>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={handleReset}>Сброс</button>
          <button className="btn btn-primary" onClick={handleNewSession}>Новая сессия</button>
        </div>
      </header>

      <div className="main">
        <MetricsSidebar metrics={metrics} />
        <Chat messages={messages} onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
}
