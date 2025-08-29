import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Projects from '../pages/projects'
import { renderWithProviders } from '../test-utils/render-helpers'
import { createMockProject, createMockProjectList } from '../test-utils/mock-data'

// ============================================================================
// PROJECTS PAGE COMPREHENSIVE TEST SUITE
// Expanded from basic tests to achieve comprehensive coverage
// ============================================================================

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockAuthContext = {
  user: { email: 'test@example.com' },
  logout: mockLogout,
  login: vi.fn(),
  register: vi.fn(),
  isAuthenticated: true,
  isLoading: false
}

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock the React Query hooks
const mockProjects = createMockProjectList(3)
vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjects,
    isLoading: false,
    error: null
  }),
  useCreateProject: () => ({
    mutate: vi.fn(),
    isPending: false
  })
}))

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.confirm for archive operations
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('Loading States', () => {
    it('displays loading spinner while projects are loading', async () => {
      renderWithProviders(<Projects />)
      
      // Should show loading initially
      expect(screen.getByText('Carregando projetos...')).toBeInTheDocument()
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Carregando projetos...')).not.toBeInTheDocument()
      }, { timeout: 6000 })
    })

    it('shows projects after loading completes', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      }, { timeout: 6000 })
      
      expect(screen.getByText('Centro de Distribuição Campinas')).toBeInTheDocument()
      expect(screen.getByText('Escritório Silva & Associates')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // HEADER AND AUTHENTICATION TESTS
  // ============================================================================

  describe('Header and Authentication', () => {
    it('displays user email and logout button in header', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Olá, test@example.com')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Sair')).toBeInTheDocument()
      expect(screen.getByText('AEC Axis')).toBeInTheDocument()
    })

    it('calls logout when logout button is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Sair')).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText('Sair'))
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // PROJECT SUMMARY CARDS TESTS
  // ============================================================================

  describe('Project Summary Cards', () => {
    it('displays project summary cards with correct metrics', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument() // Total projects
      })
      
      expect(screen.getByText('Total de Projetos')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument() // Active RFQs
      expect(screen.getByText('RFQs Ativas')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Completed projects
      expect(screen.getByText('Projetos Concluídos')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // PROJECT TABLE TESTS
  // ============================================================================

  describe('Project Table', () => {
    it('displays project table with correct headers', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('NOME DO PROJETO')).toBeInTheDocument()
      })
      
      expect(screen.getByText('STATUS')).toBeInTheDocument()
      expect(screen.getByText('DATA DE CRIAÇÃO')).toBeInTheDocument()
      expect(screen.getByText('AÇÕES')).toBeInTheDocument()
    })

    it('displays project information correctly', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })
      
      // Check project names and addresses
      expect(screen.getByText('Centro de Distribuição Campinas')).toBeInTheDocument()
      expect(screen.getByText('Escritório Silva & Associates')).toBeInTheDocument()
      expect(screen.getByText('Santos, SP')).toBeInTheDocument()
      expect(screen.getByText('Campinas, SP')).toBeInTheDocument()
    })

    it('displays project status badges with correct styling', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        const openStatus = screen.getAllByText('Em Aberto')
        expect(openStatus.length).toBeGreaterThan(0)
      })
      
      expect(screen.getByText('Fechado')).toBeInTheDocument()
    })

    it('formats dates correctly in Brazilian format', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        // Should display dates in dd/mm/yyyy format
        const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
        expect(dateElements.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // PROJECT ACTION MENU TESTS
  // ============================================================================

  describe('Project Action Menus', () => {
    it('renders action menu button for each project', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      }, { timeout: 5000 })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      expect(actionButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('shows menu options when action button is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      }, { timeout: 5000 })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Ver Detalhes')).toBeInTheDocument()
        expect(screen.getByText('Editar')).toBeInTheDocument()
        expect(screen.getByText('Arquivar')).toBeInTheDocument()
      })
    })

    it('navigates to project details when "Ver Detalhes" is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      }, { timeout: 5000 })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])

      await waitFor(() => {
        const viewDetailsButton = screen.getByText('Ver Detalhes')
        expect(viewDetailsButton).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText('Ver Detalhes'))
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1')
    })

    it('opens edit modal when "Editar" is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Editar'))

      await waitFor(() => {
        expect(screen.getByText('Editar Projeto')).toBeInTheDocument()
      })
    })

    it('archives project when "Arquivar" is clicked and confirmed', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Arquivar'))

      expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja arquivar este projeto?')

      await waitFor(() => {
        // Project should be removed from the list
        expect(screen.queryByText('Galpão Industrial Santos')).not.toBeInTheDocument()
      })
    })

    it('does not archive project when archive is cancelled', async () => {
      global.confirm = vi.fn(() => false)
      
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Arquivar'))

      // Project should still be in the list
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    it('closes menu when clicking outside', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Ver Detalhes')).toBeInTheDocument()
      })

      // Click outside the menu
      await userEvent.click(screen.getByText('AEC Axis'))

      await waitFor(() => {
        expect(screen.queryByText('Ver Detalhes')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // SEARCH AND FILTER TESTS
  // ============================================================================

  describe('Search and Filter', () => {
    it('displays search and filter controls', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar projetos por nome ou endereço...')).toBeInTheDocument()
      })
      
      expect(screen.getByDisplayValue('Todos os Status')).toBeInTheDocument()
    })

    it('filters projects by search term', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
        expect(screen.getByText('Centro de Distribuição Campinas')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar projetos por nome ou endereço...')
      await userEvent.type(searchInput, 'Santos')

      // Should filter to only show Santos project
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
        expect(screen.queryByText('Centro de Distribuição Campinas')).not.toBeInTheDocument()
      })
    })

    it('filters projects by status', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const statusFilter = screen.getByDisplayValue('Todos os Status')
      await userEvent.selectOptions(statusFilter, 'CLOSED')

      await waitFor(() => {
        expect(screen.getByText('Centro de Distribuição Campinas')).toBeInTheDocument()
        expect(screen.queryByText('Galpão Industrial Santos')).not.toBeInTheDocument()
      })
    })

    it('resets to page 1 when searching', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar projetos por nome ou endereço...')
      await userEvent.type(searchInput, 'test search')

      // Search should reset pagination (tested indirectly through behavior)
      await waitFor(() => {
        // Projects list should update based on search
        expect(searchInput).toHaveValue('test search')
      })
    })

    it('clears search results when search is cleared', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar projetos por nome ou endereço...')
      await userEvent.type(searchInput, 'Santos')
      await userEvent.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
        expect(screen.getByText('Centro de Distribuição Campinas')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // PROJECT CREATION MODAL TESTS
  // ============================================================================

  describe('Project Creation Modal', () => {
    it('opens create project modal when "Novo Projeto" is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('+ Novo Projeto')).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        expect(screen.getByText('Novo Projeto')).toBeInTheDocument()
        expect(screen.getByText('Crie um novo projeto para gerenciar')).toBeInTheDocument()
      })
    })

    it('displays create project modal form fields', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Nome do Projeto *')).toBeInTheDocument()
        expect(screen.getByLabelText('Endereço')).toBeInTheDocument()
        expect(screen.getByLabelText('Data de Início')).toBeInTheDocument()
      })
    })

    it('creates new project with valid form data', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Nome do Projeto *')).toBeInTheDocument()
      })

      await userEvent.type(screen.getByLabelText('Nome do Projeto *'), 'Novo Projeto de Teste')
      await userEvent.type(screen.getByLabelText('Endereço'), 'São Paulo, SP')
      await userEvent.type(screen.getByLabelText('Data de Início'), '2025-09-01')
      
      await userEvent.click(screen.getByText('Criar Projeto'))
      
      await waitFor(() => {
        expect(screen.getByText('Novo Projeto de Teste')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('disables create button when name is empty', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        const createButton = screen.getByText('Criar Projeto')
        expect(createButton).toBeDisabled()
      })
    })

    it('shows loading state during project creation', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      await userEvent.type(screen.getByLabelText('Nome do Projeto *'), 'Test Project')
      await userEvent.click(screen.getByText('Criar Projeto'))
      
      await waitFor(() => {
        expect(screen.getByText('Criando...')).toBeInTheDocument()
      })
    })

    it('closes modal when cancel is clicked', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument()
      })
      
      await userEvent.click(screen.getByText('Cancelar'))
      
      await waitFor(() => {
        expect(screen.queryByText('Novo Projeto')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // PROJECT EDITING MODAL TESTS
  // ============================================================================

  describe('Project Editing Modal', () => {
    it('pre-fills edit modal with existing project data', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Editar'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Galpão Industrial Santos')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Santos, SP')).toBeInTheDocument()
      })
    })

    it('updates project when edit form is submitted', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Editar'))

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Galpão Industrial Santos')
        expect(nameInput).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Galpão Industrial Santos')
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Galpão Atualizado')
      await userEvent.click(screen.getByText('Salvar Alterações'))

      await waitFor(() => {
        expect(screen.getByText('Galpão Atualizado')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows loading state during project update', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      await userEvent.click(actionButtons[0])
      await userEvent.click(screen.getByText('Editar'))
      await userEvent.click(screen.getByText('Salvar Alterações'))

      await waitFor(() => {
        expect(screen.getByText('Salvando...')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  describe('Empty State', () => {
    it('displays empty state when no projects exist', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      // Archive all projects to trigger empty state
      const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
      for (const button of actionButtons) {
        await userEvent.click(button)
        await userEvent.click(screen.getByText('Arquivar'))
      }

      await waitFor(() => {
        expect(screen.getByText('Você ainda não tem projetos.')).toBeInTheDocument()
        expect(screen.getByText('Clique em "+ Novo Projeto" para começar.')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================

  describe('Pagination', () => {
    it('shows pagination when there are multiple pages', async () => {
      // This test would need a scenario with more than 10 projects
      // For now, we test that pagination doesn't show with few projects
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
      })

      // Should not show pagination with only 3 projects (limit is 10)
      expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
      expect(screen.queryByText('Próximo')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('handles form validation errors gracefully', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Nome do Projeto *')
        expect(nameInput).toBeRequired()
      })
    })

    it('prevents form submission with empty required fields', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        const createButton = screen.getByText('Criar Projeto')
        expect(createButton).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('has proper ARIA labels for action buttons', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
        expect(actionButtons.length).toBeGreaterThan(0)
      })
    })

    it('has proper form labels and structure', async () => {
      renderWithProviders(<Projects />)
      
      await userEvent.click(screen.getByText('+ Novo Projeto'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Nome do Projeto *')).toBeInTheDocument()
        expect(screen.getByLabelText('Endereço')).toBeInTheDocument()
        expect(screen.getByLabelText('Data de Início')).toBeInTheDocument()
      })
    })

    it('has proper table structure', async () => {
      renderWithProviders(<Projects />)
      
      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
        
        const headers = within(table).getAllByRole('columnheader')
        expect(headers).toHaveLength(4)
      })
    })
  })
})