# AI Playground

A React + TypeScript application for exploring Azure AI Foundry capabilities through an interactive multi-page interface.

## Features

- 🏠 **Home Page** — Overview and getting started guide
- �� **Chat Page** — Interactive AI chat powered by Azure AI Foundry with real-time streaming
- ℹ️ **About Page** — Project information and technology documentation

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — fast build tool
- [React Router v7](https://reactrouter.com/) — client-side routing
- [@chatscope/chat-ui-kit-react](https://chatscope.io/) — chat UI components
- [OpenAI SDK](https://www.npmjs.com/package/openai) — Azure AI Foundry API client

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Azure AI Foundry credentials:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your endpoint and API key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AZURE_FOUNDRY_ENDPOINT` | Azure AI Foundry project endpoint | `https://my-project.services.ai.azure.com` |
| `VITE_AZURE_FOUNDRY_API_KEY` | API key for authentication | `abc123...` |
| `VITE_AZURE_FOUNDRY_DEPLOYMENT` | Model deployment name | `gpt-4o` |

> You can also configure these settings directly in the Chat page UI without using environment variables.

## Getting an Azure AI Foundry API Key

1. Go to [Azure AI Foundry](https://ai.azure.com)
2. Create or open a project
3. Navigate to **Settings** → **API keys**
4. Copy the endpoint URL and an API key
5. Deploy a model (e.g., GPT-4o) under **Deployments**
