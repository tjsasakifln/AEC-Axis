name: "Suíte Abrangente de Testes Frontend - React/TypeScript Testing Excellence"
description: |

## Goal
Implementar cobertura abrangente de testes para o frontend React da aplicação AEC-Axis, elevando a cobertura de testes de 1 arquivo de teste (`projects.test.tsx`) para uma suíte completa de testes unitários, de integração e E2E com >80% cobertura de código e 100% cobertura dos componentes críticos (`project-detail.tsx`, `quote-dashboard.tsx`, `materials-table.tsx`, `ifc-viewer.tsx`).

## Why
- **Risk Mitigation**: Regressões críticas em UI podem passar despercebidas sem cobertura adequada
- **Business Critical Flows**: Upload de IFC, RFQ generation e quote comparison são core business sem validação automatizada
- **WebSocket Reliability**: Funcionalidades real-time precisam de testes para garantir estabilidade
- **Refactoring Safety**: Mudanças arquiteturais se tornam arriscadas sem safety net de testes
- **Development Velocity**: Suite robusta permite refatoração confiante e deployment contínuo

## What
Suite completa de testes com patterns modernos incluindo:
- **Unit Tests**: Cobertura individual de componentes com mocking eficiente
- **Integration Tests**: Fluxos completos de usuário (upload → processing → RFQ → quotation)
- **E2E Tests**: Jornadas críticas de negócio automatizadas com Playwright
- **WebSocket Testing**: Validação de conexões real-time e estado sincronizado
- **Performance Testing**: Prevenção de memory leaks e otimização de execution time
- **Visual Regression**: Snapshot testing para mudanças visuais não intencionais

### Success Criteria
- [ ] >80% cobertura global de código com Vitest coverage
- [ ] 100% cobertura dos componentes críticos (quote-dashboard, project-detail, materials-table)
- [ ] Testes para todos os flows críticos: upload IFC → extract materials → generate RFQ → submit quotes
- [ ] WebSocket testing funcional: connection lifecycle, message handling, reconnection
- [ ] E2E tests para jornadas completas de usuário executando em <5 minutos
- [ ] Zero memory leaks em test suite executada por 30+ minutos
- [ ] CI/CD integration com test sharding e parallel execution
- [ ] Visual regression detection para componentes de UI críticos

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/guide/
  why: Modern test runner with native TypeScript/ESM support and performance optimization
  section: "Configuration guide" and "improving performance" 
  critical: Use globals:true, V8 coverage provider, isolate:false for speed

- url: https://testing-library.com/docs/react-testing-library/intro/
  why: User-centric testing approach with accessibility-first patterns
  section: "Common mistakes" and "async operations" 
  critical: Avoid implementation details, use semantic queries (getByRole, getByLabelText)

- url: https://playwright.dev/docs/best-practices
  why: Modern E2E testing with automatic waiting and isolation
  section: "Test isolation", "authentication", "API mocking"
  critical: Use browser contexts for isolation, semantic selectors over CSS selectors

- url: https://mswjs.io/docs/
  why: Network-level API mocking for consistent integration tests  
  section: "React integration" and "error handling" patterns
  critical: Mock at network level, not component level for realistic testing

- url: https://github.com/romgain/jest-websocket-mock
  why: WebSocket mocking for real-time feature testing
  section: "Connection lifecycle" and "message broadcasting"
  critical: Test connect/disconnect/reconnect scenarios properly

- file: D:\AEC Axis\frontend\src\__tests__\projects.test.tsx
  why: Current testing patterns and structure to build upon
  critical: Existing mock patterns and renderWithProviders utility

- file: D:\AEC Axis\frontend\src\components\quote-dashboard.tsx  
  why: Critical business component requiring 100% test coverage
  critical: State management patterns, API integration, real-time updates

- file: D:\AEC Axis\frontend\src\pages\project-detail.tsx
  why: Complex component with WebSocket integration and file upload
  critical: WebSocket handling (lines 49-85), file upload logic, state management

- file: D:\AEC Axis\frontend\vite.config.ts
  why: Current Vite configuration to extend with comprehensive test setup
  critical: Existing build configuration and plugin setup

- docfile: INITIAL_frontend_testing.md
  why: Complete testing specifications and coverage requirements
```

### Current Codebase Tree
```bash
D:\AEC Axis\frontend\
├── src\
│   ├── __tests__\
│   │   └── projects.test.tsx              # ONLY existing test file
│   ├── components\
│   │   ├── quote-dashboard.tsx            # CRITICAL: needs 100% coverage
│   │   ├── materials-table.tsx            # CRITICAL: needs comprehensive tests
│   │   ├── ifc-viewer.tsx                 # Complex component, needs testing
│   │   └── supplier-selection-modal.tsx   # Business logic, needs coverage
│   ├── pages\
│   │   ├── project-detail.tsx             # CRITICAL: 100% coverage required
│   │   ├── projects.tsx                   # Has basic tests, needs expansion
│   │   └── *.tsx                          # Other pages need coverage
│   ├── services\
│   │   └── api.ts                         # API layer needs comprehensive tests
│   └── contexts\
│       └── auth-context.tsx               # Authentication logic needs tests
```

### Desired Codebase Tree with Test Architecture
```bash
D:\AEC Axis\frontend\
├── src\
│   ├── __tests__\
│   │   ├── components\
│   │   │   ├── quote-dashboard.test.tsx      # CREATE: Comprehensive component testing
│   │   │   ├── materials-table.test.tsx      # CREATE: CRUD operations, validation
│   │   │   ├── ifc-viewer.test.tsx          # CREATE: 3D viewer, loading states
│   │   │   ├── supplier-selection-modal.test.tsx # CREATE: Modal logic, selection
│   │   │   └── private-route.test.tsx       # CREATE: Authentication routing
│   │   ├── pages\
│   │   │   ├── project-detail.test.tsx      # CREATE: Complex page with WebSocket
│   │   │   ├── projects.test.tsx            # EXPAND: Current basic tests
│   │   │   ├── login.test.tsx               # CREATE: Authentication flows
│   │   │   ├── register.test.tsx            # CREATE: User registration
│   │   │   └── quote-submission.test.tsx    # CREATE: Public quote interface
│   │   ├── services\
│   │   │   ├── api.test.ts                  # CREATE: API layer with MSW mocking
│   │   │   └── websocket.test.ts            # CREATE: WebSocket connection testing
│   │   ├── contexts\
│   │   │   └── auth-context.test.tsx        # CREATE: Authentication state management
│   │   ├── integration\
│   │   │   ├── upload-flow.test.tsx         # CREATE: Complete upload workflow
│   │   │   ├── rfq-generation.test.tsx      # CREATE: RFQ creation workflow
│   │   │   └── quote-comparison.test.tsx    # CREATE: Quote dashboard integration
│   │   └── e2e\
│   │       ├── complete-workflow.spec.ts    # CREATE: End-to-end user journey
│   │       ├── file-upload.spec.ts          # CREATE: File upload E2E scenarios
│   │       └── quote-dashboard.spec.ts      # CREATE: Real-time quote updates
│   ├── __mocks__\
│   │   ├── api.ts                           # CREATE: API service mocks
│   │   ├── websocket.ts                     # CREATE: WebSocket mocks
│   │   └── file-reader.ts                   # CREATE: File API mocks
│   ├── test-utils\
│   │   ├── render-helpers.tsx               # CREATE: Custom render utilities
│   │   ├── mock-data.ts                     # CREATE: Test data factory
│   │   ├── test-server.ts                   # CREATE: MSW server setup
│   │   └── setup.ts                         # CREATE: Global test configuration
│   └── playwright.config.ts                 # CREATE: E2E test configuration
```

### Known Gotchas & Critical Testing Patterns
```typescript
// CRITICAL: Vitest + React 18 Concurrent Features
// React 18's automatic batching requires proper act() wrapping
// Use @testing-library/react's automatic act() handling
import { render, screen } from '@testing-library/react'
// NOT: import { act } from 'react-dom/test-utils' (legacy)

// CRITICAL: WebSocket Testing Patterns
// jest-websocket-mock requires specific setup for cleanup
// Must call WS.clean() after each test to prevent memory leaks
afterEach(() => {
  WS.clean()
  vi.clearAllMocks()
})

// CRITICAL: File Upload Testing in jsdom
// jsdom doesn't support full File API - use manual File construction
const mockFile = new File(['content'], 'test.ifc', { 
  type: 'application/x-step' 
})

// GOTCHA: IFC Viewer Testing
// Three.js WebGL context not available in jsdom
// Mock WebGLRenderingContext and related 3D APIs
global.WebGLRenderingContext = vi.fn().mockImplementation(() => ({}))
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// GOTCHA: Async Component Testing
// Components with useEffect and API calls need proper async handling
// Use waitFor() for async operations, not setTimeout
await waitFor(() => {
  expect(screen.getByText('Loaded Data')).toBeInTheDocument()
}, { timeout: 5000 })

// CRITICAL: Memory Management in Large Test Suites
// Vitest globals can cause memory accumulation
// Use isolate: false carefully and proper cleanup
vi.clearAllMocks() // Clear function mocks
vi.resetAllMocks() // Reset implementation and calls
vi.restoreAllMocks() // Restore original implementations

// GOTCHA: TypeScript with Vitest Mocking
// vi.mock() requires proper TypeScript declarations
vi.mock('../services/api', () => ({
  projectsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn()
  }
}))
// Use vi.mocked() for type safety
const mockedProjectsApi = vi.mocked(projectsApi)
```

## Implementation Blueprint

### Data Models and Test Utilities
```typescript
// Test data factory pattern for consistent test data
// src/test-utils/mock-data.ts
export const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: '1',
  name: 'Galpão Industrial Santos', 
  address: 'Rua Industrial, 123, Santos, SP',
  created_at: '2025-08-01T10:00:00Z',
  company_id: '1',
  ...overrides
})

export const createMockIFCFile = (overrides?: Partial<IFCFile>): IFCFile => ({
  id: 'ifc-1',
  filename: 'warehouse-sample.ifc',
  status: 'COMPLETED',
  file_size: 1024000,
  upload_date: '2025-08-28T14:00:00Z', 
  project_id: '1',
  ...overrides
})

export const createMockMaterial = (overrides?: Partial<Material>): Material => ({
  id: '1',
  description: 'Viga de Aço IPE 300',
  quantity: 24,
  unit: 'un',
  ifc_file_id: 'ifc-1',
  ...overrides
})

// Custom render helper with providers
// src/test-utils/render-helpers.tsx
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions & { initialAuthState?: AuthState }
) => {
  const { initialAuthState, ...renderOptions } = options || {}
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider initialState={initialAuthState}>
          {children}
        </AuthProvider>
      </BrowserRouter>
    )
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
```

### List of Tasks in Implementation Order

```yaml
Task 1 - Enhanced Test Configuration and Setup:
MODIFY frontend/vite.config.ts:
  - FIND: existing test configuration
  - INJECT: Comprehensive Vitest configuration with V8 coverage, performance optimization
  - ADD: Coverage thresholds for critical components (100% for quote-dashboard, project-detail)
  - CONFIGURE: Global test setup, jsdom environment, timeout configurations

CREATE frontend/src/test-utils/setup.ts:
  - IMPLEMENT: Global mocks for WebSocket, File API, IntersectionObserver, WebGL
  - SETUP: Automatic cleanup after each test (vi.clearAllMocks, cleanup)
  - CONFIGURE: Performance optimizations (happy-dom over jsdom if memory issues)

Task 2 - Core Utilities and Mock Infrastructure:
CREATE frontend/src/test-utils/render-helpers.tsx:
  - IMPLEMENT: renderWithProviders utility with AuthProvider and Router
  - INCLUDE: Options for different authentication states and route configurations
  - ADD: Custom queries and matchers for domain-specific assertions

