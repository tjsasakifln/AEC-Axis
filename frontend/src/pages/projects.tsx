import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { useProjects, useCreateProject } from '../hooks/useProjects'
import { ProjectCreationCelebration } from '../components/ProjectCreationCelebration'

import { CreateProjectRequest, Project } from '../services/api'

// Remove local interfaces as they're now imported from the API service

interface ProjectSummary {
  total_projects: number
  active_rfqs: number
  completed_projects: number
}

function Projects() {
  // React Query hooks
  const { data: projects = [], isLoading, error: queryError } = useProjects()
  const createProjectMutation = useCreateProject()
  
  // Local state
  const [projectsSummary, setProjectsSummary] = useState<ProjectSummary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [createdProjectName, setCreatedProjectName] = useState('')
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Pagination state (keeping for demo data)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [, setTotalCount] = useState(0)
  const [limit] = useState(10)
  
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  // Convert query error to string for compatibility
  const error = queryError ? 'Erro ao carregar projetos' : ''

  // Load summary data on mount (keeping demo implementation)
  React.useEffect(() => {
    loadProjectsSummary()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  // Apply client-side filtering to the fetched projects
  const filteredProjects = React.useMemo(() => {
    let filtered = projects
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.address && project.address.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(project => project.status === statusFilter)
    }
    
    return filtered
  }, [projects, searchTerm, statusFilter])
  
  // Update pagination based on filtered results
  React.useEffect(() => {
    const totalCount = filteredProjects.length
    const totalPages = Math.ceil(totalCount / limit)
    setTotalCount(totalCount)
    setTotalPages(totalPages)
  }, [filteredProjects.length, limit])
  
  // Get paginated results
  const paginatedProjects = React.useMemo(() => {
    const startIndex = (currentPage - 1) * limit
    const endIndex = startIndex + limit
    return filteredProjects.slice(startIndex, endIndex)
  }, [filteredProjects, currentPage, limit])

  const loadProjectsSummary = async () => {
    try {
      // Simular carregamento do resumo (substituir pela chamada real posteriormente)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const demoSummary: ProjectSummary = {
        total_projects: 15,
        active_rfqs: 4,
        completed_projects: 5
      }
      
      setProjectsSummary(demoSummary)
    } catch (err) {
      console.error('Erro ao carregar resumo dos projetos:', err)
    }
  }

  const handleCreateProject = async (projectData: CreateProjectRequest) => {
    try {
      await createProjectMutation.mutateAsync(projectData)
      setShowCreateModal(false)
      setCreatedProjectName(projectData.name)
      setShowCelebration(true)
    } catch (err) {
      setMessage('Erro ao criar projeto')
      console.error(err)
    }
  }

  const handleCelebrationComplete = () => {
    setShowCelebration(false)
    setCreatedProjectName('')
  }

  const handleEditProject = async (projectData: CreateProjectRequest) => {
    // TODO: Implement project update mutation when backend API is available
    console.log('Edit project functionality to be implemented with backend API:', projectData)
    setShowEditModal(false)
    setEditingProject(null)
    setMessage('Funcionalidade de edição será implementada em breve')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleArchiveProject = (projectId: string) => {
    // TODO: Implement project archive mutation when backend API is available
    console.log('Archive project functionality to be implemented:', projectId)
    setMessage('Funcionalidade de arquivar será implementada em breve')
    setTimeout(() => setMessage(''), 3000)
    setOpenMenuId(null)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleMenuToggle = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenuId(openMenuId === projectId ? null : projectId)
  }

  const handleViewDetails = (projectId: string) => {
    navigate(`/projects/${projectId}`)
    setOpenMenuId(null)
  }

  const handleEditClick = (project: Project) => {
    setEditingProject(project)
    setShowEditModal(true)
    setOpenMenuId(null)
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

      {/* Project Summary Cards */}
      {projectsSummary && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          margin: '30px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 'bold' }}>
              {projectsSummary.total_projects}
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Total de Projetos</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 'bold' }}>
              {projectsSummary.active_rfqs}
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>RFQs Ativas</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 'bold' }}>
              {projectsSummary.completed_projects}
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Projetos Concluídos</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px', marginBottom: '20px' }}>
        <h2 style={{ color: '#4a5568', margin: 0 }}>Meus Projetos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn"
        >
          + Novo Projeto
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        margin: '0 30px 30px 30px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Buscar projetos por nome ou endereço..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ minWidth: '200px' }}>
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="form-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Todos os Status</option>
            <option value="OPEN">Em Aberto</option>
            <option value="CLOSED">Fechado</option>
          </select>
        </div>
      </div>

      <div style={{ margin: '0 30px' }}>
        {(error || message) && (
          <div className={error ? 'error-message' : 'success-message'}>
            {error || message}
          </div>
        )}

        {paginatedProjects.length === 0 ? (
          <div className="empty-state">
            <h3>Você ainda não tem projetos.</h3>
            <p>Clique em "+ Novo Projeto" para começar.</p>
          </div>
        ) : (
          <>
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
                {paginatedProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong>{project.name}</strong>
                      {project.address && <div style={{ color: '#718096', fontSize: '0.9rem' }}>{project.address}</div>}
                    </td>
                    <td>
                      <span style={{ 
                        background: project.status === 'OPEN' ? '#c6f6d5' : project.status === 'CLOSED' ? '#fed7d7' : '#e2e8f0', 
                        color: project.status === 'OPEN' ? '#22543d' : project.status === 'CLOSED' ? '#742a2a' : '#4a5568',
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}>
                        {project.status === 'OPEN' ? 'Em Aberto' : project.status === 'CLOSED' ? 'Fechado' : project.status}
                      </span>
                    </td>
                    <td>{formatDate(project.created_at)}</td>
                    <td style={{ position: 'relative' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ 
                          fontSize: '16px', 
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#4a5568',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onClick={(e) => handleMenuToggle(project.id, e)}
                        aria-label={`Ações do projeto ${project.name}`}
                        aria-expanded={openMenuId === project.id}
                        aria-haspopup="true"
                      >
                        ⋮
                      </button>
                      
                      {openMenuId === project.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: '0',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            zIndex: 10,
                            minWidth: '150px',
                            padding: '8px 0'
                          }}
                        >
                          <button
                            className="menu-item"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 16px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#4a5568'
                            }}
                            onClick={() => handleViewDetails(project.id)}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f7fafc'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                          >
                            Ver Detalhes
                          </button>
                          <button
                            className="menu-item"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 16px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#4a5568'
                            }}
                            onClick={() => handleEditClick(project)}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f7fafc'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                          >
                            Editar
                          </button>
                          <button
                            className="menu-item"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 16px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#e53e3e'
                            }}
                            onClick={() => handleArchiveProject(project.id)}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f7fafc'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                          >
                            Arquivar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
      
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setShowEditModal(false)
            setEditingProject(null)
          }}
          onEdit={handleEditProject}
        />
      )}

      <ProjectCreationCelebration
        isVisible={showCelebration}
        projectName={createdProjectName}
        onComplete={handleCelebrationComplete}
      />
    </div>
  )
}

interface CreateProjectModalProps {
  onClose: () => void
  onCreate: (project: CreateProjectRequest) => void
}

interface EditProjectModalProps {
  project: {
    id: string
    name: string
    address?: string
    start_date?: string
  }
  onClose: () => void
  onEdit: (project: CreateProjectRequest) => void
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

function EditProjectModal({ project, onClose, onEdit }: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: project.name,
    address: project.address || '',
    start_date: project.start_date || ''
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
      await onEdit(projectData)
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
          <h2 style={{ color: '#4a5568', margin: 0 }}>Editar Projeto</h2>
          <p className="auth-subtitle">Modifique as informações do projeto</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Nome do Projeto *
            </label>
            <input
              type="text"
              id="edit-name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Galpão Industrial ABC"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-address" className="form-label">
              Endereço
            </label>
            <input
              type="text"
              id="edit-address"
              name="address"
              className="form-input"
              value={formData.address}
              onChange={handleChange}
              placeholder="Ex: São Paulo, SP"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-start_date" className="form-label">
              Data de Início
            </label>
            <input
              type="date"
              id="edit-start_date"
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
                  <span style={{ marginLeft: '8px' }}>Salvando...</span>
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = []
  const maxVisiblePages = 5
  
  // Calculate which pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
  
  // Adjust start if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '30px 0',
      gap: '8px'
    }}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          backgroundColor: currentPage === 1 ? '#f7fafc' : 'white',
          color: currentPage === 1 ? '#a0aec0' : '#4a5568',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        ← Anterior
      </button>
      
      {/* Page Numbers */}
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#4a5568',
              cursor: 'pointer',
              fontSize: '14px',
              minWidth: '40px'
            }}
          >
            1
          </button>
          {startPage > 2 && <span style={{ color: '#a0aec0' }}>...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: page === currentPage ? '#667eea' : 'white',
            color: page === currentPage ? 'white' : '#4a5568',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '40px',
            fontWeight: page === currentPage ? '600' : 'normal'
          }}
        >
          {page}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ color: '#a0aec0' }}>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#4a5568',
              cursor: 'pointer',
              fontSize: '14px',
              minWidth: '40px'
            }}
          >
            {totalPages}
          </button>
        </>
      )}
      
      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          backgroundColor: currentPage === totalPages ? '#f7fafc' : 'white',
          color: currentPage === totalPages ? '#a0aec0' : '#4a5568',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        Próximo →
      </button>
    </div>
  )
}

export default Projects