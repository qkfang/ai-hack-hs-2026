import { useState, useCallback } from 'react'
import OpenAI from 'openai'
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import './ChatPage.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sentTime?: string
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant powered by Azure AI Foundry. Be concise, clear, and friendly.'

export function ChatPage() {
  const [endpoint, setEndpoint] = useState(
    import.meta.env.VITE_AZURE_FOUNDRY_ENDPOINT ?? ''
  )
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_AZURE_FOUNDRY_API_KEY ?? ''
  )
  const [deploymentName, setDeploymentName] = useState(
    import.meta.env.VITE_AZURE_FOUNDRY_DEPLOYMENT ?? 'gpt-4o'
  )
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(!endpoint || !apiKey)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!endpoint || !apiKey) {
        setError('Please configure your Azure AI Foundry endpoint and API key.')
        setShowConfig(true)
        return
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        sentTime: new Date().toLocaleTimeString(),
      }

      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setIsTyping(true)
      setError(null)

      try {
        const client = new OpenAI({
          baseURL: endpoint.replace(/\/$/, '') + '/openai/deployments/' + deploymentName,
          apiKey: apiKey,
          defaultQuery: { 'api-version': '2024-08-01-preview' },
          defaultHeaders: { 'api-key': apiKey },
          dangerouslyAllowBrowser: true,
        })

        const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...updatedMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ]

        const stream = await client.chat.completions.create({
          model: deploymentName,
          messages: openAIMessages,
          stream: true,
        })

        let assistantContent = ''
        const assistantId = crypto.randomUUID()

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            sentTime: new Date().toLocaleTimeString(),
          },
        ])

        setIsTyping(false)

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          assistantContent += delta
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          )
        }
      } catch (err: unknown) {
        setIsTyping(false)
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        setError(`Failed to get a response: ${message}`)
      }
    },
    [endpoint, apiKey, deploymentName, systemPrompt, messages]
  )

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>⚙️ Configuration</h2>
          <button
            className="toggle-config-btn"
            onClick={() => setShowConfig(!showConfig)}
            title={showConfig ? 'Collapse' : 'Expand'}
          >
            {showConfig ? '▲' : '▼'}
          </button>
        </div>

        {showConfig && (
          <div className="config-form">
            <div className="form-group">
              <label htmlFor="endpoint">Azure AI Foundry Endpoint</label>
              <input
                id="endpoint"
                type="url"
                placeholder="https://your-project.services.ai.azure.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="config-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <input
                id="apiKey"
                type="password"
                placeholder="Your Azure AI Foundry API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="config-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="deployment">Model Deployment Name</label>
              <input
                id="deployment"
                type="text"
                placeholder="gpt-4o"
                value={deploymentName}
                onChange={(e) => setDeploymentName(e.target.value)}
                className="config-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="systemPrompt">System Prompt</label>
              <textarea
                id="systemPrompt"
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="config-input config-textarea"
              />
            </div>
            <button
              className="btn-apply"
              onClick={() => setShowConfig(false)}
              disabled={!endpoint || !apiKey}
            >
              Apply & Start Chatting
            </button>
          </div>
        )}

        <div className="sidebar-actions">
          <button className="btn-clear" onClick={clearChat}>
            🗑️ Clear Chat
          </button>
        </div>

        <div className="sidebar-info">
          <h3>Connection Status</h3>
          <div className={`status-badge ${endpoint && apiKey ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {endpoint && apiKey ? 'Configured' : 'Not configured'}
          </div>
          {endpoint && (
            <p className="endpoint-display" title={endpoint}>
              🌐 {new URL(endpoint).hostname}
            </p>
          )}
          {deploymentName && (
            <p className="deployment-display">🚀 {deploymentName}</p>
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h1>💬 AI Chat</h1>
          <p>Powered by Azure AI Foundry</p>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="chatkit-wrapper">
          <MainContainer>
            <ChatContainer>
              <MessageList
                typingIndicator={
                  isTyping ? <TypingIndicator content="AI is thinking…" /> : null
                }
              >
                {messages.length === 0 ? (
                  <MessageList.Content className="empty-state">
                    <div className="empty-state-inner">
                      <div className="empty-icon">🤖</div>
                      <h3>Start a conversation</h3>
                      <p>
                        {endpoint && apiKey
                          ? 'Type a message below to chat with your AI assistant.'
                          : 'Configure your Azure AI Foundry credentials in the sidebar to get started.'}
                      </p>
                    </div>
                  </MessageList.Content>
                ) : (
                  messages.map((msg) => (
                    <Message
                      key={msg.id}
                      model={{
                        message: msg.content,
                        sentTime: msg.sentTime,
                        sender: msg.role === 'user' ? 'You' : 'AI Assistant',
                        direction: msg.role === 'user' ? 'outgoing' : 'incoming',
                        position: 'single',
                      }}
                    />
                  ))
                )}
              </MessageList>
              <MessageInput
                placeholder="Type a message…"
                onSend={sendMessage}
                attachButton={false}
                disabled={isTyping}
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </div>
  )
}
