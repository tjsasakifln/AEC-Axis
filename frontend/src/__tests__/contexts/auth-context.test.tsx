import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/auth-context'
import { localStorageMock } from '@test-utils/setup'

// ============================================================================
// AUTH CONTEXT COMPREHENSIVE TEST SUITE
// Tests authentication state management, persistence, and integration
// ============================================================================

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, token, login, logout, isLoading } = useAuth()

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <div data-testid="token-present">{token ? 'Token Present' : 'No Token'}</div>
      <div data-testid="user-id">{user?.id || 'No ID'}</div>
      <div data-testid="company-id">{user?.company_id || 'No Company'}</div>
      
      <button
        data-testid="login-button"
        onClick={() => login('test@example.com', 'password123')}
      >
        Login
      </button>
      
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

// Test component that attempts to use auth context outside provider
const ComponentOutsideProvider: React.FC = () => {
  try {
    const auth = useAuth()
    return <div>Should not reach here</div>
  } catch (error) {
    return <div data-testid="context-error">Context Error</div>
  }
}

describe('Auth Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Reset timers
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // PROVIDER INITIALIZATION TESTS
  // ============================================================================

  describe('Provider Initialization', () => {
    it('initializes with no user and loading false when no token in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
      expect(screen.getByTestId('token-present')).toHaveTextContent('No Token')
    })

    it('initializes with stored token and mock user data', async () => {
      const mockToken = 'stored-token-123'
      localStorageMock.getItem.mockReturnValue(mockToken)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
      })

      expect(screen.getByTestId('token-present')).toHaveTextContent('Token Present')
      expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('shows loading state during initialization', () => {
      localStorageMock.getItem.mockReturnValue('token')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Should show loading initially
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading')
    })
  })

  // ============================================================================
  // LOGIN FUNCTIONALITY TESTS
  // ============================================================================

  describe('Login Functionality', () => {
    beforeEach(() => {
      // Use fake timers for login delay simulation
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('successfully logs in with valid credentials', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
      })

      // Trigger login
      fireEvent.click(screen.getByTestId('login-button'))

      // Fast-forward through the simulated delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('token-present')).toHaveTextContent('Token Present')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', expect.stringMatching(/^demo_token_/))
    })

    it('handles login with preset valid credentials', async () => {
      const TestComponentWithValidCreds: React.FC = () => {
        const { login } = useAuth()
        
        return (
          <div>
            <button
              data-testid="admin-login"
              onClick={() => login('admin@empresa.com', '123456')}
            >
              Admin Login
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithValidCreds />
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('admin-login'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@empresa.com')
      })
    })

    it('handles login with demo credentials', async () => {
      const TestComponentWithDemoCreds: React.FC = () => {
        const { login } = useAuth()
        
        return (
          <button
            data-testid="demo-login"
            onClick={() => login('demo@aecaxis.com', '12345678')}
          >
            Demo Login
          </button>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithDemoCreds />
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('demo-login'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('demo@aecaxis.com')
      })
    })

    it('accepts any credentials with password length >= 8', async () => {
      const TestComponentWithLongPassword: React.FC = () => {
        const { login } = useAuth()
        
        return (
          <button
            data-testid="long-password-login"
            onClick={() => login('any@email.com', 'longpassword123')}
          >
            Long Password Login
          </button>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithLongPassword />
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('long-password-login'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('any@email.com')
      })
    })

    it('rejects login with short password', async () => {
      const TestComponentWithShortPassword: React.FC = () => {
        const { login } = useAuth()
        const [error, setError] = React.useState('')
        
        const handleLogin = async () => {
          try {
            await login('test@email.com', '123') // Short password
          } catch (err) {
            setError((err as Error).message)
          }
        }

        return (
          <div>
            <button data-testid="short-password-login" onClick={handleLogin}>
              Short Password Login
            </button>
            <div data-testid="login-error">{error}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithShortPassword />
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('short-password-login'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Email ou senha incorretos')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
    })

    it('generates unique tokens for different login sessions', async () => {
      const tokens: string[] = []
      
      const TestComponentMultipleLogins: React.FC = () => {
        const { login, token } = useAuth()

        React.useEffect(() => {
          if (token) {
            tokens.push(token)
          }
        }, [token])
        
        return (
          <div>
            <button
              data-testid="login-1"
              onClick={() => login('user1@test.com', 'password123')}
            >
              Login 1
            </button>
            <button
              data-testid="login-2"
              onClick={() => login('user2@test.com', 'password456')}
            >
              Login 2
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponentMultipleLogins />
        </AuthProvider>
      )

      // First login
      fireEvent.click(screen.getByTestId('login-1'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(tokens).toHaveLength(1)
      })

      // Second login (logout and login again)
      fireEvent.click(screen.getByTestId('login-2'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(tokens).toHaveLength(2)
        expect(tokens[0]).not.toBe(tokens[1])
      })
    })
  })

  // ============================================================================
  // LOGOUT FUNCTIONALITY TESTS
  // ============================================================================

  describe('Logout Functionality', () => {
    it('successfully logs out and clears all state', async () => {
      // Start with a logged-in state
      localStorageMock.getItem.mockReturnValue('existing-token')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com')
        expect(screen.getByTestId('token-present')).toHaveTextContent('Token Present')
      })

      // Logout
      fireEvent.click(screen.getByTestId('logout-button'))

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
        expect(screen.getByTestId('token-present')).toHaveTextContent('No Token')
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('handles logout when not logged in', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
      })

      // Logout when not logged in
      fireEvent.click(screen.getByTestId('logout-button'))

      // Should not crash or cause issues
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
      expect(screen.getByTestId('token-present')).toHaveTextContent('No Token')
    })
  })

  // ============================================================================
  // CONTEXT PROVIDER BEHAVIOR TESTS
  // ============================================================================

  describe('Context Provider Behavior', () => {
    it('throws error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ComponentOutsideProvider />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })

    it('provides consistent auth state to multiple child components', async () => {
      const ChildComponent1: React.FC = () => {
        const { user } = useAuth()
        return <div data-testid="child-1-user">{user?.email || 'No User'}</div>
      }

      const ChildComponent2: React.FC = () => {
        const { token } = useAuth()
        return <div data-testid="child-2-token">{token ? 'Has Token' : 'No Token'}</div>
      }

      localStorageMock.getItem.mockReturnValue('shared-token')

      render(
        <AuthProvider>
          <ChildComponent1 />
          <ChildComponent2 />
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-1-user')).toHaveTextContent('user@example.com')
        expect(screen.getByTestId('child-2-token')).toHaveTextContent('Has Token')
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com')
      })
    })

    it('updates all consumers when auth state changes', async () => {
      vi.useFakeTimers()

      const Consumer1: React.FC = () => {
        const { user } = useAuth()
        return <div data-testid="consumer-1">{user?.email || 'None'}</div>
      }

      const Consumer2: React.FC = () => {
        const { isLoading } = useAuth()
        return <div data-testid="consumer-2">{isLoading ? 'Loading' : 'Ready'}</div>
      }

      render(
        <AuthProvider>
          <Consumer1 />
          <Consumer2 />
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('consumer-1')).toHaveTextContent('None')
        expect(screen.getByTestId('consumer-2')).toHaveTextContent('Ready')
      })

      // Trigger login
      fireEvent.click(screen.getByTestId('login-button'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('consumer-1')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('consumer-2')).toHaveTextContent('Ready')
      })

      vi.useRealTimers()
    })
  })

  // ============================================================================
  // LOCALSTORAGE PERSISTENCE TESTS
  // ============================================================================

  describe('LocalStorage Persistence', () => {
    it('retrieves token from localStorage on initialization', () => {
      const storedToken = 'persisted-token-abc'
      localStorageMock.getItem.mockReturnValue(storedToken)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('stores token in localStorage after successful login', async () => {
      vi.useFakeTimers()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('login-button'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'auth_token',
          expect.stringMatching(/^demo_token_/)
        )
      })

      vi.useRealTimers()
    })

    it('removes token from localStorage on logout', async () => {
      localStorageMock.getItem.mockReturnValue('token-to-remove')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('token-present')).toHaveTextContent('Token Present')
      })

      fireEvent.click(screen.getByTestId('logout-button'))

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('handles localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      // Should not crash the application
      expect(() => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      }).not.toThrow()
    })
  })

  // ============================================================================
  // USER DATA GENERATION TESTS
  // ============================================================================

  describe('User Data Generation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('generates user data with correct email', async () => {
      const email = 'specific@test.com'
      const TestComponentSpecificEmail: React.FC = () => {
        const { login } = useAuth()
        return (
          <button
            data-testid="specific-email-login"
            onClick={() => login(email, 'password123')}
          >
            Login
          </button>
        )
      }

      render(
        <AuthProvider>
          <TestComponentSpecificEmail />
          <TestComponent />
        </AuthProvider>
      )

      fireEvent.click(screen.getByTestId('specific-email-login'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(email)
      })
    })

    it('generates unique user and company IDs', async () => {
      const userIds: string[] = []
      const companyIds: string[] = []

      const TestComponentTrackIds: React.FC = () => {
        const { user, login } = useAuth()

        React.useEffect(() => {
          if (user) {
            userIds.push(user.id)
            companyIds.push(user.company_id)
          }
        }, [user])
        
        return (
          <div>
            <button
              data-testid="login-track-1"
              onClick={() => login('track1@test.com', 'password123')}
            >
              Login Track 1
            </button>
            <button
              data-testid="login-track-2"
              onClick={() => login('track2@test.com', 'password123')}
            >
              Login Track 2
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponentTrackIds />
        </AuthProvider>
      )

      // First login
      fireEvent.click(screen.getByTestId('login-track-1'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(userIds).toHaveLength(1)
        expect(companyIds).toHaveLength(1)
      })

      // Second login
      fireEvent.click(screen.getByTestId('login-track-2'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(userIds).toHaveLength(2)
        expect(companyIds).toHaveLength(2)
        expect(userIds[0]).not.toBe(userIds[1])
        expect(companyIds[0]).not.toBe(companyIds[1])
      })
    })
  })

  // ============================================================================
  // AUTHENTICATION STATE TRANSITIONS TESTS
  // ============================================================================

  describe('Authentication State Transitions', () => {
    it('transitions from unauthenticated to authenticated correctly', async () => {
      vi.useFakeTimers()

      const StateTracker: React.FC = () => {
        const { user, token, isLoading } = useAuth()
        const [states, setStates] = React.useState<string[]>([])

        React.useEffect(() => {
          const state = `user:${!!user},token:${!!token},loading:${isLoading}`
          setStates(prev => [...prev, state])
        }, [user, token, isLoading])

        return (
          <div>
            {states.map((state, index) => (
              <div key={index} data-testid={`state-${index}`}>
                {state}
              </div>
            ))}
          </div>
        )
      }

      render(
        <AuthProvider>
          <StateTracker />
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('state-0')).toHaveTextContent('user:false,token:false,loading:true')
      })

      // Should transition to not loading
      await waitFor(() => {
        expect(screen.getByTestId('state-1')).toHaveTextContent('user:false,token:false,loading:false')
      })

      // Login
      fireEvent.click(screen.getByTestId('login-button'))

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should transition to authenticated
      await waitFor(() => {
        expect(screen.getByTestId('state-2')).toHaveTextContent('user:true,token:true,loading:false')
      })

      vi.useRealTimers()
    })

    it('transitions from authenticated to unauthenticated on logout', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token')

      const StateTracker: React.FC = () => {
        const { user, token } = useAuth()
        const [logoutOccurred, setLogoutOccurred] = React.useState(false)

        React.useEffect(() => {
          if (!user && !token && logoutOccurred) {
            // Logout completed
          }
        }, [user, token, logoutOccurred])

        return (
          <div>
            <div data-testid="current-state">
              {user ? 'Authenticated' : 'Unauthenticated'}
            </div>
            <button
              data-testid="track-logout"
              onClick={() => setLogoutOccurred(true)}
            >
              Track Logout
            </button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <StateTracker />
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-state')).toHaveTextContent('Authenticated')
      })

      // Logout
      fireEvent.click(screen.getByTestId('logout-button'))

      await waitFor(() => {
        expect(screen.getByTestId('current-state')).toHaveTextContent('Unauthenticated')
      })
    })
  })
})