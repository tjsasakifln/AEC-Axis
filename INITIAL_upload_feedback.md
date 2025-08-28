# INITIAL: Feedback Visual Aprimorado para Upload (project-detail.tsx)

## FEATURE

Implementar sistema avançado de feedback visual para upload de arquivos IFC no componente `project-detail.tsx`, incluindo barra de progresso real usando `XMLHttpRequest.upload.progress`, estimativa de tempo baseada em tamanho do arquivo, preview das primeiras informações extraídas do IFC antes do processamento completo, e experiência de usuário otimizada para reduzir ansiedade e abandono.

### Contexto e Problema Atual
O sistema atual de upload no `frontend/src/pages/project-detail.tsx` (linhas 143-165) apresenta apenas um loading básico ("Enviando arquivo...") sem informações específicas sobre o progresso real. Esta limitação causa:

- **Ansiedade do usuário:** Sem feedback sobre progresso real
- **Taxa de abandono elevada:** Usuários fecham a página durante uploads longos
- **Experiência frustrante:** Não há estimativa de tempo ou indicação de que o sistema está funcionando
- **Falta de transparência:** Usuário não sabe se upload de 100MB vai levar 30 segundos ou 5 minutos

### Objetivos de UX
- Reduzir ansiedade durante uploads longos (>50MB)
- Aumentar confiança na plataforma através de transparência
- Reduzir taxa de abandono em 60%
- Proporcionar feedback immediate e informativo

## REQUISITOS TÉCNICOS

### 1. Barra de Progresso Real com XMLHttpRequest

**Substituir Upload Atual por XMLHttpRequest com Progress:**
```typescript
// Modificar handleFileUpload em project-detail.tsx (linha 143)
interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  remainingTime: number // seconds
  eta: string // formatted ETA
}

const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
const [uploadStartTime, setUploadStartTime] = useState<number | null>(null)
const [uploadSpeed, setUploadSpeed] = useState<number[]>([]) // Speed samples for smoothing

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
    setUploadStartTime(Date.now())
    setUploadProgress({
      loaded: 0,
      total: file.size,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      eta: 'Calculando...'
    })

    const uploadedFile = await uploadFileWithProgress(projectId!, file)
    setIfcFiles([...ifcFiles, uploadedFile])
    setMessage('Upload concluído com sucesso!')
    setMessageType('success')
    
  } catch (err) {
    setMessage('Erro ao fazer upload do arquivo')
    setMessageType('error')
    console.error(err)
  } finally {
    setIsUploading(false)
    setUploadProgress(null)
    setUploadStartTime(null)
    setUploadSpeed([])
  }
}

const uploadFileWithProgress = (projectId: string, file: File): Promise<IFCFile> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    // Progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const now = Date.now()
        const elapsed = (now - uploadStartTime!) / 1000 // seconds
        const loaded = event.loaded
        const total = event.total
        const percentage = Math.round((loaded / total) * 100)
        
        // Calculate current speed
        const currentSpeed = loaded / elapsed // bytes per second
        
        // Smooth speed calculation (moving average of last 5 samples)
        const newSpeedSamples = [...uploadSpeed, currentSpeed].slice(-5)
        setUploadSpeed(newSpeedSamples)
        const averageSpeed = newSpeedSamples.reduce((a, b) => a + b, 0) / newSpeedSamples.length
        
        // Calculate remaining time
        const remainingBytes = total - loaded
        const remainingTime = remainingBytes / averageSpeed
        
        // Format ETA
        const eta = formatTimeRemaining(remainingTime)

        setUploadProgress({
          loaded,
          total,
          percentage,
          speed: averageSpeed,
          remainingTime,
          eta
        })
      }
    })

    // Success handler
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const response = JSON.parse(xhr.responseText)
        resolve(response)
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`))
      }
    })

    // Error handlers
    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    // Configure and send request
    const token = localStorage.getItem('token')
    xhr.open('POST', `${API_BASE_URL}/projects/${projectId}/ifc-files`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}
```

**Utilitários para Formatação:**
```typescript
const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s restantes`
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60)
    return `${minutes}min restantes`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}h ${minutes}min restantes`
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`
}
```

### 2. Interface Visual de Upload Aprimorada

**Componente de Progresso Avançado:**
```typescript
// Substituir área de upload atual (linhas 385-424)
const AdvancedUploadArea: React.FC<{
  onFileSelect: (files: FileList | null) => void
  isUploading: boolean
  uploadProgress: UploadProgress | null
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}> = ({
  onFileSelect,
  isUploading,
  uploadProgress,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  return (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '15px' }}>Upload de Arquivos IFC</h3>
      
      {!isUploading && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
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
          <div>
            <div style={{ 
              fontSize: '48px', 
              color: '#ccc', 
              marginBottom: '15px' 
            }}>
              📁
            </div>
            <div style={{ 
              marginBottom: '10px', 
              fontSize: '18px', 
              color: '#666' 
            }}>
              Arraste e solte um arquivo IFC aqui
            </div>
            <div style={{ 
              marginBottom: '15px', 
              color: '#888' 
            }}>
              ou
            </div>
            <input
              type="file"
              accept=".ifc"
              onChange={(e) => onFileSelect(e.target.files)}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label 
              htmlFor="file-input" 
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              Selecionar Arquivo
            </label>
            <div style={{ 
              marginTop: '15px', 
              fontSize: '14px', 
              color: '#999' 
            }}>
              Tamanho máximo: 500MB • Formatos aceitos: .ifc
            </div>
          </div>
        </div>
      )}

      {isUploading && uploadProgress && (
        <UploadProgressDisplay progress={uploadProgress} />
      )}
    </div>
  )
}

const UploadProgressDisplay: React.FC<{ progress: UploadProgress }> = ({ progress }) => {
  return (
    <div style={{
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '24px',
      backgroundColor: '#ffffff'
    }}>
      {/* Header with file info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
            Enviando arquivo IFC...
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            {formatFileSize(progress.loaded)} de {formatFileSize(progress.total)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
            {progress.percentage}%
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {formatSpeed(progress.speed)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <div style={{
          width: `${progress.percentage}%`,
          height: '100%',
          backgroundColor: '#007bff',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
          background: 'linear-gradient(90deg, #007bff 0%, #0056b3 100%)'
        }} />
      </div>

      {/* ETA and details */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#666'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="spinner" style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>Processando...</span>
        </div>
        <div>
          {progress.eta}
        </div>
      </div>
    </div>
  )
}
```

### 3. Preview de Informações do IFC Durante Upload

**IFC Preview Component:**
```typescript
interface IFCPreviewData {
  fileName: string
  fileSize: number
  ifcVersion: string
  projectName?: string
  buildingElements: {
    beams: number
    columns: number
    walls: number
    slabs: number
  }
}

const [ifcPreview, setIfcPreview] = useState<IFCPreviewData | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)

const analyzeIFCFile = async (file: File): Promise<IFCPreviewData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const lines = content.split('\n').slice(0, 100) // Primeiras 100 linhas para preview
        
        // Extract basic IFC information from header
        const preview: IFCPreviewData = {
          fileName: file.name,
          fileSize: file.size,
          ifcVersion: extractIFCVersion(lines),
          projectName: extractProjectName(lines),
          buildingElements: {
            beams: countOccurrences(content.substring(0, 50000), 'IFCBEAM'),
            columns: countOccurrences(content.substring(0, 50000), 'IFCCOLUMN'),
            walls: countOccurrences(content.substring(0, 50000), 'IFCWALL'),
            slabs: countOccurrences(content.substring(0, 50000), 'IFCSLAB')
          }
        }
        
        resolve(preview)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    
    // Read only first 100KB for preview (fast analysis)
    const chunk = file.slice(0, 100000)
    reader.readAsText(chunk)
  })
}

const extractIFCVersion = (lines: string[]): string => {
  for (const line of lines) {
    if (line.includes('FILE_SCHEMA')) {
      const match = line.match(/IFC[^']*/)
      return match ? match[0] : 'Desconhecido'
    }
  }
  return 'Desconhecido'
}

const extractProjectName = (lines: string[]): string | undefined => {
  for (const line of lines) {
    if (line.includes('IFCPROJECT')) {
      const match = line.match(/'([^']*)'/)
      return match ? match[1] : undefined
    }
  }
  return undefined
}

const countOccurrences = (text: string, pattern: string): number => {
  const matches = text.match(new RegExp(pattern, 'gi'))
  return matches ? matches.length : 0
}

// Modificar handleFileUpload para incluir preview
const handleFileUploadWithPreview = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  const file = files[0]
  if (!file.name.toLowerCase().endswith('.ifc')) {
    setMessage('Por favor, selecione apenas arquivos IFC')
    setMessageType('error')
    return
  }

  try {
    // Step 1: Quick file analysis for preview
    setIsAnalyzing(true)
    const preview = await analyzeIFCFile(file)
    setIfcPreview(preview)
    setIsAnalyzing(false)

    // Step 2: Show preview and proceed with upload
    const shouldProceed = await showPreviewConfirmation(preview)
    if (!shouldProceed) {
      setIfcPreview(null)
      return
    }

    // Step 3: Actual upload with progress
    setIsUploading(true)
    // ... existing upload logic
    
  } catch (err) {
    setIsAnalyzing(false)
    setMessage('Erro ao analisar arquivo IFC')
    setMessageType('error')
  }
}

const IFCPreviewModal: React.FC<{
  preview: IFCPreviewData
  onConfirm: () => void
  onCancel: () => void
}> = ({ preview, onConfirm, onCancel }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '70vh',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          Preview do Arquivo IFC
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div>
              <strong>Arquivo:</strong>
              <div style={{ color: '#666' }}>{preview.fileName}</div>
            </div>
            <div>
              <strong>Tamanho:</strong>
              <div style={{ color: '#666' }}>{formatFileSize(preview.fileSize)}</div>
            </div>
            <div>
              <strong>Versão IFC:</strong>
              <div style={{ color: '#666' }}>{preview.ifcVersion}</div>
            </div>
            <div>
              <strong>Projeto:</strong>
              <div style={{ color: '#666' }}>{preview.projectName || 'Não identificado'}</div>
            </div>
          </div>
          
          <div>
            <strong style={{ marginBottom: '8px', display: 'block' }}>
              Elementos Detectados:
            </strong>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div>Vigas: <strong>{preview.buildingElements.beams}</strong></div>
              <div>Pilares: <strong>{preview.buildingElements.columns}</strong></div>
              <div>Paredes: <strong>{preview.buildingElements.walls}</strong></div>
              <div>Lajes: <strong>{preview.buildingElements.slabs}</strong></div>
            </div>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Continuar Upload
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4. Estados de Erro Melhorados

**Error Handling Aprimorado:**
```typescript
interface UploadError {
  type: 'network' | 'validation' | 'server' | 'timeout' | 'cancelled'
  message: string
  code?: number
  canRetry: boolean
  details?: any
}

const [uploadError, setUploadError] = useState<UploadError | null>(null)

const handleUploadError = (error: any, xhr?: XMLHttpRequest): UploadError => {
  if (error.name === 'AbortError') {
    return {
      type: 'cancelled',
      message: 'Upload cancelado pelo usuário',
      canRetry: true
    }
  }
  
  if (!navigator.onLine) {
    return {
      type: 'network',
      message: 'Sem conexão com a internet',
      canRetry: true
    }
  }
  
  if (xhr) {
    if (xhr.status === 413) {
      return {
        type: 'validation',
        message: 'Arquivo muito grande. Máximo permitido: 500MB',
        code: 413,
        canRetry: false
      }
    }
    
    if (xhr.status === 415) {
      return {
        type: 'validation',
        message: 'Formato de arquivo inválido. Apenas arquivos .ifc são aceitos',
        code: 415,
        canRetry: false
      }
    }
    
    if (xhr.status >= 500) {
      return {
        type: 'server',
        message: 'Erro interno do servidor. Tente novamente em alguns minutos',
        code: xhr.status,
        canRetry: true
      }
    }
  }
  
  return {
    type: 'network',
    message: 'Falha na conexão. Verifique sua internet e tente novamente',
    canRetry: true
  }
}

const ErrorDisplay: React.FC<{
  error: UploadError
  onRetry?: () => void
  onDismiss: () => void
}> = ({ error, onRetry, onDismiss }) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network': return '🌐'
      case 'validation': return '⚠️'
      case 'server': return '🔧'
      case 'timeout': return '⏰'
      case 'cancelled': return '❌'
      default: return '❗'
    }
  }
  
  const getErrorColor = () => {
    switch (error.type) {
      case 'validation': return '#856404'
      case 'network': return '#0c5460'
      case 'server': return '#721c24'
      default: return '#721c24'
    }
  }
  
  const getBackgroundColor = () => {
    switch (error.type) {
      case 'validation': return '#fff3cd'
      case 'network': return '#d1ecf1'
      case 'server': return '#f8d7da'
      default: return '#f8d7da'
    }
  }
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '6px',
      backgroundColor: getBackgroundColor(),
      border: `1px solid ${getErrorColor()}20`,
      marginBottom: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px' 
      }}>
        <div style={{ fontSize: '24px' }}>
          {getErrorIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '500', 
            color: getErrorColor(), 
            marginBottom: '4px' 
          }}>
            Falha no Upload
          </div>
          <div style={{ 
            color: getErrorColor(), 
            fontSize: '14px',
            marginBottom: error.canRetry ? '12px' : '0'
          }}>
            {error.message}
          </div>
          
          {error.canRetry && onRetry && (
            <div style={{ 
              display: 'flex', 
              gap: '8px' 
            }}>
              <button
                onClick={onRetry}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: `1px solid ${getErrorColor()}`,
                  backgroundColor: 'white',
                  color: getErrorColor(),
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Tentar Novamente
              </button>
              <button
                onClick={onDismiss}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: getErrorColor(),
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 5. Integração com Processamento Pós-Upload

**Status Timeline Component:**
```typescript
interface ProcessingStage {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  startTime?: string
  endTime?: string
  progress?: number
  details?: string
}

const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
  { id: 'upload', name: 'Upload do arquivo', status: 'pending' },
  { id: 'validation', name: 'Validação IFC', status: 'pending' },
  { id: 'parsing', name: 'Análise do modelo', status: 'pending' },
  { id: 'extraction', name: 'Extração de materiais', status: 'pending' },
  { id: 'completion', name: 'Finalização', status: 'pending' }
])

const ProcessingTimeline: React.FC<{
  stages: ProcessingStage[]
}> = ({ stages }) => {
  return (
    <div style={{
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '20px',
      marginTop: '16px'
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '16px' }}>
        Processamento do Arquivo
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 0'
            }}
          >
            {/* Status Icon */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              backgroundColor: getStageColor(stage.status),
              color: 'white'
            }}>
              {getStageIcon(stage.status)}
            </div>
            
            {/* Stage Info */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: stage.status === 'processing' ? '500' : 'normal',
                color: stage.status === 'completed' ? '#28a745' : '#333'
              }}>
                {stage.name}
              </div>
              
              {stage.details && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  marginTop: '2px' 
                }}>
                  {stage.details}
                </div>
              )}
              
              {stage.status === 'processing' && stage.progress !== undefined && (
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${stage.progress}%`,
                    height: '100%',
                    backgroundColor: '#007bff',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>
            
            {/* Timing */}
            {stage.endTime && stage.startTime && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {calculateDuration(stage.startTime, stage.endTime)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const getStageColor = (status: ProcessingStage['status']): string => {
  switch (status) {
    case 'completed': return '#28a745'
    case 'processing': return '#007bff'
    case 'error': return '#dc3545'
    default: return '#6c757d'
  }
}

const getStageIcon = (status: ProcessingStage['status']): string => {
  switch (status) {
    case 'completed': return '✓'
    case 'processing': return '⟳'
    case 'error': return '✗'
    default: return '○'
  }
}
```

## DOCUMENTATION

### Implementação por Fases

**Fase 1: Upload com Progresso Real (2-3 horas)**
1. Substituir fetch por XMLHttpRequest
2. Implementar tracking de progresso
3. Adicionar cálculos de velocidade e ETA
4. Atualizar interface visual

**Fase 2: Preview de Arquivo (3-4 horas)**
1. Implementar análise rápida de IFC
2. Criar modal de preview
3. Extrair informações básicas do arquivo
4. Integrar confirmação de upload

**Fase 3: Estados de Erro Aprimorados (2 horas)**
1. Categorizar tipos de erro
2. Implementar retry logic
3. Melhorar feedback visual de erros
4. Adicionar detecção de conectividade

**Fase 4: Timeline de Processamento (2-3 horas)**
1. Expandir WebSocket messages
2. Implementar componente de timeline
3. Integrar com backend para stages
4. Adicionar estimativas de tempo

### Benefícios Esperados

**Métricas de UX:**
- Redução de 60% na taxa de abandono durante upload
- Aumento de 40% na confiança do usuário
- Redução de 50% em tickets de suporte relacionados a upload
- Melhoria de 3+ pontos no Net Promoter Score

**Métricas Técnicas:**
- Upload resumption para conexões instáveis
- Better error categorization e handling
- Faster user feedback loop
- Reduced server load através de validation no frontend

## EXAMPLES

### Exemplo de Uso Completo

```typescript
// Estado durante upload de arquivo de 100MB
const exampleProgress: UploadProgress = {
  loaded: 67108864, // ~67MB
  total: 104857600, // 100MB
  percentage: 64,
  speed: 2097152, // 2MB/s
  remainingTime: 18, // 18 seconds
  eta: "18s restantes"
}

// Preview data extraída
const examplePreview: IFCPreviewData = {
  fileName: "warehouse-industrial.ifc",
  fileSize: 104857600,
  ifcVersion: "IFC4",
  projectName: "Galpão Industrial Santos",
  buildingElements: {
    beams: 24,
    columns: 8,
    walls: 12,
    slabs: 3
  }
}

// Estados de processamento
const exampleStages: ProcessingStage[] = [
  { 
    id: 'upload', 
    name: 'Upload do arquivo', 
    status: 'completed',
    startTime: '2025-08-28T14:00:00Z',
    endTime: '2025-08-28T14:01:30Z'
  },
  { 
    id: 'validation', 
    name: 'Validação IFC', 
    status: 'processing',
    startTime: '2025-08-28T14:01:30Z',
    progress: 75,
    details: 'Verificando integridade do modelo...'
  },
  { 
    id: 'parsing', 
    name: 'Análise do modelo', 
    status: 'pending'
  }
  // ...
]
```

### CSS Animations

```css
/* Adicionar ao CSS global */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.upload-progress-enter {
  animation: slideInUp 0.3s ease-out;
}

.progress-bar {
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent 25%,
    rgba(255,255,255,0.3) 25%,
    rgba(255,255,255,0.3) 50%,
    transparent 50%,
    transparent 75%,
    rgba(255,255,255,0.3) 75%
  );
  background-size: 20px 20px;
  animation: move-stripes 1s linear infinite;
}

@keyframes move-stripes {
  0% { transform: translateX(-20px); }
  100% { transform: translateX(20px); }
}
```

## OTHER CONSIDERATIONS

### Performance
- Throttle de updates de progresso (máximo 60fps)
- Cleanup de timers e listeners
- Memory management para arquivos grandes
- Otimização de re-renders React

### Acessibilidade
- Screen reader announcements para mudanças de status
- Keyboard navigation para controles
- High contrast mode support
- ARIA labels para progress indicators

### Mobile Experience
- Touch-friendly drag and drop
- Responsive design para progress display
- Battery-conscious updates
- Offline state detection

### Error Recovery
- Automatic retry com exponential backoff
- Resume upload capabilities
- Network change detection
- Graceful degradation para conexões lentas

### Future Enhancements
- Parallel upload de múltiplos arquivos
- Drag and drop de pastas
- Cloud storage integration (Google Drive, Dropbox)
- Upload queue management
- Background upload com service workers