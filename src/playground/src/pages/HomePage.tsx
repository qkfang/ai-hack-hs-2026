import { Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import './HomePage.css'

export function HomePage() {
  const { user } = useUser()
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            {user ? `Welcome back, ${user.username}!` : 'Welcome to'}{' '}
            {!user && <span className="gradient-text">AI Playground</span>}
          </h1>
          {user && (
            <p className="hero-user-id">Your User ID: <strong>#{user.id}</strong> — keep this to reconnect later</p>
          )}
          <p className="hero-subtitle">
            Explore AI capabilities powered by Azure AI Foundry. Chat with intelligent
            assistants, create AI comic art, and discover the power of modern AI.
          </p>
          <div className="hero-actions">
            <Link to="/comic" className="btn btn-primary">
              🎨 Create Comics →
            </Link>
            <Link to="/gallery" className="btn btn-secondary">
              🌟 Browse Gallery
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
            <div className="feature-icon">🎨</div>
            <h3>Comic Book Studio</h3>
            <p>
              Describe any scene and DALL-E will generate stunning comic-style artwork.
              Your creations are saved to your account.
            </p>
            <Link to="/comic" className="feature-link">
              Create Comics →
            </Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌟</div>
            <h3>Community Gallery</h3>
            <p>
              Browse AI-generated comics from all users. Get inspired by others'
              creations and share your own artwork with the community.
            </p>
            <Link to="/gallery" className="feature-link">
              Browse Gallery →
            </Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Agent Builder</h3>
            <p>
              Configure and test custom AI agents with tools, system prompts, and
              real-time streaming responses via MCP.
            </p>
            <Link to="/agent" className="feature-link">
              Build Agents →
            </Link>
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
