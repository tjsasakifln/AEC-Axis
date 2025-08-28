import React from 'react'
import { ProcessingStage } from '../../types/upload.types'

interface ProcessingTimelineProps {
  stages: ProcessingStage[]
  currentStage?: string
}

const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({
  stages,
  currentStage
}) => {
  const getStageIcon = (stage: ProcessingStage) => {
    switch (stage.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'active':
        return (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getStageColor = (stage: ProcessingStage) => {
    switch (stage.status) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'active':
        return 'border-blue-500 bg-blue-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getConnectorColor = (stage: ProcessingStage) => {
    if (stage.status === 'completed') {
      return 'bg-green-500'
    } else if (stage.status === 'active') {
      return 'bg-blue-500'
    } else if (stage.status === 'error') {
      return 'bg-red-500'
    }
    return 'bg-gray-300'
  }

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return ''
    
    const end = endTime || new Date()
    const duration = end.getTime() - startTime.getTime()
    const seconds = Math.round(duration / 1000)
    
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Processing Status</h3>
      
      <div className="relative">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1
          
          return (
            <div key={stage.id} className="relative">
              {/* Stage Item */}
              <div className={`flex items-center p-4 rounded-lg border-2 ${getStageColor(stage)}`}>
                <div className="flex-shrink-0">
                  {getStageIcon(stage)}
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {stage.name}
                    </h4>
                    {stage.startTime && (
                      <span className="text-xs text-gray-500">
                        {formatDuration(stage.startTime, stage.endTime)}
                      </span>
                    )}
                  </div>
                  
                  {stage.details && (
                    <p className="text-sm text-gray-600 mt-1">
                      {stage.details}
                    </p>
                  )}
                  
                  {stage.progress !== undefined && stage.status === 'active' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(stage.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {!isLast && (
                <div className="flex justify-center py-2">
                  <div 
                    className={`w-0.5 h-6 ${getConnectorColor(stage)}`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Overall Status */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {stages.filter(s => s.status === 'completed').length} of {stages.length} stages completed
            </p>
            {currentStage && (
              <p className="text-sm font-medium text-gray-900 mt-1">
                Currently: {stages.find(s => s.id === currentStage)?.name}
              </p>
            )}
          </div>
          
          {/* Overall Progress Bar */}
          <div className="w-32">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProcessingTimeline