import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ifcFilesApi, IFCFile } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get IFC files for a project
export const useIFCFiles = (projectId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.ifcFiles(projectId!),
    queryFn: () => ifcFilesApi.getByProjectId(projectId!),
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute - files can change during processing
  })
}

// Get IFC viewer URL
export const useIFCViewerUrl = (ifcFileId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.ifcViewerUrl(ifcFileId!),
    queryFn: () => ifcFilesApi.getViewerUrl(ifcFileId!),
    enabled: !!ifcFileId,
    staleTime: 10 * 60 * 1000, // 10 minutes - URLs are relatively stable
    gcTime: 15 * 60 * 1000, // Keep in cache longer
  })
}

// Upload IFC file mutation
export const useUploadIFCFile = (projectId: string | undefined) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (file: File) => ifcFilesApi.upload(projectId!, file),
    onSuccess: (newFile: IFCFile) => {
      // Update the IFC files list cache
      queryClient.setQueryData<IFCFile[]>(
        queryKeys.ifcFiles(projectId!),
        (oldFiles) => {
          if (!oldFiles) return [newFile]
          return [...oldFiles, newFile]
        }
      )
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.ifcFiles(projectId!) 
      })
    },
  })
}

// Helper to update IFC file status (for WebSocket updates)
export const useUpdateIFCFileStatus = () => {
  const queryClient = useQueryClient()
  
  return {
    updateFileStatus: (projectId: string, fileId: string, status: IFCFile['status']) => {
      queryClient.setQueryData<IFCFile[]>(
        queryKeys.ifcFiles(projectId),
        (oldFiles) => {
          if (!oldFiles) return oldFiles
          return oldFiles.map(file =>
            file.id === fileId ? { ...file, status } : file
          )
        }
      )
    }
  }
}