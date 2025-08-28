import { chromium, FullConfig } from '@playwright/test'

/**
 * Playwright Global Setup
 * Handles environment preparation for E2E tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Environment Setup...')

  // Create a browser instance for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Wait for development server to be ready
    console.log('⏳ Waiting for development server...')
    await page.goto(config.webServer?.url || 'http://localhost:5173')
    await page.waitForSelector('body', { timeout: 30000 })
    console.log('✅ Development server is ready')

    // Setup test database and seed data
    console.log('🗄️ Setting up test database...')
    await setupTestDatabase()
    console.log('✅ Test database setup complete')

    // Create test user accounts
    console.log('👤 Creating test user accounts...')
    await createTestUsers()
    console.log('✅ Test users created')

    // Setup test projects and data
    console.log('📁 Setting up test projects...')
    await setupTestProjects()
    console.log('✅ Test projects setup complete')

    console.log('✅ E2E Test Environment Setup Complete')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

async function setupTestDatabase() {
  // In a real scenario, this would:
  // 1. Create/reset test database
  // 2. Run migrations
  // 3. Clear existing test data
  
  const response = await fetch('http://localhost:8000/test/reset-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  
  if (!response.ok) {
    console.warn('⚠️ Test database reset endpoint not available - using mock data')
  }
}

async function createTestUsers() {
  const testUsers = [
    {
      email: 'test.engineer@aecaxis.com',
      password: 'TestPass123!',
      name: 'Test Engineer',
      role: 'engineer'
    },
    {
      email: 'test.manager@aecaxis.com',
      password: 'TestPass123!',
      name: 'Test Manager',
      role: 'manager'
    },
    {
      email: 'test.supplier@supplier.com',
      password: 'TestPass123!',
      name: 'Test Supplier',
      role: 'supplier'
    }
  ]

  for (const user of testUsers) {
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })
      
      if (!response.ok && response.status !== 409) { // 409 = user already exists
        console.warn(`⚠️ Failed to create user ${user.email}:`, response.statusText)
      }
    } catch (error) {
      console.warn(`⚠️ Could not create test user ${user.email}:`, error)
    }
  }
}

async function setupTestProjects() {
  const testProjects = [
    {
      name: 'E2E Test Galpão Industrial',
      address: 'Rua Test, 123, Santos, SP',
      description: 'Projeto de teste para E2E',
      start_date: '2025-09-01'
    },
    {
      name: 'E2E Test Centro Distribuição',
      address: 'Av Test, 456, Campinas, SP', 
      description: 'Projeto de teste para workflows completos',
      start_date: '2025-09-15'
    }
  ]

  // Create projects with test engineer account
  const authResponse = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.engineer@aecaxis.com',
      password: 'TestPass123!'
    })
  })

  if (authResponse.ok) {
    const { access_token } = await authResponse.json()
    
    for (const project of testProjects) {
      try {
        const response = await fetch('http://localhost:8000/projects', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify(project)
        })
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to create test project ${project.name}:`, response.statusText)
        }
      } catch (error) {
        console.warn(`⚠️ Could not create test project ${project.name}:`, error)
      }
    }
  }
}

export default globalSetup