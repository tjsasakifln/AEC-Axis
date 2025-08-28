# PRP: IFC 3D Viewer Integration

name: "IFC 3D Viewer - Interactive BIM Visualization Component"
description: |

## Purpose
Implement a comprehensive 3D IFC viewer component using Three.js and IFC.js (web-ifc-viewer) for the project details page, enabling users to visualize, navigate, and interact with BIM models directly in the browser.

## Core Principles
1. **Context is King**: Leverage existing patterns from materials-table.tsx and project-detail.tsx
2. **Validation Loops**: Provide executable tests following existing Vitest patterns
3. **Information Dense**: Use Three.js with proper memory management
4. **Progressive Success**: Start with basic viewer, then add navigation controls
5. **Global rules**: Follow all rules in CLAUDE.md and existing React patterns

---

## Goal
Create an interactive 3D IFC file viewer component that integrates seamlessly into the existing project-detail.tsx page, allowing users to visualize BIM models with pan, zoom, and orbit controls while maintaining proper memory management and performance optimization.

## Why
- **Business value**: Provides immediate visual feedback for uploaded IFC files, enhancing user experience and validating model integrity before quotation
- **Integration with existing features**: Seamlessly fits into the current project workflow between file upload and materials extraction
- **Problems this solves**: Eliminates need for external IFC viewers, provides instant model validation, and improves user confidence in the platform

## What
An interactive 3D viewer component that loads IFC files from S3 URLs, renders them using Three.js/WebGL, and provides standard BIM navigation controls (orbit, pan, zoom) with loading states and error handling.

### Success Criteria
- [ ] IFC files load and render correctly in 3D view
- [ ] Navigation controls (zoom, pan, orbit) work smoothly
- [ ] Loading states displayed during model processing
- [ ] Memory properly disposed when component unmounts
- [ ] Component integrates seamlessly in project-detail.tsx
- [ ] Tests pass with 100% coverage for critical functionality

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://github.com/ThatOpen/web-ifc-viewer
  why: Official repository with latest API reference and examples
  
- url: https://ifcjs.github.io/info/docs/Guide/web-ifc-viewer/Tutorials/Memory/
  why: Critical memory management patterns to prevent leaks
  section: Dispose methods and cleanup procedures
  critical: "Once we call dispose(), we need to re-initialize our viewer instance"

- file: frontend/src/components/materials-table.tsx
  why: Pattern for React functional components with hooks, loading states, and error handling
  
- file: frontend/src/pages/project-detail.tsx  
  why: Integration point - where IFC viewer will be embedded, existing state management patterns
  
- file: frontend/src/services/api.ts
  why: API communication patterns for fetching IFC file URLs from backend

- url: https://drei.docs.pmnd.rs/controls/camera-controls
  why: Alternative Three.js camera controls if needed for advanced navigation

- url: https://wawasensei.dev/courses/react-three-fiber/lessons/camera-controls
  why: React Three Fiber camera control implementation examples

- file: frontend/src/__tests__/projects.test.tsx
  why: Existing test patterns using Vitest and React Testing Library to follow

- docfile: backend/app/services/ifc_service.py
  why: Shows how IFC files are stored in S3 and processed, provides S3 URL pattern
```

### Current Codebase Structure
```bash
frontend/src/
├── components/
│   ├── materials-table.tsx      # Pattern: functional component with hooks
│   ├── quote-dashboard.tsx      # Pattern: complex data visualization 
│   └── supplier-selection-modal.tsx
├── pages/
│   └── project-detail.tsx       # Integration point for IFC viewer
├── services/
│   └── api.ts                   # API communication patterns
├── __tests__/
│   └── projects.test.tsx        # Test patterns to follow
└── contexts/
    └── auth-context.tsx         # Context usage patterns

