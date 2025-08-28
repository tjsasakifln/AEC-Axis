import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@test-utils/render-helpers'
import {
  createMockQuoteDashboardData,
  createMockDashboardMaterial,
  createMockDashboardQuoteItem,
  createMockSupplierInfo,
  createMockErrorResponse,
} from '@test-utils/mock-data'
import { setupTestServer, teardownTestServer, resetTestServerAfterEach, useTestServerHandlers } from '@test-utils/test-server'
import { http, HttpResponse, delay } from 'msw'
import QuoteDashboard from '../../components/quote-dashboard'

// ============================================================================
// QUOTE DASHBOARD COMPREHENSIVE TEST SUITE
// Target: 100% coverage as per PRP requirements
// ============================================================================

const API_BASE_URL = 'http://localhost:8000'

describe('QuoteDashboard', () => {
  const mockOnClose = vi.fn()
  const defaultProps = {
    rfqId: 'test-rfq-1',
    onClose: mockOnClose,
  }

  beforeAll(() => {
    setupTestServer()
  })

  afterAll(() => {
    teardownTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetTestServerAfterEach()
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('displays loading spinner while fetching dashboard data', async () => {
    // Setup delayed API response to test loading state
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, async () => {
        await delay(1000)
        return HttpResponse.json(createMockQuoteDashboardData())
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    // Should show loading initially
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Comparativo de Cotações')).not.toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByText('Dashboard Comparativo de Cotações')).toBeInTheDocument()
  })

  // ============================================================================
  // SUCCESS STATE TESTS
  // ============================================================================

  it('displays dashboard with project information and quote comparison matrix', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      project: {
        id: 'project-1',
        name: 'Galpão Industrial Teste',
        address: 'Rua de Teste, 123, São Paulo, SP',
      },
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard Comparativo de Cotações')).toBeInTheDocument()
    })

    // Check project information display
    expect(screen.getByText('Projeto: Galpão Industrial Teste')).toBeInTheDocument()
    expect(screen.getByText('Rua de Teste, 123, São Paulo, SP')).toBeInTheDocument()

    // Check table headers
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Quantidade')).toBeInTheDocument()

    // Check supplier columns
    const supplierNames = mockDashboardData.materials.flatMap(m => 
      m.quotes.map(q => q.supplier.name)
    )
    const uniqueSupplierNames = [...new Set(supplierNames)]
    uniqueSupplierNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument()
    })
  })

  it('displays materials with their quantities and units', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          description: 'Viga de Aço IPE 300 - Teste',
          quantity: 25,
          unit: 'un',
        }),
        createMockDashboardMaterial({
          id: 'material-2',
          description: 'Telha Metálica Trapezoidal',
          quantity: 1000,
          unit: 'm²',
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Viga de Aço IPE 300 - Teste')).toBeInTheDocument()
    })

    expect(screen.getByText('Telha Metálica Trapezoidal')).toBeInTheDocument()
    expect(screen.getByText('25 un')).toBeInTheDocument()
    expect(screen.getByText('1.000 m²')).toBeInTheDocument()
  })

  it('displays quoted prices with currency formatting', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            createMockDashboardQuoteItem({
              price: 1500.50,
              supplier: createMockSupplierInfo({ name: 'Fornecedor A' }),
            }),
            createMockDashboardQuoteItem({
              price: 1299.99,
              supplier: createMockSupplierInfo({ id: 'supplier-2', name: 'Fornecedor B' }),
            }),
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('R$ 1.500,50')).toBeInTheDocument()
    })

    expect(screen.getByText('R$ 1.299,99')).toBeInTheDocument()
  })

  it('displays lead times and submission dates correctly', async () => {
    const submissionDate = '2025-08-28T10:30:00Z'
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            createMockDashboardQuoteItem({
              lead_time_days: 15,
              submitted_at: submissionDate,
            }),
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('15 dias')).toBeInTheDocument()
    })

    // Check formatted date (Brazilian format)
    const expectedDate = new Date(submissionDate).toLocaleDateString('pt-BR')
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })

  // ============================================================================
  // BEST PRICE HIGHLIGHTING TESTS
  // ============================================================================

  it('highlights the lowest price for each material', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            createMockDashboardQuoteItem({
              price: 1500.00,
              supplier: createMockSupplierInfo({ id: 'supplier-1', name: 'Fornecedor A' }),
            }),
            createMockDashboardQuoteItem({
              price: 1200.00, // Lower price - should be highlighted
              supplier: createMockSupplierInfo({ id: 'supplier-2', name: 'Fornecedor B' }),
            }),
            createMockDashboardQuoteItem({
              price: 1800.00,
              supplier: createMockSupplierInfo({ id: 'supplier-3', name: 'Fornecedor C' }),
            }),
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('R$ 1.200,00')).toBeInTheDocument()
    })

    // Find the cell with the lowest price and check its styling
    const lowestPriceCell = screen.getByText('R$ 1.200,00').closest('td')
    expect(lowestPriceCell).toHaveStyle({ backgroundColor: '#d4edda' })

    // Check that higher prices don't have the highlight
    const higherPriceCell = screen.getByText('R$ 1.500,00').closest('td')
    expect(higherPriceCell).toHaveStyle({ backgroundColor: 'transparent' })
  })

  it('shows legend explaining the highlighting system', async () => {
    const mockDashboardData = createMockQuoteDashboardData()

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Legenda:')).toBeInTheDocument()
    })

    expect(screen.getByText('= Menor preço para cada material')).toBeInTheDocument()
    expect(screen.getByText(/Valores em.*negrito.*indicam o preço cotado/)).toBeInTheDocument()
  })

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  it('displays empty state when no quotes are received', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [], // No quotes received
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nenhuma cotação recebida ainda')).toBeInTheDocument()
    })

    expect(screen.getByText('Aguardando resposta dos fornecedores convidados.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('displays "Aguardando resposta" for materials without quotes from specific suppliers', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            // Only one supplier has quoted, others should show "Aguardando resposta"
            createMockDashboardQuoteItem({
              supplier: createMockSupplierInfo({ id: 'supplier-1', name: 'Fornecedor A' }),
            }),
          ],
        }),
      ],
    })

    // Add a second supplier to the scenario without a quote
    const supplierB = createMockSupplierInfo({ id: 'supplier-2', name: 'Fornecedor B' })
    mockDashboardData.materials[0].quotes.push(
      // Add empty material to force second supplier column
    )

    // Mock with multiple suppliers but not all have quotes
    const modifiedData = {
      ...mockDashboardData,
      materials: [
        {
          ...mockDashboardData.materials[0],
          quotes: [
            createMockDashboardQuoteItem({
              supplier: createMockSupplierInfo({ id: 'supplier-1', name: 'Fornecedor A' }),
            }),
          ],
        },
        createMockDashboardMaterial({
          id: 'material-2',
          quotes: [
            createMockDashboardQuoteItem({
              supplier: supplierB,
            }),
          ],
        }),
      ],
    }

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(modifiedData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard Comparativo de Cotações')).toBeInTheDocument()
    })

    // Should show "Aguardando resposta" for supplier that hasn't quoted on first material
    expect(screen.getByText('Aguardando resposta')).toBeInTheDocument()
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('displays error message when API request fails', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados do dashboard')).toBeInTheDocument()
    })

    expect(screen.getByText('Voltar')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Comparativo de Cotações')).not.toBeInTheDocument()
  })

  it('displays error message when API returns 404', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return new HttpResponse(null, { status: 404 })
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados do dashboard')).toBeInTheDocument()
    })
  })

  it('displays "no data found" message when API returns null', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(null)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument()
    })

    expect(screen.getByText('Voltar')).toBeInTheDocument()
  })

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('calls onClose when close button is clicked in success state', async () => {
    const mockDashboardData = createMockQuoteDashboardData()

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('✕ Fechar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('✕ Fechar'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when back button is clicked in error state', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Voltar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Voltar'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when back button is clicked in no data state', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(null)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Voltar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Voltar'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  it('correctly identifies unique suppliers from materials', async () => {
    const supplier1 = createMockSupplierInfo({ id: 'supplier-1', name: 'Fornecedor A' })
    const supplier2 = createMockSupplierInfo({ id: 'supplier-2', name: 'Fornecedor B' })

    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          id: 'material-1',
          quotes: [
            createMockDashboardQuoteItem({ supplier: supplier1 }),
            createMockDashboardQuoteItem({ supplier: supplier2 }),
          ],
        }),
        createMockDashboardMaterial({
          id: 'material-2',
          quotes: [
            createMockDashboardQuoteItem({ supplier: supplier1 }), // Same supplier, should not duplicate
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Fornecedor A')).toBeInTheDocument()
    })

    expect(screen.getByText('Fornecedor B')).toBeInTheDocument()

    // Should have exactly 2 unique supplier columns (not 3)
    const supplierACells = screen.getAllByText('Fornecedor A')
    const supplierBCells = screen.getAllByText('Fornecedor B')
    expect(supplierACells).toHaveLength(1) // Only in header
    expect(supplierBCells).toHaveLength(1) // Only in header
  })

  it('displays supplier CNPJ in header columns', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            createMockDashboardQuoteItem({
              supplier: createMockSupplierInfo({
                name: 'Metalúrgica Teste LTDA',
                cnpj: '12.345.678/0001-99',
              }),
            }),
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Metalúrgica Teste LTDA')).toBeInTheDocument()
    })

    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument()
  })

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  it('handles materials with zero quantity correctly', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quantity: 0,
          unit: 'un',
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('0 un')).toBeInTheDocument()
    })
  })

  it('handles quotes with zero price correctly', async () => {
    const mockDashboardData = createMockQuoteDashboardData({
      materials: [
        createMockDashboardMaterial({
          quotes: [
            createMockDashboardQuoteItem({
              price: 0,
            }),
          ],
        }),
      ],
    })

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
    })
  })

  it('reloads data when rfqId prop changes', async () => {
    let callCount = 0
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        callCount++
        return HttpResponse.json(createMockQuoteDashboardData())
      })
    ])

    const { rerender } = renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard Comparativo de Cotações')).toBeInTheDocument()
    })

    expect(callCount).toBe(1)

    // Change rfqId prop
    rerender(<QuoteDashboard {...defaultProps} rfqId="different-rfq" />)

    await waitFor(() => {
      expect(callCount).toBe(2)
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it('has proper table structure and headers', async () => {
    const mockDashboardData = createMockQuoteDashboardData()

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, () => {
        return HttpResponse.json(mockDashboardData)
      })
    ])

    renderWithProviders(<QuoteDashboard {...defaultProps} />)

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    // Check that headers are properly marked
    expect(screen.getByRole('columnheader', { name: /material/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /quantidade/i })).toBeInTheDocument()
  })
})