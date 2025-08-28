# INITIAL: Cobertura de Testes Frontend Insuficiente

## FEATURE

Implementar cobertura abrangente de testes para o frontend React da aplicação AEC-Axis, elevando a cobertura de testes de 1 arquivo de teste (`projects.test.tsx`) para uma suíte completa de testes unitários, de integração e E2E, com foco especial nos componentes críticos para o negócio.

### Contexto e Problema Atual
Atualmente o frontend possui apenas 1 arquivo de teste (`frontend/src/__tests__/projects.test.tsx`) comparado aos 67 testes do backend. Componentes críticos como `project-detail.tsx`, `quote-dashboard.tsx`, `materials-table.tsx`, e `ifc-viewer.tsx` não possuem cobertura de testes, criando riscos significativos de regressão em funcionalidades core do negócio.

### Riscos do Estado Atual
- Regressões críticas em UI podem passar despercebidas
- Flows complexos como upload de IFC, RFQ generation e quote comparison não são testados
- Funcionalidades WebSocket não têm validação automatizada
- Estados de erro e edge cases não são cobertos
- Refatorações se tornam arriscadas sem safety net

### Objetivo de Cobertura
- **Meta:** >80% de cobertura de código
- **Componentes Críticos:** 100% cobertura dos componentes principais
- **Integration Tests:** Flows completos de usuário testados
- **E2E Tests:** Jornadas críticas de negócio automatizadas

## REQUISITOS TÉCNICOS

### 1. Estrutura de Testes Expandida

**Nova Estrutura de Diretórios:**
```
frontend/src/
├── __tests__/
│   ├── components/
│   │   ├── materials-table.test.tsx
│   │   ├── quote-dashboard.test.tsx
│   │   ├── supplier-selection-modal.test.tsx
│   │   ├── ifc-viewer.test.tsx
│   │   └── private-route.test.tsx
│   ├── pages/
│   │   ├── project-detail.test.tsx
│   │   ├── projects.test.tsx (existing)
│   │   ├── login.test.tsx
│   │   ├── register.test.tsx
│   │   └── quote-submission.test.tsx
│   ├── services/
│   │   ├── api.test.ts
│   │   └── websocket.test.ts
│   ├── contexts/
│   │   └── auth-context.test.tsx
│   ├── integration/
│   │   ├── upload-flow.test.tsx
│   │   ├── rfq-generation.test.tsx
│   │   └── quote-comparison.test.tsx
│   └── e2e/
│       ├── complete-workflow.spec.ts
│       ├── file-upload.spec.ts
│       └── quote-dashboard.spec.ts
├── __mocks__/
│   ├── api.ts
│   ├── websocket.ts
│   └── file-reader.ts
└── test-utils/
    ├── render-helpers.tsx
    ├── mock-data.ts
    └── test-server.ts
```

### 2. Configuração de Testing Enhanced

**Vitest Configuration:**
```typescript
// vite.config.ts - Expansão da configuração de teste
export default defineConfig({
  // existing config...
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        'src/__tests__/',
        'src/__mocks__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Componentes críticos devem ter 100% de cobertura
        'src/components/quote-dashboard.tsx': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/pages/project-detail.tsx': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    // Configuração para testes WebSocket e async
    testTimeout: 10000,
    hookTimeout: 10000
  }
})
```

**Setup Global para Testes:**
```typescript
// src/test-utils/setup.ts
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'

// Setup global mocks
beforeAll(() => {
  // Mock WebSocket
  global.WebSocket = vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN
  }))

  // Mock File API
  global.File = vi.fn().mockImplementation((content, name, options) => ({
    name,
    size: content.length,
    type: options?.type || 'application/octet-stream',
    lastModified: Date.now(),
    content
  }))

  // Mock IntersectionObserver para IFC Viewer
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

// Cleanup após cada teste
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

### 3. Testes de Componentes Críticos

**Materials Table - Comprehensive Testing:**
```typescript
// src/__tests__/components/materials-table.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MaterialsTable from '../../components/materials-table'
import { materialsApi } from '../../services/api'
import { renderWithProviders } from '../../test-utils/render-helpers'

