import { useRef, useEffect, useState } from 'react'
import { IfcViewerAPI } from 'web-ifc-viewer'
import * as THREE from 'three'
import './ifc-viewer.css'

interface IFCViewerProps {
  ifcFileUrl: string
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onLoadError?: (error: Error) => void
  height?: string
  width?: string
}

function IFCViewer({ 
  ifcFileUrl, 
  onLoadStart, 
  onLoadComplete, 
  onLoadError,
  height = "500px",
  width = "100%" 
}: IFCViewerProps) {
  // Pattern: Use refs for Three.js objects (following materials-table pattern)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<IfcViewerAPI | null>(null)
  const isInitializedRef = useRef<boolean>(false)
  
  // Pattern: Loading and error states (mirror materials-table.tsx)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Critical: Initialize viewer with proper error handling
  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current || isInitializedRef.current) return
      
      try {
        // Pattern: Check initialization state to prevent double-init
        if (viewerRef.current) return
        
        // Set WASM path for web-ifc-viewer
        const viewer = new IfcViewerAPI({ 
          container: containerRef.current,
          backgroundColor: new THREE.Color(0xffffff)
        })
        
        // Initialize basic viewer setup
        await viewer.IFC.setWasmPath('/wasm/')
        viewer.axes.setAxes()
        viewer.grid.setGrid()
        
        viewerRef.current = viewer
        isInitializedRef.current = true
        setIsInitialized(true)
        setError(null)
        
      } catch (err) {
        const errorMessage = 'Failed to initialize 3D viewer'
        setError(errorMessage)
        onLoadError?.(err as Error)
        console.error('IFC Viewer initialization error:', err)
      }
    }
    
    initViewer()
    
    // Critical: Memory cleanup
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose()
          viewerRef.current = null
          isInitializedRef.current = false
        } catch (err) {
          console.error('Error disposing IFC viewer:', err)
        }
      }
    }
  }, [onLoadError])
  
  // Pattern: File loading effect (separate from initialization)
  useEffect(() => {
    const loadIfc = async () => {
      if (!viewerRef.current || !ifcFileUrl || !isInitialized) return
      
      try {
        setIsLoading(true)
        setError(null)
        onLoadStart?.()
        
        // Critical: Use loadIfcUrl for remote files
        const model = await viewerRef.current.IFC.loadIfcUrl(ifcFileUrl)
        
        // Fit model to viewport for better UX
        if (model && viewerRef.current.context) {
          await viewerRef.current.context.fitToFrame()
        }
        
        setIsLoading(false)
        onLoadComplete?.()
        
      } catch (err) {
        const errorMessage = 'Failed to load IFC file. Please check the file format and try again.'
        setError(errorMessage)
        setIsLoading(false)
        onLoadError?.(err as Error)
        console.error('IFC file loading error:', err)
      }
    }
    
    if (isInitialized) {
      loadIfc()
    }
  }, [ifcFileUrl, isInitialized, onLoadStart, onLoadComplete, onLoadError])

  return (
    <div data-testid="ifc-viewer-container" style={{ width, height, position: 'relative', border: '1px solid #ddd', borderRadius: '4px' }}>
      {isLoading && (
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 10,
          flexDirection: 'column'
        }}>
          <div 
            className="loading-spinner"
            style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              marginBottom: '10px'
            }}
          ></div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            Loading 3D model...
          </div>
        </div>
      )}
      {error && (
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(248, 215, 218, 0.9)',
          color: '#721c24',
          zIndex: 10,
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <strong>Error: </strong>
            {error}
          </div>
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }} 
      />
    </div>
  )
}

export default IFCViewer