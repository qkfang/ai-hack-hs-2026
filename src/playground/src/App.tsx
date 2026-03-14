import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { AboutPage } from './pages/AboutPage'
import { AgentBuilderPage } from './pages/AgentBuilderPage'
import { LandingPage } from './pages/LandingPage'
import { ComicPage } from './pages/ComicPage'
import { GalleryPage } from './pages/GalleryPage'
import { StoryBookPage } from './pages/StoryBookPage'
import { TranslationPage } from './pages/TranslationPage'
import { SpeechPage } from './pages/SpeechPage'
import { RealtimePage } from './pages/RealtimePage'
import { UserProvider, useUser } from './contexts/UserContext'
import './App.css'

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LandingPage />} />
      <Route path="/" element={<RequireUser><Layout /></RequireUser>}>
        <Route index element={<HomePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="agent" element={<AgentBuilderPage />} />
        <Route path="comic" element={<ComicPage />} />
        <Route path="storybook" element={<StoryBookPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="translation" element={<TranslationPage />} />
        <Route path="speech" element={<SpeechPage />} />
        <Route path="realtime" element={<RealtimePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}

export default App
