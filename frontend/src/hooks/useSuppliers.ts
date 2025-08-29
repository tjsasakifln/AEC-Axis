import { useQuery } from '@tanstack/react-query'
import { suppliersApi } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get all suppliers
export const useSuppliers = () => {
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: suppliersApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes - suppliers don't change frequently
  })
}