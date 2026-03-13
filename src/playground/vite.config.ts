import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import OpenAI from 'openai'

function chatkitSessionPlugin(): Plugin {
  return {
    name: 'chatkit-session',
    configureServer(server) {
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
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chatkitSessionPlugin()],
})
