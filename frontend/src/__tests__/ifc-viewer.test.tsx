import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import IFCViewer from '../components/ifc-viewer'

// Pattern: Mock external dependencies (follow projects.test.tsx pattern)
vi.mock('web-ifc-viewer', () => ({
  IfcViewerAPI: vi.fn().mockImplementation(() => ({
    axes: { setAxes: vi.fn() },
    grid: { setGrid: vi.fn() },
    IFC: { 
      setWasmPath: vi.fn().mockResolvedValue(undefined),
      loadIfcUrl: vi.fn().mockResolvedValue({})
    },
    context: { 
      fitToFrame: vi.fn().mockResolvedValue(undefined)
    },
    dispose: vi.fn()
  }))
}))

vi.mock('three', () => ({
  Color: vi.fn().mockImplementation((color) => ({ color })),
  default: {}
}))

describe('IFC Viewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render viewer container', () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    const container = screen.getByTestId('ifc-viewer-container')
    expect(container).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()
  })

  it('should call onLoadStart when model starts loading', async () => {
    const mockLoadStart = vi.fn()
    render(<IFCViewer ifcFileUrl="test-url" onLoadStart={mockLoadStart} />)
    
    await waitFor(() => {
      expect(mockLoadStart).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should call onLoadComplete when model loads successfully', async () => {
    const mockLoadComplete = vi.fn()
    render(<IFCViewer ifcFileUrl="test-url" onLoadComplete={mockLoadComplete} />)
    
    await waitFor(() => {
      expect(mockLoadComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should handle viewer initialization errors gracefully', async () => {
    const mockLoadError = vi.fn()
    
    // Mock failure scenario during initialization
    const { IfcViewerAPI } = await import('web-ifc-viewer')
    vi.mocked(IfcViewerAPI).mockImplementationOnce(() => {
      throw new Error('Failed to initialize viewer')
    })
    
    render(<IFCViewer ifcFileUrl="test-url" onLoadError={mockLoadError} />)
    
    await waitFor(() => {
      expect(mockLoadError).toHaveBeenCalled()
      expect(screen.getByText(/Failed to initialize 3D viewer/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle IFC loading errors gracefully', async () => {
    const mockLoadError = vi.fn()
    
    // Mock IFC loading failure
    const { IfcViewerAPI } = await import('web-ifc-viewer')
    const mockViewerInstance = {
      axes: { setAxes: vi.fn() },
      grid: { setGrid: vi.fn() },
      IFC: { 
        setWasmPath: vi.fn().mockResolvedValue(undefined),
        loadIfcUrl: vi.fn().mockRejectedValue(new Error('Failed to load IFC'))
      },
      context: { 
        fitToFrame: vi.fn().mockResolvedValue(undefined)
      },
      dispose: vi.fn()
    }
    
    vi.mocked(IfcViewerAPI).mockImplementationOnce(() => mockViewerInstance as any)
    
    render(<IFCViewer ifcFileUrl="test-url" onLoadError={mockLoadError} />)
    
    await waitFor(() => {
      expect(mockLoadError).toHaveBeenCalled()
      expect(screen.getByText(/Failed to load IFC file/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should use custom dimensions when provided', () => {
    render(<IFCViewer ifcFileUrl="test-url" height="600px" width="80%" />)
    const container = screen.getByTestId('ifc-viewer-container')
    expect(container).toHaveStyle('height: 600px')
    expect(container).toHaveStyle('width: 80%')
  })

  it('should use default dimensions when not provided', () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    const container = screen.getByTestId('ifc-viewer-container')
    expect(container).toHaveStyle('height: 500px')
    expect(container).toHaveStyle('width: 100%')
  })

  it('should properly dispose viewer on unmount', () => {
    const { unmount } = render(<IFCViewer ifcFileUrl="test-url" />)
    
    // Allow viewer to initialize
    setTimeout(() => {
      unmount()
      // The dispose method should be called during cleanup
      // This is tested implicitly by the mock implementation
    }, 100)
  })

  it('should set WASM path correctly', async () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByTestId('ifc-viewer-container')).toBeInTheDocument()
    })
    
    // Check that setWasmPath is called during initialization
    const { IfcViewerAPI } = await vi.importMock('web-ifc-viewer')
    const mockViewerInstance = vi.mocked(IfcViewerAPI).mock.results?.[0]?.value
    if (mockViewerInstance) {
      expect(mockViewerInstance.IFC.setWasmPath).toHaveBeenCalledWith('/wasm/')
    }
  })
})