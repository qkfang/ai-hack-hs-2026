import { ChatKit, useChatKit } from '@openai/chatkit-react'
import './ChatPage.css'

export function ChatPage() {
  const chatkit = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch('/api/chatkit/session', { method: 'POST' })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(error ?? 'Failed to create ChatKit session')
        }
        const { client_secret } = await res.json()
        return client_secret
      },
    },
  })

  return (
    <div className="chat-page">
      <div className="chat-main">
        <div className="chat-header">
          <h1>💬 AI Chat</h1>
          <p>Powered by OpenAI ChatKit</p>
        </div>
        <div className="chatkit-wrapper">
          <ChatKit control={chatkit.control} className="chatkit-component" />
        </div>
      </div>
    </div>
  )
}
