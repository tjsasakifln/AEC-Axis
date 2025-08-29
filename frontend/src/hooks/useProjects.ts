import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, CreateProjectRequest, Project } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get all projects
export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: projectsApi.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes - projects don't change frequently
  })
}

// Get single project
export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.project(projectId!),
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create project mutation
export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (project: CreateProjectRequest) => projectsApi.create(project),
    onSuccess: (newProject: Project) => {
      // Update the projects list cache with the new project
      queryClient.setQueryData<Project[]>(
        queryKeys.projects,
        (oldProjects) => {
          if (!oldProjects) return [newProject]
          return [...oldProjects, newProject]
        }
      )
      
      // Also set the individual project cache
      queryClient.setQueryData(queryKeys.project(newProject.id), newProject)
      
      // Invalidate projects list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}