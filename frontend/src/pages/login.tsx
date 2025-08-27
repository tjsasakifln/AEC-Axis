import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, login } = useAuth()

  if (user) {
    return <Navigate to="/projects" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <h1>AEC Axis</h1>
        <h2>Entrar na sua conta</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn"
            disabled={isSubmitting}
            style={{ width: '100%', marginBottom: '15px' }}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center' }}>
          Não tem uma conta?{' '}
          <Link to="/register" style={{ color: '#007bff' }}>
            Registrar-se
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login