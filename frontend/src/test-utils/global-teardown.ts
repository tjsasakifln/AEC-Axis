import { FullConfig } from '@playwright/test'

/**
 * Playwright Global Teardown
 * Handles cleanup after all E2E tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E Test Environment Cleanup...')

  try {
    // Cleanup test database
    console.log('🗄️ Cleaning up test database...')
    await cleanupTestDatabase()
    console.log('✅ Test database cleanup complete')

    // Remove test files and uploads
    console.log('📁 Cleaning up test files...')
    await cleanupTestFiles()
    console.log('✅ Test files cleanup complete')

    // Close any remaining connections
    console.log('🔌 Closing connections...')
    await closeConnections()
    console.log('✅ Connections closed')

    console.log('✅ E2E Test Environment Cleanup Complete')

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - we don't want cleanup failures to fail the test suite
  }
}

async function cleanupTestDatabase() {
  try {
    const response = await fetch('http://localhost:8000/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      console.warn('⚠️ Test database cleanup endpoint not available')
    }
  } catch (error) {
    console.warn('⚠️ Could not cleanup test database:', error)
  }
}

async function cleanupTestFiles() {
  try {
    const response = await fetch('http://localhost:8000/test/cleanup-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      console.warn('⚠️ Test files cleanup endpoint not available')
    }
  } catch (error) {
    console.warn('⚠️ Could not cleanup test files:', error)
  }
}

async function closeConnections() {
  // Close any persistent connections, websockets, etc.
  // This is a placeholder for any cleanup that might be needed
}

export default globalTeardown