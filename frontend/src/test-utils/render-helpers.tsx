import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/auth-context'

// ============================================================================
// RENDER WITH PROVIDERS UTILITY
// Provides consistent testing setup with all necessary providers
// ============================================================================

interface User {
  id: string
  email: string
  company_id: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Authentication state for testing different auth scenarios
  initialAuthState?: Partial<AuthState>
  
  // Router configuration for testing navigation
  initialEntries?: string[]
  initialIndex?: number
  
  // Use MemoryRouter instead of BrowserRouter (useful for isolated routing tests)
  useMemoryRouter?: boolean
  
  // Additional wrapper components
  additionalWrappers?: React.ComponentType<{ children: React.ReactNode }>[]
}

// Default authenticated user for testing
const defaultAuthenticatedUser: User = {
  id: 'test-user-id',
  email: 'test@aecaxis.com', 
  company_id: 'test-company-id'
}

// Default authentication states for common testing scenarios
export const authStates = {
  authenticated: {
    user: defaultAuthenticatedUser,
    token: 'test-auth-token',
    isLoading: false,
  },
  unauthenticated: {
    user: null,
    token: null,
    isLoading: false,
  },
  loading: {
    user: null,
    token: null,
    isLoading: true,
  },
  authenticatedNoCompany: {
    user: { ...defaultAuthenticatedUser, company_id: '' },
    token: 'test-auth-token',
    isLoading: false,
  }
}

/**
 * Custom render function that wraps components with necessary providers
 * 
 * @param ui - React component to render
 * @param options - Render options including auth state and router config
 * @returns Render result with additional utilities
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { rerender: (ui: React.ReactElement) => void } {
  const {
    initialAuthState = authStates.authenticated,
    initialEntries = ['/'],
    initialIndex = 0,
    useMemoryRouter = false,
    additionalWrappers = [],
    ...renderOptions
  } = options

  // Create a custom AuthProvider wrapper with test state
  const TestAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Mock the auth context with test data
    const mockAuthContext = {
      user: initialAuthState.user || null,
      token: initialAuthState.token || null,
      isLoading: initialAuthState.isLoading ?? false,
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn(),
    }

    // Note: We're bypassing the actual AuthProvider logic for testing
    // In a real implementation, you might want to extend AuthProvider to accept initial state
    return (
      <AuthProvider>
        {/* Override context value for testing - this would need AuthProvider modification */}
        {children}
      </AuthProvider>
    )
  }

  const RouterWrapper = useMemoryRouter 
    ? ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
          {children}
        </MemoryRouter>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <BrowserRouter>{children}</BrowserRouter>
      )

  // Compose all wrapper components
  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let wrappedChildren = children

    // Apply additional wrappers in reverse order
    additionalWrappers.reverse().forEach((Wrapper) => {
      wrappedChildren = <Wrapper>{wrappedChildren}</Wrapper>
    })

    return (
      <RouterWrapper>
        <TestAuthProvider>
          {wrappedChildren}
        </TestAuthProvider>
      </RouterWrapper>
    )
  }

  const renderResult = render(ui, {
    wrapper: AllProviders,
    ...renderOptions,
  })

  // Enhanced rerender that maintains providers
  const rerender = (rerenderUi: React.ReactElement) => {
    return renderResult.rerender(
      <AllProviders>{rerenderUi}</AllProviders>
    )
  }

  return {
    ...renderResult,
    rerender,
  }
}

// ============================================================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================================================

/**
 * Create a mock user for testing
 */
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@aecaxis.com',
  company_id: 'test-company-id',
  ...overrides,
})

/**
 * Wait for async operations to complete in tests
 * Useful for API calls and async state updates
 */
export const waitForAsync = (ms: number = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create mock event objects for testing
 */
export const createMockEvent = <T extends Event>(
  type: string, 
  props: Partial<T> = {}
): T => {
  const event = new Event(type) as T
  Object.assign(event, props)
  return event
}

/**
 * Mock FormData for file upload testing
 */
export const createMockFormData = (entries: Record<string, any> = {}) => {
  const formData = new FormData()
  Object.entries(entries).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

/**
 * Create mock File objects for upload testing
 */
export const createMockFile = (
  content: string = 'mock file content',
  filename: string = 'test.ifc',
  mimeType: string = 'application/x-step'
): File => {
  return new File([content], filename, { type: mimeType })
}

// ============================================================================
// CUSTOM QUERIES AND MATCHERS
// ============================================================================

/**
 * Find elements by data-testid attribute
 * Promotes using semantic selectors but provides fallback
 */
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`)
  }
  return element as HTMLElement
}

/**
 * Find loading indicators in components
 */
export const findLoadingIndicator = (container: HTMLElement) => {
  return container.querySelector('.loading-spinner, [role="status"]') ||
         container.querySelector('*[class*="loading"], *[class*="spinner"]') ||
         Array.from(container.querySelectorAll('*'))
           .find(el => el.textContent?.toLowerCase().includes('carregando') ||
                      el.textContent?.toLowerCase().includes('loading'))
}

/**
 * Find error messages in components  
 */
export const findErrorMessage = (container: HTMLElement) => {
  return container.querySelector('.error-message, [role="alert"]') ||
         Array.from(container.querySelectorAll('*'))
           .find(el => el.textContent?.toLowerCase().includes('erro') ||
                      el.textContent?.toLowerCase().includes('error'))
}

// ============================================================================
// DEBUG UTILITIES FOR TESTS
// ============================================================================

/**
 * Log component tree for debugging test failures
 */
export const logComponentTree = (container: HTMLElement, depth: number = 3) => {
  if (process.env.NODE_ENV === 'test' && process.env.VITEST_DEBUG) {
    console.log('🌳 Component Tree:')
    console.log(container.outerHTML.slice(0, 1000) + (container.outerHTML.length > 1000 ? '...' : ''))
  }
}

/**
 * Log all queries available on the screen for debugging
 */
export const logAvailableQueries = (screen: any) => {
  if (process.env.NODE_ENV === 'test' && process.env.VITEST_DEBUG) {
    console.log('🔍 Available queries:')
    screen.debug()
  }
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

// Re-export commonly used testing utilities
export { screen, fireEvent, waitFor, act } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'

// Export vi for consistent mock usage across tests
export { vi } from 'vitest'