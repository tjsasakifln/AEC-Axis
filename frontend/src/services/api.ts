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

export default api