CREATE frontend/src/test-utils/mock-data.ts:
  - IMPLEMENT: Factory functions for all domain entities (Project, IFCFile, Material, etc.)
  - PATTERN: Builder pattern for complex object construction with reasonable defaults
  - INCLUDE: Realistic data that matches production API responses

CREATE frontend/src/test-utils/test-server.ts:
  - IMPLEMENT: MSW server setup with handlers for all API endpoints
  - PATTERN: Request/response handlers matching existing API structure
  - INCLUDE: Error scenario handlers for testing failure states

Task 3 - Critical Component Testing (100% Coverage):
CREATE frontend/src/__tests__/components/quote-dashboard.test.tsx:
  - TEST: Component rendering with empty state, loading state, data population
  - TEST: Real-time updates via WebSocket message simulation
  - TEST: User interactions (filtering, sorting, supplier selection)
  - TEST: Error handling (network failures, malformed data)
  - MOCK: API calls with MSW, WebSocket connections with jest-websocket-mock
  - ACHIEVE: 100% branch and function coverage

CREATE frontend/src/__tests__/components/materials-table.test.tsx:
  - TEST: CRUD operations (inline editing, deletion with confirmation)
  - TEST: Selection logic (individual, bulk, select all)
  - TEST: Validation (numeric inputs, required fields)
  - TEST: API integration with error scenarios
  - MOCK: API responses, user interactions with user-event
  - ACHIEVE: 100% coverage including edge cases

CREATE frontend/src/__tests__/pages/project-detail.test.tsx:
  - TEST: WebSocket connection lifecycle (connect, subscribe, disconnect)
  - TEST: File upload workflow (validation, progress, error states)
  - TEST: IFC file status updates via WebSocket
  - TEST: Component state transitions and navigation
  - MOCK: WebSocket server, file upload APIs, authentication
  - ACHIEVE: 100% coverage of critical business logic

Task 4 - Service Layer and Integration Testing:
CREATE frontend/src/__tests__/services/api.test.ts:
  - TEST: All API service methods with MSW mocking
  - TEST: Authentication token handling, request/response transformations
  - TEST: Error scenarios (network failures, invalid responses, timeouts)
  - TEST: Request retry logic and error recovery
  - PATTERN: Use MSW for realistic network-level mocking

CREATE frontend/src/__tests__/services/websocket.test.ts:
  - TEST: WebSocket connection management and reconnection logic
  - TEST: Message parsing and type safety validation
  - TEST: Connection state management and cleanup
  - MOCK: WebSocket server with jest-websocket-mock

Task 5 - Page-Level Testing:
CREATE frontend/src/__tests__/pages/login.test.tsx:
  - TEST: Form validation, submission, success/error handling
  - TEST: Authentication flow integration with auth context
  - TEST: Navigation after successful login
  - MOCK: Authentication API with success/failure scenarios

CREATE frontend/src/__tests__/pages/projects.test.tsx:
  - EXPAND: Existing basic tests with comprehensive coverage
  - TEST: Project creation modal, action menus, navigation
  - TEST: Empty states, loading states, error states
  - MOCK: Projects API with pagination and filtering

CREATE frontend/src/__tests__/contexts/auth-context.test.tsx:
  - TEST: Authentication state management (login, logout, token refresh)
  - TEST: Context provider behavior and hook usage
  - TEST: Persistence and session management
  - MOCK: Authentication API and localStorage

Task 6 - Integration Testing for Critical Flows:
CREATE frontend/src/__tests__/integration/upload-flow.test.tsx:
  - TEST: Complete workflow: file select → upload → processing → materials display
  - TEST: WebSocket real-time updates during processing
  - TEST: Error recovery and retry scenarios
  - INTEGRATE: Multiple components working together

CREATE frontend/src/__tests__/integration/rfq-generation.test.tsx:
  - TEST: End-to-end RFQ creation: material selection → supplier selection → RFQ submission
  - TEST: Form validation, API error handling, success scenarios
  - MOCK: Complete API workflow with realistic timing

CREATE frontend/src/__tests__/integration/quote-comparison.test.tsx:
  - TEST: Quote dashboard real-time updates, comparison logic
  - TEST: WebSocket message handling and UI synchronization
  - TEST: Performance with multiple simultaneous quote updates

