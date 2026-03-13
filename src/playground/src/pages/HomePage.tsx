import { Link } from 'react-router-dom'
import './HomePage.css'

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">AI Playground</span>
          </h1>
          <p className="hero-subtitle">
            Explore AI capabilities powered by Azure AI Foundry. Chat with intelligent
            assistants and discover the power of modern AI.
          </p>
          <div className="hero-actions">
            <Link to="/chat" className="btn btn-primary">
              Start Chatting →
            </Link>
            <Link to="/about" className="btn btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="ai-orb">
            <span>🤖</span>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AI Chat</h3>
            <p>
              Engage in natural conversations with an AI assistant powered by Azure AI
              Foundry. Ask questions, get help with tasks, and more.
            </p>
            <Link to="/chat" className="feature-link">
              Open Chat →
            </Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>Secure & Configurable</h3>
            <p>
              Connect to your own Azure AI Foundry project using your API key. Your
              credentials are used only in your browser session.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Streaming</h3>
            <p>
              Experience fast, streaming AI responses delivered token-by-token for a
              responsive and engaging chat experience.
            </p>
          </div>
        </div>
      </section>

      <section className="getting-started-section">
        <h2 className="section-title">Getting Started</h2>
        <div className="steps-list">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Set up Azure AI Foundry</h3>
              <p>
                Create a project in{' '}
                <a
                  href="https://ai.azure.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Azure AI Foundry
                </a>{' '}
                and deploy a model (e.g., GPT-4o).
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Get your API Key</h3>
              <p>
                Copy your project endpoint and API key from the Azure AI Foundry
                portal.
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Configure and Chat</h3>
              <p>
                Enter your credentials on the{' '}
                <Link to="/chat">Chat page</Link> and start exploring AI
                capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
