import React, { useState } from 'react'
import { UploadError } from '../../types/upload.types'

interface ErrorDisplayProps {
  error: UploadError
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const [isRetrying, setIsRetrying] = useState(false)

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'validation':
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'server':
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
          </svg>
        )
      case 'timeout':
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'cancelled':
        return (
          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getErrorColor = () => {
    switch (error.type) {
      case 'cancelled':
        return 'border-gray-200 bg-gray-50'
      case 'validation':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-red-200 bg-red-50'
    }
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Network Error'
      case 'validation':
        return 'Validation Error'
      case 'server':
        return 'Server Error'
      case 'timeout':
        return 'Upload Timeout'
      case 'cancelled':
        return 'Upload Cancelled'
      default:
        return 'Upload Error'
    }
  }

  const getRecoverySuggestion = () => {
    switch (error.type) {
      case 'network':
        return {
          title: 'Check your connection',
          suggestions: [
            'Verify your internet connection is stable',
            'Try connecting to a different network',
            'Disable VPN if enabled and try again'
          ]
        }
      case 'validation':
        return {
          title: 'Fix file issues',
          suggestions: [
            'Ensure the file is a valid IFC format',
            'Check that the file size is within limits',
            'Try exporting the file again from your CAD software'
          ]
        }
      case 'server':
        if (error.code === 401 || error.code === 403) {
          return {
            title: 'Authentication required',
            suggestions: [
              'Log out and log back in',
              'Check your account permissions',
              'Contact support if the issue persists'
            ]
          }
        }
        return {
          title: 'Server temporarily unavailable',
          suggestions: [
            'Wait a few moments and try again',
            'Check the system status page',
            'Contact support if the issue continues'
          ]
        }
      case 'timeout':
        return {
          title: 'Upload took too long',
          suggestions: [
            'Try uploading during off-peak hours',
            'Check your internet connection speed',
            'Consider using a wired connection instead of WiFi'
          ]
        }
      case 'cancelled':
        return {
          title: 'Upload was cancelled',
          suggestions: [
            'You can start a new upload anytime',
            'Make sure not to navigate away during upload'
          ]
        }
      default:
        return {
          title: 'Something went wrong',
          suggestions: [
            'Try uploading the file again',
            'Check your internet connection',
            'Contact support if the problem continues'
          ]
        }
    }
  }

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const recoverySuggestion = getRecoverySuggestion()

  return (
    <div className={`rounded-lg border-2 p-6 ${getErrorColor()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {getErrorTitle()}
              </h3>
              <p className="text-gray-700 mb-2">
                {error.message}
              </p>
              {error.details && (
                <p className="text-sm text-gray-600 mb-4">
                  {error.details}
                </p>
              )}
              
              {/* Error Code */}
              {error.code && (
                <p className="text-xs text-gray-500 mb-4">
                  Error Code: {error.code}
                </p>
              )}

              {/* Recovery Suggestions */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {recoverySuggestion.title}:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {recoverySuggestion.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Dismiss Button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            {onRetry && error.recoverable && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Try Again
                  </>
                )}
              </button>
            )}

            {error.type === 'network' && (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
              >
                Refresh Page
              </button>
            )}

            <a
              href={`mailto:support@aec-axis.com?subject=Upload Error&body=Error: ${encodeURIComponent(JSON.stringify(error, null, 2))}`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay