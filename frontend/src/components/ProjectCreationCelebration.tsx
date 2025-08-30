import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'

interface ProjectCreationCelebrationProps {
  isVisible: boolean
  projectName: string
  onComplete: () => void
}

export function ProjectCreationCelebration({ 
  isVisible, 
  projectName, 
  onComplete 
}: ProjectCreationCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showStamp, setShowStamp] = useState(false)
  const [showBlueprint, setShowBlueprint] = useState(false)
  const [currentLetter, setCurrentLetter] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    // Animation sequence
    const sequence = async () => {
      // 1. Show blueprint background
      setShowBlueprint(true)
      
      // 2. Start crane building animation after 500ms
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 3. Build project name letter by letter
      for (let i = 0; i <= projectName.length; i++) {
        setCurrentLetter(i)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // 4. Show confetti after name is built
      await new Promise(resolve => setTimeout(resolve, 300))
      setShowConfetti(true)
      
      // 5. Show stamp effect
      await new Promise(resolve => setTimeout(resolve, 500))
      setShowStamp(true)
      
      // 6. Clean up and close after 2.5 seconds
      await new Promise(resolve => setTimeout(resolve, 2500))
      onComplete()
    }

    sequence()
  }, [isVisible, projectName, onComplete])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            colors={['#f97316', '#eab308', '#3b82f6', '#fff', '#f3f4f6']}
            confettiSource={{
              x: 0,
              y: 0,
              w: window.innerWidth,
              h: window.innerHeight / 4
            }}
            gravity={0.3}
          />
        )}

        <motion.div
          initial={{ scale: 0.8, rotateY: -10 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0.8, rotateY: 10 }}
          className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4 overflow-hidden"
          style={{
            background: showBlueprint 
              ? 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'
              : 'white',
            color: showBlueprint ? 'white' : '#374151'
          }}
        >
          {/* Blueprint grid pattern */}
          {showBlueprint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Construction crane icon */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ 
              x: showBlueprint ? 0 : -50, 
              opacity: showBlueprint ? 1 : 0,
              rotate: showBlueprint ? [0, -5, 5, 0] : 0
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-4 left-4"
          >
            <CraneIcon />
          </motion.div>

          <div className="text-center relative z-10">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <motion.h2 
                className="text-2xl font-bold mb-2"
                animate={{ color: showBlueprint ? '#ffffff' : '#374151' }}
              >
                Construindo Projeto...
              </motion.h2>
              
              {/* Project name being "built" */}
              <div className="relative">
                <motion.div
                  className="text-lg font-semibold mb-4 font-mono tracking-wider"
                  style={{ 
                    minHeight: '2rem',
                    color: showBlueprint ? '#fbbf24' : '#6b7280'
                  }}
                >
                  {projectName.substring(0, currentLetter)}
                  {currentLetter < projectName.length && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="border-r-2 border-current ml-1"
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Construction progress indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: showBlueprint ? `${(currentLetter / projectName.length) * 100}%` : 0 
              }}
              transition={{ duration: 0.3 }}
              className="h-1 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full mb-6 mx-auto"
              style={{ maxWidth: '200px' }}
            />

            {/* Project Approved Stamp */}
            <AnimatePresence>
              {showStamp && (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ 
                    scale: [0, 1.2, 1], 
                    rotate: [-45, -10, 0],
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    duration: 0.8
                  }}
                  className="relative"
                >
                  <div 
                    className="inline-block px-6 py-3 border-4 border-red-500 text-red-500 font-bold text-xl transform rotate-6"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderStyle: 'dashed',
                      fontFamily: 'monospace',
                      letterSpacing: '2px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    PROJETO APROVADO
                  </div>
                  
                  {/* Stamp impact effect */}
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 border-4 border-red-400 rounded-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Blueprint roll-up animation overlay */}
          <AnimatePresence>
            {showStamp && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                transition={{ delay: 2, duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 bg-blue-900"
                style={{ 
                  transformOrigin: 'top',
                  background: 'linear-gradient(to bottom, #1e3a8a, transparent)'
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Construction crane SVG icon component
function CraneIcon() {
  return (
    <motion.svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="currentColor"
      animate={{
        rotate: [0, 2, -2, 0],
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.path
        d="M8 28h16M12 28V8M20 28V12M4 8h24M12 8l8-4M20 12l-8 4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.circle
        cx="20"
        cy="8"
        r="2"
        fill="currentColor"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.svg>
  )
}