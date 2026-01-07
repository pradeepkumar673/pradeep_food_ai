import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Favorites from './pages/Favorites'
import Planner from './pages/Planner'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/planner" element={<Planner />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#4CAF50',
              },
            },
            error: {
              style: {
                background: '#FF4C4C',
              },
            },
          }}
        />
      </Layout>
    </Router>
  )
}

export default App