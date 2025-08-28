export interface UploadProgress {
  loaded: number           // Bytes uploaded  
  total: number           // Total file size
  percentage: number      // 0-100 progress percentage
  speed: number          // Current upload speed (bytes/second)
  averageSpeed: number   // Smoothed speed for ETA calculation
  remainingTime: number  // Estimated seconds remaining
  eta: string           // Human-readable ETA ("2min 30s remaining")
  elapsedTime: number   // Total upload time so far
}

export interface IFCPreviewData {
  fileName: string
  fileSize: number
  ifcVersion: string        // IFC2x3, IFC4, etc.
  projectName?: string      // From IFCPROJECT entity
  buildingElements: {
    beams: number
    columns: number  
    walls: number
    slabs: number
    totalElements: number
  }
  coordinateSystem?: string
  units?: string
}

export interface UploadState {
  status: 'idle' | 'analyzing' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: UploadProgress | null
  preview: IFCPreviewData | null
  error: UploadError | null
  canRetry: boolean
  canCancel: boolean
}

export interface UploadError {
  type: 'network' | 'validation' | 'server' | 'timeout' | 'cancelled' | 'unknown'
  message: string
  details?: string
  code?: number
  recoverable: boolean
}

export interface ProcessingStage {
  id: string
  name: string
  status: 'pending' | 'active' | 'completed' | 'error' 
  startTime?: Date
  endTime?: Date
  progress?: number
  details?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileType?: string
  magicNumber?: string
}

export interface SpeedSample {
  timestamp: number
  loaded: number
  speed: number
}

export type UploadEventType = 'progress' | 'complete' | 'error' | 'abort'

export interface UploadEventHandler {
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (result: any) => void
  onError?: (error: UploadError) => void
  onCancel?: () => void
}