// Mock API
vi.mock('../../services/api', () => ({
  materialsApi: {
    getByIfcFileId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

const mockMaterials = [
  {
    id: '1',
    description: 'Viga de Aço IPE 300',
    quantity: 24,
    unit: 'un',
    ifc_file_id: 'ifc-1'
  },
  {
    id: '2', 
    description: 'Concreto C30',
    quantity: 150.5,
    unit: 'm³',
    ifc_file_id: 'ifc-1'
  }
]

describe('MaterialsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    materialsApi.getByIfcFileId.mockResolvedValue(mockMaterials)
  })

  describe('Rendering', () => {
    it('should display loading state initially', () => {
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      expect(screen.getByText('Carregando materiais...')).toBeInTheDocument()
    })

    it('should display materials after loading', async () => {
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
        expect(screen.getByText('24')).toBeInTheDocument()
        expect(screen.getByText('un')).toBeInTheDocument()
        expect(screen.getByText('Concreto C30')).toBeInTheDocument()
        expect(screen.getByText('150,5')).toBeInTheDocument()
        expect(screen.getByText('m³')).toBeInTheDocument()
      })
    })

    it('should display empty state when no materials', async () => {
      materialsApi.getByIfcFileId.mockResolvedValue([])
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum material encontrado')).toBeInTheDocument()
        expect(screen.getByText('O arquivo IFC não contém materiais válidos para extração.')).toBeInTheDocument()
      })
    })
  })

  describe('Material Selection', () => {
    it('should allow selecting individual materials', async () => {
      const onSelectedChange = vi.fn()
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={onSelectedChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const checkbox = screen.getAllByRole('checkbox')[0] // First material checkbox
      fireEvent.click(checkbox)

      expect(onSelectedChange).toHaveBeenCalledWith(['1'])
    })

    it('should handle select all functionality', async () => {
      const onSelectedChange = vi.fn()
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={onSelectedChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const selectAllCheckbox = screen.getByLabelText(/selecionar todos/i)
      fireEvent.click(selectAllCheckbox)

      expect(onSelectedChange).toHaveBeenCalledWith(['1', '2'])
    })
  })

  describe('Inline Editing', () => {
    it('should allow editing material description', async () => {
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const descriptionCell = screen.getByDisplayValue('Viga de Aço IPE 300')
      fireEvent.change(descriptionCell, { target: { value: 'Viga de Aço IPE 400' } })
      fireEvent.blur(descriptionCell)

      await waitFor(() => {
        expect(materialsApi.update).toHaveBeenCalledWith('1', {
          description: 'Viga de Aço IPE 400',
          quantity: 24,
          unit: 'un'
        })
      })
    })

    it('should validate numeric inputs for quantity', async () => {
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const quantityCell = screen.getByDisplayValue('24')
      fireEvent.change(quantityCell, { target: { value: 'invalid' } })
      fireEvent.blur(quantityCell)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Quantidade deve ser um número válido')).toBeInTheDocument()
      })

      // Should not call API with invalid data
      expect(materialsApi.update).not.toHaveBeenCalled()
    })
  })

  describe('Material Deletion', () => {
    it('should delete material with confirmation', async () => {
      // Mock window.confirm
      global.confirm = vi.fn().mockReturnValue(true)
      
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const deleteButton = screen.getAllByLabelText(/deletar material/i)[0]
      fireEvent.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith(
        'Tem certeza que deseja deletar o material "Viga de Aço IPE 300"?'
      )
      
      await waitFor(() => {
        expect(materialsApi.delete).toHaveBeenCalledWith('1')
      })
    })

    it('should not delete material when cancelled', async () => {
      global.confirm = vi.fn().mockReturnValue(false)
      
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })

      const deleteButton = screen.getAllByLabelText(/deletar material/i)[0]
      fireEvent.click(deleteButton)

      expect(materialsApi.delete).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      materialsApi.getByIfcFileId.mockRejectedValue(new Error('API Error'))
      
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar materiais')).toBeInTheDocument()
        expect(screen.getByText('Tente recarregar a página')).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      materialsApi.getByIfcFileId.mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockMaterials)
      
      renderWithProviders(<MaterialsTable ifcFileId="ifc-1" onSelectedMaterialsChange={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar materiais')).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      })
    })
  })
})
```

### 4. Testes de Integração - Upload Flow

**Complete Upload Flow Integration Test:**
```typescript
// src/__tests__/integration/upload-flow.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProjectDetail from '../../pages/project-detail'
import { renderWithProviders } from '../../test-utils/render-helpers'
import { mockApiServer } from '../../test-utils/test-server'

describe('IFC Upload Flow Integration', () => {
  beforeAll(() => {
    mockApiServer.listen()
  })

  afterEach(() => {
    mockApiServer.resetHandlers()
  })

  afterAll(() => {
    mockApiServer.close()
  })

  it('should complete full upload and processing workflow', async () => {
    // Mock WebSocket for real-time updates
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null
    }
    global.WebSocket = vi.fn().mockImplementation(() => mockWs)

    renderWithProviders(<ProjectDetail />)

    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    // Step 1: Upload IFC file
    const file = new File(['mock ifc content'], 'test-warehouse.ifc', { 
      type: 'application/x-step' 
    })

    const fileInput = screen.getByLabelText(/selecionar arquivo/i)
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Enviando arquivo...')).toBeInTheDocument()
    })

    // Step 2: File appears in list with PROCESSING status
    await waitFor(() => {
      expect(screen.getByText('test-warehouse.ifc')).toBeInTheDocument()
      expect(screen.getByText('PROCESSING')).toBeInTheDocument()
    })

    // Step 3: Simulate WebSocket message for processing complete
    const processingCompleteMessage = {
      type: 'ifc_status_update',
      ifc_file_id: 'mock-file-id',
      status: 'COMPLETED'
    }

    // Trigger WebSocket message
    if (mockWs.onmessage) {
      mockWs.onmessage({
        data: JSON.stringify(processingCompleteMessage)
      })
    }

    // Step 4: Status should update to COMPLETED
    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })

    // Step 5: Click on completed file to see materials
    const completedFileRow = screen.getByText('test-warehouse.ifc').closest('tr')
    fireEvent.click(completedFileRow)

    // Step 6: Materials table should appear
    await waitFor(() => {
      expect(screen.getByText('Quantitativos Extraídos')).toBeInTheDocument()
      expect(screen.getByText('Viga de Aço IPE 300')).toBeInTheDocument()
      expect(screen.getByText('Concreto C30')).toBeInTheDocument()
    })

    // Step 7: Select materials and generate RFQ
    const materialCheckboxes = screen.getAllByRole('checkbox')
    fireEvent.click(materialCheckboxes[1]) // Select first material
    fireEvent.click(materialCheckboxes[2]) // Select second material

    const generateRfqButton = screen.getByRole('button', { name: /gerar cotação/i })
    expect(generateRfqButton).toBeEnabled()
    fireEvent.click(generateRfqButton)

    // Step 8: Supplier selection modal should open
    await waitFor(() => {
      expect(screen.getByText('Selecionar Fornecedores')).toBeInTheDocument()
      expect(screen.getByText('Construtora ABC')).toBeInTheDocument()
    })

    // Step 9: Select suppliers and submit
    const supplierCheckbox = screen.getByLabelText('Construtora ABC')
    fireEvent.click(supplierCheckbox)

    const submitButton = screen.getByRole('button', { name: /enviar rfq/i })
    fireEvent.click(submitButton)

    // Step 10: Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/RFQ enviado com sucesso/i)).toBeInTheDocument()
    })

    // Step 11: RFQ should appear in the list
    await waitFor(() => {
      expect(screen.getByText('RFQs Gerados')).toBeInTheDocument()
      expect(screen.getByText('OPEN')).toBeInTheDocument()
    })
  }, 30000) // Longer timeout for integration test

  it('should handle upload errors gracefully', async () => {
    // Mock failed upload
    mockApiServer.use(
      rest.post('/api/projects/:id/ifc-files', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Upload failed' }))
      })
    )

    renderWithProviders(<ProjectDetail />)

    await waitFor(() => {
      expect(screen.getByText('Galpão Industrial Santos')).toBeInTheDocument()
    })

    const file = new File(['mock content'], 'test.ifc', { type: 'application/x-step' })
    const fileInput = screen.getByLabelText(/selecionar arquivo/i)
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Erro ao fazer upload do arquivo')).toBeInTheDocument()
    })

    // File should not appear in the list
    expect(screen.queryByText('test.ifc')).not.toBeInTheDocument()
  })
})
```

### 5. E2E Tests com Playwright

**Setup E2E:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI
  }
})
```

**Complete Workflow E2E Test:**
```typescript
// src/__tests__/e2e/complete-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('AEC-Axis Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password123')
    await page.click('[data-testid=login-button]')
    
    await expect(page).toHaveURL('/projects')
  })

  test('complete BIM-to-quotation workflow', async ({ page }) => {
    // Step 1: Navigate to project
    await page.click('[data-testid=project-card-1]')
    await expect(page).toHaveURL('/projects/1')

    // Step 2: Upload IFC file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-fixtures/sample-warehouse.ifc')

    // Verify upload progress
    await expect(page.locator('[data-testid=upload-progress]')).toBeVisible()
    await expect(page.locator('[data-testid=upload-progress]')).toHaveText('Enviando arquivo...')

    // Step 3: Wait for processing to complete
    await expect(page.locator('[data-testid=ifc-status-COMPLETED]')).toBeVisible({ timeout: 60000 })

    // Step 4: Click on processed file to view materials
    await page.click('[data-testid=ifc-file-row-1]')
    await expect(page.locator('[data-testid=materials-table]')).toBeVisible()

    // Step 5: Select materials
    await page.check('[data-testid=material-checkbox-1]')
    await page.check('[data-testid=material-checkbox-2]')

    // Verify button becomes enabled
    const rfqButton = page.locator('[data-testid=generate-rfq-button]')
    await expect(rfqButton).toBeEnabled()
    await expect(rfqButton).toHaveText('Gerar Cotação (2 itens)')

    // Step 6: Generate RFQ
    await rfqButton.click()
    await expect(page.locator('[data-testid=supplier-modal]')).toBeVisible()

    // Step 7: Select suppliers
    await page.check('[data-testid=supplier-checkbox-1]')
    await page.check('[data-testid=supplier-checkbox-2]')

    // Step 8: Submit RFQ
    await page.click('[data-testid=submit-rfq-button]')
    
    // Verify success message
    await expect(page.locator('[data-testid=success-message]')).toBeVisible()
    await expect(page.locator('[data-testid=success-message]')).toHaveText(/RFQ enviado com sucesso/)

    // Step 9: Verify RFQ appears in list
    await expect(page.locator('[data-testid=rfq-list]')).toBeVisible()
    await expect(page.locator('[data-testid=rfq-status-OPEN]')).toBeVisible()

    // Step 10: View dashboard
    await page.click('[data-testid=view-dashboard-button-1]')
    await expect(page.locator('[data-testid=quote-dashboard]')).toBeVisible()
    await expect(page.locator('[data-testid=dashboard-materials-matrix]')).toBeVisible()
  })

  test('should handle real-time quote updates', async ({ page }) => {
    // Navigate to existing RFQ dashboard
    await page.goto('/projects/1')
    await page.click('[data-testid=view-dashboard-button-1]')

    // Initial state - no quotes
    await expect(page.locator('[data-testid=waiting-response]')).toHaveCount(4) // 2 materials x 2 suppliers

    // Simulate supplier submitting quote via API
    await page.evaluate(() => {
      // Trigger WebSocket message simulation
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'quote_received',
          rfq_id: '1',
          supplier_id: '1',
          material_id: '1',
          price: 1500.00,
          timestamp: new Date().toISOString()
        }
      }))
    })

    // Verify real-time update
    await expect(page.locator('[data-testid=quote-price-1-1]')).toHaveText('R$ 1.500,00')
    await expect(page.locator('[data-testid=quote-cell-1-1]')).toHaveClass(/lowest-price/)

    // Verify notification toast
    await expect(page.locator('[data-testid=notification-toast]')).toBeVisible()
    await expect(page.locator('[data-testid=notification-toast]')).toHaveText(/Nova Cotação Recebida/)
  })
})
```

