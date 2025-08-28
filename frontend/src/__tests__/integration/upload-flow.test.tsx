import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WS from 'jest-websocket-mock'
import { renderWithProviders } from '../../test-utils/render-helpers'
import { createMockProject } from '../../test-utils/mock-data'
import ProjectDetail from '../../pages/project-detail'

// ============================================================================
// IFC UPLOAD FLOW INTEGRATION TEST
// Tests the complete workflow from file selection to 3D visualization
// ============================================================================

const mockProject = createMockProject({ id: '1' })

const mockNavigate = vi.fn()
const mockUseParams = vi.fn(() => ({ projectId: '1' }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  }
})

vi.mock('../../services/api', () => ({
  getProject: vi.fn().mockResolvedValue(mockProject),
  uploadFile: vi.fn().mockImplementation((projectId: string, file: File, onProgress: (progress: number) => void) => {
    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 20
      onProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
      }
    }, 100)
    
    return Promise.resolve({
      id: 'file-123',
      filename: file.name,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
      processing_status: 'PROCESSING'
    })
  }),
}))

let mockWebSocketServer: WS

describe('IFC Upload Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWebSocketServer = new WS('ws://localhost:8000/ws/project-1', { jsonProtocol: true })
  })

  afterEach(() => {
    WS.clean()
  })

  // ============================================================================
  // COMPLETE UPLOAD WORKFLOW
  // ============================================================================

  it('completes full upload workflow from file selection to 3D visualization', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    // Step 1: File selection
    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['mock ifc content'], 'test-building.ifc', { type: 'application/x-step' })
    
    await user.upload(fileInput, mockFile)

    // Step 2: Upload progress
    await waitFor(() => {
      expect(screen.getByText('Enviando arquivo...')).toBeInTheDocument()
    })

    // Should show progress bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Step 3: Processing status via WebSocket
    await waitFor(() => {
      expect(mockWebSocketServer).toHaveReceivedMessages([
        expect.objectContaining({
          type: 'project_subscribe',
          project_id: '1'
        })
      ])
    })

    // Simulate processing status updates
    mockWebSocketServer.send({
      type: 'file_processing',
      data: {
        file_id: 'file-123',
        status: 'PROCESSING',
        progress: 25
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Processando arquivo...')).toBeInTheDocument()
    })

    // Simulate processing completion
    mockWebSocketServer.send({
      type: 'file_processing',
      data: {
        file_id: 'file-123',
        status: 'COMPLETED',
        progress: 100,
        ifc_url: '/files/test-building.ifc'
      }
    })

    // Step 4: 3D viewer initialization
    await waitFor(() => {
      expect(screen.getByText('Arquivo processado com sucesso')).toBeInTheDocument()
    })

    // Should show 3D viewer
    const viewer = screen.getByTestId('ifc-viewer')
    expect(viewer).toBeInTheDocument()

    // Step 5: Verify viewer controls are available
    await waitFor(() => {
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
      expect(screen.getByLabelText('Reset view')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // ERROR HANDLING DURING UPLOAD
  // ============================================================================

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock upload failure
    const mockApi = await vi.importMock('../../services/api')
    mockApi.uploadFile.mockRejectedValueOnce(new Error('Upload failed'))

    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['mock content'], 'test.ifc', { type: 'application/x-step' })
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar arquivo')).toBeInTheDocument()
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })

    // Should show retry option
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('handles processing errors from WebSocket', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['mock content'], 'test.ifc', { type: 'application/x-step' })
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument()
    })

    // Simulate processing error
    mockWebSocketServer.send({
      type: 'file_processing',
      data: {
        file_id: 'file-123',
        status: 'ERROR',
        error_message: 'Invalid IFC format'
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Erro no processamento')).toBeInTheDocument()
      expect(screen.getByText('Invalid IFC format')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  it('validates file type and size before upload', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    
    // Test invalid file type
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    await user.upload(fileInput, invalidFile)

    await waitFor(() => {
      expect(screen.getByText('Formato de arquivo não suportado')).toBeInTheDocument()
    })

    // Test oversized file (mock 100MB file)
    const oversizedFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.ifc', { type: 'application/x-step' })
    await user.upload(fileInput, oversizedFile)

    await waitFor(() => {
      expect(screen.getByText('Arquivo muito grande')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // MULTIPLE FILE HANDLING
  // ============================================================================

  it('handles multiple file uploads sequentially', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    
    // Upload first file
    const file1 = new File(['content1'], 'building1.ifc', { type: 'application/x-step' })
    await user.upload(fileInput, file1)

    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument()
    })

    // Upload second file while first is processing
    const file2 = new File(['content2'], 'building2.ifc', { type: 'application/x-step' })
    await user.upload(fileInput, file2)

    // Should queue second upload
    await waitFor(() => {
      expect(screen.getByText('Na fila de upload')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // WEBSOCKET CONNECTION RESILIENCE
  // ============================================================================

  it('handles WebSocket reconnection during upload', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['content'], 'test.ifc', { type: 'application/x-step' })
    
    await user.upload(fileInput, mockFile)

    // Simulate WebSocket disconnection
    mockWebSocketServer.close()

    await waitFor(() => {
      expect(screen.getByText('Conexão perdida')).toBeInTheDocument()
    })

    // Simulate reconnection
    mockWebSocketServer = new WS('ws://localhost:8000/ws/project-1', { jsonProtocol: true })

    await waitFor(() => {
      expect(screen.getByText('Reconectado')).toBeInTheDocument()
    })

    // Should re-subscribe to project updates
    expect(mockWebSocketServer).toHaveReceivedMessages([
      expect.objectContaining({
        type: 'project_subscribe',
        project_id: '1'
      })
    ])
  })

  // ============================================================================
  // PERFORMANCE AND MEMORY
  // ============================================================================

  it('cleans up resources after upload completion', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['content'], 'test.ifc', { type: 'application/x-step' })
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument()
    })

    // Unmount component
    unmount()

    // WebSocket should be closed
    expect(mockWebSocketServer.server.clients()).toHaveLength(0)
  })

  // ============================================================================
  // USER EXPERIENCE
  // ============================================================================

  it('provides clear feedback throughout the upload process', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const fileInput = screen.getByLabelText(/upload|arquivo/i)
    const mockFile = new File(['content'], 'test.ifc', { type: 'application/x-step' })
    
    // Initial state
    expect(screen.getByText('Arraste arquivos aqui ou clique para selecionar')).toBeInTheDocument()
    
    // File selected
    await user.upload(fileInput, mockFile)
    expect(screen.getByText('test.ifc')).toBeInTheDocument()

    // Upload in progress
    await waitFor(() => {
      expect(screen.getByText('Enviando arquivo...')).toBeInTheDocument()
    })

    // Upload complete
    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument()
    })

    // Processing status
    mockWebSocketServer.send({
      type: 'file_processing',
      data: {
        file_id: 'file-123',
        status: 'PROCESSING',
        progress: 50
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Processando arquivo... 50%')).toBeInTheDocument()
    })
  })
})