backend/app/
├── services/
│   └── ifc_service.py          # S3 storage and IFC processing
└── worker.py                   # IFC processing pipeline
```

### Desired Codebase Structure After Implementation
```bash
frontend/src/
├── components/
│   ├── ifc-viewer.tsx          # NEW: Main IFC 3D viewer component
│   └── materials-table.tsx
├── pages/
│   └── project-detail.tsx      # MODIFIED: Integrate IFC viewer
├── __tests__/
│   ├── ifc-viewer.test.tsx     # NEW: Component tests
│   └── projects.test.tsx
└── services/
    └── api.ts                  # MODIFIED: Add IFC file URL endpoint if needed
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: web-ifc-viewer memory management
// Memory MUST be disposed when component unmounts to prevent leaks
useEffect(() => {
  return () => {
    if (viewer.current) {
      viewer.current.dispose();
      viewer.current = null;
    }
  };
}, []);

// CRITICAL: WASM files must be served from public directory
// web-ifc-viewer requires WASM files to be accessible at runtime
// Place web-ifc.wasm and web-ifc-mt.wasm in public/ directory

// GOTCHA: ifcLoader expects absolute URLs or Blob URLs
// Cannot load directly from local file paths
// Must use S3 URLs or createObjectURL for local files

// GOTCHA: React strict mode calls useEffect twice
// May cause double initialization - use ref to track initialization

// CRITICAL: Three.js canvas cleanup
// Must dispose geometries, materials, textures, and renderer
// viewer.context.renderer.dispose() is essential

// GOTCHA: Web Workers for IFC.js performance
// web-ifc-viewer uses Web Workers by default for better performance
// Ensure WASM files are accessible to workers

// VERSION COMPATIBILITY
// web-ifc-viewer 1.0.218 is stable but not actively maintained
// Consider ThatOpen/engine alternative for future upgrades
```

## Implementation Blueprint

### Data Models and Structure
```typescript
// IFC Viewer Props Interface
interface IFCViewerProps {
  ifcFileUrl: string;           // S3 URL or blob URL to IFC file
  onLoadStart?: () => void;     // Loading state callback
  onLoadComplete?: () => void;  // Success callback  
  onLoadError?: (error: Error) => void; // Error callback
  height?: string;              // Container height, default "500px"
  width?: string;               // Container width, default "100%"
}

// IFC Viewer State
interface IFCViewerState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Extend existing IFCFile interface for viewer URL
interface IFCFileWithUrl extends IFCFile {
  viewerUrl?: string;  // Generated S3 URL for viewer consumption
}
```

### List of tasks to be completed in order

```yaml
Task 1: Install Dependencies and Setup
INSTALL packages:
  - npm install web-ifc-viewer three @types/three
  - Download WASM files to public directory
MODIFY frontend/package.json:
  - Add dependencies with correct versions
CREATE public/wasm/ directory:
  - Copy web-ifc.wasm and web-ifc-mt.wasm files

Task 2: Create Base IFC Viewer Component  
CREATE frontend/src/components/ifc-viewer.tsx:
  - MIRROR pattern from: materials-table.tsx (hooks, loading states)
  - IMPLEMENT basic viewer initialization
  - ADD proper TypeScript interfaces
  - INCLUDE memory management with useEffect cleanup

Task 3: Add Navigation Controls and Loading States
MODIFY frontend/src/components/ifc-viewer.tsx:
  - ADD orbit, pan, zoom controls using web-ifc-viewer API
  - IMPLEMENT loading spinner during model processing
  - ADD error handling with user-friendly messages
  - ENSURE responsive container sizing

Task 4: Integrate with Project Detail Page
MODIFY frontend/src/pages/project-detail.tsx:
  - FIND pattern: "selectedIFCFile && selectedIFCFile.status === 'COMPLETED'"
  - ADD IFC viewer component after materials table
  - IMPLEMENT conditional rendering based on file status
  - PRESERVE existing state management patterns

Task 5: Add API Support for IFC File URLs
MODIFY frontend/src/services/api.ts:
  - ADD method to generate presigned S3 URLs for IFC files
  - FOLLOW existing API patterns from ifcFilesApi
  - IMPLEMENT proper error handling and TypeScript types

