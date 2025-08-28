import React, { useEffect } from 'react'
import { IFCPreviewData } from '../../types/upload.types'
import { formatFileSize } from '../../utils/progress-calculator'
import { estimateIFCComplexity, getProcessingTimeEstimate } from '../../utils/ifc-parser'

interface FilePreviewModalProps {
  isOpen: boolean
  previewData: IFCPreviewData | null
  onConfirm: () => void
  onCancel: () => void
  isAnalyzing?: boolean
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  previewData,
  onConfirm,
  onCancel,
  isAnalyzing = false
}) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const complexity = previewData ? estimateIFCComplexity(previewData) : 'Unknown'
  const processingTime = previewData ? getProcessingTimeEstimate(previewData) : 'Unknown'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                IFC File Preview
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Review file details before uploading
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {isAnalyzing ? (
              // Loading State
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4"
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
                  <p className="text-lg font-medium text-gray-900">
                    Analyzing IFC File...
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This may take a few moments for large files
                  </p>
                </div>
              </div>
            ) : previewData ? (
              // Preview Data
              <div className="space-y-6">
                {/* File Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    File Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-sm font-medium text-gray-600">File Name</dt>
                      <dd className="text-lg font-semibold text-gray-900 mt-1 truncate" title={previewData.fileName}>
                        {previewData.fileName}
                      </dd>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-sm font-medium text-gray-600">File Size</dt>
                      <dd className="text-lg font-semibold text-gray-900 mt-1">
                        {formatFileSize(previewData.fileSize)}
                      </dd>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-sm font-medium text-gray-600">IFC Version</dt>
                      <dd className="text-lg font-semibold text-gray-900 mt-1">
                        {previewData.ifcVersion}
                      </dd>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-sm font-medium text-gray-600">Complexity</dt>
                      <dd className="text-lg font-semibold text-gray-900 mt-1">
                        <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                          complexity === 'Simple' ? 'bg-green-100 text-green-800' :
                          complexity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {complexity}
                        </span>
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Project Information */}
                {previewData.projectName && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Project Information
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <dt className="text-sm font-medium text-blue-600">Project Name</dt>
                      <dd className="text-lg font-semibold text-blue-900 mt-1">
                        {previewData.projectName}
                      </dd>
                    </div>
                  </div>
                )}

                {/* Building Elements */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Building Elements
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {previewData.buildingElements.beams.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Beams</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {previewData.buildingElements.columns.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Columns</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {previewData.buildingElements.walls.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Walls</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {previewData.buildingElements.slabs.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Slabs</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-900">
                      {previewData.buildingElements.totalElements.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">Total Elements</div>
                  </div>
                </div>

                {/* Processing Estimation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Processing Time Estimate
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Based on file complexity, processing is estimated to take{' '}
                        <span className="font-medium">{processingTime}</span>.
                        Large files may take longer depending on server load.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Error State
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-lg font-medium text-gray-900">
                  Unable to preview file
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  The file could not be analyzed. You can still proceed with the upload.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isAnalyzing}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Upload File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilePreviewModal