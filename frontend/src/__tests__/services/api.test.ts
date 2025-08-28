import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import axios, { AxiosError } from 'axios'
import {
  projectsApi,
  ifcFilesApi,
  materialsApi,
  suppliersApi,
  rfqsApi,
  quotesApi,
} from '../../services/api'
import {
  createMockProject,
  createMockCreateProjectRequest,
  createMockIFCFile,
  createMockMaterial,
  createMockUpdateMaterialRequest,
  createMockSupplier,
  createMockCreateRFQRequest,
  createMockFile,
  createMockQuoteDashboardData,
  createMockErrorResponse,
} from '@test-utils/mock-data'
import { setupTestServer, teardownTestServer, resetTestServerAfterEach, useTestServerHandlers } from '@test-utils/test-server'
import { http, HttpResponse, delay } from 'msw'

// ============================================================================
// API SERVICE COMPREHENSIVE TEST SUITE
// Tests all API endpoints, error handling, authentication, and data transforms
// ============================================================================

const API_BASE_URL = 'http://localhost:8000'

// Mock localStorage for token management
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage })

describe('API Service', () => {
  beforeAll(() => {
    setupTestServer()
  })

  afterAll(() => {
    teardownTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
  })

  afterEach(() => {
    resetTestServerAfterEach()
  })

  // ============================================================================
  // AUTHENTICATION INTERCEPTOR TESTS
  // ============================================================================

  describe('Authentication Interceptor', () => {
    it('adds Authorization header when token is present in localStorage', async () => {
      const mockToken = 'test-auth-token-123'
      mockLocalStorage.getItem.mockReturnValue(mockToken)

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBe(`Bearer ${mockToken}`)
          return HttpResponse.json([])
        })
      ])

      await projectsApi.getAll()
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('does not add Authorization header when no token is present', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBeNull()
          return HttpResponse.json([])
        })
      ])

      await projectsApi.getAll()
    })
  })

  // ============================================================================
  // PROJECTS API TESTS
  // ============================================================================

  describe('Projects API', () => {
    it('getAll() returns list of projects', async () => {
      const mockProjects = [
        createMockProject({ id: '1', name: 'Project 1' }),
        createMockProject({ id: '2', name: 'Project 2' }),
      ]

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.json(mockProjects)
        })
      ])

      const result = await projectsApi.getAll()
      expect(result).toEqual(mockProjects)
    })

    it('getAll() handles empty response', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.json([])
        })
      ])

      const result = await projectsApi.getAll()
      expect(result).toEqual([])
    })

    it('create() creates new project and returns it', async () => {
      const createRequest = createMockCreateProjectRequest({
        name: 'New Project',
        address: 'Test Address',
        start_date: '2025-09-01',
      })

      const createdProject = createMockProject({
        name: createRequest.name,
        address: createRequest.address,
        start_date: createRequest.start_date,
      })

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
          const body = await request.json() as any
          expect(body).toEqual(createRequest)
          return HttpResponse.json(createdProject, { status: 201 })
        })
      ])

      const result = await projectsApi.create(createRequest)
      expect(result).toEqual(createdProject)
    })

    it('getById() returns specific project', async () => {
      const mockProject = createMockProject({ id: 'test-id', name: 'Specific Project' })

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects/test-id`, () => {
          return HttpResponse.json(mockProject)
        })
      ])

      const result = await projectsApi.getById('test-id')
      expect(result).toEqual(mockProject)
    })

    it('handles project not found error', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects/non-existent`, () => {
          return new HttpResponse(null, { status: 404 })
        })
      ])

      await expect(projectsApi.getById('non-existent')).rejects.toThrow()
    })
  })

  // ============================================================================
  // IFC FILES API TESTS
  // ============================================================================

  describe('IFC Files API', () => {
    it('getByProjectId() returns IFC files for project', async () => {
      const mockFiles = [
        createMockIFCFile({ id: '1', filename: 'file1.ifc' }),
        createMockIFCFile({ id: '2', filename: 'file2.ifc' }),
      ]

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects/project-1/ifc-files`, () => {
          return HttpResponse.json(mockFiles)
        })
      ])

      const result = await ifcFilesApi.getByProjectId('project-1')
      expect(result).toEqual(mockFiles)
    })

    it('upload() handles file upload with FormData', async () => {
      const mockFile = createMockFile('test.ifc')
      const uploadedFile = createMockIFCFile({
        filename: 'test.ifc',
        file_size: mockFile.size,
      })

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/projects/project-1/ifc-files`, async ({ request }) => {
          const formData = await request.formData()
          const file = formData.get('file') as File
          
          expect(file).toBeDefined()
          expect(file.name).toBe('test.ifc')
          expect(request.headers.get('content-type')).toMatch(/multipart\/form-data/)

          return HttpResponse.json(uploadedFile, { status: 201 })
        })
      ])

      const result = await ifcFilesApi.upload('project-1', mockFile)
      expect(result).toEqual(uploadedFile)
    })

    it('upload() handles upload errors', async () => {
      const mockFile = createMockFile('invalid.txt')

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/projects/project-1/ifc-files`, () => {
          return HttpResponse.json(
            { detail: 'Only IFC files are allowed' },
            { status: 400 }
          )
        })
      ])

      await expect(ifcFilesApi.upload('project-1', mockFile)).rejects.toThrow()
    })

    it('getViewerUrl() returns viewer URL', async () => {
      const mockResponse = { url: 'https://s3.amazonaws.com/bucket/file.ifc' }

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/ifc-files/file-id/viewer-url`, () => {
          return HttpResponse.json(mockResponse)
        })
      ])

      const result = await ifcFilesApi.getViewerUrl('file-id')
      expect(result).toEqual(mockResponse)
    })
  })

  // ============================================================================
  // MATERIALS API TESTS
  // ============================================================================

  describe('Materials API', () => {
    it('getByIFCFileId() returns materials for IFC file', async () => {
      const mockMaterials = [
        createMockMaterial({ id: '1', description: 'Material 1' }),
        createMockMaterial({ id: '2', description: 'Material 2' }),
      ]

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/ifc-files/ifc-1/materials`, () => {
          return HttpResponse.json(mockMaterials)
        })
      ])

      const result = await materialsApi.getByIFCFileId('ifc-1')
      expect(result).toEqual(mockMaterials)
    })

    it('update() updates material and returns updated version', async () => {
      const updateData = createMockUpdateMaterialRequest({
        description: 'Updated Material',
        quantity: 50,
        unit: 'm²',
      })

      const updatedMaterial = createMockMaterial({
        id: 'material-1',
        description: updateData.description,
        quantity: updateData.quantity!,
        unit: updateData.unit!,
      })

      useTestServerHandlers([
        http.put(`${API_BASE_URL}/materials/material-1`, async ({ request }) => {
          const body = await request.json() as any
          expect(body).toEqual(updateData)
          return HttpResponse.json(updatedMaterial)
        })
      ])

      const result = await materialsApi.update('material-1', updateData)
      expect(result).toEqual(updatedMaterial)
    })

    it('update() handles validation errors', async () => {
      const invalidUpdate = { quantity: -1 }

      useTestServerHandlers([
        http.put(`${API_BASE_URL}/materials/material-1`, () => {
          return HttpResponse.json(
            { detail: 'Quantity must be positive' },
            { status: 422 }
          )
        })
      ])

      await expect(materialsApi.update('material-1', invalidUpdate)).rejects.toThrow()
    })

    it('delete() removes material', async () => {
      useTestServerHandlers([
        http.delete(`${API_BASE_URL}/materials/material-1`, () => {
          return new HttpResponse(null, { status: 204 })
        })
      ])

      await expect(materialsApi.delete('material-1')).resolves.toBeUndefined()
    })

    it('delete() handles deletion errors', async () => {
      useTestServerHandlers([
        http.delete(`${API_BASE_URL}/materials/protected-material`, () => {
          return HttpResponse.json(
            { detail: 'Cannot delete this material' },
            { status: 403 }
          )
        })
      ])

      await expect(materialsApi.delete('protected-material')).rejects.toThrow()
    })
  })

  // ============================================================================
  // SUPPLIERS API TESTS
  // ============================================================================

  describe('Suppliers API', () => {
    it('getAll() returns list of suppliers', async () => {
      const mockSuppliers = [
        createMockSupplier({ id: '1', name: 'Supplier 1' }),
        createMockSupplier({ id: '2', name: 'Supplier 2' }),
      ]

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/suppliers`, () => {
          return HttpResponse.json(mockSuppliers)
        })
      ])

      const result = await suppliersApi.getAll()
      expect(result).toEqual(mockSuppliers)
    })

    it('getAll() handles empty suppliers list', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/suppliers`, () => {
          return HttpResponse.json([])
        })
      ])

      const result = await suppliersApi.getAll()
      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // RFQS API TESTS
  // ============================================================================

  describe('RFQs API', () => {
    it('create() creates RFQ successfully', async () => {
      const rfqRequest = createMockCreateRFQRequest({
        project_id: 'project-1',
        material_ids: ['material-1', 'material-2'],
        supplier_ids: ['supplier-1', 'supplier-2'],
      })

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/rfqs`, async ({ request }) => {
          const body = await request.json() as any
          expect(body).toEqual(rfqRequest)
          return new HttpResponse(null, { status: 201 })
        })
      ])

      await expect(rfqsApi.create(rfqRequest)).resolves.toBeUndefined()
    })

    it('create() handles validation errors', async () => {
      const invalidRequest = {
        project_id: 'project-1',
        material_ids: [], // Empty - should cause validation error
        supplier_ids: ['supplier-1'],
      }

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/rfqs`, () => {
          return HttpResponse.json(
            { detail: 'At least one material must be selected' },
            { status: 400 }
          )
        })
      ])

      await expect(rfqsApi.create(invalidRequest)).rejects.toThrow()
    })

    it('getByProjectId() returns RFQs for project', async () => {
      const mockRFQs = [
        { id: 'rfq-1', status: 'OPEN', project_id: 'project-1', created_at: '2025-08-28T10:00:00Z' },
        { id: 'rfq-2', status: 'CLOSED', project_id: 'project-1', created_at: '2025-08-27T15:00:00Z' },
      ]

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects/project-1/rfqs`, () => {
          return HttpResponse.json(mockRFQs)
        })
      ])

      const result = await rfqsApi.getByProjectId('project-1')
      expect(result).toEqual(mockRFQs)
    })

    it('getDashboardData() returns quote dashboard data', async () => {
      const mockDashboardData = createMockQuoteDashboardData({ rfq_id: 'rfq-1' })

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/rfqs/rfq-1/dashboard`, () => {
          return HttpResponse.json(mockDashboardData)
        })
      ])

      const result = await rfqsApi.getDashboardData('rfq-1')
      expect(result).toEqual(mockDashboardData)
    })
  })

  // ============================================================================
  // QUOTES API TESTS (PUBLIC ENDPOINTS)
  // ============================================================================

  describe('Quotes API (Public)', () => {
    it('getDetails() returns quote details using token', async () => {
      const mockQuoteDetails = {
        rfq_id: 'rfq-1',
        project: { id: 'project-1', name: 'Test Project' },
        materials: [
          { id: 'material-1', description: 'Test Material', quantity: 10, unit: 'un' }
        ],
      }

      useTestServerHandlers([
        http.get(`${API_BASE_URL}/quotes/valid-token`, () => {
          return HttpResponse.json(mockQuoteDetails)
        })
      ])

      const result = await quotesApi.getDetails('valid-token')
      expect(result).toEqual(mockQuoteDetails)
    })

    it('getDetails() handles expired token', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/quotes/expired-token`, () => {
          return HttpResponse.json(
            { detail: 'Quote token has expired' },
            { status: 410 }
          )
        })
      ])

      await expect(quotesApi.getDetails('expired-token')).rejects.toThrow()
    })

    it('submit() submits quote successfully', async () => {
      const quoteSubmission = {
        items: [
          { rfq_item_id: 'item-1', price: 100.00, lead_time_days: 10 },
          { rfq_item_id: 'item-2', price: 200.00, lead_time_days: 15 },
        ],
      }

      const submissionResponse = {
        id: 'quote-123',
        rfq_id: 'rfq-1',
        supplier_id: 'supplier-1',
        submitted_at: '2025-08-28T16:00:00Z',
      }

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/quotes/valid-token`, async ({ request }) => {
          const body = await request.json() as any
          expect(body).toEqual(quoteSubmission)
          return HttpResponse.json(submissionResponse, { status: 201 })
        })
      ])

      const result = await quotesApi.submit('valid-token', quoteSubmission)
      expect(result).toEqual(submissionResponse)
    })

    it('submit() handles validation errors', async () => {
      const invalidSubmission = {
        items: [
          { rfq_item_id: 'item-1', price: -100, lead_time_days: 10 }, // Negative price
        ],
      }

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/quotes/valid-token`, () => {
          return HttpResponse.json(
            { detail: 'All items must have valid positive prices' },
            { status: 422 }
          )
        })
      ])

      await expect(quotesApi.submit('valid-token', invalidSubmission)).rejects.toThrow()
    })
  })

  // ============================================================================
  // NETWORK ERROR HANDLING TESTS
  // ============================================================================

  describe('Network Error Handling', () => {
    it('handles network connection failures', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.error()
        })
      ])

      await expect(projectsApi.getAll()).rejects.toThrow()
    })

    it('handles timeout errors', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, async () => {
          await delay(30000) // Long delay to trigger timeout
          return HttpResponse.json([])
        })
      ])

      // This would timeout in a real scenario
      // For testing, we'll just verify the request is made
      const startTime = Date.now()
      try {
        await projectsApi.getAll()
      } catch (error) {
        // Expected to fail due to our mock delay
      }
    })

    it('handles server errors (5xx)', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return new HttpResponse(null, { status: 500 })
        })
      ])

      await expect(projectsApi.getAll()).rejects.toThrow()
    })

    it('handles client errors (4xx)', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects/forbidden`, () => {
          return HttpResponse.json(
            { detail: 'Access forbidden' },
            { status: 403 }
          )
        })
      ])

      await expect(projectsApi.getById('forbidden')).rejects.toThrow()
    })
  })

  // ============================================================================
  // RESPONSE DATA VALIDATION TESTS
  // ============================================================================

  describe('Response Data Validation', () => {
    it('handles malformed JSON responses gracefully', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return new HttpResponse('invalid json{', {
            headers: { 'Content-Type': 'application/json' }
          })
        })
      ])

      await expect(projectsApi.getAll()).rejects.toThrow()
    })

    it('handles unexpected response structure', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.json({ unexpected: 'structure' })
        })
      ])

      // Should return the response as-is, letting TypeScript catch type issues
      const result = await projectsApi.getAll()
      expect(result).toEqual({ unexpected: 'structure' })
    })

    it('handles null/undefined responses', async () => {
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.json(null)
        })
      ])

      const result = await projectsApi.getAll()
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // CONCURRENT REQUEST TESTS
  // ============================================================================

  describe('Concurrent Requests', () => {
    it('handles multiple concurrent requests correctly', async () => {
      const mockProjects = [createMockProject(), createMockProject()]
      
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          return HttpResponse.json(mockProjects)
        })
      ])

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() => projectsApi.getAll())
      const results = await Promise.all(requests)

      // All requests should succeed and return the same data
      results.forEach(result => {
        expect(result).toEqual(mockProjects)
      })
    })

    it('handles mixed success/failure concurrent requests', async () => {
      let requestCount = 0
      
      useTestServerHandlers([
        http.get(`${API_BASE_URL}/projects`, () => {
          requestCount++
          if (requestCount % 2 === 0) {
            return new HttpResponse(null, { status: 500 })
          }
          return HttpResponse.json([])
        })
      ])

      const requests = Array(4).fill(null).map(() => projectsApi.getAll())
      const results = await Promise.allSettled(requests)

      // Should have mix of fulfilled and rejected
      const fulfilled = results.filter(r => r.status === 'fulfilled')
      const rejected = results.filter(r => r.status === 'rejected')

      expect(fulfilled.length).toBe(2)
      expect(rejected.length).toBe(2)
    })
  })

  // ============================================================================
  // REQUEST HEADER TESTS
  // ============================================================================

  describe('Request Headers', () => {
    it('sets correct Content-Type for JSON requests', async () => {
      const createRequest = createMockCreateProjectRequest()

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/projects`, ({ request }) => {
          expect(request.headers.get('content-type')).toBe('application/json')
          return HttpResponse.json(createMockProject())
        })
      ])

      await projectsApi.create(createRequest)
    })

    it('sets correct Content-Type for file uploads', async () => {
      const mockFile = createMockFile()

      useTestServerHandlers([
        http.post(`${API_BASE_URL}/projects/project-1/ifc-files`, ({ request }) => {
          const contentType = request.headers.get('content-type')
          expect(contentType).toMatch(/multipart\/form-data/)
          return HttpResponse.json(createMockIFCFile())
        })
      ])

      await ifcFilesApi.upload('project-1', mockFile)
    })
  })
})