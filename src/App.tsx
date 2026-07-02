import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Characters from './pages/Characters'
import Storylines from './pages/Storylines'
import Create from './pages/Create'
import Review from './pages/Review'
import AIConfig from './pages/AIConfig'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ai-config" element={<AIConfig />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/characters" element={<Characters />} />
        <Route path="/storylines" element={<Storylines />} />
        <Route path="/create" element={<Create />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </AppLayout>
  )
}

export default App
