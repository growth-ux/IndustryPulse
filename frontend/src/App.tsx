import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import SearchPanel from './components/SearchPanel'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import SourceManager from './components/SourceManager'
import Favorites from './components/Favorites'
import Insights from './pages/Insights'
import Hot from './pages/Hot'
import { TimelineProvider } from './context/TimelineContext'

function MainLayout() {
  return (
    <div className="app">
      <Header />
      <SearchPanel />
      <main className="main-container">
        <Sidebar />
        <Timeline />
      </main>
    </div>
  )
}

function SourceLayout() {
  return (
    <div className="app">
      <Header />
      <SourceManager />
    </div>
  )
}

function FavoritesLayout() {
  return (
    <div className="app">
      <Header />
      <Favorites />
    </div>
  )
}

function InsightsLayout() {
  return (
    <div className="app">
      <Header />
      <Insights />
    </div>
  )
}

function HotLayout() {
  return (
    <div className="app">
      <Header />
      <Hot />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <TimelineProvider>
        <Routes>
          <Route path="/hot" element={<HotLayout />} />
          <Route path="/" element={<MainLayout />} />
          <Route path="/sources" element={<SourceLayout />} />
          <Route path="/favorites" element={<FavoritesLayout />} />
          <Route path="/insights" element={<InsightsLayout />} />
          <Route path="*" element={<Navigate to="/hot" replace />} />
        </Routes>
      </TimelineProvider>
    </BrowserRouter>
  )
}

export default App