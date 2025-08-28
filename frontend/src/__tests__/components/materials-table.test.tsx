import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test-utils/render-helpers'
import {
  createMockMaterial,
  createMockMaterialList,
  createMockUpdateMaterialRequest,
  createMockErrorResponse,
} from '@test-utils/mock-data'
import { setupTestServer, teardownTestServer, resetTestServerAfterEach, useTestServerHandlers } from '@test-utils/test-server'
import { http, HttpResponse, delay } from 'msw'
import MaterialsTable from '../../components/materials-table'

// ============================================================================
// MATERIALS TABLE COMPREHENSIVE TEST SUITE
// Target: 100% coverage for CRUD operations, inline editing, and selection
// ============================================================================

const API_BASE_URL = 'http://localhost:8000'

describe('MaterialsTable', () => {
  const mockOnSelectedMaterialsChange = vi.fn()
  const defaultProps = {
    ifcFileId: 'test-ifc-file-1',
    onSelectedMaterialsChange: mockOnSelectedMaterialsChange,
  }

  beforeAll(() => {
    setupTestServer()
  })

  afterAll(() => {
    teardownTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.confirm for delete operations
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    resetTestServerAfterEach()
    vi.restoreAllMocks()
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('displays loading message while fetching materials', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, async () => {
        await delay(1000)
        return HttpResponse.json(createMockMaterialList())
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    expect(screen.getByText('Carregando materiais...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando materiais...')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  // ============================================================================
  // SUCCESS STATE TESTS
  // ============================================================================

  it('displays materials table with correct headers', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 3)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    // Check table headers
    expect(screen.getByRole('columnheader', { name: /descrição/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /quantidade/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /unidade/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ações/i })).toBeInTheDocument()

    // Check select all checkbox
    const selectAllCheckbox = screen.getByRole('checkbox')
    expect(selectAllCheckbox).toBeInTheDocument()
  })

  it('displays materials data correctly', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Viga de Aço IPE 300 - Teste',
        quantity: 25,
        unit: 'un',
      }),
      createMockMaterial({
        id: 'material-2',
        description: 'Telha Metálica Trapezoidal',
        quantity: 850,
        unit: 'm²',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Viga de Aço IPE 300 - Teste')).toBeInTheDocument()
    })

    expect(screen.getByText('Telha Metálica Trapezoidal')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('850')).toBeInTheDocument()
    expect(screen.getByText('un')).toBeInTheDocument()
    expect(screen.getByText('m²')).toBeInTheDocument()
  })

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  it('displays empty state when no materials are found', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json([])
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Nenhum material encontrado.')).toBeInTheDocument()
    })

    expect(screen.getByText('Este arquivo IFC não contém materiais extraíveis ou ainda está sendo processado.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('displays error message when API request fails', async () => {
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar materiais')).toBeInTheDocument()
    })

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  // ============================================================================
  // SELECTION FUNCTIONALITY TESTS
  // ============================================================================

  it('allows selecting individual materials', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 3)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    // Get individual checkboxes (skip the first one which is select all)
    const checkboxes = screen.getAllByRole('checkbox')
    const firstMaterialCheckbox = checkboxes[1] // Skip select all checkbox

    expect(firstMaterialCheckbox).not.toBeChecked()

    await userEvent.click(firstMaterialCheckbox)

    expect(firstMaterialCheckbox).toBeChecked()
    expect(mockOnSelectedMaterialsChange).toHaveBeenCalledWith([mockMaterials[0].id])
  })

  it('allows selecting multiple materials', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 3)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    const firstMaterialCheckbox = checkboxes[1]
    const secondMaterialCheckbox = checkboxes[2]

    await userEvent.click(firstMaterialCheckbox)
    await userEvent.click(secondMaterialCheckbox)

    expect(firstMaterialCheckbox).toBeChecked()
    expect(secondMaterialCheckbox).toBeChecked()
    expect(mockOnSelectedMaterialsChange).toHaveBeenLastCalledWith([
      mockMaterials[0].id,
      mockMaterials[1].id,
    ])
  })

  it('allows deselecting materials', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 2)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    const firstMaterialCheckbox = checkboxes[1]

    // Select first
    await userEvent.click(firstMaterialCheckbox)
    expect(mockOnSelectedMaterialsChange).toHaveBeenCalledWith([mockMaterials[0].id])

    // Deselect first
    await userEvent.click(firstMaterialCheckbox)
    expect(mockOnSelectedMaterialsChange).toHaveBeenCalledWith([])
  })

  it('select all checkbox selects all materials', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 3)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    
    await userEvent.click(selectAllCheckbox)

    expect(selectAllCheckbox).toBeChecked()
    expect(mockOnSelectedMaterialsChange).toHaveBeenCalledWith([
      mockMaterials[0].id,
      mockMaterials[1].id,
      mockMaterials[2].id,
    ])

    // All individual checkboxes should be checked
    const allCheckboxes = screen.getAllByRole('checkbox')
    allCheckboxes.slice(1).forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('select all checkbox deselects all materials', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 2)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    
    // Select all first
    await userEvent.click(selectAllCheckbox)
    expect(selectAllCheckbox).toBeChecked()

    // Deselect all
    await userEvent.click(selectAllCheckbox)
    expect(selectAllCheckbox).not.toBeChecked()
    expect(mockOnSelectedMaterialsChange).toHaveBeenCalledWith([])
  })

  // ============================================================================
  // INLINE EDITING TESTS
  // ============================================================================

  it('allows editing material description', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Viga Original',
        quantity: 10,
        unit: 'un',
      }),
    ]

    const updatedMaterial = {
      ...mockMaterials[0],
      description: 'Viga Atualizada',
    }

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.put(`${API_BASE_URL}/materials/:materialId`, async ({ request }) => {
        await delay(200)
        const body = await request.json()
        return HttpResponse.json({ ...updatedMaterial, ...body })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Viga Original')).toBeInTheDocument()
    })

    // Click to edit description
    await userEvent.click(screen.getByText('Viga Original'))

    // Should show input field
    const input = screen.getByDisplayValue('Viga Original')
    expect(input).toBeInTheDocument()

    // Clear and type new value
    await userEvent.clear(input)
    await userEvent.type(input, 'Viga Atualizada')
    
    // Press Enter to save
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Viga Atualizada')).toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue('Viga Atualizada')).not.toBeInTheDocument()
  })

  it('allows editing material quantity', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Viga Teste',
        quantity: 10,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.put(`${API_BASE_URL}/materials/:materialId`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ ...mockMaterials[0], ...body })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    // Click to edit quantity
    await userEvent.click(screen.getByText('10'))

    // Should show number input
    const input = screen.getByDisplayValue('10')
    expect(input).toHaveAttribute('type', 'number')

    // Update quantity
    await userEvent.clear(input)
    await userEvent.type(input, '25')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument()
    })
  })

  it('allows editing material unit', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Material Teste',
        quantity: 100,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.put(`${API_BASE_URL}/materials/:materialId`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ ...mockMaterials[0], ...body })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('un')).toBeInTheDocument()
    })

    // Click to edit unit
    await userEvent.click(screen.getByText('un'))

    const input = screen.getByDisplayValue('un')
    await userEvent.clear(input)
    await userEvent.type(input, 'm²')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('m²')).toBeInTheDocument()
    })
  })

  it('cancels editing when Escape key is pressed', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Original Description',
        quantity: 10,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Original Description')).toBeInTheDocument()
    })

    // Start editing
    await userEvent.click(screen.getByText('Original Description'))
    
    const input = screen.getByDisplayValue('Original Description')
    await userEvent.clear(input)
    await userEvent.type(input, 'Modified Text')

    // Cancel with Escape
    await userEvent.keyboard('{Escape}')

    // Should revert to original value
    expect(screen.getByText('Original Description')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Modified Text')).not.toBeInTheDocument()
  })

  it('cancels editing when clicking outside (onBlur)', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Test Description',
        quantity: 15,
        unit: 'kg',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.put(`${API_BASE_URL}/materials/:materialId`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ ...mockMaterials[0], ...body })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    // Start editing
    await userEvent.click(screen.getByText('Test Description'))
    
    const input = screen.getByDisplayValue('Test Description')
    await userEvent.clear(input)
    await userEvent.type(input, 'New Description')

    // Click outside to save (blur event)
    await userEvent.click(document.body)

    await waitFor(() => {
      expect(screen.getByText('New Description')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  it('shows error for invalid quantity (non-numeric)', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Test Material',
        quantity: 10,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    // Start editing quantity
    await userEvent.click(screen.getByText('10'))
    
    const input = screen.getByDisplayValue('10')
    await userEvent.clear(input)
    await userEvent.type(input, 'invalid')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Quantidade deve ser um número válido')).toBeInTheDocument()
    })
  })

  it('handles API error during material update', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Test Material',
        quantity: 10,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.put(`${API_BASE_URL}/materials/:materialId`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Test Material')).toBeInTheDocument()
    })

    // Try to edit
    await userEvent.click(screen.getByText('Test Material'))
    
    const input = screen.getByDisplayValue('Test Material')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated Material')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Erro ao salvar alterações')).toBeInTheDocument()
    })

    // Should revert to original value
    expect(screen.getByText('Test Material')).toBeInTheDocument()
  })

  // ============================================================================
  // DELETE FUNCTIONALITY TESTS
  // ============================================================================

  it('allows deleting a material with confirmation', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Material para Deletar',
        quantity: 5,
        unit: 'un',
      }),
      createMockMaterial({
        id: 'material-2',
        description: 'Material que Permanece',
        quantity: 10,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.delete(`${API_BASE_URL}/materials/:materialId`, () => {
        return new HttpResponse(null, { status: 204 })
      })
    ])

    // Mock confirm to return true
    global.confirm = vi.fn(() => true)

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Material para Deletar')).toBeInTheDocument()
    })

    // Find delete button (trash icon)
    const deleteButtons = screen.getAllByTitle('Excluir material')
    await userEvent.click(deleteButtons[0])

    // Should show confirmation dialog
    expect(global.confirm).toHaveBeenCalledWith('Tem certeza de que deseja excluir o material "Material para Deletar"?')

    await waitFor(() => {
      expect(screen.queryByText('Material para Deletar')).not.toBeInTheDocument()
    })

    // Other material should still be there
    expect(screen.getByText('Material que Permanece')).toBeInTheDocument()
  })

  it('cancels deletion when user chooses not to confirm', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Material Mantido',
        quantity: 5,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    // Mock confirm to return false (user cancels)
    global.confirm = vi.fn(() => false)

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Material Mantido')).toBeInTheDocument()
    })

    const deleteButton = screen.getByTitle('Excluir material')
    await userEvent.click(deleteButton)

    expect(global.confirm).toHaveBeenCalled()

    // Material should still be there
    expect(screen.getByText('Material Mantido')).toBeInTheDocument()
  })

  it('handles API error during material deletion', async () => {
    const mockMaterials = [
      createMockMaterial({
        id: 'material-1',
        description: 'Material com Erro',
        quantity: 5,
        unit: 'un',
      }),
    ]

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      }),
      http.delete(`${API_BASE_URL}/materials/:materialId`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    ])

    global.confirm = vi.fn(() => true)

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Material com Erro')).toBeInTheDocument()
    })

    const deleteButton = screen.getByTitle('Excluir material')
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Erro ao excluir material')).toBeInTheDocument()
    })

    // Material should still be there since deletion failed
    expect(screen.getByText('Material com Erro')).toBeInTheDocument()
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it('has proper table accessibility structure', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 2)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    // Check that all required headers exist
    expect(screen.getByRole('columnheader', { name: /descrição/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /quantidade/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /unidade/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ações/i })).toBeInTheDocument()
  })

  it('provides accessible labels and titles for interactive elements', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 1)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTitle('Excluir material')).toBeInTheDocument()
    })

    // Click to edit and check accessibility
    await userEvent.click(screen.getByText(mockMaterials[0].description))
    const input = screen.getByDisplayValue(mockMaterials[0].description)
    expect(input).toBeInTheDocument()
  })

  // ============================================================================
  // COMPONENT PROPS TESTS
  // ============================================================================

  it('calls onSelectedMaterialsChange with empty array when no callback provided', async () => {
    const mockMaterials = createMockMaterialList('test-ifc-file-1', 1)

    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        return HttpResponse.json(mockMaterials)
      })
    ])

    // Render without onSelectedMaterialsChange callback
    renderWithProviders(<MaterialsTable ifcFileId="test-ifc-file-1" />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    // Should not crash when selecting materials
    const checkbox = screen.getAllByRole('checkbox')[1]
    await userEvent.click(checkbox)

    expect(checkbox).toBeChecked()
  })

  it('reloads materials when ifcFileId prop changes', async () => {
    let callCount = 0
    useTestServerHandlers([
      http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, () => {
        callCount++
        return HttpResponse.json(createMockMaterialList())
      })
    ])

    const { rerender } = renderWithProviders(<MaterialsTable {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    expect(callCount).toBe(1)

    // Change ifcFileId prop
    rerender(<MaterialsTable {...defaultProps} ifcFileId="different-ifc-file" />)

    await waitFor(() => {
      expect(callCount).toBe(2)
    })
  })
})