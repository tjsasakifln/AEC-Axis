import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WS from 'jest-websocket-mock'
import { renderWithProviders } from '../../test-utils/render-helpers'
import { createMockProject, createMockMaterial, createMockSupplier } from '../../test-utils/mock-data'
import ProjectDetail from '../../pages/project-detail'

// ============================================================================
// RFQ GENERATION INTEGRATION TEST
// Tests the complete workflow from material selection to supplier notification
// ============================================================================

const mockProject = createMockProject({ id: '1' })
const mockMaterials = [
  createMockMaterial({ 
    id: 'mat-1',
    name: 'Viga de Aço H 200x100',
    quantity: 50,
    unit: 'pcs',
    estimated_cost: 1500.00
  }),
  createMockMaterial({ 
    id: 'mat-2',
    name: 'Chapa de Aço 10mm',
    quantity: 100,
    unit: 'm²',
    estimated_cost: 2000.00
  })
]

const mockSuppliers = [
  createMockSupplier({ id: 'sup-1', name: 'Steel Corp', email: 'contact@steelcorp.com' }),
  createMockSupplier({ id: 'sup-2', name: 'Metal Works', email: 'sales@metalworks.com' })
]

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
  getProjectMaterials: vi.fn().mockResolvedValue(mockMaterials),
  getSuppliers: vi.fn().mockResolvedValue(mockSuppliers),
  createRFQ: vi.fn().mockImplementation((data) => Promise.resolve({
    id: 'rfq-123',
    project_id: data.project_id,
    materials: data.materials,
    suppliers: data.suppliers,
    deadline: data.deadline,
    status: 'SENT',
    created_at: new Date().toISOString()
  })),
  sendRFQToSuppliers: vi.fn().mockResolvedValue({ sent_count: 2 })
}))

let mockWebSocketServer: WS

