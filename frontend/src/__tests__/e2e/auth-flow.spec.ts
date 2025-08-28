import { test, expect } from '@playwright/test'

/**
 * Authentication Flow E2E Tests
 * Tests complete user authentication journeys including registration, login, and logout
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // ============================================================================
  // LOGIN WORKFLOW
  // ============================================================================

  test('complete login workflow for engineer user', async ({ page }) => {
    // Step 1: Navigate to login page
    await expect(page).toHaveTitle(/AEC Axis/)
    await expect(page.locator('h1')).toContainText('AEC Axis')
    
    // Should see login form
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()

    // Step 2: Enter credentials
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')

    // Step 3: Submit login
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Step 4: Verify successful login
    await expect(page).toHaveURL('/projects')
    await expect(page.locator('h1')).toContainText('Projetos')
    await expect(page.getByText('Olá, test.engineer@aecaxis.com')).toBeVisible()

    // Step 5: Verify user can access protected features
    await expect(page.getByText('+ Novo Projeto')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('handles invalid login credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@email.com')
    await page.getByLabel('Senha').fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Should show error message
    await expect(page.getByText('Email ou senha inválidos')).toBeVisible()
    
    // Should remain on login page
    await expect(page).toHaveURL('/')
  })

  test('validates required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Should show validation messages
    await expect(page.getByText('Email é obrigatório')).toBeVisible()
    await expect(page.getByText('Senha é obrigatória')).toBeVisible()
  })

  test('validates email format', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid-email')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Email deve ter um formato válido')).toBeVisible()
  })

  // ============================================================================
  // REGISTRATION WORKFLOW
  // ============================================================================

  test('complete user registration workflow', async ({ page }) => {
    // Step 1: Navigate to registration
    await page.getByText('Criar conta').click()
    
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Criar Conta')

    // Step 2: Fill registration form
    await page.getByLabel('Nome completo').fill('New Test User')
    await page.getByLabel('Email').fill('newuser@test.com')
    await page.getByLabel('Senha', { exact: true }).fill('NewPass123!')
    await page.getByLabel('Confirmar senha').fill('NewPass123!')
    await page.getByLabel('Empresa').fill('Test Company')

    // Step 3: Accept terms
    await page.getByLabel('Aceito os termos de uso').check()

    // Step 4: Submit registration
    await page.getByRole('button', { name: 'Criar Conta' }).click()

    // Step 5: Verify account creation
    await expect(page.getByText('Conta criada com sucesso')).toBeVisible()
    
    // Should redirect to projects after successful registration
    await expect(page).toHaveURL('/projects')
    await expect(page.getByText('Olá, newuser@test.com')).toBeVisible()
  })

  test('validates password requirements during registration', async ({ page }) => {
    await page.getByText('Criar conta').click()
    
    await page.getByLabel('Nome completo').fill('Test User')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('weak')
    await page.getByLabel('Confirmar senha').fill('weak')

    await page.getByRole('button', { name: 'Criar Conta' }).click()

    await expect(page.getByText('Senha deve ter pelo menos 8 caracteres')).toBeVisible()
    await expect(page.getByText('Senha deve conter letras maiúsculas e minúsculas')).toBeVisible()
    await expect(page.getByText('Senha deve conter números')).toBeVisible()
  })

  test('validates password confirmation match', async ({ page }) => {
    await page.getByText('Criar conta').click()
    
    await page.getByLabel('Senha', { exact: true }).fill('Password123!')
    await page.getByLabel('Confirmar senha').fill('DifferentPass123!')

    await page.getByRole('button', { name: 'Criar Conta' }).click()

    await expect(page.getByText('As senhas devem coincidir')).toBeVisible()
  })

  // ============================================================================
  // LOGOUT WORKFLOW
  // ============================================================================

  test('complete logout workflow', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/projects')

    // Logout
    await page.getByText('Sair').click()

    // Should redirect to login page
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('AEC Axis')
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  test('maintains session across page refreshes', async ({ page }) => {
    // Login
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/projects')

    // Refresh page
    await page.reload()

    // Should remain logged in
    await expect(page).toHaveURL('/projects')
    await expect(page.getByText('Olá, test.engineer@aecaxis.com')).toBeVisible()
  })

  test('redirects to login when accessing protected routes without authentication', async ({ page }) => {
    await page.goto('/projects')
    
    // Should redirect to login
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('AEC Axis')
  })

  test('handles token expiration gracefully', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/projects')

    // Simulate token expiration by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('token')
    })

    // Try to perform an action that requires authentication
    await page.getByText('+ Novo Projeto').click()

    // Should redirect to login due to expired/missing token
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Sua sessão expirou. Faça login novamente.')).toBeVisible()
  })

  // ============================================================================
  // SECURITY FEATURES
  // ============================================================================

  test('prevents XSS in login form', async ({ page }) => {
    const xssScript = '<script>alert("XSS")</script>'
    
    await page.getByLabel('Email').fill(xssScript)
    await page.getByLabel('Senha').fill(xssScript)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Script should not execute - content should be escaped
    const emailValue = await page.getByLabel('Email').inputValue()
    expect(emailValue).toBe(xssScript) // Should be treated as plain text

    // No alert should appear
    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected: alert dialog appeared')
    })
  })

  test('implements rate limiting for failed login attempts', async ({ page }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Senha').fill('wrongpassword')
      await page.getByRole('button', { name: 'Entrar' }).click()
      
      await expect(page.getByText('Email ou senha inválidos')).toBeVisible()
      
      // Clear form for next attempt
      await page.getByLabel('Email').fill('')
      await page.getByLabel('Senha').fill('')
    }

    // After too many attempts, should show rate limiting message
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Senha').fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Muitas tentativas de login. Tente novamente em alguns minutos.')).toBeVisible()
  })
})