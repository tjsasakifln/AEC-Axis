import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { projectsApi, ifcFilesApi, Project, IFCFile } from '../services/api'
import MaterialsTable from '../components/materials-table'

function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [ifcFiles, setIfcFiles] = useState<IFCFile[]>([])
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedIFCFile, setSelectedIFCFile] = useState<IFCFile | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const clientId = useRef<string>(Math.random().toString(36).substring(7))

  useEffect(() => {
    if (projectId) {
      loadProjectData()
      loadIfcFiles()
      setupWebSocket()
    }
    
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [projectId])

  const setupWebSocket = () => {
    if (!projectId) return

    try {
      const wsUrl = `ws://localhost:8000/ws/${clientId.current}`
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        if (ws.current) {
          ws.current.send(JSON.stringify({
            type: 'subscribe',
            project_id: projectId
          }))
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Error setting up WebSocket:', error)
    }
  }

  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'ifc_status_update') {
      setIfcFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === message.ifc_file_id 
            ? { ...file, status: message.status }
            : file
        )
      )
    } else if (message.type === 'subscribed') {
      console.log(`Subscribed to project ${message.project_id}`)
    }
  }

  const loadProjectData = async () => {
    try {
      setIsLoadingProject(true)
      const projectData = await projectsApi.getById(projectId!)
      setProject(projectData)
    } catch (err) {
      setError('Erro ao carregar projeto')
      console.error(err)
    } finally {
      setIsLoadingProject(false)
    }
  }

  const loadIfcFiles = async () => {
    try {
      setIsLoadingFiles(true)
      const filesData = await ifcFilesApi.getByProjectId(projectId!)
      setIfcFiles(filesData)
    } catch (err) {
      setError('Erro ao carregar arquivos IFC')
      console.error(err)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setError('Por favor, selecione apenas arquivos IFC')
      return
    }

    try {
      setIsUploading(true)
      setError('')
      const uploadedFile = await ifcFilesApi.upload(projectId!, file)
      setIfcFiles([...ifcFiles, uploadedFile])
    } catch (err) {
      setError('Erro ao fazer upload do arquivo')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [projectId, ifcFiles])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#28a745'
      case 'PROCESSING':
        return '#ffc107'
      case 'ERROR':
        return '#dc3545'
      case 'PENDING':
      default:
        return '#6c757d'
    }
  }

  if (isLoadingProject) {
    return (
      <div className="container">
        <div>Carregando projeto...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container">
        <div>Projeto não encontrado</div>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary">
          Voltar aos Projetos
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/projects')} className="btn btn-secondary">
            ← Voltar
          </button>
          <h1>AEC Axis</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Bem-vindo, {user?.email}</span>
          <button onClick={logout} className="btn btn-secondary">
            Sair
          </button>
        </div>
      </header>

      <h2 style={{ marginBottom: '30px' }}>{project.name}</h2>

      {error && <div className="error-message">{error}</div>}

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Upload de Arquivos IFC</h3>
        
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${isDragOver ? '#007bff' : '#ccc'}`,
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#f8f9fa' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {isUploading ? (
            <div>
              <div>Enviando arquivo...</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '10px', fontSize: '18px', color: '#666' }}>
                Arraste e solte um arquivo IFC aqui
              </div>
              <div style={{ marginBottom: '15px', color: '#888' }}>
                ou
              </div>
              <input
                type="file"
                accept=".ifc"
                onChange={(e) => handleFileUpload(e.target.files)}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" className="btn">
                Selecionar Arquivo
              </label>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '15px' }}>Arquivos IFC</h3>
        
        {isLoadingFiles ? (
          <div>Carregando arquivos...</div>
        ) : ifcFiles.length === 0 ? (
          <div className="empty-state">
            <h4>Nenhum arquivo IFC encontrado.</h4>
            <p>Faça o upload de um arquivo IFC para começar a extrair quantitativos.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NOME DO ARQUIVO</th>
                <th>TAMANHO</th>
                <th>DATA DO UPLOAD</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ifcFiles.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => file.status === 'COMPLETED' && setSelectedIFCFile(file)}
                  style={{
                    cursor: file.status === 'COMPLETED' ? 'pointer' : 'default',
                    backgroundColor: selectedIFCFile?.id === file.id ? '#f8f9fa' : 'transparent'
                  }}
                  title={file.status === 'COMPLETED' ? 'Clique para ver materiais extraídos' : ''}
                >
                  <td>{file.filename}</td>
                  <td>{formatFileSize(file.file_size)}</td>
                  <td>{formatDate(file.upload_date)}</td>
                  <td>
                    <span
                      style={{
                        color: getStatusColor(file.status),
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(file.status) + '20'
                      }}
                    >
                      {file.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedIFCFile && selectedIFCFile.status === 'COMPLETED' && (
        <MaterialsTable
          ifcFileId={selectedIFCFile.id}
          filename={selectedIFCFile.filename}
        />
      )}
    </div>
  )
}

export default ProjectDetail