import React, { useState, useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { extractAndRenderCharts } from './InlineCharts'

function extractBlockField(content, field) {
  if (!content) return null
  const re = new RegExp('\\*\\*' + field + ':\\*\\*\\s*(.+?)(?:\\n|$)')
  const m = content.match(re)
  return m ? m[1].trim() : null
}

function compactPositionLine(content) {
  const position = extractBlockField(content, 'ТЕКУЩАЯ ПОЗИЦИЯ')
  if (!position) return null
  const isRed = /пересмотр|остановка|halt/i.test(position)
  const isYellow = /скорректированный|adjusted/i.test(position)
  const color = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e'
  return (
    <div style={{ marginTop: 8, fontSize: 12, color, opacity: 0.8 }}>
      ■ {position}
    </div>
  )
}

function MessageContent({ content, role, prevAssistantContent, isFirst }) {
  const { mainText, statusBlock } = useMemo(() => {
    if (role !== 'assistant') return { mainText: content, statusBlock: null }

    const result = extractAndRenderCharts(content || '')
    if (!result.statusBlock) return result

    // Compare current and previous metrics+position
    const curMetrics = extractBlockField(content, 'КЛЮЧЕВЫЕ МЕТРИКИ')
    const curPosition = extractBlockField(content, 'ТЕКУЩАЯ ПОЗИЦИЯ')
    const prevMetrics = extractBlockField(prevAssistantContent, 'КЛЮЧЕВЫЕ МЕТРИКИ')
    const prevPosition = extractBlockField(prevAssistantContent, 'ТЕКУЩАЯ ПОЗИЦИЯ')

    const metricsChanged = !prevMetrics || curMetrics !== prevMetrics
    const positionChanged = !prevPosition || curPosition !== prevPosition
    const showFullBlock = isFirst || metricsChanged || positionChanged

    if (!showFullBlock) {
      return { mainText: result.mainText, statusBlock: compactPositionLine(content) }
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