## DOCUMENTATION

### Testing Strategy

**1. Test Pyramid Structure:**
- **Unit Tests (70%):** Componentes individuais, hooks, utilities
- **Integration Tests (20%):** Fluxos entre componentes, API integration
- **E2E Tests (10%):** Jornadas completas de usuário

**2. Priorização por Criticidade:**
- **P0 (Crítico):** Upload IFC, RFQ generation, Quote dashboard
- **P1 (Alto):** Authentication, Project management, Material editing
- **P2 (Médio):** UI components, Form validation
- **P3 (Baixo):** Visual elements, Animations

**3. Test Data Strategy:**
```typescript
// src/test-utils/mock-data.ts
export const mockProject = {
  id: '1',
  name: 'Galpão Industrial Santos',
  address: 'Rua Industrial, 123, Santos, SP',
  created_at: '2025-08-01T10:00:00Z',
  company_id: '1'
}

export const mockIFCFile = {
  id: 'ifc-1',
  filename: 'warehouse-sample.ifc',
  status: 'COMPLETED',
  file_size: 1024000,
  upload_date: '2025-08-28T14:00:00Z',
  project_id: '1'
}

export const mockMaterials = [
  {
    id: '1',
    description: 'Viga de Aço IPE 300',
    quantity: 24,
    unit: 'un',
    ifc_file_id: 'ifc-1'
  }
]
```

### CI/CD Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run unit tests
        run: |
          cd frontend
          npm run test:coverage
          
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/lcov.info
          
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
          
      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## EXAMPLES

### Mock Service Worker Setup

```typescript
// src/test-utils/test-server.ts
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { mockProject, mockIFCFile, mockMaterials } from './mock-data'

export const mockApiServer = setupServer(
  // Projects API
  rest.get('/api/projects/:id', (req, res, ctx) => {
    return res(ctx.json(mockProject))
  }),

  // IFC Files API
  rest.get('/api/projects/:projectId/ifc-files', (req, res, ctx) => {
    return res(ctx.json([mockIFCFile]))
  }),

  rest.post('/api/projects/:projectId/ifc-files', (req, res, ctx) => {
    return res(ctx.json({ ...mockIFCFile, status: 'PENDING' }))
  }),

  // Materials API
  rest.get('/api/ifc-files/:ifcFileId/materials', (req, res, ctx) => {
    return res(ctx.json(mockMaterials))
  }),

  // WebSocket Mock
  rest.get('/ws/:clientId', (req, res, ctx) => {
    return res(ctx.status(101)) // WebSocket upgrade
  })
)
```

### Custom Render Helper

```typescript
// src/test-utils/render-helpers.tsx
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/auth-context'

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
export { customRender as renderWithProviders }
```

## OTHER CONSIDERATIONS

### Performance Testing
- Bundle size impact de testing utilities
- Test execution time optimization  
- Parallel test execution
- Memory usage durante testes longos

### Accessibility Testing
- Integração com @axe-core/react
- Screen reader compatibility tests
- Keyboard navigation tests
- Color contrast validation

### Visual Regression Testing
- Chromatic integration para screenshot diffs
- Storybook stories como test cases
- Mobile responsiveness validation

### Monitoring e Metrics
- Test execution time tracking
- Flaky test detection
- Coverage trending over time
- Test reliability metrics

### Future Enhancements
- Property-based testing com fast-check
- Mutation testing para validar qualidade dos testes
- Cross-browser testing automation
- Performance testing com Lighthouse CI
- A11y testing automation