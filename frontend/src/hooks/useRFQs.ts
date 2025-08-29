import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rfqsApi, CreateRFQRequest, QuoteDashboardData } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get RFQs for a project
export const useRFQs = (projectId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.rfqs(projectId!),
    queryFn: () => rfqsApi.getByProjectId(projectId!),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute - RFQs can be updated frequently
  })
}

// Get RFQ dashboard data
export const useRFQDashboard = (rfqId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.rfqDashboard(rfqId!),
    queryFn: () => rfqsApi.getDashboardData(rfqId!),
    enabled: !!rfqId,
    staleTime: 10 * 1000, // 10 seconds - dashboard needs to be fresh for real-time quotes
    refetchInterval: 15 * 1000, // Auto-refresh every 15 seconds
    refetchIntervalInBackground: true,
  })
}

// Create RFQ mutation
export const useCreateRFQ = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateRFQRequest) => rfqsApi.create(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch RFQs for the project
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.rfqs(variables.project_id) 
      })
    },
  })
}

// Helper to update dashboard data (for WebSocket updates)
export const useUpdateDashboardData = () => {
  const queryClient = useQueryClient()
  
  return {
    updateDashboardData: (rfqId: string, updater: (oldData: QuoteDashboardData | undefined) => QuoteDashboardData | undefined) => {
      queryClient.setQueryData<QuoteDashboardData>(
        queryKeys.rfqDashboard(rfqId),
        updater
      )
    },
    
    invalidateDashboard: (rfqId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.rfqDashboard(rfqId) 
      })
    }
  }
}