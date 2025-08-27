import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    cnpj: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/projects" replace />
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    setIsSubmitting(true)

    try {
      // Por enquanto, simular criação de conta bem-sucedida
      // até corrigirmos o backend
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simular delay

      setSuccess('Conta criada com sucesso! Você pode fazer login agora.')
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        cnpj: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no registro')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>AEC Axis</h1>
          <h2>Criar sua conta</h2>
          <p className="auth-subtitle">Transforme sua gestão de suprimentos</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="companyName" className="form-label">
              Nome da Empresa
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              className="form-input"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Sua Construtora Ltda"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="cnpj" className="form-label">
              CNPJ
            </label>
            <input
              type="text"
              id="cnpj"
              name="cnpj"
              className="form-input"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0001-00"
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
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repita sua senha"
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
                <span style={{ marginLeft: '8px' }}>Criando conta...</span>
              </>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>
        
        <div className="divider">ou</div>
        
        <p style={{ textAlign: 'center', color: '#718096' }}>
          Já tem uma conta?{' '}
          <Link to="/login" className="auth-link">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register