import { IFCPreviewData } from '../types/upload.types'
import { readFileChunk } from './upload-helpers'

/**
 * IFC version patterns
 */
const IFC_VERSION_PATTERNS = {
  'IFC2X3': /IFC2X3/gi,
  'IFC4': /IFC4(?!X)/gi,
  'IFC4X3': /IFC4X3/gi,
  'IFC2X2': /IFC2X2/gi,
}

/**
 * IFC entity patterns for counting building elements
 */
const IFC_ENTITY_PATTERNS = {
  beams: /IFCBEAM\s*\(/gi,
  columns: /IFCCOLUMN\s*\(/gi,
  walls: /IFCWALL(?:STANDARDCASE)?\s*\(/gi,
  slabs: /IFCSLAB\s*\(/gi,
  doors: /IFCDOOR\s*\(/gi,
  windows: /IFCWINDOW\s*\(/gi,
  spaces: /IFCSPACE\s*\(/gi,
}

/**
 * Extracts IFC version from file content
 */
const extractIFCVersion = (content: string): string => {
  // First check FILE_SCHEMA section
  const schemaMatch = content.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)
  if (schemaMatch) {
    return schemaMatch[1].toUpperCase()
  }
  
  // Fallback to pattern matching
  for (const [version, pattern] of Object.entries(IFC_VERSION_PATTERNS)) {
    if (pattern.test(content)) {
      return version
    }
  }
  
  return 'Unknown'
}

/**
 * Extracts project name from IFC content
 */
const extractProjectName = (content: string): string | undefined => {
  // Look for IFCPROJECT entity
  const projectPatterns = [
    /IFCPROJECT\([^,]*,\s*[^,]*,\s*'([^']*)',/i,
    /IFCPROJECT\([^,]*,'([^']*)',/i,
    /#\d+\s*=\s*IFCPROJECT\([^,]*,\s*[^,]*,\s*'([^']*)',/i
  ]
  
  for (const pattern of projectPatterns) {
    const match = content.match(pattern)
    if (match && match[1] && match[1].trim() !== '') {
      return match[1].trim()
    }
  }
  
  return undefined
}

/**
 * Extracts coordinate system information
 */
const extractCoordinateSystem = (content: string): string | undefined => {
  const coordSystemMatch = content.match(/IFCGEOMETRICREPRESENTATIONCONTEXT.*?'([^']*)',/i)
  return coordSystemMatch ? coordSystemMatch[1] : undefined
}

/**
 * Extracts units information
 */
const extractUnits = (content: string): string | undefined => {
  const unitsPatterns = [
    /IFCSIUNIT\([^,]*,\s*[^,]*,\s*\.([^.]*)\..*?\)/gi,
    /IFCUNITASSIGNMENT.*?\.([^.]*)\..*?\)/gi
  ]
  
  for (const pattern of unitsPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].replace(/_/g, ' ')
    }
  }
  
  return undefined
}

/**
 * Counts building elements in IFC content
 */
