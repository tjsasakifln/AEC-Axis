import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { projectsApi, ifcFilesApi, rfqsApi, Project, IFCFile, RFQ } from '../services/api'
import MaterialsTable from '../components/materials-table'
import SupplierSelectionModal from '../components/supplier-selection-modal'
import QuoteDashboard from '../components/quote-dashboard'
import IFCViewer from '../components/ifc-viewer'

function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [ifcFiles, setIfcFiles] = useState<IFCFile[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [isLoadingRfqs, setIsLoadingRfqs] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedIFCFile, setSelectedIFCFile] = useState<IFCFile | null>(null)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)
  const [ifcViewerUrl, setIfcViewerUrl] = useState<string | null>(null)
  const [isLoadingViewerUrl, setIsLoadingViewerUrl] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const clientId = useRef<string>(Math.random().toString(36).substring(7))

  useEffect(() => {
    if (projectId) {
      loadProjectData()
      loadIfcFiles()
      loadRfqs()
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
      setMessage('Erro ao carregar projeto')
      setMessageType('error')
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
      setMessage('Erro ao carregar arquivos IFC')
      setMessageType('error')
      console.error(err)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const loadRfqs = async () => {
    try {
      setIsLoadingRfqs(true)
      const rfqsData = await rfqsApi.getByProjectId(projectId!)
      setRfqs(rfqsData)
    } catch (err) {
      setMessage('Erro ao carregar RFQs')
      setMessageType('error')
      console.error(err)
    } finally {
      setIsLoadingRfqs(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setMessage('Por favor, selecione apenas arquivos IFC')
      setMessageType('error')
      return
    }

    try {
      setIsUploading(true)
      setMessage('')
      const uploadedFile = await ifcFilesApi.upload(projectId!, file)
      setIfcFiles([...ifcFiles, uploadedFile])
    } catch (err) {
      setMessage('Erro ao fazer upload do arquivo')
      setMessageType('error')
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

  const handleRFQSubmission = async (supplierIds: string[]) => {
    if (!projectId || selectedMaterialIds.length === 0 || supplierIds.length === 0) {
      return
    }

    try {
      setMessage('')
      
      await rfqsApi.create({
        project_id: projectId,
        material_ids: selectedMaterialIds,
        supplier_ids: supplierIds
      })

      setIsSupplierModalOpen(false)
      setSelectedMaterialIds([])
      setMessage('RFQ enviado com sucesso! Os fornecedores receberão a solicitação de cotação.')
      setMessageType('success')
      
      // Reload RFQs to show the new one
      loadRfqs()
      
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage('Erro ao enviar RFQ. Tente novamente.')
      setMessageType('error')
      console.error(err)
    } finally {
      // RFQ submission completed
    }
  }

  const loadIfcViewerUrl = async (ifcFileId: string) => {
    try {
      setIsLoadingViewerUrl(true)
      setIfcViewerUrl(null)
      const response = await ifcFilesApi.getViewerUrl(ifcFileId)
      setIfcViewerUrl(response.url)
    } catch (err) {
      console.error('Error loading IFC viewer URL:', err)
      setMessage('Erro ao carregar URL do visualizador 3D')
      setMessageType('error')
    } finally {
      setIsLoadingViewerUrl(false)
    }
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

      {selectedRfqId && (
        <QuoteDashboard 
          rfqId={selectedRfqId} 
          onClose={() => setSelectedRfqId(null)} 
        />
      )}

      {!selectedRfqId && (
        <>
          {/* RFQs Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>RFQs Gerados</h3>
            
            {isLoadingRfqs ? (
              <div>Carregando RFQs...</div>
            ) : rfqs.length === 0 ? (
              <div className="empty-state">
                <h4>Nenhum RFQ gerado ainda.</h4>
                <p>Faça o upload de um arquivo IFC e gere cotações para ver os RFQs aqui.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>STATUS</th>
                    <th>CRIADO EM</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.map((rfq) => (
                    <tr key={rfq.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                        {rfq.id.slice(-8)}
                      </td>
                      <td>
                        <span
                          style={{
                            color: rfq.status === 'OPEN' ? '#007bff' : '#6c757d',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: rfq.status === 'OPEN' ? '#007bff20' : '#6c757d20'
                          }}
                        >
                          {rfq.status}
                        </span>
                      </td>
                      <td>{formatDate(rfq.created_at)}</td>
                      <td>
                        <button
                          onClick={() => setSelectedRfqId(rfq.id)}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '14px'
                          }}
                        >
                          Ver Dashboard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!selectedRfqId && message && (
        <div 
          className={messageType === 'error' ? 'error-message' : 'success-message'}
          style={{
            padding: '10px 15px',
            borderRadius: '4px',
            marginBottom: '15px',
            backgroundColor: messageType === 'error' ? '#f8d7da' : '#d1f2eb',
            color: messageType === 'error' ? '#721c24' : '#0c5460',
            border: `1px solid ${messageType === 'error' ? '#f5c6cb' : '#bee5eb'}`
          }}
        >
          {message}
        </div>
      )}

      {!selectedRfqId && (
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
      )}

      {!selectedRfqId && (
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
                  onClick={() => {
                    if (file.status === 'COMPLETED') {
                      setSelectedIFCFile(file)
                      setSelectedMaterialIds([])
                      loadIfcViewerUrl(file.id)
                    }
                  }}
                  style={{
                    cursor: file.status === 'COMPLETED' ? 'pointer' : 'default',
                    backgroundColor: selectedIFCFile?.id === file.id ? '#f8f9fa' : 'transparent'
                  }}
                  title={file.status === 'COMPLETED' ? 'Clique para ver materiais extraídos e visualizar em 3D' : ''}
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
      )}

      {!selectedRfqId && selectedIFCFile && selectedIFCFile.status === 'COMPLETED' && (
        <div>
          {/* IFC 3D Viewer Section */}
          {ifcViewerUrl && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '15px' }}>Visualizador 3D - {selectedIFCFile.filename}</h3>
              <IFCViewer
                ifcFileUrl={ifcViewerUrl}
                height="500px"
                width="100%"
                onLoadStart={() => {
                  console.log('IFC model loading started')
                }}
                onLoadComplete={() => {
                  console.log('IFC model loaded successfully')
                }}
                onLoadError={(error) => {
                  console.error('IFC model loading error:', error)
                  setMessage('Erro ao carregar modelo 3D. Verifique se o arquivo IFC é válido.')
                  setMessageType('error')
                }}
              />
            </div>
          )}
          
          {isLoadingViewerUrl && (
            <div style={{ marginBottom: '30px', padding: '20px', textAlign: 'center' }}>
              <div>Carregando visualizador 3D...</div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Quantitativos Extraídos - {selectedIFCFile.filename}</h3>
            <button
              className="btn"
              disabled={selectedMaterialIds.length === 0}
              onClick={() => setIsSupplierModalOpen(true)}
              style={{
                backgroundColor: selectedMaterialIds.length > 0 ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: selectedMaterialIds.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              Gerar Cotação ({selectedMaterialIds.length} itens)
            </button>
          </div>
          <MaterialsTable
            ifcFileId={selectedIFCFile.id}
            onSelectedMaterialsChange={setSelectedMaterialIds}
          />
        </div>
      )}

      {!selectedRfqId && (
        <SupplierSelectionModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSubmit={handleRFQSubmission}
          selectedMaterialCount={selectedMaterialIds.length}
        />
      )}
    </div>
  )
}

export default ProjectDetail