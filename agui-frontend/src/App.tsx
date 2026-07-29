import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useMemo, useState } from 'react'
import { MessagePart } from './components/ToolPanels'
import './App.css'

/** 后端根地址（与本地 `agui-backend` 默认端口一致） */
const API_BASE = 'http://localhost:3000'

export default function App() {
  const chatUrl = `${API_BASE}/ai/chat`

  // DefaultChatTransport 是 ai-sdk 提供的默认聊天传输器，内部使用 fetch 发送 POST 请求到后端 SSE 接口，返回流式的 AI 回答文本
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: chatUrl,
      }),
    [chatUrl],
  )

  // 用 useChat 连接后端的 SSE 接口，连接方式用 DefaultChatTransport，返回的 messages 是当前的聊天消息列表，sendMessage 用于发送用户消息，status 是当前聊天状态，stop 用于停止当前的流式回答，error 是当前的错误信息，clearError 用于清除错误信息
  const { messages, sendMessage, status, stop, error, clearError } = useChat<UIMessage>({
    transport,
  })
  const [input, setInput] = useState('')

  const busy = status === 'submitted' || status === 'streaming'
  const canSend = status === 'ready' && input.trim().length > 0
  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1)

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div>
          <h1>agui</h1>
          <p className="chat-sub">后端：{chatUrl}</p>
        </div>
        {busy && (
          <button type="button" className="btn-stop" onClick={() => stop()}>
            停止
          </button>
        )}
      </header>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="chat-empty">
            输入问题开始对话
          </p>
        )}
        {/* messages 数据结构为 { id: string; role: 'user' | 'assistant'; parts: MessagePart[] }[] */}
        {/* MessagePart 是用来表示消息的不同部分，可以是文本、图片等 */}
        {messages.map((message) => {
          const textPartIndices = message.parts
            .map((p, i) => (p.type === 'text' ? i : -1))
            .filter((i) => i >= 0)
          const lastTextPartIdx = textPartIndices[textPartIndices.length - 1]

          return (
            <article
              key={message.id}
              className={`chat-bubble chat-bubble--${message.role}`}
            >
              <span className="chat-role">
                {message.role === 'user' ? '你' : '助手'}
              </span>
              <div className="chat-body">
                {message.parts.map((part, index) => (
                  <MessagePart
                    key={`${message.id}-p-${index}`}
                    part={part}
                    textStreamActive={
                      part.type === 'text' &&
                      message.role === 'assistant' &&
                      message.id === lastAssistant?.id &&
                      index === lastTextPartIdx &&
                      busy
                    }
                  />
                ))}
              </div>
            </article>
          )
        })}
      </div>

      {error && (
        <div className="chat-error" role="alert">
          <span>{error.message}</span>
          <button type="button" onClick={() => clearError()}>
            关闭
          </button>
        </div>
      )}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSend) return
          void sendMessage({ text: input })
          setInput('')
        }}
      >
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSend) {
                void sendMessage({ text: input })
                setInput('')
              }
            }
          }}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          rows={3}
          disabled={status !== 'ready'}
          aria-label="消息输入"
        />
        <div className="chat-actions">
          <span className="chat-status">
            {status === 'ready' && '就绪'}
            {status === 'submitted' && '已发送…'}
            {status === 'streaming' && '生成中…'}
            {status === 'error' && '出错'}
          </span>
          <button type="submit" disabled={!canSend}>
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