describe('RFQ Generation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWebSocketServer = new WS('ws://localhost:8000/ws/project-1', { jsonProtocol: true })
  })

  afterEach(() => {
    WS.clean()
  })

  // ============================================================================
  // COMPLETE RFQ WORKFLOW
  // ============================================================================

  it('completes full RFQ workflow from material selection to supplier notification', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    // Step 1: Navigate to materials tab
    await user.click(screen.getByText('Materiais'))

    await waitFor(() => {
      expect(screen.getByText('Viga de Aço H 200x100')).toBeInTheDocument()
      expect(screen.getByText('Chapa de Aço 10mm')).toBeInTheDocument()
    })

    // Step 2: Select materials for RFQ
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    const material2Checkbox = screen.getByLabelText('Selecionar Chapa de Aço 10mm')
    
    await user.click(material1Checkbox)
    await user.click(material2Checkbox)

    // Step 3: Open RFQ creation modal
    const createRFQButton = screen.getByText('Criar RFQ')
    expect(createRFQButton).toBeEnabled()
    await user.click(createRFQButton)

    // Step 4: Configure RFQ details
    await waitFor(() => {
      expect(screen.getByText('Nova Solicitação de Cotação')).toBeInTheDocument()
    })

    // Set deadline
    const deadlineInput = screen.getByLabelText('Prazo de Resposta')
    await user.clear(deadlineInput)
    await user.type(deadlineInput, '2025-09-15')

    // Add description
    const descriptionInput = screen.getByLabelText('Descrição/Observações')
    await user.type(descriptionInput, 'RFQ para estrutura metálica do galpão industrial')

    // Step 5: Select suppliers
    const supplierSection = screen.getByText('Fornecedores')
    expect(supplierSection).toBeInTheDocument()

    const supplier1Checkbox = screen.getByLabelText('Selecionar Steel Corp')
    const supplier2Checkbox = screen.getByLabelText('Selecionar Metal Works')
    
    await user.click(supplier1Checkbox)
    await user.click(supplier2Checkbox)

    // Step 6: Review materials summary
    const materialsSection = screen.getByText('Materiais Selecionados')
    expect(materialsSection).toBeInTheDocument()
    
    expect(screen.getByText('Viga de Aço H 200x100')).toBeInTheDocument()
    expect(screen.getByText('50 pcs')).toBeInTheDocument()
    expect(screen.getByText('Chapa de Aço 10mm')).toBeInTheDocument()
    expect(screen.getByText('100 m²')).toBeInTheDocument()

    // Step 7: Create and send RFQ
    const sendRFQButton = screen.getByText('Enviar RFQ')
    await user.click(sendRFQButton)

    // Step 8: Verify loading state
    await waitFor(() => {
      expect(screen.getByText('Criando RFQ...')).toBeInTheDocument()
    })

    // Step 9: Verify success notification
    await waitFor(() => {
      expect(screen.getByText('RFQ criada com sucesso')).toBeInTheDocument()
      expect(screen.getByText('Enviada para 2 fornecedores')).toBeInTheDocument()
    })

    // Step 10: Verify WebSocket notification
    await waitFor(() => {
      expect(mockWebSocketServer).toHaveReceivedMessages([
        expect.objectContaining({
          type: 'project_subscribe',
          project_id: '1'
        })
      ])
    })

    // Simulate RFQ status update via WebSocket
    mockWebSocketServer.send({
      type: 'rfq_created',
      data: {
        rfq_id: 'rfq-123',
        project_id: '1',
        status: 'SENT',
        suppliers_notified: 2
      }
    })

    // Step 11: Verify RFQ appears in project dashboard
    await waitFor(() => {
      expect(screen.getByText('RFQ #123')).toBeInTheDocument()
      expect(screen.getByText('Enviada')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  it('handles RFQ creation errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock RFQ creation failure
    const mockApi = await vi.importMock('../../services/api')
    mockApi.createRFQ.mockRejectedValueOnce(new Error('Failed to create RFQ'))

    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))

    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    await user.click(material1Checkbox)
    await user.click(screen.getByText('Criar RFQ'))

    await waitFor(() => {
      expect(screen.getByText('Nova Solicitação de Cotação')).toBeInTheDocument()
    })

    const supplier1Checkbox = screen.getByLabelText('Selecionar Steel Corp')
    await user.click(supplier1Checkbox)
    await user.click(screen.getByText('Enviar RFQ'))

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar RFQ')).toBeInTheDocument()
      expect(screen.getByText('Failed to create RFQ')).toBeInTheDocument()
    })

    // Should show retry option
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('handles supplier notification failures', async () => {
    const user = userEvent.setup()
    
    // Mock partial supplier notification failure
    const mockApi = await vi.importMock('../../services/api')
    mockApi.sendRFQToSuppliers.mockResolvedValueOnce({ sent_count: 1, failed_count: 1 })

    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))
    
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    await user.click(material1Checkbox)
    await user.click(screen.getByText('Criar RFQ'))

    const supplier1Checkbox = screen.getByLabelText('Selecionar Steel Corp')
    const supplier2Checkbox = screen.getByLabelText('Selecionar Metal Works')
    await user.click(supplier1Checkbox)
    await user.click(supplier2Checkbox)
    await user.click(screen.getByText('Enviar RFQ'))

    await waitFor(() => {
      expect(screen.getByText('RFQ criada com sucesso')).toBeInTheDocument()
      expect(screen.getByText('Enviada para 1 de 2 fornecedores')).toBeInTheDocument()
      expect(screen.getByText('1 falha no envio')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // VALIDATION
  // ============================================================================

  it('validates RFQ form before submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))
    
    // Try to create RFQ without selecting materials
    const createRFQButton = screen.getByText('Criar RFQ')
    expect(createRFQButton).toBeDisabled()

    // Select material but don't select suppliers
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    await user.click(material1Checkbox)
    await user.click(createRFQButton)

    await waitFor(() => {
      expect(screen.getByText('Nova Solicitação de Cotação')).toBeInTheDocument()
    })

    // Try to send without selecting suppliers
    const sendRFQButton = screen.getByText('Enviar RFQ')
    expect(sendRFQButton).toBeDisabled()

    // Select supplier
    const supplier1Checkbox = screen.getByLabelText('Selecionar Steel Corp')
    await user.click(supplier1Checkbox)

    // Now button should be enabled
    expect(sendRFQButton).toBeEnabled()
  })

  it('validates deadline is in the future', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))
    
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    await user.click(material1Checkbox)
    await user.click(screen.getByText('Criar RFQ'))

    const deadlineInput = screen.getByLabelText('Prazo de Resposta')
    await user.clear(deadlineInput)
    await user.type(deadlineInput, '2020-01-01') // Past date

    await waitFor(() => {
      expect(screen.getByText('O prazo deve ser uma data futura')).toBeInTheDocument()
    })

    const sendRFQButton = screen.getByText('Enviar RFQ')
    expect(sendRFQButton).toBeDisabled()
  })

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  it('receives real-time RFQ response updates via WebSocket', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    // Create RFQ first
    await user.click(screen.getByText('Materiais'))
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    await user.click(material1Checkbox)
    await user.click(screen.getByText('Criar RFQ'))

    const supplier1Checkbox = screen.getByLabelText('Selecionar Steel Corp')
    await user.click(supplier1Checkbox)
    await user.click(screen.getByText('Enviar RFQ'))

    await waitFor(() => {
      expect(screen.getByText('RFQ criada com sucesso')).toBeInTheDocument()
    })

    // Simulate supplier response via WebSocket
    mockWebSocketServer.send({
      type: 'rfq_response',
      data: {
        rfq_id: 'rfq-123',
        supplier_id: 'sup-1',
        supplier_name: 'Steel Corp',
        status: 'RESPONDED',
        total_amount: 75000.00,
        response_time: new Date().toISOString()
      }
    })

    // Should show response notification
    await waitFor(() => {
      expect(screen.getByText('Nova resposta de cotação')).toBeInTheDocument()
      expect(screen.getByText('Steel Corp respondeu à RFQ')).toBeInTheDocument()
    })

    // Navigate to RFQ dashboard to see response
    await user.click(screen.getByText('Ver Cotações'))

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
      expect(screen.getByText('R$ 75.000,00')).toBeInTheDocument()
      expect(screen.getByText('Respondida')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  it('handles bulk material selection efficiently', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))

    // Select all materials
    const selectAllCheckbox = screen.getByLabelText('Selecionar todos os materiais')
    await user.click(selectAllCheckbox)

    // All material checkboxes should be selected
    const material1Checkbox = screen.getByLabelText('Selecionar Viga de Aço H 200x100')
    const material2Checkbox = screen.getByLabelText('Selecionar Chapa de Aço 10mm')
    
    expect(material1Checkbox).toBeChecked()
    expect(material2Checkbox).toBeChecked()

    // Create RFQ button should be enabled
    const createRFQButton = screen.getByText('Criar RFQ')
    expect(createRFQButton).toBeEnabled()

    // Counter should show correct number
    expect(screen.getByText('2 materiais selecionados')).toBeInTheDocument()
  })

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  it('optimizes performance with large material lists', async () => {
    // Mock large material list
    const mockApi = await vi.importMock('../../services/api')
    const largeMaterialList = Array.from({ length: 1000 }, (_, i) => 
      createMockMaterial({ 
        id: `mat-${i}`,
        name: `Material ${i}`,
        quantity: Math.random() * 100,
        unit: 'pcs',
        estimated_cost: Math.random() * 1000
      })
    )
    mockApi.getProjectMaterials.mockResolvedValueOnce(largeMaterialList)

    const user = userEvent.setup()
    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Materiais'))

    // Should render with virtualization for performance
    await waitFor(() => {
      expect(screen.getByText('Material 0')).toBeInTheDocument()
      // Not all materials should be in DOM at once (virtualization)
      expect(screen.queryByText('Material 999')).not.toBeInTheDocument()
    })

    // Scroll should load more materials
    const materialsContainer = screen.getByTestId('materials-list')
    materialsContainer.scrollTop = materialsContainer.scrollHeight
    
    await waitFor(() => {
      expect(screen.getByText('Material 999')).toBeInTheDocument()
    })
  })
})