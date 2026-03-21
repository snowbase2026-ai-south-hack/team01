import React, { useState, useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { extractAndRenderCharts } from './InlineCharts'

function extractMetricsKey(content) {
  if (!content) return null
  const m = content.match(/\*\*КЛЮЧЕВЫЕ МЕТРИКИ:\*\*\s*(.+?)(?:\n|$)/)
  return m ? m[1].trim() : null
}

function MessageContent({ content, role, prevAssistantContent, isFirst }) {
  const { mainText, statusBlock } = useMemo(() => {
    if (role !== 'assistant') return { mainText: content, statusBlock: null }

    const result = extractAndRenderCharts(content || '')

    // Show full charts only if: first message OR metrics changed
    if (result.statusBlock) {
      const curMetrics = extractMetricsKey(content)
      const prevMetrics = extractMetricsKey(prevAssistantContent)

      if (!isFirst && curMetrics && prevMetrics && curMetrics === prevMetrics) {
        // Metrics unchanged — compact position line only
        const posMatch = (content || '').match(/\*\*ТЕКУЩАЯ ПОЗИЦИЯ:\*\*\s*(.+?)(?:\n|$)/)
        if (posMatch) {
          const position = posMatch[1].trim()
          const isRed = /пересмотр|остановка|halt/i.test(position)
          const isYellow = /скорректированный|adjusted/i.test(position)
          const color = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e'
          return {
            mainText: result.mainText,
            statusBlock: (
              <div style={{ marginTop: 8, fontSize: 12, color, opacity: 0.8 }}>
                ■ {position}
              </div>
            ),
          }
        }
      }
    }

    return result
  }, [content, role, prevAssistantContent, isFirst])

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainText}</ReactMarkdown>
      {statusBlock}
    </>
  )
}

export default function Chat({ messages, onSend, isLoading }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = '44px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="chat-area">
      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-icon">◆</div>
            <div className="welcome-title">CAITO Assistant</div>
            <div className="welcome-sub">
              AI-ассистент стратегических решений. Задайте вопрос о масштабировании системы персонализации BigTechGroup.
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          // Find previous assistant message content for diff comparison
          let prevAssistantContent = null
          let isFirstAssistant = true
          if (msg.role === 'assistant') {
            for (let j = i - 1; j >= 0; j--) {
              if (messages[j].role === 'assistant') {
                prevAssistantContent = messages[j].content
                isFirstAssistant = false
                break
              }
            }
          }
          return (
            <div key={i} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? 'Вы' : 'AI'}
              </div>
              <div className="message-bubble">
                <MessageContent
                  content={msg.content}
                  role={msg.role}
                  prevAssistantContent={prevAssistantContent}
                  isFirst={isFirstAssistant}
                />
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">AI</div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="Введите сообщение..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isLoading}
          >
            ▸
          </button>
        </div>
      </form>
    </div>
  )
}