Task 7 - E2E Testing with Playwright:
CREATE frontend/playwright.config.ts:
  - CONFIGURE: Modern Playwright setup with browser contexts for isolation
  - SETUP: Base URL, timeout configurations, test artifacts retention
  - CONFIGURE: Parallel execution and test sharding for CI/CD

CREATE frontend/src/__tests__/e2e/complete-workflow.spec.ts:
  - TEST: Complete user journey from login → project → IFC upload → RFQ → quotes
  - TEST: Real-time features and cross-browser compatibility
  - IMPLEMENT: Page object model for maintainable test structure

CREATE frontend/src/__tests__/e2e/file-upload.spec.ts:
  - TEST: File upload scenarios including large files, validation, progress tracking
  - TEST: Drag-and-drop functionality and error recovery
  - MOCK: Backend responses for consistent test execution

Task 8 - Performance and Memory Optimization:
OPTIMIZE test suite performance:
  - CONFIGURE: Vitest with isolate: false for speed, proper test parallelization
  - IMPLEMENT: Test sharding for CI/CD environments  
  - SETUP: Memory leak detection and cleanup validation
  - MONITOR: Test execution time and memory usage patterns

Task 9 - CI/CD Integration and Automation:
CREATE .github/workflows/frontend-tests.yml:
  - IMPLEMENT: GitHub Actions workflow with test matrix (Node versions)
  - SETUP: Parallel test execution, coverage reporting, artifact storage
  - INTEGRATE: E2E tests with browser matrix and screenshot capture
  - CONFIGURE: Test result reporting and PR comment integration

Task 10 - Documentation and Maintenance:
CREATE frontend/docs/testing-guide.md:
  - DOCUMENT: Testing patterns, conventions, and best practices
  - INCLUDE: Examples of common testing scenarios and patterns
  - SETUP: Testing data management and mock strategies
  - GUIDE: Debugging test failures and performance optimization
```

### Per Task Pseudocode

```typescript
// Task 3 - Quote Dashboard Testing (Critical Component)
describe('QuoteDashboard', () => {
  let mockServer: SetupServer
  
  beforeAll(() => {
    mockServer = setupServer(...handlers)
    mockServer.listen()
  })
  
  afterEach(() => {
    mockServer.resetHandlers()
    vi.clearAllMocks()
  })
  
  afterAll(() => mockServer.close())

  test('displays quote comparison matrix with real-time updates', async () => {
    const mockWebSocketServer = new WS('ws://localhost:8000/ws/test-client')
    
    renderWithProviders(<QuoteDashboard rfqId="rfq-123" onClose={vi.fn()} />)
    
    // Test initial loading
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument()
    
    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Comparativo de Cotações')).toBeInTheDocument()
    })
    
    // Test WebSocket real-time update
    await mockWebSocketServer.connected
    mockWebSocketServer.send(JSON.stringify({
      type: 'quote_received',
      rfq_id: 'rfq-123',
      supplier_id: 'supplier-1',
      price: 1500.00,
      timestamp: new Date().toISOString()
    }))
    
    // Verify real-time update reflected in UI
    await waitFor(() => {
      expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
      expect(screen.getByText('Nova Cotação Recebida!')).toBeInTheDocument()
    })
    
    mockWebSocketServer.close()
  })
  
  test('handles error scenarios gracefully', async () => {
    // Mock API error
    mockServer.use(
      http.get('/api/rfqs/:id/dashboard', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    
    renderWithProviders(<QuoteDashboard rfqId="rfq-123" onClose={vi.fn()} />)
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados do dashboard')).toBeInTheDocument()
    })
    
    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    fireEvent.click(retryButton)
    
    // Verify retry attempt
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument()
  })
})

