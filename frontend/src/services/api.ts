import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface Project {
  id: string
  name: string
  address?: string
  start_date?: string
  created_at: string
  status: string
}

export interface CreateProjectRequest {
  name: string
  address?: string
  start_date?: string
}

export interface IFCFile {
  id: string
  filename: string
  file_size: number
  upload_date: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  s3_key?: string
}

export interface Material {
  id: string
  description: string
  quantity: number
  unit: string
  ifc_file_id: string
  created_at: string
}

export interface UpdateMaterialRequest {
  description?: string
  quantity?: number
  unit?: string
}

export interface Supplier {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  created_at: string
}

export interface CreateRFQRequest {
  project_id: string
  material_ids: string[]
  supplier_ids: string[]
}

export interface ProjectInfo {
  id: string
  name: string
  address?: string
}

export interface MaterialInfo {
  id: string
  rfq_item_id: string
  description: string
  quantity: number
  unit: string
}

export interface QuoteDetails {
  rfq_id: string
  project: ProjectInfo
  materials: MaterialInfo[]
}

export interface QuoteItemSubmission {
  rfq_item_id: string
  price: number
  lead_time_days: number
}

export interface QuoteSubmissionRequest {
  items: QuoteItemSubmission[]
}

export interface QuoteSubmissionResponse {
  id: string
  rfq_id: string
  supplier_id: string
  submitted_at: string
}

export interface SupplierInfo {
  id: string
  name: string
  email: string
  cnpj: string
}

export interface DashboardQuoteItem {
  price: number
  lead_time_days: number
  submitted_at: string
  supplier: SupplierInfo
}

export interface DashboardMaterial {
  id: string
  rfq_item_id: string
  description: string
  quantity: number
  unit: string
  quotes: DashboardQuoteItem[]
}

export interface QuoteDashboardData {
  rfq_id: string
  project: ProjectInfo
  materials: DashboardMaterial[]
}

export interface RFQ {
  id: string
  status: string
  project_id: string
  created_at: string
}

export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const response = await api.get('/projects')
    return response.data
  },

  create: async (project: CreateProjectRequest): Promise<Project> => {
    const response = await api.post('/projects', project)
    return response.data
  },

  getById: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  }
}

export const ifcFilesApi = {
  getByProjectId: async (projectId: string): Promise<IFCFile[]> => {
    const response = await api.get(`/projects/${projectId}/ifc-files`)
    return response.data
  },

  upload: async (projectId: string, file: File): Promise<IFCFile> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(`/projects/${projectId}/ifc-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  getViewerUrl: async (ifcFileId: string): Promise<{ url: string }> => {
    const response = await api.get(`/ifc-files/${ifcFileId}/viewer-url`)
    return response.data
  }
}

export const materialsApi = {
  getByIFCFileId: async (ifcFileId: string): Promise<Material[]> => {
    const response = await api.get(`/ifc-files/${ifcFileId}/materials`)
    return response.data
  },

  update: async (materialId: string, data: UpdateMaterialRequest): Promise<Material> => {
    const response = await api.put(`/materials/${materialId}`, data)
    return response.data
  },

  delete: async (materialId: string): Promise<void> => {
    await api.delete(`/materials/${materialId}`)
  }
}

export const suppliersApi = {
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get('/suppliers')
    return response.data
  }
}

export const rfqsApi = {
  create: async (data: CreateRFQRequest): Promise<void> => {
    await api.post('/rfqs', data)
  },

  getByProjectId: async (projectId: string): Promise<RFQ[]> => {
    const response = await api.get(`/projects/${projectId}/rfqs`)
    return response.data
  },

  getDashboardData: async (rfqId: string): Promise<QuoteDashboardData> => {
    const response = await api.get(`/rfqs/${rfqId}/dashboard`)
    return response.data
  }
}

export const quotesApi = {
  getDetails: async (token: string): Promise<QuoteDetails> => {
    const response = await axios.get(`${API_BASE_URL}/quotes/${token}`)
    return response.data
  },

  submit: async (token: string, data: QuoteSubmissionRequest): Promise<QuoteSubmissionResponse> => {
    const response = await axios.post(`${API_BASE_URL}/quotes/${token}`, data)
    return response.data
  }
}

export default api