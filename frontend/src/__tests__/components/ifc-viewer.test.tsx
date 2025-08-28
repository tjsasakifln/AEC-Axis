import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@test-utils/render-helpers'
import { mockWebGLContext } from '@test-utils/setup'
import IFCViewer from '../../components/ifc-viewer'

// ============================================================================
// IFC VIEWER COMPREHENSIVE TEST SUITE
// Target: 95% coverage (relaxed due to Three.js complexity as per PRP)
// Tests 3D viewer initialization, WebGL integration, and file loading
// ============================================================================

// Mock web-ifc-viewer since it's a complex external library
const mockIfcViewerAPI = {
  IFC: {
    setWasmPath: vi.fn().mockResolvedValue(undefined),
    loadIfcUrl: vi.fn().mockResolvedValue({}),
  },
  axes: {
    setAxes: vi.fn(),
  },
  grid: {
    setGrid: vi.fn(),
  },
  context: {
    fitToFrame: vi.fn().mockResolvedValue(undefined),
  },
  dispose: vi.fn(),
}

vi.mock('web-ifc-viewer', () => ({
  IfcViewerAPI: vi.fn().mockImplementation(() => mockIfcViewerAPI),
}))

// Mock Three.js - already handled in setup.ts but ensure it's available
vi.mock('three', () => ({
  Color: vi.fn().mockImplementation((color) => ({ color })),
  // Add other Three.js mocks as needed
}))