const countBuildingElements = (content: string) => {
  const elements = {
    beams: 0,
    columns: 0,
    walls: 0,
    slabs: 0,
    totalElements: 0
  }
  
  // Count each type of element
  elements.beams = (content.match(IFC_ENTITY_PATTERNS.beams) || []).length
  elements.columns = (content.match(IFC_ENTITY_PATTERNS.columns) || []).length
  elements.walls = (content.match(IFC_ENTITY_PATTERNS.walls) || []).length
  elements.slabs = (content.match(IFC_ENTITY_PATTERNS.slabs) || []).length
  
  // Count all IFC entities for total
  const allEntityPattern = /IFC[A-Z]+\s*\(/gi
  elements.totalElements = (content.match(allEntityPattern) || []).length
  
  return elements
}

/**
 * Validates IFC file structure
 */
const validateIFCStructure = (content: string): boolean => {
  // Check for essential IFC structure elements
  const requiredElements = [
    /ISO-10303/i,
    /HEADER/i,
    /FILE_DESCRIPTION/i,
    /FILE_NAME/i,
    /FILE_SCHEMA/i,
    /ENDSEC/i,
    /DATA/i,
    /ENDSEC/i,
    /END-ISO-10303/i
  ]
  
  return requiredElements.every(pattern => pattern.test(content))
}

/**
 * Analyzes IFC file content and extracts metadata
 */
export const analyzeIFCFile = async (file: File): Promise<IFCPreviewData> => {
  try {
    // Read first 100KB of file for analysis (sufficient for header and initial entities)
    const chunkSize = Math.min(100000, file.size)
    const content = await readFileChunk(file, 0, chunkSize)
    
    // Validate IFC structure
    if (!validateIFCStructure(content)) {
      throw new Error('Invalid IFC file structure')
    }
    
    // Extract metadata
    const ifcVersion = extractIFCVersion(content)
    const projectName = extractProjectName(content)
    const coordinateSystem = extractCoordinateSystem(content)
    const units = extractUnits(content)
    const buildingElements = countBuildingElements(content)
    
    return {
      fileName: file.name,
      fileSize: file.size,
      ifcVersion,
      projectName,
      buildingElements,
      coordinateSystem,
      units
    }
  } catch (error) {
    console.error('Error analyzing IFC file:', error)
    throw new Error('Failed to analyze IFC file content')
  }
}

/**
 * Gets a quick preview without full analysis (for very large files)
 */
export const getQuickIFCPreview = async (file: File): Promise<Partial<IFCPreviewData>> => {
  try {
    // Read only first 10KB for quick analysis
    const content = await readFileChunk(file, 0, 10000)
    
    return {
      fileName: file.name,
      fileSize: file.size,
      ifcVersion: extractIFCVersion(content),
      projectName: extractProjectName(content)
    }
  } catch (error) {
    console.error('Error getting quick IFC preview:', error)
    throw new Error('Failed to get IFC preview')
  }
}

/**
 * Estimates complexity based on file size and content
 */
export const estimateIFCComplexity = (previewData: IFCPreviewData): 'Simple' | 'Medium' | 'Complex' => {
  const { fileSize, buildingElements } = previewData
  const totalElements = buildingElements.totalElements
  
  // File size based estimation (in MB)
  const sizeMB = fileSize / (1024 * 1024)
  
  if (sizeMB < 10 && totalElements < 1000) {
    return 'Simple'
  } else if (sizeMB < 50 && totalElements < 10000) {
    return 'Medium'
  } else {
    return 'Complex'
  }
}

/**
 * Gets processing time estimate based on file complexity
 */
export const getProcessingTimeEstimate = (previewData: IFCPreviewData): string => {
  const complexity = estimateIFCComplexity(previewData)
  
  switch (complexity) {
    case 'Simple':
      return '1-2 minutes'
    case 'Medium':
      return '3-5 minutes'
    case 'Complex':
      return '5-10 minutes'
    default:
      return 'Unknown'
  }
}

/**
 * Formats IFC preview data for display
 */
export const formatIFCPreview = (previewData: IFCPreviewData): Record<string, string> => {
  const { buildingElements } = previewData
  
  return {
    'File Name': previewData.fileName,
    'File Size': `${(previewData.fileSize / (1024 * 1024)).toFixed(2)} MB`,
    'IFC Version': previewData.ifcVersion,
    'Project Name': previewData.projectName || 'Not specified',
    'Total Elements': buildingElements.totalElements.toLocaleString(),
    'Beams': buildingElements.beams.toLocaleString(),
    'Columns': buildingElements.columns.toLocaleString(),
    'Walls': buildingElements.walls.toLocaleString(),
    'Slabs': buildingElements.slabs.toLocaleString(),
    'Coordinate System': previewData.coordinateSystem || 'Not specified',
    'Units': previewData.units || 'Not specified',
    'Estimated Complexity': estimateIFCComplexity(previewData),
    'Processing Time': getProcessingTimeEstimate(previewData)
  }
}