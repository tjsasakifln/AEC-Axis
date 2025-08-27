import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  address?: string
  start_date?: string
}

interface CreateProjectRequest {
  name: string
  address?: string
  start_date?: string
}

function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      // Simular carregamento de projetos
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Projetos de demonstração
      const demoProjects: Project[] = [
        {
          id: '1',
          name: 'Galpão Industrial Santos',
          status: 'Em Andamento',
          created_at: new Date().toISOString(),
          address: 'Santos, SP'
        },
        {
          id: '2',
          name: 'Centro de Distribuição Campinas',
          status: 'Planejamento',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          address: 'Campinas, SP'
        }
      ]
      
      setProjects(demoProjects)
    } catch (err) {
      setError('Erro ao carregar projetos')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (projectData: CreateProjectRequest) => {
    try {
      // Simular criação de projeto
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newProject: Project = {
        id: Date.now().toString(),
        name: projectData.name,
        status: 'Planejamento',
        created_at: new Date().toISOString(),
        address: projectData.address,
        start_date: projectData.start_date
      }
      
      setProjects([...projects, newProject])
      setShowCreateModal(false)
    } catch (err) {
      setError('Erro ao criar projeto')
      console.error(err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="loading" style={{ margin: '0 auto 20px' }}></div>
          <p>Carregando projetos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', marginTop: '20px', minHeight: '90vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AEC Axis</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#4a5568', fontWeight: '500' }}>Olá, {user?.email}</span>
          <button onClick={logout} className="btn btn-secondary">
            Sair
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px', marginBottom: '20px' }}>
        <h2 style={{ color: '#4a5568', margin: 0 }}>Meus Projetos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn"
        >
          + Novo Projeto
        </button>
      </div>

      <div style={{ margin: '0 30px' }}>
        {error && <div className="error-message">{error}</div>}

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>Você ainda não tem projetos.</h3>
            <p>Clique em "+ Novo Projeto" para começar.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NOME DO PROJETO</th>
                <th>STATUS</th>
                <th>DATA DE CRIAÇÃO</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <strong>{project.name}</strong>
                    {project.address && <div style={{ color: '#718096', fontSize: '0.9rem' }}>{project.address}</div>}
                  </td>
                  <td>
                    <span style={{ 
                      background: project.status === 'Em Andamento' ? '#c6f6d5' : '#e2e8f0', 
                      color: project.status === 'Em Andamento' ? '#22543d' : '#4a5568',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      {project.status}
                    </span>
                  </td>
                  <td>{formatDate(project.created_at)}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '8px 16px' }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  )
}

interface CreateProjectModalProps {
  onClose: () => void
  onCreate: (project: CreateProjectRequest) => void
}

function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    start_date: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const projectData: CreateProjectRequest = {
      name: formData.name,
      ...(formData.address && { address: formData.address }),
      ...(formData.start_date && { start_date: formData.start_date })
    }

    try {
      await onCreate(projectData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="auth-card" style={{ width: '90%', maxWidth: '500px' }}>
        <div className="auth-header" style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#4a5568', margin: 0 }}>Novo Projeto</h2>
          <p className="auth-subtitle">Crie um novo projeto para gerenciar</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nome do Projeto *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Galpão Industrial ABC"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="address" className="form-label">
              Endereço
            </label>
            <input
              type="text"
              id="address"
              name="address"
              className="form-input"
              value={formData.address}
              onChange={handleChange}
              placeholder="Ex: São Paulo, SP"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="start_date" className="form-label">
              Data de Início
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              className="form-input"
              value={formData.start_date}
              onChange={handleChange}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="loading"></span>
                  <span style={{ marginLeft: '8px' }}>Criando...</span>
                </>
              ) : (
                'Criar Projeto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Projects