Task 6: Create Comprehensive Tests
CREATE frontend/src/__tests__/ifc-viewer.test.tsx:
  - MIRROR test patterns from: projects.test.tsx
  - TEST component rendering with canvas
  - TEST loading state display
  - TEST error handling scenarios
  - TEST memory cleanup on unmount

Task 7: Performance Optimization and Memory Management
MODIFY frontend/src/components/ifc-viewer.tsx:
  - IMPLEMENT proper dispose methods for Three.js objects
  - ADD performance monitoring with size limits
  - OPTIMIZE rendering for large IFC files
  - ENSURE Web Workers utilization
```

### Per Task Pseudocode

```typescript
// Task 2: Base IFC Viewer Component
import { IfcViewerAPI } from 'web-ifc-viewer';
import React, { useRef, useEffect, useState } from 'react';

const IFCViewer: React.FC<IFCViewerProps> = ({ 
  ifcFileUrl, 
  onLoadStart, 
  onLoadComplete, 
  onLoadError,
  height = "500px",
  width = "100%" 
}) => {
  // PATTERN: Use refs for Three.js objects (see materials-table pattern)
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);
  
  // PATTERN: Loading and error states (mirror materials-table.tsx)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // CRITICAL: Initialize viewer with proper error handling
  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current) return;
      
      try {
        // PATTERN: Check initialization state to prevent double-init
        if (viewerRef.current) return;
        
        const viewer = new IfcViewerAPI({ container: containerRef.current });
        viewer.axes.setAxes();
        viewer.grid.setGrid();
        
        viewerRef.current = viewer;
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize 3D viewer');
        onLoadError?.(err as Error);
      }
    };
    
    initViewer();
    
    // CRITICAL: Memory cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);
  
  // PATTERN: File loading effect (separate from initialization)
  useEffect(() => {
    const loadIfc = async () => {
      if (!viewerRef.current || !ifcFileUrl) return;
      
      try {
        setIsLoading(true);
        onLoadStart?.();
        
        // CRITICAL: Use loadIfcUrl for remote files
        await viewerRef.current.IFC.loadIfcUrl(ifcFileUrl);
        
        setIsLoading(false);
        onLoadComplete?.();
      } catch (err) {
        setError('Failed to load IFC file');
        setIsLoading(false);
        onLoadError?.(err as Error);
      }
    };
    
    loadIfc();
  }, [ifcFileUrl, onLoadStart, onLoadComplete, onLoadError]);
  
  return (
    <div style={{ width, height, position: 'relative' }}>
      {isLoading && (
        <div style={{ /* loading spinner styles */ }}>
          Loading 3D model...
        </div>
      )}
      {error && (
        <div style={{ /* error styles */ }}>
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
```

### Integration Points
```yaml
PACKAGES:
  - add to: frontend/package.json
  - pattern: "web-ifc-viewer": "^1.0.218", "three": "^0.158.0"
  
STATIC_FILES:
  - add to: frontend/public/wasm/
  - files: web-ifc.wasm, web-ifc-mt.wasm
  - source: node_modules/web-ifc/web-ifc.wasm

COMPONENT_INTEGRATION:
  - add to: frontend/src/pages/project-detail.tsx
  - location: After MaterialsTable component
  - pattern: "selectedIFCFile && <IFCViewer ifcFileUrl={ifcFileUrl} />"

API_ENDPOINTS:
  - consider: GET /ifc-files/{id}/viewer-url for presigned S3 URLs
  - alternative: Use existing file_path from IFCFile model
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd frontend
npm run lint -- --fix        # Auto-fix ESLint issues
npx tsc --noEmit             # Type checking only
npm run build                # Ensure build succeeds

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests - Follow Existing Patterns
```typescript
// CREATE frontend/src/__tests__/ifc-viewer.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import IFCViewer from '../components/ifc-viewer'

// PATTERN: Mock external dependencies (follow projects.test.tsx pattern)
vi.mock('web-ifc-viewer', () => ({
  IfcViewerAPI: vi.fn().mockImplementation(() => ({
    axes: { setAxes: vi.fn() },
    grid: { setGrid: vi.fn() },
    IFC: { loadIfcUrl: vi.fn().mockResolvedValue({}) },
    dispose: vi.fn()
  }))
}))

describe('IFC Viewer Component', () => {
  it('should render canvas container', () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    const container = screen.getByRole('generic')
    expect(container).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    render(<IFCViewer ifcFileUrl="test-url" />)
    expect(screen.getByText('Loading 3D model...')).toBeInTheDocument()
  })

  it('should call onLoadComplete when model loads successfully', async () => {
    const mockLoadComplete = vi.fn()
    render(<IFCViewer ifcFileUrl="test-url" onLoadComplete={mockLoadComplete} />)
    
    await waitFor(() => {
      expect(mockLoadComplete).toHaveBeenCalled()
    })
  })

  it('should handle load errors gracefully', async () => {
    const mockLoadError = vi.fn()
    // Mock failure scenario
    vi.mocked(IfcViewerAPI).mockImplementationOnce(() => {
      throw new Error('Failed to initialize')
    })
    
    render(<IFCViewer ifcFileUrl="test-url" onLoadError={mockLoadError} />)
    
    await waitFor(() => {
      expect(mockLoadError).toHaveBeenCalled()
    })
  })
})
```

```bash
# Run and iterate until passing:
cd frontend
npm test ifc-viewer.test.tsx
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start the development server
cd frontend
npm run dev

# Start backend
cd backend
uvicorn app.main:app --reload

# Manual testing checklist:
# 1. Upload an IFC file to a project
# 2. Navigate to project details page
# 3. Verify 3D viewer appears when file status is COMPLETED
# 4. Test navigation controls (zoom, pan, orbit)
# 5. Check browser dev tools for memory leaks after unmounting

# Expected: IFC model loads and is navigable without console errors
```

## Final Validation Checklist
- [ ] All tests pass: `cd frontend && npm test`
- [ ] No linting errors: `cd frontend && npm run lint`
- [ ] No type errors: `cd frontend && npx tsc --noEmit`
- [ ] Build succeeds: `cd frontend && npm run build`
- [ ] IFC files load and display in 3D viewer
- [ ] Navigation controls work smoothly
- [ ] Loading states display correctly
- [ ] Error handling works for invalid files
- [ ] Memory is properly disposed on component unmount
- [ ] Integration with project-detail.tsx is seamless

---

## Anti-Patterns to Avoid
- ❌ Don't skip memory cleanup - Three.js objects MUST be disposed
- ❌ Don't load IFC files without proper loading states
- ❌ Don't ignore WASM file requirements - they must be in public/
- ❌ Don't use sync operations for large IFC file loading
- ❌ Don't reinitialize viewer on every render
- ❌ Don't forget error boundaries for WebGL context failures
- ❌ Don't hardcode viewer dimensions - make them responsive
- ❌ Don't skip TypeScript types for better development experience

## Confidence Score: 9/10

### Why High Confidence:
✅ **Comprehensive Context**: All necessary documentation URLs, existing patterns, and gotchas included
✅ **Executable Validation**: Specific test patterns and validation commands provided
✅ **Memory Management**: Critical dispose patterns and cleanup procedures documented
✅ **Integration Points**: Clear integration path with existing project-detail.tsx
✅ **Progressive Implementation**: Task breakdown allows for iterative development and testing

### Risk Mitigation:
- WASM files setup clearly documented to avoid runtime errors
- Memory management patterns prevent common Three.js leaks
- Error handling covers WebGL context failures and network issues
- Test patterns follow existing codebase conventions
- Integration preserves existing functionality and state management

### Success Probability:
Given the comprehensive context, clear validation loops, and adherence to existing patterns, this PRP provides sufficient information for successful one-pass implementation by an AI agent with Claude Code capabilities.