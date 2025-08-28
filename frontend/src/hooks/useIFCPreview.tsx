import { useState, useCallback } from 'react'
import { IFCPreviewData } from '../types/upload.types'
import { 
  analyzeIFCFile, 
  getQuickIFCPreview, 
  formatIFCPreview 
} from '../utils/ifc-parser'
import { validateFile } from '../utils/upload-helpers'

interface UseIFCPreviewState {
  isAnalyzing: boolean
  previewData: IFCPreviewData | null
  error: string | null
}

export const useIFCPreview = () => {
  const [state, setState] = useState<UseIFCPreviewState>({
    isAnalyzing: false,
    previewData: null,
    error: null
  })

  // Full analysis of IFC file
  const analyzeFile = useCallback(async (file: File): Promise<IFCPreviewData> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))

    try {
      // First validate the file
      const validationResult = await validateFile(file)
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Invalid file')
      }

      // Perform full analysis
      const previewData = await analyzeIFCFile(file)
      
      setState({
        isAnalyzing: false,
        previewData,
        error: null
      })

      return previewData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze IFC file'
      
      setState({
        isAnalyzing: false,
        previewData: null,
        error: errorMessage
      })

      throw new Error(errorMessage)
    }
  }, [])

  // Quick preview for large files
  const getQuickPreview = useCallback(async (file: File): Promise<Partial<IFCPreviewData>> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }))

    try {
      // Basic file validation
      const validationResult = await validateFile(file)
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Invalid file')
      }

      // Get quick preview
      const previewData = await getQuickIFCPreview(file)
      
      setState({
        isAnalyzing: false,
        previewData: null, // Don't store partial data in full state
        error: null
      })

      return previewData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get file preview'
      
      setState({
        isAnalyzing: false,
        previewData: null,
        error: errorMessage
      })

      throw new Error(errorMessage)
    }
  }, [])

  // Format preview data for display
  const getFormattedPreview = useCallback((previewData?: IFCPreviewData | null): Record<string, string> | null => {
    const data = previewData || state.previewData
    return data ? formatIFCPreview(data) : null
  }, [state.previewData])

  // Reset preview state
  const resetPreview = useCallback(() => {
    setState({
      isAnalyzing: false,
      previewData: null,
      error: null
    })
  }, [])

  // Check if file analysis is recommended based on size
  const shouldUseQuickPreview = useCallback((file: File): boolean => {
    // Use quick preview for files larger than 100MB
    const sizeMB = file.size / (1024 * 1024)
    return sizeMB > 100
  }, [])

  // Analyze file with automatic strategy selection
  const analyzeFileAuto = useCallback(async (file: File): Promise<IFCPreviewData | Partial<IFCPreviewData>> => {
    if (shouldUseQuickPreview(file)) {
      return await getQuickPreview(file)
    } else {
      return await analyzeFile(file)
    }
  }, [shouldUseQuickPreview, getQuickPreview, analyzeFile])

  return {
    isAnalyzing: state.isAnalyzing,
    previewData: state.previewData,
    error: state.error,
    analyzeFile,
    getQuickPreview,
    analyzeFileAuto,
    getFormattedPreview,
    resetPreview,
    shouldUseQuickPreview
  }
}