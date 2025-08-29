import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes for most data
      // Cache time: How long data stays in cache after being unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 (auth errors)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false
        }
        // Retry up to 2 times for other errors
        return failureCount < 2
      },
      // Background refetch settings
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
})

// Query key factory for consistent key management
export const queryKeys = {
  // Projects
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  
  // IFC Files
  ifcFiles: (projectId: string) => ['ifc-files', projectId] as const,
  ifcViewerUrl: (ifcFileId: string) => ['ifc-viewer-url', ifcFileId] as const,
  
  // Materials
  materials: (ifcFileId: string) => ['materials', ifcFileId] as const,
  
  // Suppliers
  suppliers: ['suppliers'] as const,
  
  // RFQs
  rfqs: (projectId: string) => ['rfqs', projectId] as const,
  rfqDashboard: (rfqId: string) => ['rfq-dashboard', rfqId] as const,
  
  // Quotes
  quoteDetails: (token: string) => ['quote-details', token] as const,
} as const