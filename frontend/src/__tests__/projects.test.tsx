import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Projects from '../pages/projects'
import { AuthProvider } from '../contexts/auth-context'

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render action menu button for each project', async () => {
    renderWithProviders(<Projects />)
    
    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Check if action menu buttons exist for each project
    const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
    expect(actionButtons).toHaveLength(2) // Two demo projects
  })

  it('should show menu options when action button is clicked', async () => {
    renderWithProviders(<Projects />)
    
    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Click the first action button
    const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
    fireEvent.click(actionButtons[0])

    // Check if menu options appear
    await waitFor(() => {
      expect(screen.getByText('Ver Detalhes')).toBeInTheDocument()
      expect(screen.getByText('Editar')).toBeInTheDocument()
      expect(screen.getByText('Arquivar')).toBeInTheDocument()
    })
  })

  it('should navigate to project details when "Ver Detalhes" is clicked', async () => {
    renderWithProviders(<Projects />)
    
    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Click the first action button
    const actionButtons = screen.getAllByLabelText(/ações do projeto/i)
    fireEvent.click(actionButtons[0])

    // Wait for menu to appear and click "Ver Detalhes"
    await waitFor(() => {
      const viewDetailsButton = screen.getByText('Ver Detalhes')
      fireEvent.click(viewDetailsButton)
    })

    // Check if navigate was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/projects/1')
  })
})