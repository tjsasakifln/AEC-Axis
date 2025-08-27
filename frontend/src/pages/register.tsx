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

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          company_name: formData.companyName,
          cnpj: formData.cnpj
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erro no registro')
      }

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
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>AEC Axis</h1>
        <h2>Criar sua conta</h2>
        
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
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn"
            disabled={isSubmitting}
            style={{ width: '100%', marginBottom: '15px' }}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center' }}>
          Já tem uma conta?{' '}
          <Link to="/login" style={{ color: '#007bff' }}>
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register