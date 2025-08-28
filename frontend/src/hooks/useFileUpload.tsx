import { useState, useRef, useCallback, useEffect } from 'react'
// Removed unused throttle import
import { 
  UploadState, 
  UploadProgress, 
  UploadError,
  SpeedSample 
} from '../types/upload.types'
import { IFCFile } from '../services/api'
import { 
  createUploadProgress, 
  createProgressThrottle,
  isValidProgressEvent 
} from '../utils/progress-calculator'
import { 
  createUploadError, 
  createNetworkError, 
  createCancellationError,
  getRetryStrategy 
} from '../utils/upload-helpers'

interface UseFileUploadOptions {
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (file: IFCFile) => void
  onError?: (error: UploadError) => void
  progressThrottleMs?: number
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    onProgress,
    onComplete,
    onError,
    progressThrottleMs = 100
  } = options

  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: null,
    preview: null,
    error: null,
    canRetry: false,
    canCancel: false
  })

  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const startTimeRef = useRef<number>(0)
  const speedSamplesRef = useRef<SpeedSample[]>([])
  const retryCountRef = useRef<number>(0)
  const currentFileRef = useRef<File | null>(null)
  const currentProjectIdRef = useRef<string | null>(null)

  // Throttled progress update to prevent UI lag
  const throttledProgressUpdate = useCallback(
    createProgressThrottle((progress: UploadProgress) => {
      setUploadState(prev => ({ ...prev, progress }))
      onProgress?.(progress)
    }, progressThrottleMs),
    [onProgress, progressThrottleMs]
  )

  // Reset upload state
  const resetUploadState = useCallback(() => {
    setUploadState({
      status: 'idle',
      progress: null,
      preview: null,
      error: null,
      canRetry: false,
      canCancel: false
    })
    speedSamplesRef.current = []
    retryCountRef.current = 0
    currentFileRef.current = null
    currentProjectIdRef.current = null
  }, [])

  // Create XMLHttpRequest with progress tracking
  const createXHRRequest = useCallback((file: File, projectId: string): Promise<IFCFile> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr
      startTimeRef.current = Date.now()
      speedSamplesRef.current = []

      // CRITICAL: Register event listeners BEFORE calling send()
      xhr.upload.addEventListener('progress', (event: ProgressEvent) => {
        if (!isValidProgressEvent(event)) return

        const progress = createUploadProgress(
          event.loaded,
          event.total,
          speedSamplesRef.current,
          startTimeRef.current
        )

        // Update speed samples for next calculation
        speedSamplesRef.current = [...speedSamplesRef.current, {
          timestamp: Date.now(),
          loaded: event.loaded,
          speed: progress.speed
        }].slice(-10) // Keep last 10 samples

        throttledProgressUpdate(progress)
      })

      xhr.addEventListener('load', () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const uploadedFile: IFCFile = JSON.parse(xhr.responseText)
            setUploadState(prev => ({ 
              ...prev, 
              status: 'completed',
              canCancel: false 
            }))
            onComplete?.(uploadedFile)
            resolve(uploadedFile)
          } else {
            const error = createUploadError(xhr.status, xhr.statusText)
            const { canRetry } = getRetryStrategy(error)
            
            setUploadState(prev => ({ 
              ...prev, 
              status: 'error', 
              error, 
              canRetry: canRetry && retryCountRef.current < 3,
              canCancel: false 
            }))
            onError?.(error)
            reject(error)
          }
        } catch (parseError) {
          const error: UploadError = {
            type: 'unknown',
            message: 'Failed to parse server response',
            recoverable: true
          }
          setUploadState(prev => ({ 
            ...prev, 
            status: 'error', 
            error, 
            canRetry: true,
            canCancel: false 
          }))
          onError?.(error)
          reject(error)
        }
      })

      xhr.addEventListener('error', () => {
        const error = createNetworkError()
        const { canRetry } = getRetryStrategy(error)
        
        setUploadState(prev => ({ 
          ...prev, 
          status: 'error', 
          error, 
          canRetry: canRetry && retryCountRef.current < 3,
          canCancel: false 
        }))
        onError?.(error)
        reject(error)
      })

      xhr.addEventListener('timeout', () => {
        const error: UploadError = {
          type: 'timeout',
          message: 'Upload timeout',
          details: 'The upload took too long. Please try again',
          recoverable: true
        }
        const { canRetry } = getRetryStrategy(error)
        
        setUploadState(prev => ({ 
          ...prev, 
          status: 'error', 
          error, 
          canRetry: canRetry && retryCountRef.current < 3,
          canCancel: false 
        }))
        onError?.(error)
        reject(error)
      })

      xhr.addEventListener('abort', () => {
        const error = createCancellationError()
        setUploadState(prev => ({ 
          ...prev, 
          status: 'idle', 
          error, 
          canRetry: false,
          canCancel: false 
        }))
        reject(error)
      })

      // Configure request
      const token = localStorage.getItem('auth_token')
      const apiBaseUrl = 'http://localhost:8000'
      
      xhr.open('POST', `${apiBaseUrl}/projects/${projectId}/ifc-files`)
      xhr.timeout = 300000 // 5 minutes timeout
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      // Start upload
      xhr.send(formData)
    })
  }, [throttledProgressUpdate, onComplete, onError])

  // Main upload function
  const uploadFile = useCallback(async (file: File, projectId: string): Promise<IFCFile> => {
    if (uploadState.status === 'uploading') {
      throw new Error('Upload already in progress')
    }

    // Store current upload details for retry
    currentFileRef.current = file
    currentProjectIdRef.current = projectId

    setUploadState(prev => ({ 
      ...prev, 
      status: 'uploading', 
      error: null,
      canCancel: true,
      canRetry: false
    }))

    try {
      return await createXHRRequest(file, projectId)
    } catch (error) {
      // Error handling is done in the XMLHttpRequest event listeners
      throw error
    }
  }, [uploadState.status, createXHRRequest])

  // Retry upload function
  const retryUpload = useCallback(async (): Promise<IFCFile | null> => {
    if (!currentFileRef.current || !currentProjectIdRef.current) {
      return null
    }

    if (retryCountRef.current >= 3) {
      const error: UploadError = {
        type: 'unknown',
        message: 'Maximum retry attempts exceeded',
        details: 'Please try uploading the file again later',
        recoverable: false
      }
      setUploadState(prev => ({ ...prev, error, canRetry: false }))
      return null
    }

    retryCountRef.current++
    
    // Apply retry delay
    const { delay } = getRetryStrategy(uploadState.error || createNetworkError())
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    return uploadFile(currentFileRef.current, currentProjectIdRef.current)
  }, [uploadFile, uploadState.error])

  // Cancel upload function
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
    }
    
    resetUploadState()
  }, [resetUploadState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort()
      }
    }
  }, [])

  return {
    uploadState,
    uploadFile,
    retryUpload,
    cancelUpload,
    resetUploadState
  }
}