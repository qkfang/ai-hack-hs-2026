import './AboutPage.css'

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About AI Playground</h1>
        <p>
          A modern React application for exploring Azure AI Foundry capabilities through
          an interactive chat interface.
        </p>
      </section>

      <div className="about-content">
        <section className="about-section">
          <h2>What is AI Playground?</h2>
          <p>
            AI Playground is a web application built with React and TypeScript that allows
            you to interact with AI models deployed on Azure AI Foundry. It provides a
            clean, intuitive chat interface where you can experiment with different AI
            models and system prompts.
          </p>
        </section>

        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-icon">⚛️</div>
              <h3>React 19</h3>
              <p>Modern UI library for building interactive user interfaces</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">📘</div>
              <h3>TypeScript</h3>
              <p>Type-safe JavaScript for reliable and maintainable code</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">⚡</div>
              <h3>Vite</h3>
              <p>Next-generation frontend build tool for fast development</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">🗺️</div>
              <h3>React Router v7</h3>
              <p>Client-side routing for a seamless multi-page experience</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">💬</div>
              <h3>ChatScope UI Kit</h3>
              <p>Ready-made chat UI components for a polished chat experience</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">🔵</div>
              <h3>Azure AI Foundry</h3>
              <p>Microsoft's enterprise AI platform powering the chat capabilities</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Configuration</h2>
          <p>
            All AI credentials (Azure AI Foundry endpoint, API keys, model deployments) are
            configured on the <strong>server side only</strong> — they never reach the browser.
            Update <code>src/api/appsettings.json</code> or set the equivalent environment
            variables on your server:
          </p>
          <div className="config-table">
            <div className="config-row header">
              <span>appsettings.json key</span>
              <span>Description</span>
              <span>Example</span>
            </div>
            <div className="config-row">
              <span>AzureAIFoundry:Endpoint</span>
              <span>Azure AI Foundry project endpoint</span>
              <code>https://my-project.services.ai.azure.com</code>
            </div>
            <div className="config-row">
              <span>AzureAIFoundry:ApiKey</span>
              <span>Authentication key from your Foundry project</span>
              <code>(set via env or user-secrets)</code>
            </div>
            <div className="config-row">
              <span>AzureAIFoundry:Deployment</span>
              <span>Name of your deployed chat model</span>
              <code>gpt-4o</code>
            </div>
            <div className="config-row">
              <span>AzureAIFoundry:DalleDeployment</span>
              <span>Name of your DALL-E deployment</span>
              <code>dall-e-3</code>
            </div>
            <div className="config-row">
              <span>OpenAI:ApiKey</span>
              <span>Standard OpenAI key (used when Azure is not configured)</span>
              <code>(set via env or user-secrets)</code>
            </div>
            <div className="config-row">
              <span>OpenAI:ChatKitWorkflowId</span>
              <span>ChatKit workflow ID for the Chat page</span>
              <code>wf_abc123…</code>
            </div>
          </div>
          <p className="env-note">
            💡 The playground frontend only needs one setting — the backend API URL — which
            is only relevant during local development. Create a <code>.env.local</code> file
            in <code>src/playground</code>:
          </p>
          <div className="code-block">
            <pre>{`VITE_API_BASE_URL=http://localhost:5163`}</pre>
          </div>
        </section>

        <section className="about-section">
          <h2>Pages</h2>
          <div className="pages-list">
            <div className="page-item">
              <strong>🏠 Home</strong> — Overview and getting started guide
            </div>
            <div className="page-item">
              <strong>💬 Chat</strong> — Interactive AI chat powered by Azure AI Foundry
            </div>
            <div className="page-item">
              <strong>ℹ️ About</strong> — Project information and documentation
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Resources</h2>
          <ul className="resource-list">
            <li>
              <a href="https://ai.azure.com" target="_blank" rel="noopener noreferrer">
                Azure AI Foundry Portal
              </a>
            </li>
            <li>
              <a
                href="https://learn.microsoft.com/azure/ai-foundry/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Azure AI Foundry Documentation
              </a>
            </li>
            <li>
              <a
                href="https://chatscope.io/storybook/react/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ChatScope UI Kit Documentation
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
