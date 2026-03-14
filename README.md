# 🤖 AI Hackathon for Teens

> A 2-hour hands-on AI hackathon for **Year 7 – Year 12 high school students** — learn, build, and have fun with real AI tools!

---

## 🚀 What Is This?

**AI Hackathon for Teens** is an event kit + working codebase that lets high school students experience AI development first-hand. In just 2 hours, participants go from "what even is AI?" to running their own chatbot and weather API powered by Azure AI.

---

## 🗂️ Project Structure

```
ai-hack-hs-2026/
├── src/
│   ├── api/          # 🌤️  Weather Info API — C# ASP.NET Core + MCP Server
│   └── playground/   # 💬  AI Playground — React + TypeScript chat app
├── bicep/            # ☁️  Azure infrastructure as code
└── hack.md           # 📋  Full hackathon slide deck & lab guides
```

---

## 🧩 Components

### 🌤️ Weather Info API (`src/api`)
A C# ASP.NET Core backend with:
- **REST API** — full CRUD weather endpoints
- **Swagger UI** — interactive API docs at `/swagger`
- **MCP Server** — Model Context Protocol endpoint so AI assistants can query live weather data
- **Admin Portal** — password-protected management UI
- **EF Core In-Memory DB** — seeded with sample data on startup

➡️ See [`src/api/README.md`](src/api/README.md) for setup and endpoints.

### 💬 AI Playground (`src/playground`)
A React + TypeScript single-page app featuring:
- **Chat Page** — real-time streaming chat powered by Azure AI Foundry (GPT-4o)
- **About Page** — project info and tech docs
- Built with Vite, React Router v7, and the OpenAI SDK

➡️ See [`src/playground/README.md`](src/playground/README.md) for setup and env vars.

### ☁️ Azure Infrastructure (`bicep/`)
Bicep templates to deploy the whole stack to Azure with one command.

---

## 🧪 Labs at a Glance

| Lab | Topic | What You Build |
|-----|-------|---------------|
| **Lab 1** | Prompt Engineering | Craft the perfect AI prompt using the CRAFT framework |
| **Lab 2** | Text & Chatbots | Chat with the AI Playground app |
| **Lab 3** | Image & Video AI | Generate images and video with AI tools |
| **Lab 4** | Voice & Audio AI | Turn voice into text and text into speech |

Full instructions are in [`hack.md`](hack.md).

---

## ⚡ Quick Start

### Run the API locally
```bash
cd src/api
dotnet run
# Open https://localhost:5001
```

### Run the AI Playground locally
```bash
cd src/playground
npm install
cp .env.example .env.local   # add your Azure AI Foundry keys
npm run dev
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | C# / ASP.NET Core / EF Core |
| Frontend | React 19 / TypeScript / Vite |
| AI | Azure AI Foundry (GPT-4o) |
| Protocol | MCP (Model Context Protocol) |
| Infra | Azure App Service / Bicep |

---

## 📅 Hackathon Agenda

| Time | Activity |
|------|----------|
| 0:00 – 0:10 | Welcome & Icebreaker ❄️ |
| 0:10 – 0:40 | What is AI? History & Real-World Examples 🧠 |
| 0:40 – 0:55 | **Lab 1:** Prompt Engineering 🧪 |
| 0:55 – 1:20 | **Lab 2:** Chat & Chatbots 💬 |
| 1:20 – 1:35 | **Lab 3:** Image & Video AI 🖼️ |
| 1:35 – 1:50 | **Lab 4:** Voice & Audio AI 🎙️ |
| 1:50 – 2:00 | Showcase & What's Next 🚀 |

---

## 🌟 Have Fun & Build Something Amazing!

> *"The people who thrive in the AI era won't just be those who use AI — they'll be the ones who know how to direct it."*