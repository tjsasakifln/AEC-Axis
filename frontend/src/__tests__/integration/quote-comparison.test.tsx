import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WS from 'jest-websocket-mock'
import { renderWithProviders } from '../../test-utils/render-helpers'
import { createMockProject, createMockRFQ, createMockQuote, createMockMaterial } from '../../test-utils/mock-data'
import QuoteDashboard from '../../components/quote-dashboard'

// ============================================================================
// QUOTE COMPARISON INTEGRATION TEST
// Tests the complete quote comparison workflow with real-time updates
// ============================================================================

const mockProject = createMockProject({ id: '1' })
const mockRFQ = createMockRFQ({ 
  id: 'rfq-123',
  project_id: '1',
  status: 'RESPONSES_RECEIVED' 
})

const mockMaterials = [
  createMockMaterial({ 
    id: 'mat-1',
    name: 'Viga de Aço H 200x100',
    quantity: 50,
    unit: 'pcs'
  }),
  createMockMaterial({ 
    id: 'mat-2',
    name: 'Chapa de Aço 10mm',
    quantity: 100,
    unit: 'm²'
  })
]

const mockQuotes = [
  createMockQuote({
    id: 'quote-1',
    rfq_id: 'rfq-123',
    supplier_name: 'Steel Corp',
    supplier_email: 'contact@steelcorp.com',
    total_amount: 75000.00,
    status: 'SUBMITTED',
    valid_until: '2025-09-30',
    items: [
      { material_id: 'mat-1', unit_price: 1200.00, total_price: 60000.00 },
      { material_id: 'mat-2', unit_price: 150.00, total_price: 15000.00 }
    ]
  }),
  createMockQuote({
    id: 'quote-2',
    rfq_id: 'rfq-123',
    supplier_name: 'Metal Works',
    supplier_email: 'sales@metalworks.com',
    total_amount: 82000.00,
    status: 'SUBMITTED',
    valid_until: '2025-09-28',
    items: [
      { material_id: 'mat-1', unit_price: 1300.00, total_price: 65000.00 },
      { material_id: 'mat-2', unit_price: 170.00, total_price: 17000.00 }
    ]
  })
]

vi.mock('../../services/api', () => ({
  getProject: vi.fn().mockResolvedValue(mockProject),
  getRFQ: vi.fn().mockResolvedValue(mockRFQ),
  getRFQQuotes: vi.fn().mockResolvedValue(mockQuotes),
  getRFQMaterials: vi.fn().mockResolvedValue(mockMaterials),
  selectQuote: vi.fn().mockResolvedValue({ success: true }),
  requestQuoteRevision: vi.fn().mockResolvedValue({ revision_id: 'rev-123' }),
  exportQuoteComparison: vi.fn().mockResolvedValue({ download_url: '/exports/comparison.pdf' })
}))

let mockWebSocketServer: WS

