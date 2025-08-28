import { UploadError, FileValidationResult } from '../types/upload.types'

/**
 * Maximum file size allowed (500MB in bytes)
 */
export const MAX_FILE_SIZE = 500 * 1024 * 1024

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = ['.ifc']

/**
 * IFC file magic numbers for content validation
 */
const IFC_MAGIC_NUMBERS = [
  'ISO-10303', // Standard IFC header
  'FILE_DESCRIPTION', // Another common IFC header pattern
]

/**
 * Validates file extension
 */
export const validateFileExtension = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return ALLOWED_EXTENSIONS.includes(extension)
}

/**
 * Validates file size
 */
export const validateFileSize = (fileSize: number): boolean => {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE
}

/**
 * Reads file content to validate magic numbers
 */
export const validateFileContent = async (file: File): Promise<FileValidationResult> => {
  try {
    // Read first 1KB of file to check magic numbers
    const chunk = file.slice(0, 1024)
    const content = await readFileAsText(chunk)
    
    // Check for IFC magic numbers
    const hasIFCMagic = IFC_MAGIC_NUMBERS.some(magic => 
      content.includes(magic)
    )
    
    if (!hasIFCMagic) {
      return {
        isValid: false,
        error: 'File does not appear to be a valid IFC file',
        fileType: 'unknown'
      }
    }
    
    return {
      isValid: true,
      fileType: 'ifc',
      magicNumber: content.substring(0, 100)
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Unable to read file content for validation',
      fileType: 'unknown'
    }
  }
}

/**
 * Comprehensive file validation
 */
export const validateFile = async (file: File): Promise<FileValidationResult> => {
  // Check file extension
  if (!validateFileExtension(file.name)) {
    return {
      isValid: false,
      error: 'Only IFC files are allowed'
    }
  }
  
  // Check file size
  if (!validateFileSize(file.size)) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024))
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    }
  }
  
  // Check file content
  return await validateFileContent(file)
}

/**
 * Reads file as text with error handling
 */
export const readFileAsText = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        resolve(event.target.result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('File reading failed'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Reads file chunk as text for large file handling
 */
export const readFileChunk = (file: File, start: number, end: number): Promise<string> => {
  const chunk = file.slice(start, end)
  return readFileAsText(chunk)
}

/**
 * Creates upload error from XMLHttpRequest status
 */
export const createUploadError = (status: number, statusText: string): UploadError => {
  if (!navigator.onLine) {
    return {
      type: 'network',
      message: 'No internet connection',
      details: 'Please check your internet connection and try again',
      recoverable: true
    }
  }
  
  switch (status) {
    case 413:
      return {
        type: 'validation',
        message: 'File too large',
        details: 'The selected file exceeds the maximum allowed size',
        code: status,
        recoverable: false
      }
      
    case 415:
      return {
        type: 'validation',
        message: 'Invalid file type',
        details: 'Only IFC files are supported',
        code: status,
        recoverable: false
      }
      
    case 400:
      return {
        type: 'validation',
        message: 'Invalid request',
        details: statusText || 'The upload request was invalid',
        code: status,
        recoverable: false
      }
      
    case 401:
    case 403:
      return {
        type: 'server',
        message: 'Authentication failed',
        details: 'Please log in again and try uploading',
        code: status,
        recoverable: true
      }
      
    case 408:
    case 504:
      return {
        type: 'timeout',
        message: 'Upload timeout',
        details: 'The upload took too long. Please try again',
        code: status,
        recoverable: true
      }
      
    case 429:
      return {
        type: 'server',
        message: 'Too many requests',
        details: 'Please wait a moment and try again',
        code: status,
        recoverable: true
      }
      
    case 500:
    case 502:
    case 503:
      return {
        type: 'server',
        message: 'Server error',
        details: 'A server error occurred. Please try again later',
        code: status,
        recoverable: true
      }
      
    default:
      return {
        type: 'unknown',
        message: statusText || 'Upload failed',
        details: 'An unexpected error occurred during upload',
        code: status,
        recoverable: true
      }
  }
}

/**
 * Creates network error for failed requests
 */
export const createNetworkError = (): UploadError => {
  return {
    type: 'network',
    message: 'Network error',
    details: 'Failed to connect to the server. Please check your connection',
    recoverable: true
  }
}

/**
 * Creates cancellation error
 */
export const createCancellationError = (): UploadError => {
  return {
    type: 'cancelled',
    message: 'Upload cancelled',
    details: 'The upload was cancelled by the user',
    recoverable: false
  }
}

/**
 * Determines retry strategy based on error type
 */
export const getRetryStrategy = (error: UploadError): { canRetry: boolean; delay: number } => {
  if (!error.recoverable) {
    return { canRetry: false, delay: 0 }
  }
  
  switch (error.type) {
    case 'network':
      return { canRetry: true, delay: 2000 } // 2 seconds
      
    case 'timeout':
      return { canRetry: true, delay: 5000 } // 5 seconds
      
    case 'server':
      if (error.code === 429) {
        return { canRetry: true, delay: 10000 } // 10 seconds for rate limiting
      }
      return { canRetry: true, delay: 3000 } // 3 seconds for other server errors
      
    default:
      return { canRetry: true, delay: 1000 } // 1 second default
  }
}

/**
 * Feature detection utilities
 */
export const hasFileAPI = (): boolean => {
  return !!(window.File && window.FileReader && window.FileList && window.Blob)
}

export const hasFileConstructor = (): boolean => {
  try {
    return !!new File([''], 'test.txt')
  } catch {
    return false
  }
}

export const hasDragDropAPI = (): boolean => {
  const div = document.createElement('div')
  return ('draggable' in div) && ('ondrop' in div)
}

export const hasXMLHttpRequestUpload = (): boolean => {
  return !!(XMLHttpRequest.prototype.upload)
}