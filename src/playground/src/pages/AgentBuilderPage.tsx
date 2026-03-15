import { useState, useRef, useEffect, useCallback } from 'react'
import { API_BASE } from '../config'
import './AgentBuilderPage.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface McpTool {
  id: string
  name: string
  description: string
  serverUrl: string
  enabled: boolean
  parameters: string
}

interface AgentConfig {
  name: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  mcpTools: McpTool[]
}

type MessageRole = 'user' | 'assistant'

interface ChatMessage {
  role: MessageRole
  content: string
}

interface ToolCallEvent {
  type: 'tool_call'
  name: string
  arguments: string
}

interface ToolResultEvent {
  type: 'tool_result'
  name: string
  result: string
}

type ActivityItem =
  | { kind: 'message'; msg: ChatMessage }
  | { kind: 'tool_call'; name: string; arguments: string; result?: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AgentConfig = {
  name: 'My Agent',
  description: 'A helpful AI assistant',
  systemPrompt: 'You are a helpful assistant.',
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  mcpTools: [],
}

const STORAGE_KEY = 'agent-builder-config-v2'

const MODEL_PRESETS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'o1',
  'o3-mini',
]

const PROMPT_TEMPLATES = [
  {
    label: 'Helpful Assistant',
    prompt: 'You are a helpful, harmless, and honest AI assistant. Answer questions clearly and concisely.',
  },
  {
    label: 'Code Expert',
    prompt:
      'You are an expert software engineer. When given code problems, provide clear solutions with explanations. Use code blocks for all code examples.',
  },
  {
    label: 'Data Analyst',
    prompt:
      'You are a data analyst expert. Help users understand data, create analyses, and interpret results. Suggest appropriate visualizations and statistical methods.',
  },
  {
    label: 'Creative Writer',
    prompt:
      'You are a creative writing assistant. Help with storytelling, characters, plots, and prose. Be imaginative, engaging, and adapt your style to match the user\u2019s request.',
  },
  {
    label: 'Customer Support',
    prompt:
      'You are a friendly and professional customer support agent. Be empathetic, patient, and solution-focused. Escalate complex issues appropriately.',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadConfig(): AgentConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function tokenEstimate(text: string) {
  return Math.ceil(text.length / 4)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  leftLabel?: string
  rightLabel?: string
}) {
  return (
    <div className="ab-form-group">
      <div className="ab-label-row">
        <label className="ab-label">{label}</label>
        <span className="ab-value-badge">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ab-slider"
      />
      {(leftLabel || rightLabel) && (
        <div className="ab-slider-labels">
          <span>{leftLabel ?? ''}</span>
          <span>{rightLabel ?? ''}</span>
        </div>
      )}
    </div>
  )
}

function ToolCard({
  tool,
  onUpdate,
  onRemove,
}: {
  tool: McpTool
  onUpdate: (updates: Partial<McpTool>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [paramsError, setParamsError] = useState('')

  function validateParams(v: string) {
    try {
      JSON.parse(v)
      setParamsError('')
    } catch {
      setParamsError('Invalid JSON')
    }
  }

  return (
    <div className={`ab-tool-card ${!tool.enabled ? 'ab-tool-disabled' : ''}`}>
      <div className="ab-tool-header">
        <div className="ab-tool-header-left">
          <label className="ab-toggle-wrap">
            <input
              type="checkbox"
              checked={tool.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="ab-toggle"
            />
            <span className="ab-toggle-track" />
          </label>
          <input
            type="text"
            value={tool.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="tool_name"
            className="ab-tool-name-input"
          />
        </div>
        <div className="ab-tool-header-right">
          <button className="ab-icon-btn" onClick={() => setExpanded(!expanded)} title="Expand">
            {expanded ? '▲' : '▼'}
          </button>
          <button className="ab-icon-btn ab-danger-btn" onClick={onRemove} title="Remove">
            ✕
          </button>
        </div>
      </div>
      {expanded && (
        <div className="ab-tool-body">
          <div className="ab-form-group">
            <label className="ab-label">Description</label>
            <input
              type="text"
              value={tool.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="What does this tool do?"
              className="ab-input"
            />
          </div>
          <div className="ab-form-group">
            <label className="ab-label">MCP Server URL</label>
            <input
              type="text"
              value={tool.serverUrl}
              onChange={(e) => onUpdate({ serverUrl: e.target.value })}
              placeholder="https://mcp-server.example.com/mcp"
              className="ab-input"
            />
          </div>
          <div className="ab-form-group">
            <div className="ab-label-row">
              <label className="ab-label">Parameters Schema (JSON)</label>
              {paramsError && <span className="ab-error-badge">{paramsError}</span>}
            </div>
            <textarea
              value={tool.parameters}
              onChange={(e) => {
                onUpdate({ parameters: e.target.value })
                validateParams(e.target.value)
              }}
              rows={6}
              className={`ab-code-editor ${paramsError ? 'ab-input-error' : ''}`}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ToolCallBlock({ name, args, result }: { name: string; args: string; result?: string }) {
  const [open, setOpen] = useState(false)
  let parsedArgs: unknown = args
  try { parsedArgs = JSON.parse(args) } catch { /* keep raw */ }

  return (
    <div className="ab-tool-call-block">
      <button className="ab-tool-call-header" onClick={() => setOpen(!open)}>
        <span className="ab-tool-call-icon">🔧</span>
        <span className="ab-tool-call-name">{name}</span>
        <span className="ab-tool-call-chevron">{open ? '▲' : '▼'}</span>
        {result ? (
          <span className="ab-tool-call-badge ab-success">Done</span>
        ) : (
          <span className="ab-tool-call-badge ab-running">Running…</span>
        )}
      </button>
      {open && (
        <div className="ab-tool-call-body">
          <div className="ab-tool-section-label">Input</div>
          <pre className="ab-code-block">{JSON.stringify(parsedArgs, null, 2)}</pre>
          {result !== undefined && (
            <>
              <div className="ab-tool-section-label">Output</div>
              <pre className="ab-code-block">{result}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AgentBuilderPage() {
  const [activeTab, setActiveTab] = useState<'designer' | 'use' | 'code'>('designer')
  const [config, setConfig] = useState<AgentConfig>(loadConfig)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const [showTemplates, setShowTemplates] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Persist config on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  // Scroll to bottom on new activity
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activity])

  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  function handleReset() {
    if (confirm('Reset all settings to defaults?')) {
      setConfig(DEFAULT_CONFIG)
    }
  }

  // ── MCP tool CRUD ──────────────────────────────────────────────────────────
  function addMcpTool() {
    const newTool: McpTool = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      serverUrl: '',
      enabled: true,
      parameters:
        '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
    }
    updateConfig({ mcpTools: [...config.mcpTools, newTool] })
  }

  function updateMcpTool(id: string, updates: Partial<McpTool>) {
    updateConfig({
      mcpTools: config.mcpTools.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })
  }

  function removeMcpTool(id: string) {
    updateConfig({ mcpTools: config.mcpTools.filter((t) => t.id !== id) })
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function clearConversation() {
    setActivity([])
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setActivity((prev) => [...prev, { kind: 'message', msg: userMsg }])
    setInput('')
    setIsLoading(true)

    // Collect prior messages from activity
    const priorMessages = activity
      .filter((a): a is { kind: 'message'; msg: ChatMessage } => a.kind === 'message')
      .map((a) => ({ role: a.msg.role, content: a.msg.content }))

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...priorMessages, { role: 'user', content: text }],
          systemPrompt: config.systemPrompt,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
          presencePenalty: config.presencePenalty,
          frequencyPenalty: config.frequencyPenalty,
          mcpTools: config.mcpTools,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`)
      }

      // Placeholder assistant message for streaming
      const assistantMsgIndex = { current: -1 }
      setActivity((prev) => {
        const next = [...prev, { kind: 'message' as const, msg: { role: 'assistant' as const, content: '' } }]
        assistantMsgIndex.current = next.length - 1
        return next
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateAssistant = (appendText: string) => {
        setActivity((prev) => {
          const copy = [...prev]
          const idx = assistantMsgIndex.current
          if (idx >= 0 && copy[idx]?.kind === 'message') {
            const existing = copy[idx] as { kind: 'message'; msg: ChatMessage }
            copy[idx] = { kind: 'message', msg: { role: 'assistant', content: existing.msg.content + appendText } }
          }
          return copy
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          if (event.type === 'content') {
            updateAssistant(event.content as string)
          } else if (event.type === 'tool_call') {
            const tc = event as unknown as ToolCallEvent
            setActivity((prev) => [
              ...prev,
              { kind: 'tool_call', name: tc.name, arguments: tc.arguments },
            ])
          } else if (event.type === 'tool_result') {
            const tr = event as unknown as ToolResultEvent
            setActivity((prev) => {
              const copy = [...prev]
              // Find the matching pending tool_call (last one with no result)
              for (let i = copy.length - 1; i >= 0; i--) {
                const item = copy[i]
                if (item.kind === 'tool_call' && item.name === tr.name && item.result === undefined) {
                  copy[i] = { ...item, result: tr.result }
                  break
                }
              }
              return copy
            })
          } else if (event.type === 'done') {
            break
          } else if (event.type === 'error') {
            updateAssistant(`\n\n⚠️ Error: ${event.message as string}`)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setActivity((prev) => [
        ...prev,
        { kind: 'message', msg: { role: 'assistant', content: `⚠️ Error: ${msg}` } },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const activeToolCount = config.mcpTools.filter((t) => t.enabled && t.name.trim()).length
  const lastActivityItem = activity[activity.length - 1]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-page">
      {/* Tab bar */}
      <div className="ab-tabbar">
        <div className="ab-tabbar-left">
          <span className="ab-agent-badge">🤖 {config.name || 'Unnamed Agent'}</span>
        </div>
        <div className="ab-tabbar-center">
          <button
            className={`ab-tab ${activeTab === 'designer' ? 'ab-tab-active' : ''}`}
            onClick={() => setActiveTab('designer')}
          >
            🎨 Designer
          </button>
          <button
            className={`ab-tab ${activeTab === 'use' ? 'ab-tab-active' : ''}`}
            onClick={() => setActiveTab('use')}
          >
            💬 Use
          </button>
          <button
            className={`ab-tab ${activeTab === 'code' ? 'ab-tab-active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            💻 Code
          </button>
        </div>
        <div className="ab-tabbar-right">
          <button className="ab-btn ab-btn-ghost" onClick={handleReset} title="Reset to defaults">
            ↺ Reset
          </button>
          <button
            className={`ab-btn ${saveState === 'saved' ? 'ab-btn-success' : 'ab-btn-primary'}`}
            onClick={handleSave}
          >
            {saveState === 'saved' ? '✓ Saved' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* ── DESIGNER TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'designer' && (
        <div className="ab-designer">
          {/* LEFT COLUMN */}
          <div className="ab-col">
            {/* Identity */}
            <section className="ab-card">
              <h3 className="ab-card-title">🤖 Agent Identity</h3>
              <div className="ab-form-group">
                <label className="ab-label">Agent Name</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="My Agent"
                  className="ab-input"
                />
              </div>
              <div className="ab-form-group">
                <label className="ab-label">Description</label>
                <input
                  type="text"
                  value={config.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="What does this agent do?"
                  className="ab-input"
                />
              </div>
            </section>

            {/* System Prompt */}
            <section className="ab-card">
              <div className="ab-card-title-row">
                <h3 className="ab-card-title">📝 System Prompt</h3>
                <div className="ab-prompt-actions">
                  <button
                    className="ab-btn ab-btn-ghost ab-btn-sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    Templates ▾
                  </button>
                  <button
                    className="ab-btn ab-btn-ghost ab-btn-sm"
                    onClick={() => updateConfig({ systemPrompt: '' })}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {showTemplates && (
                <div className="ab-templates-dropdown">
                  {PROMPT_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      className="ab-template-item"
                      onClick={() => {
                        updateConfig({ systemPrompt: t.prompt })
                        setShowTemplates(false)
                      }}
                    >
                      <strong>{t.label}</strong>
                      <span className="ab-template-preview">{t.prompt.slice(0, 60)}…</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="ab-form-group">
                <textarea
                  className="ab-prompt-editor"
                  value={config.systemPrompt}
                  onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                  placeholder="You are a helpful assistant. Define the agent's personality, capabilities, and behavior here..."
                  rows={12}
                />
                <div className="ab-prompt-stats">
                  {config.systemPrompt.length} chars · ~{tokenEstimate(config.systemPrompt)} tokens
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="ab-col">
            {/* Model Settings */}
            <section className="ab-card">
              <h3 className="ab-card-title">⚙️ Model Settings</h3>

              {/* Model input + presets */}
              <div className="ab-form-group">
                <label className="ab-label">Model</label>
                <div className="ab-model-row">
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => updateConfig({ model: e.target.value })}
                    placeholder="gpt-4o"
                    className="ab-input ab-model-input"
                  />
                </div>
                <div className="ab-model-presets">
                  {MODEL_PRESETS.map((m) => (
                    <button
                      key={m}
                      className={`ab-preset-chip ${config.model === m ? 'ab-preset-active' : ''}`}
                      onClick={() => updateConfig({ model: m })}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <Slider
                label="Temperature"
                min={0}
                max={2}
                step={0.01}
                value={config.temperature}
                onChange={(v) => updateConfig({ temperature: v })}
                leftLabel="Precise (0)"
                rightLabel="Creative (2)"
              />

              <Slider
                label="Max Tokens"
                min={256}
                max={16384}
                step={256}
                value={config.maxTokens}
                onChange={(v) => updateConfig({ maxTokens: v })}
                leftLabel="256"
                rightLabel="16384"
              />

              <Slider
                label="Top-P"
                min={0}
                max={1}
                step={0.01}
                value={config.topP}
                onChange={(v) => updateConfig({ topP: v })}
                leftLabel="0"
                rightLabel="1"
              />

              <div className="ab-row-2">
                <Slider
                  label="Presence Penalty"
                  min={-2}
                  max={2}
                  step={0.01}
                  value={config.presencePenalty}
                  onChange={(v) => updateConfig({ presencePenalty: v })}
                  leftLabel="-2"
                  rightLabel="2"
                />
                <Slider
                  label="Frequency Penalty"
                  min={-2}
                  max={2}
                  step={0.01}
                  value={config.frequencyPenalty}
                  onChange={(v) => updateConfig({ frequencyPenalty: v })}
                  leftLabel="-2"
                  rightLabel="2"
                />
              </div>
            </section>

            {/* MCP Tools */}
            <section className="ab-card">
              <div className="ab-card-title-row">
                <h3 className="ab-card-title">
                  🔧 MCP Tools
                  {activeToolCount > 0 && (
                    <span className="ab-active-badge">{activeToolCount} active</span>
                  )}
                </h3>
                <button className="ab-btn ab-btn-primary ab-btn-sm" onClick={addMcpTool}>
                  + Add Tool
                </button>
              </div>
              {config.mcpTools.length === 0 ? (
                <div className="ab-empty-state">
                  <span className="ab-empty-icon">🧰</span>
                  <p>No tools configured.</p>
                  <p className="ab-empty-sub">
                    Add MCP tool definitions to extend your agent's capabilities with external
                    services.
                  </p>
                </div>
              ) : (
                <div className="ab-tools-list">
                  {config.mcpTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      onUpdate={(updates) => updateMcpTool(tool.id, updates)}
                      onRemove={() => removeMcpTool(tool.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ── USE TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'use' && (
        <div className="ab-use">
          {/* Sidebar */}
          <aside className="ab-sidebar">
            <div className="ab-sidebar-section">
              <h4 className="ab-sidebar-title">Agent Config</h4>
              <div className="ab-config-row">
                <span>Model</span>
                <span className="ab-config-val">{config.model || 'default'}</span>
              </div>
              <div className="ab-config-row">
                <span>Temperature</span>
                <span className="ab-config-val">{config.temperature}</span>
              </div>
              <div className="ab-config-row">
                <span>Max Tokens</span>
                <span className="ab-config-val">{config.maxTokens}</span>
              </div>
              <div className="ab-config-row">
                <span>Top-P</span>
                <span className="ab-config-val">{config.topP}</span>
              </div>
              <div className="ab-config-row">
                <span>Pres. Penalty</span>
                <span className="ab-config-val">{config.presencePenalty}</span>
              </div>
              <div className="ab-config-row">
                <span>Freq. Penalty</span>
                <span className="ab-config-val">{config.frequencyPenalty}</span>
              </div>
              {activeToolCount > 0 && (
                <div className="ab-config-row">
                  <span>Tools</span>
                  <span className="ab-config-val ab-tools-active">{activeToolCount} active</span>
                </div>
              )}
            </div>

            {config.systemPrompt && (
              <div className="ab-sidebar-section">
                <h4 className="ab-sidebar-title">System Prompt</h4>
                <p className="ab-prompt-preview">{config.systemPrompt}</p>
              </div>
            )}

            {activeToolCount > 0 && (
              <div className="ab-sidebar-section">
                <h4 className="ab-sidebar-title">Active Tools</h4>
                {config.mcpTools
                  .filter((t) => t.enabled && t.name.trim())
                  .map((t) => (
                    <div key={t.id} className="ab-tool-pill">
                      🔧 {t.name}
                    </div>
                  ))}
              </div>
            )}

            <div className="ab-sidebar-actions">
              <button className="ab-btn ab-btn-ghost ab-btn-full" onClick={clearConversation}>
                🗑 Clear Chat
              </button>
              <button
                className="ab-btn ab-btn-ghost ab-btn-full"
                onClick={() => setActiveTab('designer')}
              >
                🎨 Edit Agent
              </button>
            </div>
          </aside>

          {/* Chat area */}
          <div className="ab-chat">
            <div className="ab-messages">
              {activity.length === 0 && !isLoading && (
                <div className="ab-chat-empty">
                  <div className="ab-chat-empty-icon">💬</div>
                  <h3>Start chatting with {config.name || 'your agent'}</h3>
                  {config.systemPrompt && (
                    <p className="ab-chat-empty-hint">
                      System prompt is active · {activeToolCount} tool
                      {activeToolCount !== 1 ? 's' : ''} enabled
                    </p>
                  )}
                </div>
              )}

              {activity.map((item, i) => {
                if (item.kind === 'message') {
                  const { msg } = item
                  return (
                    <div key={i} className={`ab-msg ab-msg-${msg.role}`}>
                      <div className="ab-msg-avatar">
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="ab-msg-body">
                        <div className="ab-msg-author">
                          {msg.role === 'user' ? 'You' : config.name || 'Agent'}
                        </div>
                        <div className="ab-msg-content">{msg.content}</div>
                      </div>
                    </div>
                  )
                }
                if (item.kind === 'tool_call') {
                  return (
                    <div key={i} className="ab-msg-tool">
                      <ToolCallBlock
                        name={item.name}
                        args={item.arguments}
                        result={item.result}
                      />
                    </div>
                  )
                }
                return null
              })}

              {isLoading && lastActivityItem?.kind === 'message' &&
                (lastActivityItem as { kind: 'message'; msg: ChatMessage }).msg.content === '' && (
                  <div className="ab-msg ab-msg-assistant">
                    <div className="ab-msg-avatar">🤖</div>
                    <div className="ab-msg-body">
                      <div className="ab-msg-author">{config.name || 'Agent'}</div>
                      <div className="ab-msg-content">
                        <span className="ab-typing">
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="ab-input-row">
              <textarea
                ref={inputRef}
                className="ab-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={3}
                disabled={isLoading}
              />
              <button
                className={`ab-send-btn ${isLoading ? 'ab-send-loading' : ''}`}
                onClick={() => void sendMessage()}
                disabled={isLoading || !input.trim()}
                title="Send message"
              >
                {isLoading ? (
                  <span className="ab-spinner" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CODE TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'code' && (
        <div className="ab-code">
          <div className="ab-code-header">
            <h2>💻 Code</h2>
            <p>Copilot SDK integration coming soon — prompt driver code UI will appear here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