describe('Quote Comparison Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWebSocketServer = new WS('ws://localhost:8000/ws/rfq-123', { jsonProtocol: true })
  })

  afterEach(() => {
    WS.clean()
  })

  const renderQuoteDashboard = () => {
    return renderWithProviders(
      <QuoteDashboard 
        rfqId="rfq-123" 
        onClose={vi.fn()} 
      />
    )
  }

  // ============================================================================
  // COMPLETE QUOTE COMPARISON WORKFLOW
  // ============================================================================

  it('displays comprehensive quote comparison matrix with real-time updates', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    // Wait for quotes to load
    await waitFor(() => {
      expect(screen.getByText('Comparação de Cotações')).toBeInTheDocument()
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
      expect(screen.getByText('Metal Works')).toBeInTheDocument()
    })

    // Verify WebSocket connection established
    await waitFor(() => {
      expect(mockWebSocketServer).toHaveReceivedMessages([
        expect.objectContaining({
          type: 'rfq_subscribe',
          rfq_id: 'rfq-123'
        })
      ])
    })

    // Step 1: Verify comparison matrix structure
    const comparisonTable = screen.getByRole('table')
    expect(comparisonTable).toBeInTheDocument()

    // Check headers
    const headers = within(comparisonTable).getAllByRole('columnheader')
    expect(headers).toHaveLength(4) // Material, Steel Corp, Metal Works, Best Price

    // Check material rows
    expect(screen.getByText('Viga de Aço H 200x100')).toBeInTheDocument()
    expect(screen.getByText('Chapa de Aço 10mm')).toBeInTheDocument()

    // Step 2: Verify price comparison
    expect(screen.getByText('R$ 1.200,00')).toBeInTheDocument() // Steel Corp unit price
    expect(screen.getByText('R$ 1.300,00')).toBeInTheDocument() // Metal Works unit price
    
    // Check best price highlighting
    const bestPriceCell = screen.getByTestId('best-price-mat-1')
    expect(bestPriceCell).toHaveClass('bg-green-100') // Best price should be highlighted

    // Step 3: Verify total comparison
    expect(screen.getByText('Total: R$ 75.000,00')).toBeInTheDocument() // Steel Corp total
    expect(screen.getByText('Total: R$ 82.000,00')).toBeInTheDocument() // Metal Works total

    // Step 4: Simulate real-time quote update
    mockWebSocketServer.send({
      type: 'quote_updated',
      data: {
        quote_id: 'quote-3',
        rfq_id: 'rfq-123',
        supplier_name: 'Iron Solutions',
        total_amount: 70000.00,
        status: 'SUBMITTED',
        items: [
          { material_id: 'mat-1', unit_price: 1100.00, total_price: 55000.00 },
          { material_id: 'mat-2', unit_price: 150.00, total_price: 15000.00 }
        ]
      }
    })

    // Step 5: Verify new quote appears
    await waitFor(() => {
      expect(screen.getByText('Iron Solutions')).toBeInTheDocument()
      expect(screen.getByText('Total: R$ 70.000,00')).toBeInTheDocument()
    })

    // Step 6: Verify best price recalculation
    await waitFor(() => {
      const newBestPriceCell = screen.getByTestId('best-price-mat-1')
      expect(within(newBestPriceCell).getByText('R$ 1.100,00')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // QUOTE SELECTION AND DECISION MAKING
  // ============================================================================

  it('handles complete quote selection workflow', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
    })

    // Step 1: Select best overall quote
    const selectQuoteButton = screen.getByTestId('select-quote-1')
    await user.click(selectQuoteButton)

    // Step 2: Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText('Confirmar Seleção de Cotação')).toBeInTheDocument()
      expect(screen.getByText('Deseja selecionar a cotação da Steel Corp?')).toBeInTheDocument()
      expect(screen.getByText('Total: R$ 75.000,00')).toBeInTheDocument()
    })

    // Step 3: Confirm selection
    await user.click(screen.getByText('Confirmar Seleção'))

    // Step 4: Verify loading state
    await waitFor(() => {
      expect(screen.getByText('Processando seleção...')).toBeInTheDocument()
    })

    // Step 5: Verify success notification
    await waitFor(() => {
      expect(screen.getByText('Cotação selecionada com sucesso')).toBeInTheDocument()
    })

    // Step 6: Verify WebSocket notification sent
    mockWebSocketServer.send({
      type: 'quote_selected',
      data: {
        quote_id: 'quote-1',
        rfq_id: 'rfq-123',
        supplier_name: 'Steel Corp',
        selected_by: 'test@example.com',
        selected_at: new Date().toISOString()
      }
    })

    // Step 7: Verify UI update
    await waitFor(() => {
      expect(screen.getByText('Selecionada')).toBeInTheDocument()
      const selectedQuoteCard = screen.getByTestId('quote-card-1')
      expect(selectedQuoteCard).toHaveClass('border-green-500')
    })
  })

  // ============================================================================
  // QUOTE REVISION REQUESTS
  // ============================================================================

  it('handles quote revision requests', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Metal Works')).toBeInTheDocument()
    })

    // Step 1: Request revision for higher priced quote
    const revisionButton = screen.getByTestId('request-revision-quote-2')
    await user.click(revisionButton)

    // Step 2: Revision request modal
    await waitFor(() => {
      expect(screen.getByText('Solicitar Revisão de Cotação')).toBeInTheDocument()
    })

    // Step 3: Add revision comments
    const commentsInput = screen.getByLabelText('Comentários para revisão')
    await user.type(commentsInput, 'Favor revisar preços para competir com outras cotações. Especialmente item Viga de Aço.')

    // Step 4: Set target price
    const targetPriceInput = screen.getByLabelText('Preço alvo (opcional)')
    await user.type(targetPriceInput, '75000')

    // Step 5: Send revision request
    await user.click(screen.getByText('Enviar Solicitação'))

    // Step 6: Verify request sent
    await waitFor(() => {
      expect(screen.getByText('Solicitação de revisão enviada')).toBeInTheDocument()
    })

    // Step 7: Simulate revised quote via WebSocket
    mockWebSocketServer.send({
      type: 'quote_revised',
      data: {
        original_quote_id: 'quote-2',
        revised_quote_id: 'quote-2-rev',
        rfq_id: 'rfq-123',
        supplier_name: 'Metal Works',
        total_amount: 73000.00,
        revision_notes: 'Revised prices as requested',
        items: [
          { material_id: 'mat-1', unit_price: 1150.00, total_price: 57500.00 },
          { material_id: 'mat-2', unit_price: 155.00, total_price: 15500.00 }
        ]
      }
    })

    // Step 8: Verify revised quote appears
    await waitFor(() => {
      expect(screen.getByText('Metal Works (Revisada)')).toBeInTheDocument()
      expect(screen.getByText('Total: R$ 73.000,00')).toBeInTheDocument()
      expect(screen.getByText('Revisão recebida')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // FILTERING AND SORTING
  // ============================================================================

  it('provides advanced filtering and sorting capabilities', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
    })

    // Step 1: Sort by price (lowest first)
    const sortDropdown = screen.getByLabelText('Ordenar por')
    await user.selectOptions(sortDropdown, 'price_asc')

    await waitFor(() => {
      const quoteCards = screen.getAllByTestId(/quote-card-/)
      const firstCard = quoteCards[0]
      expect(within(firstCard).getByText('Steel Corp')).toBeInTheDocument()
    })

    // Step 2: Filter by price range
    const priceFilterInput = screen.getByLabelText('Filtrar por preço máximo')
    await user.type(priceFilterInput, '80000')

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
      expect(screen.queryByText('Metal Works')).not.toBeInTheDocument() // Should be filtered out
    })

    // Step 3: Filter by supplier
    const supplierFilter = screen.getByLabelText('Filtrar por fornecedor')
    await user.selectOptions(supplierFilter, 'all')

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
      expect(screen.getByText('Metal Works')).toBeInTheDocument()
    })

    // Step 4: Filter by validity date
    const validityFilter = screen.getByLabelText('Mostrar apenas cotações válidas')
    await user.click(validityFilter)

    // Should filter based on valid_until dates
    await waitFor(() => {
      const validQuotes = screen.getAllByTestId(/quote-card-/)
      expect(validQuotes.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  it('exports quote comparison reports', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
    })

    // Step 1: Open export options
    const exportButton = screen.getByText('Exportar')
    await user.click(exportButton)

    await waitFor(() => {
      expect(screen.getByText('Opções de Exportação')).toBeInTheDocument()
    })

    // Step 2: Select export format
    const pdfOption = screen.getByLabelText('PDF detalhado')
    await user.click(pdfOption)

    // Step 3: Configure export options
    const includeChartsCheckbox = screen.getByLabelText('Incluir gráficos de comparação')
    const includeCommentsCheckbox = screen.getByLabelText('Incluir comentários e anotações')
    
    await user.click(includeChartsCheckbox)
    await user.click(includeCommentsCheckbox)

    // Step 4: Generate export
    await user.click(screen.getByText('Gerar Relatório'))

    // Step 5: Verify export process
    await waitFor(() => {
      expect(screen.getByText('Gerando relatório...')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Relatório gerado com sucesso')).toBeInTheDocument()
      expect(screen.getByText('Download')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // REAL-TIME COLLABORATION
  // ============================================================================

  it('supports real-time collaboration with multiple users', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
    })

    // Simulate another user joining
    mockWebSocketServer.send({
      type: 'user_joined',
      data: {
        user_email: 'colleague@example.com',
        user_name: 'João Silva',
        rfq_id: 'rfq-123'
      }
    })

    await waitFor(() => {
      expect(screen.getByText('João Silva se conectou')).toBeInTheDocument()
    })

    // Simulate another user adding comment
    mockWebSocketServer.send({
      type: 'quote_comment',
      data: {
        quote_id: 'quote-1',
        user_email: 'colleague@example.com',
        user_name: 'João Silva',
        comment: 'Steel Corp tem bom histórico de entrega',
        timestamp: new Date().toISOString()
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Steel Corp tem bom histórico de entrega')).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Simulate another user selecting quote
    mockWebSocketServer.send({
      type: 'quote_selected',
      data: {
        quote_id: 'quote-1',
        selected_by: 'colleague@example.com',
        selected_by_name: 'João Silva',
        rfq_id: 'rfq-123'
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Selecionada por João Silva')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // ERROR HANDLING AND RECOVERY
  // ============================================================================

  it('handles WebSocket disconnection and recovery gracefully', async () => {
    const user = userEvent.setup()
    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Steel Corp')).toBeInTheDocument()
    })

    // Simulate connection loss
    mockWebSocketServer.close()

    await waitFor(() => {
      expect(screen.getByText('Conexão perdida')).toBeInTheDocument()
      expect(screen.getByText('Tentando reconectar...')).toBeInTheDocument()
    })

    // Simulate reconnection
    mockWebSocketServer = new WS('ws://localhost:8000/ws/rfq-123', { jsonProtocol: true })

    await waitFor(() => {
      expect(screen.getByText('Reconectado')).toBeInTheDocument()
    })

    // Should re-subscribe
    expect(mockWebSocketServer).toHaveReceivedMessages([
      expect.objectContaining({
        type: 'rfq_subscribe',
        rfq_id: 'rfq-123'
      })
    ])
  })

  // ============================================================================
  // PERFORMANCE WITH LARGE DATASETS
  // ============================================================================

  it('handles large numbers of quotes efficiently', async () => {
    // Mock large quote set
    const mockApi = await vi.importMock('../../services/api')
    const largeQuoteSet = Array.from({ length: 50 }, (_, i) => 
      createMockQuote({
        id: `quote-${i}`,
        supplier_name: `Supplier ${i}`,
        total_amount: Math.random() * 100000 + 50000
      })
    )
    mockApi.getRFQQuotes.mockResolvedValueOnce(largeQuoteSet)

    renderQuoteDashboard()

    await waitFor(() => {
      expect(screen.getByText('Comparação de Cotações')).toBeInTheDocument()
    })

    // Should use virtualization for performance
    const quotesList = screen.getByTestId('quotes-list')
    expect(quotesList).toBeInTheDocument()

    // Not all quotes should be rendered at once
    expect(screen.getByText('Supplier 0')).toBeInTheDocument()
    expect(screen.queryByText('Supplier 49')).not.toBeInTheDocument()

    // Pagination should be available
    expect(screen.getByText('Página 1 de')).toBeInTheDocument()
    const nextPageButton = screen.getByText('Próxima')
    expect(nextPageButton).toBeInTheDocument()
  })
})