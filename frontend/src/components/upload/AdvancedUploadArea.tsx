import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { validateFile, MAX_FILE_SIZE } from '../../utils/upload-helpers'
import { formatFileSize } from '../../utils/progress-calculator'

interface AdvancedUploadAreaProps {
  onFileSelect: (files: FileList) => void
  disabled?: boolean
  maxFileSize?: number
  acceptedFileTypes?: string[]
  multiple?: boolean
  className?: string
}

const AdvancedUploadArea: React.FC<AdvancedUploadAreaProps> = ({
  onFileSelect,
  disabled = false,
  maxFileSize = MAX_FILE_SIZE,
  acceptedFileTypes = ['.ifc'],
  multiple = false,
  className = ''
}) => {
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationError(null)
    setIsDragActive(false)

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0]
      if (error.code === 'file-too-large') {
        setValidationError(`File is too large. Maximum size is ${formatFileSize(maxFileSize)}`)
      } else if (error.code === 'file-invalid-type') {
        setValidationError(`Invalid file type. Only ${acceptedFileTypes.join(', ')} files are allowed`)
      } else {
        setValidationError(error.message || 'File validation failed')
      }
      return
    }

    // Validate accepted files
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      try {
        const validation = await validateFile(file)
        if (!validation.isValid) {
          setValidationError(validation.error || 'File validation failed')
          return
        }

        // Convert to FileList-like object
        const fileList = {
          0: file,
          length: 1,
          item: (index: number) => index === 0 ? file : null,
          [Symbol.iterator]: function* () {
            yield file
          }
        } as FileList

        onFileSelect(fileList)
      } catch (error) {
        setValidationError('Error validating file content')
      }
    }
  }, [onFileSelect, maxFileSize, acceptedFileTypes])

  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneIsDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': acceptedFileTypes,
      'text/plain': acceptedFileTypes
    },
    maxSize: maxFileSize,
    multiple,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  })

  const getDropzoneClasses = () => {
    const baseClasses = `
      relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
      transition-all duration-300 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
    `

    if (disabled) {
      return `${baseClasses} border-gray-200 bg-gray-50 cursor-not-allowed`
    }

    if (isDragReject) {
      return `${baseClasses} border-red-400 bg-red-50 text-red-700`
    }

    if (dropzoneIsDragActive || isDragActive) {
      return `${baseClasses} border-blue-400 bg-blue-50 text-blue-700 scale-105`
    }

    return `${baseClasses} border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50`
  }

  const getIconColor = () => {
    if (disabled) return 'text-gray-400'
    if (isDragReject) return 'text-red-400'
    if (dropzoneIsDragActive || isDragActive) return 'text-blue-500'
    return 'text-gray-400'
  }

  return (
    <div className={className}>
      <div {...getRootProps()} className={getDropzoneClasses()}>
        <input {...getInputProps()} />
        
        {/* Upload Icon */}
        <div className="mb-4">
          <svg
            className={`mx-auto h-12 w-12 ${getIconColor()} transition-colors duration-200`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Main Message */}
        <div className="mb-4">
          {disabled ? (
            <p className="text-lg font-medium text-gray-500">
              Upload disabled
            </p>
          ) : isDragReject ? (
            <p className="text-lg font-medium text-red-700">
              Invalid file type
            </p>
          ) : dropzoneIsDragActive || isDragActive ? (
            <p className="text-lg font-medium text-blue-700">
              Drop the IFC file here...
            </p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload IFC File
              </p>
              <p className="text-sm text-gray-600">
                Drag and drop your IFC file here, or{' '}
                <span className="text-blue-600 font-medium">click to browse</span>
              </p>
            </div>
          )}
        </div>

        {/* File Requirements */}
        {!disabled && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              Supported formats: {acceptedFileTypes.join(', ').toUpperCase()}
            </p>
            <p>
              Maximum file size: {formatFileSize(maxFileSize)}
            </p>
            {multiple && (
              <p>Multiple files allowed</p>
            )}
          </div>
        )}

        {/* Animated Border for Active State */}
        {(dropzoneIsDragActive || isDragActive) && !isDragReject && (
          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg
              className="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                Upload Error
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Features Highlight */}
      {!disabled && !validationError && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <svg className="mx-auto w-6 h-6 text-green-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="font-medium text-gray-900">Instant Validation</p>
            <p className="text-gray-600">File content verified before upload</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <svg className="mx-auto w-6 h-6 text-blue-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-gray-900">Real-time Progress</p>
            <p className="text-gray-600">See upload speed and time remaining</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <svg className="mx-auto w-6 h-6 text-purple-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
            </svg>
            <p className="font-medium text-gray-900">IFC Preview</p>
            <p className="text-gray-600">See project details before processing</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedUploadArea