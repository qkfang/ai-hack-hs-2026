import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function makeOpenAIClient(model: string): { client: OpenAI; deployment: string } {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT ?? ''
  const azureApiKey = process.env.AZURE_FOUNDRY_API_KEY ?? ''
  const defaultDeployment = process.env.AZURE_FOUNDRY_DEPLOYMENT ?? 'gpt-4o'
  const deployment = model || defaultDeployment

  if (endpoint && azureApiKey) {
    const client = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': '2024-05-01-preview' },
      defaultHeaders: { 'api-key': azureApiKey },
    })
    return { client, deployment }
  }

  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const client = new OpenAI({ apiKey })
  return { client, deployment }
}

async function callMcpTool(serverUrl: string, toolName: string, args: Record<string, unknown>): Promise<string> {
  const payload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: toolName, arguments: args },
    id: Date.now(),
  }
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`MCP server responded with ${response.status}: ${response.statusText}`)
  }
  const json = await response.json() as { result?: { content?: Array<{ text?: string }> }; error?: { message?: string } }
  if (json.error) throw new Error(json.error.message ?? 'MCP tool error')
  const content = json.result?.content
  if (Array.isArray(content)) {
    return content.map((c) => c.text ?? '').join('\n')
  }
  return JSON.stringify(json.result ?? '')
}

function sendSse(res: ServerResponse, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

interface McpToolDef {
  name: string
  description: string
  serverUrl: string
  enabled: boolean
  parameters: string
}

function agentApiPlugin(): Plugin {
  return {
    name: 'agent-api',
    configureServer(server) {
      // ── ChatKit session ──────────────────────────────────────────────────────
      server.middlewares.use('/api/chatkit/session', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        const apiKey = process.env.OPENAI_API_KEY ?? ''
        const workflowId = process.env.CHATKIT_WORKFLOW_ID ?? ''

        if (!apiKey || !workflowId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY and CHATKIT_WORKFLOW_ID must be set' }))
          return
        }

        try {
          const client = new OpenAI({ apiKey })
          const session = await client.beta.chatkit.sessions.create({
            user: crypto.randomUUID(),
            workflow: { id: workflowId },
          })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ client_secret: session.client_secret }))
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create session'
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: message }))
        }
      })

      // ── Agent chat (SSE streaming + agentic tool-call loop) ──────────────────
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        let body: string
        try {
          body = await readBody(req)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to read request body' }))
          return
        }

        let payload: {
          messages: OpenAI.ChatCompletionMessageParam[]
          systemPrompt?: string
          model?: string
          temperature?: number
          maxTokens?: number
          topP?: number
          presencePenalty?: number
          frequencyPenalty?: number
          mcpTools?: McpToolDef[]
        }

        try {
          payload = JSON.parse(body)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }

        const {
          messages,
          systemPrompt,
          model = '',
          temperature = 0.7,
          maxTokens = 2048,
          topP = 1,
          presencePenalty = 0,
          frequencyPenalty = 0,
          mcpTools = [],
        } = payload

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })

        try {
          const { client, deployment } = makeOpenAIClient(model)

          const systemMessages: OpenAI.ChatCompletionMessageParam[] = systemPrompt
            ? [{ role: 'system', content: systemPrompt }]
            : []

          const enabledTools = mcpTools.filter((t) => t.enabled && t.name.trim())
          const toolDefs: OpenAI.ChatCompletionTool[] = enabledTools.map((t) => {
            let parameters: Record<string, unknown> = { type: 'object', properties: {} }
            try { parameters = JSON.parse(t.parameters) } catch { /* keep default */ }
            return {
              type: 'function',
              function: {
                name: t.name.trim().replace(/\s+/g, '_'),
                description: t.description,
                parameters,
              },
            }
          })

          const conversationMessages: OpenAI.ChatCompletionMessageParam[] = [
            ...systemMessages,
            ...messages,
          ]

          const MAX_ITERATIONS = 10
          let iterations = 0

          // Agentic loop: run until no tool calls remain or max iterations hit
          while (iterations < MAX_ITERATIONS) {
            iterations++

            const stream = await client.chat.completions.create({
              model: deployment,
              messages: conversationMessages,
              temperature,
              max_tokens: maxTokens,
              top_p: topP,
              presence_penalty: presencePenalty,
              frequency_penalty: frequencyPenalty,
              ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
              stream: true,
            })

            let assistantContent = ''
            const toolCallAccumulator: Record<string, { name: string; arguments: string }> = {}

            for await (const chunk of stream) {
              const choice = chunk.choices[0]
              if (!choice) continue

              const delta = choice.delta

              // Accumulate text content
              if (delta.content) {
                assistantContent += delta.content
                sendSse(res, { type: 'content', content: delta.content })
              }

              // Accumulate tool call deltas
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index
                  if (!toolCallAccumulator[idx]) {
                    toolCallAccumulator[idx] = { name: '', arguments: '' }
                  }
                  if (tc.function?.name) toolCallAccumulator[idx].name += tc.function.name
                  if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments
                }
              }
            }

            // Push assistant message to conversation
            const toolCallList = Object.values(toolCallAccumulator)
            if (toolCallList.length > 0) {
              const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
                role: 'assistant',
                content: assistantContent || null,
                tool_calls: toolCallList.map((tc, i) => ({
                  id: `call_${Date.now()}_${i}`,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              }
              conversationMessages.push(assistantMsg)

              // Execute each tool call
              for (let i = 0; i < toolCallList.length; i++) {
                const tc = toolCallList[i]
                const toolCallId = `call_${Date.now()}_${i}`
                const toolDef = enabledTools.find(
                  (t) => t.name.trim().replace(/\s+/g, '_') === tc.name,
                )

                sendSse(res, {
                  type: 'tool_call',
                  name: tc.name,
                  arguments: tc.arguments,
                })

                let toolResult: string
                try {
                  const args = JSON.parse(tc.arguments || '{}') as Record<string, unknown>
                  if (toolDef?.serverUrl) {
                    toolResult = await callMcpTool(toolDef.serverUrl, tc.name, args)
                  } else {
                    toolResult = JSON.stringify({ error: 'No MCP server URL configured for this tool' })
                  }
                } catch (err) {
                  toolResult = JSON.stringify({ error: err instanceof Error ? err.message : 'Tool call failed' })
                }

                sendSse(res, { type: 'tool_result', name: tc.name, result: toolResult })

                const toolMsg: OpenAI.ChatCompletionToolMessageParam = {
                  role: 'tool',
                  tool_call_id: toolCallId,
                  content: toolResult,
                }
                conversationMessages.push(toolMsg)
              }

              // Continue loop to get final answer after tool results
              continue
            } else {
              // No tool calls – we're done
              conversationMessages.push({ role: 'assistant', content: assistantContent })
              break
            }
          }

          sendSse(res, { type: 'done' })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unexpected error'
          sendSse(res, { type: 'error', message })
        } finally {
          res.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), agentApiPlugin()],
})
