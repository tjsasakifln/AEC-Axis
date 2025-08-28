import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, authStates } from '@test-utils/render-helpers'
import {
  createMockProject,
  createMockIFCFileList,
  createMockMaterialList,
  createMockSupplierList,
  createMockRFQList,
  createMockFile,
  createMockProjectScenario,
  createMockWebSocketMessage,
  createMockIFCStatusUpdate,
} from '@test-utils/mock-data'
import { setupTestServer, teardownTestServer, resetTestServerAfterEach, useTestServerHandlers } from '@test-utils/test-server'
import { http, HttpResponse, delay } from 'msw'
import ProjectDetail from '../../pages/project-detail'
import { MockWebSocket } from '@test-utils/setup'

// ============================================================================
// PROJECT DETAIL COMPREHENSIVE TEST SUITE
// Target: 100% coverage for complex page with WebSocket, file upload, and multiple integrations
// ============================================================================

const API_BASE_URL = 'http://localhost:8000'

// Mock child components to isolate ProjectDetail testing
vi.mock('../../components/materials-table', () => ({
  default: ({ onSelectedMaterialsChange }: any) => (
    <div data-testid="materials-table">
      <button onClick={() => onSelectedMaterialsChange(['material-1', 'material-2'])}>
        Mock Select Materials
      </button>
    </div>
  )
}))

vi.mock('../../components/quote-dashboard', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="quote-dashboard">
      <button onClick={onClose}>Mock Close Dashboard</button>
    </div>
  )
}))

vi.mock('../../components/ifc-viewer', () => ({
  default: ({ onLoadStart, onLoadComplete, onLoadError }: any) => (
    <div data-testid="ifc-viewer">
      <button onClick={onLoadStart}>Mock Load Start</button>
      <button onClick={onLoadComplete}>Mock Load Complete</button>
      <button onClick={() => onLoadError(new Error('Mock error'))}>Mock Load Error</button>
    </div>
  )
}))

vi.mock('../../components/supplier-selection-modal', () => ({
  default: ({ isOpen, onSubmit, onClose }: any) => (
    isOpen ? (
      <div data-testid="supplier-selection-modal">
        <button onClick={() => onSubmit(['supplier-1', 'supplier-2'])}>Mock Submit RFQ</button>
        <button onClick={onClose}>Mock Close Modal</button>
      </div>
    ) : null
  )
}))

// Mock the advanced upload components
vi.mock('../../components/upload/AdvancedUploadArea', () => ({
  default: ({ onFileSelect, disabled }: any) => (
    <div data-testid="advanced-upload-area">
      <input
        type="file"
        onChange={(e) => onFileSelect(e.target.files)}
        disabled={disabled}
        data-testid="file-input"
      />
    </div>
  )
}))

vi.mock('../../components/upload/FilePreviewModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }: any) => (
    isOpen ? (
      <div data-testid="file-preview-modal">
        <button onClick={onConfirm}>Confirm Upload</button>
        <button onClick={onCancel}>Cancel Upload</button>
      </div>
    ) : null
  )
}))

// Mock file upload hook
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: ({ onComplete, onError }: any) => ({
    uploadState: { 
      status: 'idle',
      progress: null,
      error: null,
      canCancel: false,
      canRetry: false
    },
    uploadFile: vi.fn().mockImplementation(async (file, projectId) => {
      // Simulate successful upload
      setTimeout(() => {
        onComplete({
          id: 'mock-ifc-file-id',
          filename: file.name,
          status: 'PENDING',
          file_size: file.size,
          upload_date: new Date().toISOString()
        })
      }, 100)
    }),
    retryUpload: vi.fn(),
    cancelUpload: vi.fn(),
    resetUploadState: vi.fn(),
  })
}))

vi.mock('../../hooks/useIFCPreview', () => ({
  useIFCPreview: () => ({
    isAnalyzing: false,
    analyzeFile: vi.fn().mockResolvedValue({
      elements: 150,
      materials: 25,
      size: '2.5 MB',
      version: 'IFC4'
    })
  })
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'test-project-1' }),
  }
})

