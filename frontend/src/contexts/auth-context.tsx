import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  company_id: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      setToken(storedToken)
      // TODO: Validate token with backend and get user info
      // For now, we'll assume the token is valid
      setUser({ id: '1', email: 'user@example.com', company_id: '1' })
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    // Simular delay de autenticação
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Credenciais válidas para demonstração
    const validCredentials = [
      { email: 'admin@empresa.com', password: '123456' },
      { email: 'demo@aecaxis.com', password: '12345678' },
      { email: email, password: password } // Aceitar qualquer combinação para demo
    ]
    
    const isValidCredential = validCredentials.some(
      cred => cred.email === email && cred.password === password
    ) || password.length >= 8 // Aceitar qualquer senha com 8+ chars
    
    if (!isValidCredential) {
      throw new Error('Email ou senha incorretos')
    }
    
    // Simular token de autenticação
    const authToken = `demo_token_${Date.now()}`
    setToken(authToken)
    localStorage.setItem('auth_token', authToken)
    
    // Simular dados do usuário
    const userData = {
      id: `user_${Date.now()}`,
      email: email,
      company_id: `company_${Date.now()}`
    }
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
  }

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}