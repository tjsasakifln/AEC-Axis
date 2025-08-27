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

export default api