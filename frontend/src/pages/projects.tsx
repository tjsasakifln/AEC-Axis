import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth-context'
import { projectsApi, Project, CreateProjectRequest } from '../services/api'

function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const projectsData = await projectsApi.getAll()
      setProjects(projectsData)
    } catch (err) {
      setError('Erro ao carregar projetos')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (projectData: CreateProjectRequest) => {
    try {
      const newProject = await projectsApi.create(projectData)
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
      <div className="container">
        <div>Carregando projetos...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>AEC Axis</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Bem-vindo, {user?.email}</span>
          <button onClick={logout} className="btn btn-secondary">
            Sair
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Meus Projetos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn"
        >
          + Novo Projeto
        </button>
      </div>

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
                <td>{project.name}</td>
                <td>{project.status}</td>
                <td>{formatDate(project.created_at)}</td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                  >
                    Ver Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px'
      }}>
        <h3 style={{ marginBottom: '20px' }}>Novo Projeto</h3>
        
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
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
              {isSubmitting ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Projects