// Task 6 - Integration Testing Pattern
describe('Upload Flow Integration', () => {
  test('complete IFC upload and processing workflow', async () => {
    const mockWebSocketServer = new WS('ws://localhost:8000/ws/test-client')
    
    renderWithProviders(<ProjectDetail />)
    
    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })
    
    // Simulate file upload
    const file = new File(['mock ifc content'], 'test-warehouse.ifc', { 
      type: 'application/x-step' 
    })
    
    const fileInput = screen.getByLabelText(/selecionar arquivo/i)
    await userEvent.upload(fileInput, file)
    
    // Verify upload starts
    await waitFor(() => {
      expect(screen.getByText('Enviando arquivo...')).toBeInTheDocument()
    })
    
    // Simulate WebSocket processing status update
    await mockWebSocketServer.connected
    mockWebSocketServer.send(JSON.stringify({
      type: 'ifc_status_update',
      ifc_file_id: 'mock-file-id',
      status: 'COMPLETED'
    }))
    
    // Verify processing completion and materials display
    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      expect(screen.getByText('Quantitativos Extraídos')).toBeInTheDocument()
    })
    
    mockWebSocketServer.close()
  })
})
```

### Integration Points
```yaml
VITE_CONFIG:
  - Extend: frontend/vite.config.ts with comprehensive test configuration
  - Add: V8 coverage provider, global test setup, performance optimization
  
CI_CD:
  - Create: .github/workflows/frontend-tests.yml
  - Pattern: Matrix testing with Node.js versions, parallel execution
  
PACKAGE_JSON:
  - Add dependencies: @testing-library/jest-dom, jest-websocket-mock, msw, @playwright/test
  - Scripts: test:unit, test:integration, test:e2e, test:coverage
  
PLAYWRIGHT:
  - Setup: playwright.config.ts with modern configuration
  - Pattern: Browser contexts for test isolation, semantic selectors
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Frontend validation with TypeScript strict mode
cd frontend
npm run lint
npm run type-check

# Vitest configuration validation
npm run test:config

# Expected: No linting or TypeScript errors, valid Vitest configuration
```

### Level 2: Unit Tests with Coverage Validation
```bash
# Run unit tests with coverage thresholds
npm run test:coverage

# Specific critical component coverage
npm run test -- --coverage --testPathPattern="quote-dashboard|project-detail|materials-table"

# Performance testing (memory leaks)
npm run test:memory

# Expected: >80% global coverage, 100% critical components, no memory leaks
```

### Level 3: Integration and E2E Testing
```bash
# Integration tests with MSW
npm run test:integration

# E2E tests with Playwright
npm run test:e2e

# Cross-browser E2E testing
npm run test:e2e -- --browser=chromium,firefox,webkit

# Expected: All integration tests pass, E2E complete in <5 minutes
```

## Final Validation Checklist
- [ ] All unit tests pass: `npm run test:coverage`
- [ ] Coverage thresholds met: >80% global, 100% critical components  
- [ ] Integration tests pass: `npm run test:integration`
- [ ] E2E tests complete: `npm run test:e2e`
- [ ] No memory leaks: Test suite runs for 30+ minutes without issues
- [ ] Performance acceptable: Test execution <2 minutes for unit tests
- [ ] CI/CD integration: Tests run automatically on PR creation
- [ ] WebSocket testing functional: Real-time features properly validated
- [ ] File upload testing comprehensive: All scenarios covered including errors
- [ ] Mock Service Worker operational: API testing with realistic network behavior

---

## Anti-Patterns to Avoid
- ❌ Don't test implementation details - focus on user behavior and outcomes
- ❌ Don't use enzyme or shallow rendering - use @testing-library for user-centric tests  
- ❌ Don't skip cleanup in WebSocket tests - causes memory leaks and flaky tests
- ❌ Don't hardcode wait times - use waitFor() with proper timeout handling
- ❌ Don't mock everything - use integration testing with MSW for realistic API behavior
- ❌ Don't ignore test performance - optimize with isolate: false and proper cleanup
- ❌ Don't skip E2E tests for critical user journeys - they catch integration issues unit tests miss

**Confidence Level: 9/10** - Comprehensive testing strategy with modern tools, realistic testing patterns, proper performance optimization, and extensive validation coverage. Only minor uncertainty around specific WebSocket testing edge cases and E2E test stability in CI/CD environments.