import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materialsApi, Material, UpdateMaterialRequest } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get materials for an IFC file
export const useMaterials = (ifcFileId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.materials(ifcFileId!),
    queryFn: () => materialsApi.getByIFCFileId(ifcFileId!),
    enabled: !!ifcFileId,
    staleTime: 30 * 1000, // 30 seconds - materials can be edited frequently
  })
}

// Update material mutation
export const useUpdateMaterial = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ materialId, data }: { materialId: string; data: UpdateMaterialRequest }) => 
      materialsApi.update(materialId, data),
    onSuccess: (updatedMaterial: Material) => {
      // Find which IFC file this material belongs to and update the cache
      const ifcFileId = updatedMaterial.ifc_file_id
      
      queryClient.setQueryData<Material[]>(
        queryKeys.materials(ifcFileId),
        (oldMaterials) => {
          if (!oldMaterials) return [updatedMaterial]
          return oldMaterials.map(material =>
            material.id === updatedMaterial.id ? updatedMaterial : material
          )
        }
      )
    },
  })
}

// Delete material mutation
export const useDeleteMaterial = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ materialId, ifcFileId }: { materialId: string; ifcFileId: string }) => {
      // Call delete API
      return materialsApi.delete(materialId).then(() => ({ materialId, ifcFileId }))
    },
    onSuccess: ({ materialId, ifcFileId }) => {
      // Remove from materials cache
      queryClient.setQueryData<Material[]>(
        queryKeys.materials(ifcFileId),
        (oldMaterials) => {
          if (!oldMaterials) return oldMaterials
          return oldMaterials.filter(material => material.id !== materialId)
        }
      )
    },
  })
}