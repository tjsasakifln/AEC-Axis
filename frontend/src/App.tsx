import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import PrivateRoute from './components/private-route'
import Login from './pages/login'
import Register from './pages/register'
import Projects from './pages/projects'
import ProjectDetail from './pages/project-detail'
import QuoteSubmission from './pages/quote-submission'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/quotes/:token" element={<QuoteSubmission />} />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/projects" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App