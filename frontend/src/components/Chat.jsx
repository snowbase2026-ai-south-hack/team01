import React, { useState, useRef, useEffect } from 'react'

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
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? 'Вы' : 'AI'}
            </div>
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}
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