describe('IFCViewer', () => {
  const mockOnLoadStart = vi.fn()
  const mockOnLoadComplete = vi.fn()
  const mockOnLoadError = vi.fn()

  const defaultProps = {
    ifcFileUrl: 'https://example.com/test-file.ifc',
    onLoadStart: mockOnLoadStart,
    onLoadComplete: mockOnLoadComplete,
    onLoadError: mockOnLoadError,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock implementation for each test
    mockIfcViewerAPI.IFC.loadIfcUrl.mockReset().mockResolvedValue({})
    mockIfcViewerAPI.IFC.setWasmPath.mockReset().mockResolvedValue(undefined)
  })

  // ============================================================================
  // RENDERING AND INITIALIZATION TESTS
  // ============================================================================

  it('renders viewer container with correct dimensions', () => {
    renderWithProviders(
      <IFCViewer 
        {...defaultProps} 
        height="600px" 
        width="100%" 
      />
    )

    const container = screen.getByRole('generic').parentElement
    expect(container).toHaveStyle({
      width: '100%',
      height: '600px',
      position: 'relative',
    })
  })

  it('uses default dimensions when none provided', () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    const container = screen.getByRole('generic').parentElement
    expect(container).toHaveStyle({
      width: '100%',
      height: '500px',
    })
  })

  it('displays loading spinner during initialization', async () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()
    
    // Loading spinner should be visible
    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toBeInTheDocument()
  })

  it('initializes IFC viewer with correct configuration', async () => {
    const { IfcViewerAPI } = await import('web-ifc-viewer')
    
    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(IfcViewerAPI).toHaveBeenCalledWith({
        container: expect.any(Element),
        backgroundColor: expect.any(Object),
      })
    })

    expect(mockIfcViewerAPI.IFC.setWasmPath).toHaveBeenCalledWith('/wasm/')
    expect(mockIfcViewerAPI.axes.setAxes).toHaveBeenCalled()
    expect(mockIfcViewerAPI.grid.setGrid).toHaveBeenCalled()
  })

  // ============================================================================
  // FILE LOADING TESTS
  // ============================================================================

  it('loads IFC file successfully and calls completion callback', async () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    // Wait for initialization to complete
    await waitFor(() => {
      expect(mockOnLoadStart).toHaveBeenCalled()
    }, { timeout: 5000 })

    // Wait for file loading to complete
    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledWith(defaultProps.ifcFileUrl)
    })

    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })

    expect(mockIfcViewerAPI.context.fitToFrame).toHaveBeenCalled()
  })

  it('handles file loading without fitting to frame when model is null', async () => {
    mockIfcViewerAPI.IFC.loadIfcUrl.mockResolvedValue(null)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledWith(defaultProps.ifcFileUrl)
    })

    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })

    expect(mockIfcViewerAPI.context.fitToFrame).not.toHaveBeenCalled()
  })

  it('reloads file when ifcFileUrl prop changes', async () => {
    const { rerender } = renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledWith(defaultProps.ifcFileUrl)
    })

    // Change the file URL
    const newUrl = 'https://example.com/different-file.ifc'
    rerender(<IFCViewer {...defaultProps} ifcFileUrl={newUrl} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledWith(newUrl)
    })
  })

  it('does not reload file if URL has not changed', async () => {
    const { rerender } = renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledTimes(1)
    })

    // Rerender with same URL
    rerender(<IFCViewer {...defaultProps} />)

    // Should not call loadIfcUrl again
    expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledTimes(1)
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('handles viewer initialization errors', async () => {
    const { IfcViewerAPI } = await import('web-ifc-viewer')
    
    // Mock IfcViewerAPI constructor to throw error
    const initError = new Error('Failed to initialize WebGL context')
    vi.mocked(IfcViewerAPI).mockImplementationOnce(() => {
      throw initError
    })

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockOnLoadError).toHaveBeenCalledWith(initError)
    })

    expect(screen.getByText('Error: Failed to initialize 3D viewer')).toBeInTheDocument()
  })

  it('handles WASM path setting errors', async () => {
    const wasmError = new Error('Failed to load WASM files')
    mockIfcViewerAPI.IFC.setWasmPath.mockRejectedValue(wasmError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockOnLoadError).toHaveBeenCalledWith(wasmError)
    })

    expect(screen.getByText('Error: Failed to initialize 3D viewer')).toBeInTheDocument()
  })

  it('handles file loading errors', async () => {
    const fileError = new Error('Failed to load IFC file')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(fileError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockOnLoadError).toHaveBeenCalledWith(fileError)
    })

    expect(screen.getByText('Error: Failed to load IFC file. Please check the file format and try again.')).toBeInTheDocument()
  })

  it('handles frame fitting errors gracefully', async () => {
    const frameError = new Error('Failed to fit frame')
    mockIfcViewerAPI.context.fitToFrame.mockRejectedValue(frameError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalled()
    })

    // Should still call onLoadComplete despite frame fitting error
    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('shows loading state during file loading', async () => {
    // Make loadIfcUrl take some time
    let resolveLoad: (value: any) => void
    mockIfcViewerAPI.IFC.loadIfcUrl.mockImplementation(
      () => new Promise(resolve => { resolveLoad = resolve })
    )

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockOnLoadStart).toHaveBeenCalled()
    })

    // Should show loading state
    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()

    // Resolve the loading
    resolveLoad!({})

    await waitFor(() => {
      expect(screen.queryByText('Loading 3D model...')).not.toBeInTheDocument()
    })
  })

  it('hides loading state after successful load', async () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    // Initially shows loading
    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })

    // Should hide loading after completion
    expect(screen.queryByText('Loading 3D model...')).not.toBeInTheDocument()
  })

  it('shows error state and hides loading after error', async () => {
    const fileError = new Error('Load failed')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(fileError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Loading 3D model...')).not.toBeInTheDocument()
  })

  // ============================================================================
  // MEMORY MANAGEMENT TESTS
  // ============================================================================

  it('properly disposes of viewer on unmount', async () => {
    const { unmount } = renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalled()
    })

    unmount()

    expect(mockIfcViewerAPI.dispose).toHaveBeenCalled()
  })

  it('handles disposal errors gracefully', async () => {
    const disposeError = new Error('Disposal failed')
    mockIfcViewerAPI.dispose.mockImplementation(() => {
      throw disposeError
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalled()
    })

    unmount()

    expect(consoleSpy).toHaveBeenCalledWith('Error disposing IFC viewer:', disposeError)
    
    consoleSpy.mockRestore()
  })

  it('prevents double initialization', async () => {
    const { rerender } = renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.setWasmPath).toHaveBeenCalledTimes(1)
    })

    // Rerender should not reinitialize
    rerender(<IFCViewer {...defaultProps} />)

    // Should still have been called only once
    expect(mockIfcViewerAPI.IFC.setWasmPath).toHaveBeenCalledTimes(1)
  })

  // ============================================================================
  // CALLBACK BEHAVIOR TESTS
  // ============================================================================

  it('works without onLoadStart callback', async () => {
    renderWithProviders(
      <IFCViewer 
        ifcFileUrl={defaultProps.ifcFileUrl}
        onLoadComplete={mockOnLoadComplete}
        onLoadError={mockOnLoadError}
      />
    )

    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })

    // Should not crash without onLoadStart
    expect(mockOnLoadComplete).toHaveBeenCalled()
  })

  it('works without onLoadComplete callback', async () => {
    renderWithProviders(
      <IFCViewer 
        ifcFileUrl={defaultProps.ifcFileUrl}
        onLoadStart={mockOnLoadStart}
        onLoadError={mockOnLoadError}
      />
    )

    await waitFor(() => {
      expect(mockOnLoadStart).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalled()
    })

    // Should not crash without onLoadComplete
    expect(mockOnLoadStart).toHaveBeenCalled()
  })

  it('works without onLoadError callback', async () => {
    const fileError = new Error('Load failed')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(fileError)

    renderWithProviders(
      <IFCViewer 
        ifcFileUrl={defaultProps.ifcFileUrl}
        onLoadStart={mockOnLoadStart}
        onLoadComplete={mockOnLoadComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })

    // Should not crash without onLoadError
    expect(screen.getByText(/Failed to load IFC file/)).toBeInTheDocument()
  })

  it('works with all callbacks undefined', async () => {
    renderWithProviders(
      <IFCViewer ifcFileUrl={defaultProps.ifcFileUrl} />
    )

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalled()
    })

    // Should work without any callbacks
    expect(screen.queryByText('Loading 3D model...')).not.toBeInTheDocument()
  })

  // ============================================================================
  // VISUAL STATE TESTS
  // ============================================================================

  it('applies correct opacity during loading', async () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    const viewerContainer = document.querySelector('[style*="opacity"]')
    expect(viewerContainer).toHaveStyle({ opacity: '0.3' })

    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalled()
    })

    expect(viewerContainer).toHaveStyle({ opacity: '1' })
  })

  it('shows both loading spinner and viewer container', () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()
    
    const viewerDiv = document.querySelector('[style*="opacity"]')
    expect(viewerDiv).toBeInTheDocument()
  })

  it('error overlay covers the entire viewer area', async () => {
    const fileError = new Error('Load failed')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(fileError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })

    const errorOverlay = screen.getByText(/Error:/).parentElement
    expect(errorOverlay).toHaveStyle({
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '10',
    })
  })

  // ============================================================================
  // WEBGL INTEGRATION TESTS
  // ============================================================================

  it('initializes with WebGL context from global mocks', () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    // WebGL context should be available from our global mocks
    expect(global.WebGLRenderingContext).toBeDefined()
    expect(mockWebGLContext).toBeDefined()
  })

  it('handles missing WebGL context gracefully', async () => {
    // Temporarily remove WebGL context
    const originalWebGL = global.WebGLRenderingContext
    global.WebGLRenderingContext = undefined as any

    const initError = new Error('WebGL not supported')
    const { IfcViewerAPI } = await import('web-ifc-viewer')
    vi.mocked(IfcViewerAPI).mockImplementationOnce(() => {
      throw initError
    })

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(mockOnLoadError).toHaveBeenCalledWith(initError)
    })

    // Restore WebGL context
    global.WebGLRenderingContext = originalWebGL
  })

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  it('handles empty ifcFileUrl gracefully', async () => {
    renderWithProviders(<IFCViewer {...defaultProps} ifcFileUrl="" />)

    // Should initialize viewer but not load file
    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.setWasmPath).toHaveBeenCalled()
    })

    // Should not attempt to load empty URL
    expect(mockIfcViewerAPI.IFC.loadIfcUrl).not.toHaveBeenCalled()
  })

  it('handles very long file URLs', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.ifc'
    
    renderWithProviders(<IFCViewer {...defaultProps} ifcFileUrl={longUrl} />)

    await waitFor(() => {
      expect(mockIfcViewerAPI.IFC.loadIfcUrl).toHaveBeenCalledWith(longUrl)
    })
  })

  it('handles invalid file URLs', async () => {
    const invalidUrl = 'not-a-valid-url'
    const urlError = new Error('Invalid URL')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(urlError)

    renderWithProviders(<IFCViewer {...defaultProps} ifcFileUrl={invalidUrl} />)

    await waitFor(() => {
      expect(mockOnLoadError).toHaveBeenCalledWith(urlError)
    })
  })

  it('handles concurrent file loads correctly', async () => {
    let loadCount = 0
    mockIfcViewerAPI.IFC.loadIfcUrl.mockImplementation(() => {
      loadCount++
      return Promise.resolve({})
    })

    const { rerender } = renderWithProviders(<IFCViewer {...defaultProps} />)

    // Quickly change URLs
    rerender(<IFCViewer {...defaultProps} ifcFileUrl="https://example.com/file2.ifc" />)
    rerender(<IFCViewer {...defaultProps} ifcFileUrl="https://example.com/file3.ifc" />)

    await waitFor(() => {
      expect(loadCount).toBeGreaterThan(0)
    })

    // Should handle multiple loads gracefully
    expect(mockOnLoadError).not.toHaveBeenCalled()
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it('provides appropriate container structure for screen readers', () => {
    renderWithProviders(<IFCViewer {...defaultProps} />)

    const container = screen.getByRole('generic')
    expect(container).toBeInTheDocument()
  })

  it('provides meaningful error messages', async () => {
    const fileError = new Error('Network connection failed')
    mockIfcViewerAPI.IFC.loadIfcUrl.mockRejectedValue(fileError)

    renderWithProviders(<IFCViewer {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load IFC file. Please check the file format and try again.')).toBeInTheDocument()
    })
  })
})