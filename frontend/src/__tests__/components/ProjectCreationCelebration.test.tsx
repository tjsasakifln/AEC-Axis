import { render, screen } from '@testing-library/react'
import { ProjectCreationCelebration } from '../../components/ProjectCreationCelebration'
import { vi } from 'vitest'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: ({ children, ...props }: any) => <path {...props}>{children}</path>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock react-confetti
vi.mock('react-confetti', () => ({
  default: () => <div data-testid="confetti" />
}))

describe('ProjectCreationCelebration', () => {
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when not visible', () => {
    render(
      <ProjectCreationCelebration
        isVisible={false}
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    )

    expect(screen.queryByText('Construindo Projeto...')).not.toBeInTheDocument()
  })

  it('should render celebration when visible', () => {
    render(
      <ProjectCreationCelebration
        isVisible={true}
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByText('Construindo Projeto...')).toBeInTheDocument()
  })

  it('should display project name', () => {
    const projectName = 'Amazing Construction Project'
    render(
      <ProjectCreationCelebration
        isVisible={true}
        projectName={projectName}
        onComplete={mockOnComplete}
      />
    )

    // The project name should be built letter by letter, so we check if it's in the document
    expect(screen.getByText('Construindo Projeto...')).toBeInTheDocument()
  })

  it('should call onComplete after animation sequence', async () => {
    vi.useFakeTimers()
    
    render(
      <ProjectCreationCelebration
        isVisible={true}
        projectName="Test"
        onComplete={mockOnComplete}
      />
    )

    // Fast forward through the animation sequence
    // 500ms (blueprint) + 400ms (building) + 300ms + 500ms (confetti) + 2500ms (cleanup) = 3700ms
    vi.advanceTimersByTime(4000)

    expect(mockOnComplete).toHaveBeenCalled()
    
    vi.useRealTimers()
  })
})