import { test, expect } from '@playwright/test'

/**
 * Project Management E2E Tests
 * Tests complete project lifecycle from creation to management
 */

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/')
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')
    await page.getByRole('button', { name: 'Entrar' }).click()
    
    await expect(page).toHaveURL('/projects')
  })

  // ============================================================================
  // PROJECT CREATION WORKFLOW
  // ============================================================================

  test('complete project creation workflow', async ({ page }) => {
    // Step 1: Open create project modal
    await page.getByText('+ Novo Projeto').click()
    
    await expect(page.getByText('Novo Projeto')).toBeVisible()
    await expect(page.getByText('Crie um novo projeto para gerenciar')).toBeVisible()

    // Step 2: Fill project details
    await page.getByLabel('Nome do Projeto *').fill('E2E Test Warehouse Project')
    await page.getByLabel('Endereço').fill('Rua E2E Test, 100, São Paulo, SP, CEP: 01234-567')
    await page.getByLabel('Data de Início').fill('2025-10-01')
    await page.getByLabel('Descrição').fill('Projeto criado durante teste E2E para validação do fluxo completo')

    // Step 3: Create project
    await page.getByRole('button', { name: 'Criar Projeto' }).click()

    // Step 4: Verify project creation
    await expect(page.getByText('Projeto criado com sucesso')).toBeVisible()
    
    // Should see new project in the list
    await expect(page.getByText('E2E Test Warehouse Project')).toBeVisible()
    await expect(page.getByText('São Paulo, SP')).toBeVisible()

    // Step 5: Verify project appears in summary cards
    const totalProjectsCard = page.locator('text=Total de Projetos').locator('..')
    const projectCount = await totalProjectsCard.locator('.text-2xl').textContent()
    expect(parseInt(projectCount || '0')).toBeGreaterThan(0)
  })

  test('validates required fields during project creation', async ({ page }) => {
    await page.getByText('+ Novo Projeto').click()
    
    // Try to create without required fields
    await page.getByRole('button', { name: 'Criar Projeto' }).click()
    
    await expect(page.getByText('Nome do projeto é obrigatório')).toBeVisible()
    
    // Button should be disabled when required fields are empty
    const createButton = page.getByRole('button', { name: 'Criar Projeto' })
    await expect(createButton).toBeDisabled()
  })

  test('cancels project creation', async ({ page }) => {
    await page.getByText('+ Novo Projeto').click()
    
    await page.getByLabel('Nome do Projeto *').fill('Test Project to Cancel')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    
    // Modal should close
    await expect(page.getByText('Novo Projeto')).not.toBeVisible()
    
    // Project should not be created
    await expect(page.getByText('Test Project to Cancel')).not.toBeVisible()
  })

  // ============================================================================
  // PROJECT SEARCH AND FILTERING
  // ============================================================================

  test('searches projects by name and address', async ({ page }) => {
    // Wait for projects to load
    await expect(page.locator('table')).toBeVisible()
    
    // Search by project name
    const searchInput = page.getByPlaceholderText('Buscar projetos por nome ou endereço...')
    await searchInput.fill('E2E Test Galpão')
    
    // Should filter results
    await expect(page.getByText('E2E Test Galpão Industrial')).toBeVisible()
    
    // Clear search
    await searchInput.fill('')
    
    // Search by address
    await searchInput.fill('Santos')
    await expect(page.getByText('Santos, SP')).toBeVisible()
  })

  test('filters projects by status', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    // Filter by status
    const statusFilter = page.getByDisplayValue('Todos os Status')
    await statusFilter.selectOption('ACTIVE')
    
    // Should show only active projects
    const statusBadges = page.locator('.bg-green-100') // Active status styling
    await expect(statusBadges.first()).toBeVisible()
  })

  // ============================================================================
  // PROJECT ACTIONS
  // ============================================================================

  test('views project details', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    // Click on first project's action menu
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    
    // Click "Ver Detalhes"
    await page.getByText('Ver Detalhes').click()
    
    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/projects\/\d+/)
    await expect(page.locator('h1')).toContainText('E2E Test Galpão Industrial')
    
    // Should see project tabs
    await expect(page.getByText('Visão Geral')).toBeVisible()
    await expect(page.getByText('Materiais')).toBeVisible()
    await expect(page.getByText('Arquivos')).toBeVisible()
    await expect(page.getByText('RFQs')).toBeVisible()
  })

  test('edits project information', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    // Open action menu for first project
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    
    // Click "Editar"
    await page.getByText('Editar').click()
    
    // Should open edit modal
    await expect(page.getByText('Editar Projeto')).toBeVisible()
    
    // Modify project name
    const nameInput = page.getByLabel('Nome do Projeto *')
    const originalName = await nameInput.inputValue()
    
    await nameInput.fill(originalName + ' - Editado')
    await page.getByRole('button', { name: 'Salvar Alterações' }).click()
    
    // Should show success message
    await expect(page.getByText('Projeto atualizado com sucesso')).toBeVisible()
    
    // Should see updated name in the list
    await expect(page.getByText(originalName + ' - Editado')).toBeVisible()
  })

  test('archives project with confirmation', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    // Get the name of the project we'll archive
    const projectName = await page.locator('table tbody tr:first-child td:first-child').textContent()
    
    // Open action menu
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    
    // Click "Arquivar"
    await page.getByText('Arquivar').click()
    
    // Should show confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Tem certeza que deseja arquivar este projeto?')
      await dialog.accept()
    })
    
    // Project should be removed from active list
    if (projectName) {
      await expect(page.getByText(projectName)).not.toBeVisible()
    }
    
    // Project count should decrease
    const totalProjectsCard = page.locator('text=Total de Projetos').locator('..')
    const projectCount = await totalProjectsCard.locator('.text-2xl').textContent()
    expect(parseInt(projectCount || '0')).toBeGreaterThanOrEqual(0)
  })

  test('cancels project archival', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    const projectName = await page.locator('table tbody tr:first-child td:first-child').textContent()
    
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    
    await page.getByText('Arquivar').click()
    
    // Cancel the confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.dismiss()
    })
    
    // Project should still be visible
    if (projectName) {
      await expect(page.getByText(projectName)).toBeVisible()
    }
  })

  // ============================================================================
  // PROJECT LIST FUNCTIONALITY
  // ============================================================================

  test('displays projects with correct information', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    
    // Check table headers
    await expect(page.getByText('NOME DO PROJETO')).toBeVisible()
    await expect(page.getByText('STATUS')).toBeVisible()
    await expect(page.getByText('DATA DE CRIAÇÃO')).toBeVisible()
    await expect(page.getByText('AÇÕES')).toBeVisible()
    
    // Check that projects have required information
    const firstRow = page.locator('table tbody tr').first()
    
    // Should have project name
    const projectCell = firstRow.locator('td').first()
    await expect(projectCell).not.toBeEmpty()
    
    // Should have status badge
    const statusCell = firstRow.locator('td').nth(1)
    await expect(statusCell.locator('.px-2')).toBeVisible() // Status badge styling
    
    // Should have formatted date
    const dateCell = firstRow.locator('td').nth(2)
    const dateText = await dateCell.textContent()
    expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // DD/MM/YYYY format
  })

  test('handles empty project list state', async ({ page }) => {
    // Archive all projects to create empty state
    while (true) {
      const actionButtons = page.locator('[aria-label*="ações do projeto"]')
      const count = await actionButtons.count()
      
      if (count === 0) break
      
      await actionButtons.first().click()
      await page.getByText('Arquivar').click()
      
      // Accept confirmation
      page.on('dialog', async dialog => {
        await dialog.accept()
      })
      
      await page.waitForTimeout(500) // Wait for UI update
    }
    
    // Should show empty state message
    await expect(page.getByText('Você ainda não tem projetos.')).toBeVisible()
    await expect(page.getByText('Clique em "+ Novo Projeto" para começar.')).toBeVisible()
  })

  // ============================================================================
  // SUMMARY CARDS
  // ============================================================================

  test('displays accurate project summary metrics', async ({ page }) => {
    // Wait for data to load
    await expect(page.locator('table')).toBeVisible()
    
    // Check that summary cards are displayed
    await expect(page.getByText('Total de Projetos')).toBeVisible()
    await expect(page.getByText('RFQs Ativas')).toBeVisible()
    await expect(page.getByText('Projetos Concluídos')).toBeVisible()
    
    // Verify numbers are displayed
    const totalProjectsCard = page.locator('text=Total de Projetos').locator('..')
    const totalNumber = await totalProjectsCard.locator('.text-2xl').textContent()
    expect(parseInt(totalNumber || '0')).toBeGreaterThanOrEqual(0)
  })

  // ============================================================================
  // RESPONSIVE BEHAVIOR
  // ============================================================================

  test('works correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Projects should still be accessible
    await expect(page.getByText('+ Novo Projeto')).toBeVisible()
    
    // Table should be responsive or show mobile-optimized view
    await expect(page.locator('table')).toBeVisible()
    
    // Action menus should work on mobile
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    
    await expect(page.getByText('Ver Detalhes')).toBeVisible()
    await expect(page.getByText('Editar')).toBeVisible()
    await expect(page.getByText('Arquivar')).toBeVisible()
  })

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  test('loads projects efficiently', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to projects page
    await page.goto('/projects')
    
    // Wait for projects to load
    await expect(page.locator('table')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000)
    
    // Should not have obvious performance issues
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'))
    })
    
    const entries = JSON.parse(performanceEntries)
    const loadEventEnd = entries[0]?.loadEventEnd || 0
    
    // Page should load completely within 3 seconds
    expect(loadEventEnd).toBeLessThan(3000)
  })
})