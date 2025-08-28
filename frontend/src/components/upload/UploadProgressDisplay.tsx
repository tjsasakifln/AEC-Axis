import React from 'react'
import { UploadProgress } from '../../types/upload.types'
import { formatFileSize, formatSpeed } from '../../utils/progress-calculator'

interface UploadProgressDisplayProps {
  progress: UploadProgress
  fileName?: string
  onCancel?: () => void
}

const UploadProgressDisplay: React.FC<UploadProgressDisplayProps> = ({
  progress,
  fileName,
  onCancel
}) => {
  const {
    loaded,
    total,
    percentage,
    speed,
    eta,
    elapsedTime
  } = progress

  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-blue-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Uploading File
            </h3>
            {fileName && (
              <p className="text-sm text-gray-500">{fileName}</p>
            )}
          </div>
        </div>
        
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {percentage}% Complete
          </span>
          <span className="text-sm text-gray-500">
            {formatFileSize(loaded)} of {formatFileSize(total)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Upload Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-600">Speed</dt>
          <dd className="text-lg font-semibold text-gray-900 mt-1">
            {formatSpeed(speed)}
          </dd>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-600">Time Remaining</dt>
          <dd className="text-lg font-semibold text-gray-900 mt-1">
            {eta}
          </dd>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-600">Elapsed</dt>
          <dd className="text-lg font-semibold text-gray-900 mt-1">
            {formatElapsedTime(elapsedTime)}
          </dd>
        </div>
      </div>

      {/* Tips for large uploads */}
      {total > 50 * 1024 * 1024 && ( // Show for files larger than 50MB
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <svg
              className="flex-shrink-0 w-5 h-5 text-blue-400 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                Large File Upload
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Please keep this tab open until the upload completes. 
                Closing or navigating away may interrupt the upload process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadProgressDisplay