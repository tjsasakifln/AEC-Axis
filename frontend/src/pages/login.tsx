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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>AEC Axis</h1>
          <h2>Bem-vindo de volta</h2>
          <p className="auth-subtitle">Entre na sua conta para continuar</p>
        </div>
        
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
              placeholder="seu@email.com"
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
              placeholder="Sua senha"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn"
            disabled={isSubmitting}
            style={{ width: '100%', marginBottom: '24px' }}
          >
            {isSubmitting ? (
              <>
                <span className="loading"></span>
                <span style={{ marginLeft: '8px' }}>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        
        <div className="divider">ou</div>
        
        <p style={{ textAlign: 'center', color: '#718096' }}>
          Não tem uma conta?{' '}
          <Link to="/register" className="auth-link">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login