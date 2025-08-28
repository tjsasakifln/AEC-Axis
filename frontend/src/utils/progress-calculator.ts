import { UploadProgress, SpeedSample } from '../types/upload.types'

/**
 * Formats bytes into human-readable format (B, KB, MB, GB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Formats speed in bytes per second to human-readable format
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`
}

/**
 * Formats time remaining into human-readable format
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return 'Calculating...'
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s remaining`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s remaining`
      : `${minutes}m remaining`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m remaining`
    : `${hours}h remaining`
}

/**
 * Calculates smooth average speed from speed samples to reduce jitter
 */
export const calculateSmoothSpeed = (speedSamples: SpeedSample[]): number => {
  if (speedSamples.length === 0) return 0
  
  // Use last 5 samples for smoothing, giving more weight to recent samples
  const recentSamples = speedSamples.slice(-5)
  const weights = recentSamples.map((_, index) => index + 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  
  const weightedSum = recentSamples.reduce((sum, sample, index) => 
    sum + (sample.speed * weights[index]), 0
  )
  
  return weightedSum / totalWeight
}

/**
 * Creates a complete UploadProgress object from current upload state
 */
export const createUploadProgress = (
  loaded: number,
  total: number,
  speedSamples: SpeedSample[],
  startTime: number
): UploadProgress => {
  const now = Date.now()
  const elapsedTime = (now - startTime) / 1000
  const percentage = Math.round((loaded / total) * 100)
  
  // Calculate current speed
  const speed = elapsedTime > 0 ? loaded / elapsedTime : 0
  
  // Add current sample
  const updatedSamples = [...speedSamples, {
    timestamp: now,
    loaded,
    speed
  }].slice(-10) // Keep last 10 samples
  
  // Calculate smooth average speed
  const averageSpeed = calculateSmoothSpeed(updatedSamples)
  
  // Calculate remaining time
  const remainingBytes = total - loaded
  const remainingTime = averageSpeed > 0 ? remainingBytes / averageSpeed : 0
  
  return {
    loaded,
    total,
    percentage,
    speed,
    averageSpeed,
    remainingTime,
    eta: formatTimeRemaining(remainingTime),
    elapsedTime
  }
}

/**
 * Validates progress event data for accuracy
 */
export const isValidProgressEvent = (event: ProgressEvent): boolean => {
  return (
    event.lengthComputable &&
    typeof event.loaded === 'number' &&
    typeof event.total === 'number' &&
    event.loaded >= 0 &&
    event.total > 0 &&
    event.loaded <= event.total
  )
}

/**
 * Calculates upload accuracy percentage based on estimated vs actual time
 */
export const calculateAccuracy = (estimatedTime: number, actualTime: number): number => {
  if (estimatedTime <= 0 || actualTime <= 0) return 0
  
  const difference = Math.abs(estimatedTime - actualTime)
  const accuracy = Math.max(0, 100 - (difference / actualTime) * 100)
  
  return Math.round(accuracy)
}

/**
 * Throttles progress updates to prevent UI lag
 */
export const createProgressThrottle = (callback: (progress: UploadProgress) => void, delay = 100) => {
  let lastUpdate = 0
  
  return (progress: UploadProgress) => {
    const now = Date.now()
    
    if (now - lastUpdate >= delay) {
      callback(progress)
      lastUpdate = now
    }
  }
}