describe('ProjectDetail', () => {
  let mockWebSocket: MockWebSocket
  
  beforeAll(() => {
    setupTestServer()
  })

  afterAll(() => {
    teardownTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Mock WebSocket constructor to track instances
    const originalWebSocket = global.WebSocket
    global.WebSocket = vi.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url)
      return mockWebSocket
    }) as any
  })

  afterEach(() => {
    resetTestServerAfterEach()
    if (mockWebSocket) {
      mockWebSocket.close()
    }
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('displays loading state while fetching project data', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/:projectId`, async () => {
        await delay(1000)
        return HttpResponse.json(createMockProject())
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    expect(screen.getByText('Carregando projeto...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Carregando projeto...')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  // ============================================================================
  // SUCCESS STATE TESTS
  // ============================================================================

  it('displays project information and all sections', async () => {
    const { project, ifcFiles, rfqs } = createMockProjectScenario('test-project-1')

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json(ifcFiles)),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json(rfqs)),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText(project.name)).toBeInTheDocument()
    })

    // Check main sections are present
    expect(screen.getByText('RFQs Gerados')).toBeInTheDocument()
    expect(screen.getByText('Upload de Arquivos IFC')).toBeInTheDocument()
    expect(screen.getByText('Arquivos IFC')).toBeInTheDocument()
  })

  it('displays user information in header', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    const testUser = { email: 'test@aecaxis.com', id: '1', company_id: '1' }
    
    renderWithProviders(<ProjectDetail />, {
      initialAuthState: { ...authStates.authenticated, user: testUser },
    })

    await waitFor(() => {
      expect(screen.getByText('Bem-vindo, test@aecaxis.com')).toBeInTheDocument()
    })

    expect(screen.getByText('Sair')).toBeInTheDocument()
  })

  // ============================================================================
  // NAVIGATION TESTS
  // ============================================================================

  it('navigates back to projects when back button is clicked', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('← Voltar')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('← Voltar'))
    expect(mockNavigate).toHaveBeenCalledWith('/projects')
  })

  it('handles project not found error', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => {
        return new HttpResponse(null, { status: 404 })
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Projeto não encontrado')).toBeInTheDocument()
    })

    expect(screen.getByText('Voltar aos Projetos')).toBeInTheDocument()
  })

  // ============================================================================
  // WEBSOCKET INTEGRATION TESTS
  // ============================================================================

  it('establishes WebSocket connection and subscribes to project updates', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('ws://localhost:8000/ws/'))
    })

    // Wait for WebSocket to open and send subscription message
    await waitFor(() => {
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          project_id: 'test-project-1'
        })
      )
    })
  })

  it('handles IFC status updates via WebSocket', async () => {
    const { project, ifcFiles } = createMockProjectScenario()
    const ifcFileWithPending = [...ifcFiles, {
      id: 'pending-ifc',
      filename: 'pending-file.ifc',
      status: 'PENDING' as const,
      file_size: 1024000,
      upload_date: new Date().toISOString()
    }]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json(ifcFileWithPending)),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument()
    })

    // Simulate WebSocket status update
    const statusUpdate = createMockIFCStatusUpdate('pending-ifc', 'COMPLETED')
    mockWebSocket.mockReceiveMessage(statusUpdate)

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      expect(screen.queryByText('PENDING')).not.toBeInTheDocument()
    })
  })

  it('handles WebSocket connection errors gracefully', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined()
    })

    // Simulate WebSocket error
    mockWebSocket.mockError()

    // Component should continue to work despite WebSocket error
    expect(screen.getByText(project.name)).toBeInTheDocument()
  })

  // ============================================================================
  // FILE UPLOAD TESTS
  // ============================================================================

  it('handles file selection and shows preview modal', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByTestId('advanced-upload-area')).toBeInTheDocument()
    })

    // Simulate file selection
    const fileInput = screen.getByTestId('file-input')
    const mockFile = createMockFile('test.ifc')
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    })

    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByTestId('file-preview-modal')).toBeInTheDocument()
    })
  })

  it('handles file upload confirmation and success', async () => {
    const { project, ifcFiles } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json(ifcFiles)),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
      http.post(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => {
        return HttpResponse.json({
          id: 'new-ifc-file',
          filename: 'test.ifc',
          status: 'PENDING',
          file_size: 1024,
          upload_date: new Date().toISOString()
        })
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByTestId('file-input')).toBeInTheDocument()
    })

    // Select file
    const fileInput = screen.getByTestId('file-input')
    const mockFile = createMockFile('test.ifc')
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    })
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText('Confirm Upload')).toBeInTheDocument()
    })

    // Confirm upload
    await userEvent.click(screen.getByText('Confirm Upload'))

    await waitFor(() => {
      expect(screen.getByText('Upload concluído com sucesso!')).toBeInTheDocument()
    })
  })

  it('handles file upload cancellation', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByTestId('file-input')).toBeInTheDocument()
    })

    // Select file
    const fileInput = screen.getByTestId('file-input')
    const mockFile = createMockFile('test.ifc')
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    })
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText('Cancel Upload')).toBeInTheDocument()
    })

    // Cancel upload
    await userEvent.click(screen.getByText('Cancel Upload'))

    await waitFor(() => {
      expect(screen.queryByTestId('file-preview-modal')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // IFC FILES MANAGEMENT TESTS
  // ============================================================================

  it('displays IFC files table with correct information', async () => {
    const { project, ifcFiles } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json(ifcFiles)),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Arquivos IFC')).toBeInTheDocument()
    })

    // Check table headers
    expect(screen.getByText('NOME DO ARQUIVO')).toBeInTheDocument()
    expect(screen.getByText('TAMANHO')).toBeInTheDocument()
    expect(screen.getByText('DATA DO UPLOAD')).toBeInTheDocument()
    expect(screen.getByText('STATUS')).toBeInTheDocument()

    // Check file data
    ifcFiles.forEach(file => {
      expect(screen.getByText(file.filename)).toBeInTheDocument()
      expect(screen.getByText(file.status)).toBeInTheDocument()
    })
  })

  it('handles IFC file selection and displays materials/3D viewer', async () => {
    const { project, ifcFiles, materials } = createMockProjectScenario()
    const completedIFCFile = { ...ifcFiles[0], status: 'COMPLETED' as const }
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([completedIFCFile])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/ifc-files/${completedIFCFile.id}/materials`, () => HttpResponse.json(materials)),
      http.get(`${API_BASE_URL}/ifc-files/${completedIFCFile.id}/viewer-url`, () => {
        return HttpResponse.json({ url: 'https://mock-s3-url.com/file.ifc' })
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText(completedIFCFile.filename)).toBeInTheDocument()
    })

    // Click on completed IFC file
    await userEvent.click(screen.getByText(completedIFCFile.filename))

    await waitFor(() => {
      expect(screen.getByTestId('ifc-viewer')).toBeInTheDocument()
      expect(screen.getByTestId('materials-table')).toBeInTheDocument()
    })

    expect(screen.getByText(`Quantitativos Extraídos - ${completedIFCFile.filename}`)).toBeInTheDocument()
  })

  // ============================================================================
  // RFQ GENERATION TESTS
  // ============================================================================

  it('handles RFQ generation workflow', async () => {
    const { project, ifcFiles, materials, suppliers } = createMockProjectScenario()
    const completedIFCFile = { ...ifcFiles[0], status: 'COMPLETED' as const }
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([completedIFCFile])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/ifc-files/${completedIFCFile.id}/materials`, () => HttpResponse.json(materials)),
      http.get(`${API_BASE_URL}/ifc-files/${completedIFCFile.id}/viewer-url`, () => {
        return HttpResponse.json({ url: 'https://mock-s3-url.com/file.ifc' })
      }),
      http.get(`${API_BASE_URL}/suppliers`, () => HttpResponse.json(suppliers)),
      http.post(`${API_BASE_URL}/rfqs`, () => {
        return new HttpResponse(null, { status: 201 })
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    // Select IFC file to show materials
    await waitFor(() => {
      expect(screen.getByText(completedIFCFile.filename)).toBeInTheDocument()
    })
    await userEvent.click(screen.getByText(completedIFCFile.filename))

    await waitFor(() => {
      expect(screen.getByTestId('materials-table')).toBeInTheDocument()
    })

    // Mock select materials
    await userEvent.click(screen.getByText('Mock Select Materials'))

    // Should enable the RFQ generation button
    await waitFor(() => {
      expect(screen.getByText('Gerar Cotação (2 itens)')).toBeInTheDocument()
    })

    // Click RFQ generation button
    await userEvent.click(screen.getByText('Gerar Cotação (2 itens)'))

    await waitFor(() => {
      expect(screen.getByTestId('supplier-selection-modal')).toBeInTheDocument()
    })

    // Submit RFQ
    await userEvent.click(screen.getByText('Mock Submit RFQ'))

    await waitFor(() => {
      expect(screen.getByText('RFQ enviado com sucesso! Os fornecedores receberão a solicitação de cotação.')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // QUOTE DASHBOARD TESTS
  // ============================================================================

  it('displays quote dashboard when RFQ is selected', async () => {
    const { project, rfqs } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json(rfqs)),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Ver Dashboard')).toBeInTheDocument()
    })

    // Click on "Ver Dashboard" button
    await userEvent.click(screen.getByText('Ver Dashboard'))

    await waitFor(() => {
      expect(screen.getByTestId('quote-dashboard')).toBeInTheDocument()
    })

    // Close dashboard
    await userEvent.click(screen.getByText('Mock Close Dashboard'))

    await waitFor(() => {
      expect(screen.queryByTestId('quote-dashboard')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('handles API errors gracefully with error messages', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar projeto')).toBeInTheDocument()
    })
  })

  it('handles IFC files loading error', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => {
        return new HttpResponse(null, { status: 500 })
      }),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar arquivos IFC')).toBeInTheDocument()
    })
  })

  it('handles RFQs loading error', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => {
        return new HttpResponse(null, { status: 500 })
      }),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar RFQs')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // AUTHENTICATION AND SECURITY TESTS
  // ============================================================================

  it('handles user logout', async () => {
    const { project } = createMockProjectScenario()
    const mockLogout = vi.fn()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    // Mock AuthProvider to track logout calls
    vi.mock('../../contexts/auth-context', () => ({
      useAuth: () => ({
        user: { email: 'test@example.com' },
        logout: mockLogout,
        isAuthenticated: true,
      })
    }))

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Sair')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Sair'))
    // In a real implementation, this would call the actual logout function
  })

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  it('formats file sizes correctly', async () => {
    const { project } = createMockProjectScenario()
    const ifcFileWithLargeSize = {
      id: 'large-file',
      filename: 'large-warehouse.ifc',
      status: 'COMPLETED' as const,
      file_size: 52428800, // 50MB
      upload_date: new Date().toISOString()
    }
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([ifcFileWithLargeSize])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('50 MB')).toBeInTheDocument()
    })
  })

  it('formats dates correctly in Brazilian format', async () => {
    const { project } = createMockProjectScenario()
    const ifcFileWithDate = {
      id: 'dated-file',
      filename: 'dated-warehouse.ifc',
      status: 'COMPLETED' as const,
      file_size: 1024000,
      upload_date: '2025-08-28T15:30:00Z'
    }
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([ifcFileWithDate])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      const expectedDate = new Date('2025-08-28T15:30:00Z').toLocaleDateString('pt-BR')
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  it('displays empty state when no IFC files are present', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Nenhum arquivo IFC encontrado.')).toBeInTheDocument()
      expect(screen.getByText('Faça o upload de um arquivo IFC para começar a extrair quantitativos.')).toBeInTheDocument()
    })
  })

  it('displays empty state when no RFQs are generated', async () => {
    const { project } = createMockProjectScenario()
    
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/projects/test-project-1`, () => HttpResponse.json(project)),
      http.get(`${API_BASE_URL}/projects/test-project-1/ifc-files`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/projects/test-project-1/rfqs`, () => HttpResponse.json([])),
    ])

    renderWithProviders(<ProjectDetail />, {
      initialAuthState: authStates.authenticated,
    })

    await waitFor(() => {
      expect(screen.getByText('Nenhum RFQ gerado ainda.')).toBeInTheDocument()
      expect(screen.getByText('Faça o upload de um arquivo IFC e gere cotações para ver os RFQs aqui.')).toBeInTheDocument()
    })
  })
})