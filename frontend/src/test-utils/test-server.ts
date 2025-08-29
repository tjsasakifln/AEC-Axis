import { setupServer, SetupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
import {
  createMockProject,
  createMockProjectList,
  createMockIFCFile,
  createMockIFCFileList,
  createMockMaterial,
  createMockMaterialList,
  createMockSupplierList,
  createMockRFQList,
  createMockQuoteDashboardData,
  createMockErrorResponse,
} from './mock-data'

// ============================================================================
// MSW TEST SERVER SETUP FOR API MOCKING
// Provides network-level mocking for realistic integration testing
// ============================================================================

const API_BASE_URL = 'http://localhost:8000'

// ============================================================================
// REQUEST HANDLERS FOR ALL API ENDPOINTS
// ============================================================================

export const handlers = [
  // ============================================================================
  // PROJECTS API HANDLERS
  // ============================================================================
  http.get(`${API_BASE_URL}/projects`, async () => {
    await delay(100) // Simulate network latency
    return HttpResponse.json(createMockProjectList(3))
  }),

  http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
    await delay(200)
    const body = await request.json() as any
    const newProject = createMockProject({
      name: body.name,
      address: body.address,
      start_date: body.start_date,
    })
    return HttpResponse.json(newProject, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/projects/:projectId`, async ({ params }) => {
    await delay(100)
    const { projectId } = params
    
    if (projectId === 'non-existent') {
      return new HttpResponse(null, { status: 404 })
    }
    
    return HttpResponse.json(createMockProject({ id: projectId as string }))
  }),

  // ============================================================================
  // IFC FILES API HANDLERS
  // ============================================================================
  http.get(`${API_BASE_URL}/projects/:projectId/ifc-files`, async ({ params }) => {
    await delay(150)
    const { projectId } = params
    return HttpResponse.json(createMockIFCFileList(projectId as string, 2))
  }),

  http.post(`${API_BASE_URL}/projects/:projectId/ifc-files`, async ({ params, request }) => {
    await delay(1000) // Simulate file upload time
    const { projectId } = params
    
    // Extract file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new HttpResponse(null, { status: 400 })
    }

    // Simulate file validation
    if (!file.name.endsWith('.ifc')) {
      return HttpResponse.json(
        { detail: 'Only IFC files are allowed' },
        { status: 400 }
      )
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
      return HttpResponse.json(
        { detail: 'File too large. Maximum size is 100MB' },
        { status: 413 }
      )
    }

    const newIFCFile = createMockIFCFile({
      filename: file.name,
      file_size: file.size,
      status: 'PENDING', // File starts as pending, then gets processed
    })
    
    return HttpResponse.json(newIFCFile, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/viewer-url`, async ({ params }) => {
    await delay(300)
    const { ifcFileId } = params
    
    return HttpResponse.json({
      url: `https://mock-s3-bucket.s3.amazonaws.com/ifc-files/${ifcFileId}/viewer.ifc`
    })
  }),

  // ============================================================================
  // MATERIALS API HANDLERS
  // ============================================================================
  http.get(`${API_BASE_URL}/ifc-files/:ifcFileId/materials`, async ({ params }) => {
    await delay(200)
    const { ifcFileId } = params
    
    if (ifcFileId === 'empty-file') {
      return HttpResponse.json([]) // Empty materials list
    }
    
    return HttpResponse.json(createMockMaterialList(ifcFileId as string, 5))
  }),

  http.put(`${API_BASE_URL}/materials/:materialId`, async ({ params, request }) => {
    await delay(150)
    const { materialId } = params
    const updates = await request.json() as any
    
    // Simulate validation error
    if (updates.quantity && updates.quantity < 0) {
      return HttpResponse.json(
        { detail: 'Quantity must be positive' },
        { status: 422 }
      )
    }
    
    const updatedMaterial = createMockMaterial({
      id: materialId as string,
      ...updates,
    })
    
    return HttpResponse.json(updatedMaterial)
  }),

  http.delete(`${API_BASE_URL}/materials/:materialId`, async ({ params }) => {
    await delay(100)
    const { materialId } = params
    
    if (materialId === 'protected-material') {
      return HttpResponse.json(
        { detail: 'Cannot delete this material' },
        { status: 403 }
      )
    }
    
    return new HttpResponse(null, { status: 204 })
  }),

  // ============================================================================
  // SUPPLIERS API HANDLERS
  // ============================================================================
  http.get(`${API_BASE_URL}/suppliers`, async () => {
    await delay(100)
    return HttpResponse.json(createMockSupplierList(4))
  }),

  // ============================================================================
  // RFQS API HANDLERS
  // ============================================================================
  http.post(`${API_BASE_URL}/rfqs`, async ({ request }) => {
    await delay(500) // RFQ creation takes time (emails need to be sent)
    const body = await request.json() as any
    
    // Validate request
    if (!body.material_ids || body.material_ids.length === 0) {
      return HttpResponse.json(
        { detail: 'At least one material must be selected' },
        { status: 400 }
      )
    }
    
    if (!body.supplier_ids || body.supplier_ids.length === 0) {
      return HttpResponse.json(
        { detail: 'At least one supplier must be selected' },
        { status: 400 }
      )
    }
    
    return new HttpResponse(null, { status: 201 })
  }),

  http.get(`${API_BASE_URL}/projects/:projectId/rfqs`, async ({ params }) => {
    await delay(150)
    const { projectId } = params
    return HttpResponse.json(createMockRFQList(projectId as string, 2))
  }),

  http.get(`${API_BASE_URL}/rfqs/:rfqId/dashboard`, async ({ params }) => {
    await delay(300)
    const { rfqId } = params
    
    if (rfqId === 'no-quotes') {
      return HttpResponse.json(createMockQuoteDashboardData({
        rfq_id: rfqId as string,
        materials: createMockQuoteDashboardData().materials.map(material => ({
          ...material,
          quotes: [] // No quotes received yet
        }))
      }))
    }
    
    return HttpResponse.json(createMockQuoteDashboardData({ rfq_id: rfqId as string }))
  }),

  // ============================================================================
  // QUOTES API HANDLERS (Public endpoints for suppliers)
  // ============================================================================
  http.get(`${API_BASE_URL}/quotes/:token`, async ({ params }) => {
    await delay(200)
    const { token } = params
    
    if (token === 'expired-token') {
      return HttpResponse.json(
        { detail: 'Quote token has expired' },
        { status: 410 }
      )
    }
    
    if (token === 'invalid-token') {
      return new HttpResponse(null, { status: 404 })
    }
    
    return HttpResponse.json({
      rfq_id: 'rfq-1',
      project: {
        id: 'project-1',
        name: 'Galpão Industrial Santos',
        address: 'Rua Industrial, 123, Santos, SP',
      },
      materials: createMockMaterialList().slice(0, 3).map(material => ({
        id: material.id,
        rfq_item_id: `rfq-item-${material.id}`,
        description: material.description,
        quantity: material.quantity,
        unit: material.unit,
      }))
    })
  }),

  http.post(`${API_BASE_URL}/quotes/:token`, async ({ params, request }) => {
    await delay(400)
    const { token } = params
    const body = await request.json() as any
    
    if (token === 'expired-token') {
      return HttpResponse.json(
        { detail: 'Quote token has expired' },
        { status: 410 }
      )
    }
    
    // Validate quote submission
    if (!body.items || body.items.length === 0) {
      return HttpResponse.json(
        { detail: 'At least one quote item is required' },
        { status: 400 }
      )
    }
    
    // Validate individual items
    for (const item of body.items) {
      if (!item.price || item.price <= 0) {
        return HttpResponse.json(
          { detail: 'All items must have valid positive prices' },
          { status: 422 }
        )
      }
      
      if (!item.lead_time_days || item.lead_time_days < 1) {
        return HttpResponse.json(
          { detail: 'Lead time must be at least 1 day' },
          { status: 422 }
        )
      }
    }
    
    return HttpResponse.json({
      id: 'quote-submission-123',
      rfq_id: 'rfq-1',
      supplier_id: 'supplier-test',
      submitted_at: new Date().toISOString(),
    }, { status: 201 })
  }),
]

// ============================================================================
// ERROR SCENARIO HANDLERS
// For testing error conditions and edge cases
// ============================================================================

export const errorHandlers = {
  // Network error simulation
  networkError: http.get(`${API_BASE_URL}/*`, () => {
    return HttpResponse.error()
  }),

  // 500 server error
  serverError: http.get(`${API_BASE_URL}/*`, () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Timeout simulation  
  timeout: http.get(`${API_BASE_URL}/*`, async () => {
    await delay(30000) // 30 second delay to trigger timeout
    return HttpResponse.json({})
  }),

  // Authentication error
  authError: http.get(`${API_BASE_URL}/*`, () => {
    return HttpResponse.json(
      { detail: 'Authentication credentials were not provided' },
      { status: 401 }
    )
  }),

  // Rate limiting error
  rateLimitError: http.get(`${API_BASE_URL}/*`, () => {
    return HttpResponse.json(
      { detail: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  })
}

// ============================================================================
// TEST SERVER SETUP
// ============================================================================

// Create server instance
export const testServer: SetupServer = setupServer(...handlers)

// ============================================================================
// SERVER UTILITIES FOR TESTS
// ============================================================================

/**
 * Reset all handlers to default state
 */
export const resetTestServer = () => {
  testServer.resetHandlers()
}

/**
 * Add temporary handlers for specific test scenarios
 */
export const useTestServerHandlers = (tempHandlers: any[]) => {
  testServer.use(...tempHandlers)
}

/**
 * Simulate specific error scenarios
 */
export const simulateError = (scenario: keyof typeof errorHandlers) => {
  testServer.use(errorHandlers[scenario])
}

/**
 * Create a handler for a specific endpoint with custom response
 */
export const createMockHandler = (
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  response: any,
  options: { delay?: number; status?: number } = {}
) => {
  const { delay: delayMs = 0, status = 200 } = options
  
  return http[method](`${API_BASE_URL}${path}`, async () => {
    if (delayMs > 0) {
      await delay(delayMs)
    }
    return HttpResponse.json(response, { status })
  })
}

// ============================================================================
// WEBSOCKET MOCK CLASS
// Mock WebSocket implementation for testing
// ============================================================================

export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  private _sentMessages: any[] = []

  constructor(url: string) {
    this.url = url
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data
      this._sentMessages.push(message)
      mockWebSocketServer.handleMessage(message)
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error)
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  getSentMessages() {
    return this._sentMessages
  }

  clearSentMessages() {
    this._sentMessages = []
  }
}

// ============================================================================
// WEBSOCKET MOCK SERVER
// For WebSocket testing in project-detail.tsx
// ============================================================================

export class MockWebSocketServer {
  private clients: Set<MockWebSocket> = new Set()
  private isRunning = false
  private _sentMessages: any[] = []
  private _receivedMessages: any[] = []

  listen() {
    this.isRunning = true
    console.log('Mock WebSocket server started')
    return this
  }

  start() {
    return this.listen()
  }

  close() {
    this.isRunning = false
    this.clients.clear()
    console.log('Mock WebSocket server stopped')
  }

  stop() {
    this.close()
  }

  addClient(client: MockWebSocket) {
    this.clients.add(client)
  }

  removeClient(client: MockWebSocket) {
    this.clients.delete(client)
  }

  handleMessage(message: any) {
    this._receivedMessages.push(message)
  }

  send(message: any) {
    this._sentMessages.push(message)
    this.broadcast(message)
  }

  sendMessage(message: any) {
    this.send(message)
  }

  broadcast(message: any) {
    if (!this.isRunning) return
    
    const messageStr = JSON.stringify(message)
    this.clients.forEach(client => {
      if (client.onmessage && client.readyState === MockWebSocket.OPEN) {
        client.onmessage(new MessageEvent('message', { data: messageStr }))
      }
    })
  }

  sendToClient(clientId: string, message: any) {
    // For testing, we'll just broadcast since we don't track client IDs
    this.broadcast(message)
  }

  getSentMessages() {
    return this._sentMessages
  }

  getReceivedMessages() {
    return this._receivedMessages
  }

  getConnectionCount() {
    return this.clients.size
  }

  clearMessages() {
    this._sentMessages = []
    this._receivedMessages = []
  }
}

export const mockWebSocketServer = new MockWebSocketServer()

// ============================================================================
// SETUP AND TEARDOWN HELPERS
// ============================================================================

/**
 * Setup function to be called before all tests
 */
export const setupTestServer = () => {
  testServer.listen({
    onUnhandledRequest: 'error', // Fail tests if unmocked requests are made
  })
  mockWebSocketServer.start()
}

/**
 * Cleanup function to be called after all tests
 */
export const teardownTestServer = () => {
  testServer.close()
  mockWebSocketServer.stop()
}

/**
 * Reset function to be called after each test
 */
export const resetTestServerAfterEach = () => {
  testServer.resetHandlers()
}

// ============================================================================
// EXPORT DEFAULT SETUP
// ============================================================================

export default {
  server: testServer,
  handlers,
  errorHandlers,
  mockWebSocketServer,
  setupTestServer,
  teardownTestServer,
  resetTestServerAfterEach,
  useTestServerHandlers,
  simulateError,
  createMockHandler,
}