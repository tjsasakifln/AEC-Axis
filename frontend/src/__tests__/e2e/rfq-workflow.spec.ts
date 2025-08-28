import { test, expect } from '@playwright/test'

/**
 * Complete RFQ Workflow E2E Tests
 * Tests the full RFQ journey from creation to supplier response and quote selection
 */

test.describe('RFQ Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a project with materials
    await page.goto('/')
    await page.getByLabel('Email').fill('test.engineer@aecaxis.com')
    await page.getByLabel('Senha').fill('TestPass123!')
    await page.getByRole('button', { name: 'Entrar' }).click()
    
    await expect(page).toHaveURL('/projects')
    
    // Navigate to first project
    const firstActionButton = page.locator('[aria-label*="ações do projeto"]').first()
    await firstActionButton.click()
    await page.getByText('Ver Detalhes').click()
    
    await expect(page).toHaveURL(/\/projects\/\d+/)
  })

  // ============================================================================
  // COMPLETE RFQ CREATION WORKFLOW
  // ============================================================================

  test('complete RFQ creation workflow from materials to supplier notification', async ({ page }) => {
    // Step 1: Navigate to Materials tab
    await page.getByText('Materiais').click()
    
    await expect(page.getByText('Lista de Materiais')).toBeVisible()
    
    // Step 2: Select materials for RFQ
    const material1Checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]')
    const material2Checkbox = page.locator('table tbody tr:nth-child(2) input[type="checkbox"]')
    
    await material1Checkbox.check()
    await material2Checkbox.check()
    
    // Verify selection counter
    await expect(page.getByText('2 materiais selecionados')).toBeVisible()
    
    // Step 3: Initiate RFQ creation
    const createRFQButton = page.getByText('Criar RFQ')
    await expect(createRFQButton).toBeEnabled()
    await createRFQButton.click()
    
    // Step 4: Configure RFQ details
    await expect(page.getByText('Nova Solicitação de Cotação')).toBeVisible()
    
    // Set basic RFQ information
    const titleInput = page.getByLabel('Título da RFQ')
    await titleInput.fill('Cotação Estrutura Metálica - E2E Test')
    
    const descriptionInput = page.getByLabel('Descrição/Observações')
    await descriptionInput.fill('Solicitação de cotação para estrutura metálica do galpão industrial. Prazo de entrega: 30 dias.')
    
    const deadlineInput = page.getByLabel('Prazo de Resposta')
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15)
    await deadlineInput.fill(futureDate.toISOString().split('T')[0])
    
    // Step 5: Select suppliers
    await expect(page.getByText('Fornecedores Disponíveis')).toBeVisible()
    
    const supplier1Checkbox = page.getByLabelText('Selecionar Steel Corp')
    const supplier2Checkbox = page.getByLabelText('Selecionar Metal Works')
    const supplier3Checkbox = page.getByLabelText('Selecionar Iron Solutions')
    
    await supplier1Checkbox.check()
    await supplier2Checkbox.check()
    await supplier3Checkbox.check()
    
    // Verify supplier selection
    await expect(page.getByText('3 fornecedores selecionados')).toBeVisible()
    
    // Step 6: Review materials and specifications
    await expect(page.getByText('Materiais Incluídos')).toBeVisible()
    
    // Should show selected materials with quantities
    const materialsList = page.locator('[data-testid="rfq-materials-list"]')
    await expect(materialsList).toBeVisible()
    
    const materialItems = materialsList.locator('.material-item')
    const materialCount = await materialItems.count()
    expect(materialCount).toBe(2)
    
    // Step 7: Add technical specifications
    const specsTextarea = page.getByLabel('Especificações Técnicas')
    await specsTextarea.fill(`
    - Aço estrutural conforme NBR 8800
    - Solda com eletrodo E7018
    - Tratamento anticorrosivo: primer + tinta poliuretânica
    - Certificados de qualidade obrigatórios
    - Laudos dimensionais para elementos críticos
    `)
    
    // Step 8: Set delivery requirements
    const deliveryLocationInput = page.getByLabel('Local de Entrega')
    await deliveryLocationInput.fill('Rua Industrial, 123 - Santos/SP - CEP: 11070-100')
    
    const deliveryDateInput = page.getByLabel('Data Limite de Entrega')
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + 45)
    await deliveryDateInput.fill(deliveryDate.toISOString().split('T')[0])
    
    // Step 9: Configure quote requirements
    const validityPeriodSelect = page.getByLabel('Período de Validade da Cotação')
    await validityPeriodSelect.selectOption('30') // 30 days
    
    const currencySelect = page.getByLabel('Moeda')
    await currencySelect.selectOption('BRL')
    
    const includeShippingCheckbox = page.getByLabel('Incluir custos de frete')
    await includeShippingCheckbox.check()
    
    const includeInstallationCheckbox = page.getByLabel('Incluir custos de instalação')
    await includeInstallationCheckbox.check()
    
    // Step 10: Review and send RFQ
    const reviewSection = page.getByText('Revisão Final')
    await reviewSection.scrollIntoViewIfNeeded()
    
    // Should show summary
    await expect(page.getByText('Materiais: 2 itens')).toBeVisible()
    await expect(page.getByText('Fornecedores: 3 empresas')).toBeVisible()
    await expect(page.getByText('Prazo de resposta:')).toBeVisible()
    
    // Send RFQ
    const sendButton = page.getByText('Enviar RFQ')
    await expect(sendButton).toBeEnabled()
    await sendButton.click()
    
    // Step 11: Verify sending process
    await expect(page.getByText('Enviando RFQ...')).toBeVisible()
    await expect(page.locator('.progress-indicator')).toBeVisible()
    
    // Step 12: Confirm successful delivery
    await expect(page.getByText('RFQ enviada com sucesso!')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Notificações enviadas para 3 fornecedores')).toBeVisible()
    
    // Step 13: Verify RFQ appears in project dashboard
    await page.getByText('RFQs').click()
    
    await expect(page.getByText('Cotação Estrutura Metálica - E2E Test')).toBeVisible()
    await expect(page.getByText('Enviada')).toBeVisible()
    await expect(page.getByText('3 fornecedores')).toBeVisible()
  })

  // ============================================================================
  // SUPPLIER RESPONSE SIMULATION
  // ============================================================================

  test('handles supplier responses and quote comparison', async ({ page }) => {
    // First create an RFQ (simplified)
    await page.getByText('Materiais').click()
    
    const material1Checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]')
    await material1Checkbox.check()
    
    await page.getByText('Criar RFQ').click()
    
    await page.getByLabel('Título da RFQ').fill('Quick RFQ for Testing')
    const supplierCheckbox = page.getByLabelText('Selecionar Steel Corp')
    await supplierCheckbox.check()
    
    await page.getByText('Enviar RFQ').click()
    await expect(page.getByText('RFQ enviada com sucesso!')).toBeVisible({ timeout: 10000 })
    
    // Navigate to RFQs
    await page.getByText('RFQs').click()
    
    // Open the RFQ dashboard
    const rfqRow = page.locator('table tbody tr:first-child')
    const viewButton = rfqRow.getByText('Ver Cotações')
    await viewButton.click()
    
    // Should open quote dashboard
    await expect(page.getByText('Dashboard de Cotações')).toBeVisible()
    await expect(page.getByText('Quick RFQ for Testing')).toBeVisible()
    
    // Simulate supplier response arrival (via WebSocket in real app)
    // For E2E testing, we'll simulate the UI state after response arrives
    
    // Wait for quote responses (simulated)
    await page.waitForTimeout(2000)
    
    // Should show received quotes
    await expect(page.getByText('Cotações Recebidas')).toBeVisible()
    
    // Verify quote comparison matrix
    const comparisonTable = page.locator('[data-testid="quote-comparison-table"]')
    await expect(comparisonTable).toBeVisible()
    
    // Should show supplier columns
    await expect(page.getByText('Steel Corp')).toBeVisible()
    
    // Should show material rows with prices
    await expect(page.locator('.material-row')).toHaveCount(1)
    
    // Test quote selection
    const selectQuoteButton = page.getByText('Selecionar Cotação')
    await selectQuoteButton.click()
    
    // Confirmation modal
    await expect(page.getByText('Confirmar Seleção')).toBeVisible()
    await page.getByText('Sim, Selecionar').click()
    
    // Success notification
    await expect(page.getByText('Cotação selecionada com sucesso')).toBeVisible()
  })

  // ============================================================================
  // RFQ MANAGEMENT AND TRACKING
  // ============================================================================

  test('manages RFQ lifecycle and tracking', async ({ page }) => {
    // Navigate to RFQs tab
    await page.getByText('RFQs').click()
    
    await expect(page.getByText('Solicitações de Cotação')).toBeVisible()
    
    // Should show RFQ list with status
    const rfqTable = page.locator('[data-testid="rfq-table"]')
    await expect(rfqTable).toBeVisible()
    
    // Test RFQ status filtering
    const statusFilter = page.getByLabel('Filtrar por status')
    await statusFilter.selectOption('SENT')
    
    // Should filter results
    await expect(page.locator('.rfq-row')).toHaveCount(1)
    
    // Reset filter
    await statusFilter.selectOption('ALL')
    
    // Test RFQ actions
    const firstRFQRow = page.locator('.rfq-row').first()
    const actionsButton = firstRFQRow.getByLabelText('Ações da RFQ')
    await actionsButton.click()
    
    // Should show action menu
    await expect(page.getByText('Ver Detalhes')).toBeVisible()
    await expect(page.getByText('Editar')).toBeVisible()
    await expect(page.getByText('Duplicar')).toBeVisible()
    await expect(page.getByText('Cancelar')).toBeVisible()
    
    // Test RFQ editing
    await page.getByText('Editar').click()
    
    await expect(page.getByText('Editar RFQ')).toBeVisible()
    
    // Modify deadline
    const newDeadlineInput = page.getByLabel('Prazo de Resposta')
    const newDeadline = new Date()
    newDeadline.setDate(newDeadline.getDate() + 20)
    await newDeadlineInput.fill(newDeadline.toISOString().split('T')[0])
    
    // Save changes
    await page.getByText('Salvar Alterações').click()
    await expect(page.getByText('RFQ atualizada com sucesso')).toBeVisible()
    
    // Test RFQ duplication
    await actionsButton.click()
    await page.getByText('Duplicar').click()
    
    await expect(page.getByText('Duplicar RFQ')).toBeVisible()
    await page.getByLabel('Novo título').fill('RFQ Duplicada - Teste E2E')
    await page.getByText('Criar Duplicata').click()
    
    await expect(page.getByText('RFQ duplicada com sucesso')).toBeVisible()
  })

  // ============================================================================
  // COMMUNICATION AND NOTIFICATIONS
  // ============================================================================

  test('handles communication with suppliers', async ({ page }) => {
    await page.getByText('RFQs').click()
    
    // Open RFQ dashboard
    const firstRFQRow = page.locator('.rfq-row').first()
    await firstRFQRow.getByText('Ver Cotações').click()
    
    await expect(page.getByText('Dashboard de Cotações')).toBeVisible()
    
    // Test supplier communication
    const communicationTab = page.getByText('Comunicação')
    await communicationTab.click()
    
    await expect(page.getByText('Histórico de Comunicação')).toBeVisible()
    
    // Send message to suppliers
    const messageInput = page.getByLabel('Nova mensagem')
    await messageInput.fill('Prezados fornecedores, gostaríamos de esclarecer que o prazo de entrega é flexível. Aguardamos suas cotações.')
    
    const sendMessageButton = page.getByText('Enviar Mensagem')
    await sendMessageButton.click()
    
    await expect(page.getByText('Mensagem enviada para todos os fornecedores')).toBeVisible()
    
    // Should appear in communication history
    await expect(page.getByText('Prezados fornecedores, gostaríamos de esclarecer')).toBeVisible()
    
    // Test individual supplier communication
    const supplierTabs = page.locator('.supplier-tab')
    await supplierTabs.first().click()
    
    const individualMessageInput = page.getByLabel('Mensagem para Steel Corp')
    await individualMessageInput.fill('Poderiam confirmar a disponibilidade do material H200x100?')
    
    await page.getByText('Enviar').click()
    await expect(page.getByText('Mensagem enviada para Steel Corp')).toBeVisible()
  })

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  test('generates RFQ reports and analytics', async ({ page }) => {
    await page.getByText('RFQs').click()
    
    // Test RFQ analytics
    const analyticsButton = page.getByText('Analytics')
    await analyticsButton.click()
    
    await expect(page.getByText('Análise de RFQs')).toBeVisible()
    
    // Should show metrics
    await expect(page.getByText('RFQs Enviadas')).toBeVisible()
    await expect(page.getByText('Taxa de Resposta')).toBeVisible()
    await expect(page.getByText('Tempo Médio de Resposta')).toBeVisible()
    
    // Test report generation
    const generateReportButton = page.getByText('Gerar Relatório')
    await generateReportButton.click()
    
    await expect(page.getByText('Opções de Relatório')).toBeVisible()
    
    // Select report type
    const reportTypeSelect = page.getByLabel('Tipo de Relatório')
    await reportTypeSelect.selectOption('comprehensive')
    
    // Select date range
    const startDateInput = page.getByLabel('Data Inicial')
    const endDateInput = page.getByLabel('Data Final')
    
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    await startDateInput.fill(startDate.toISOString().split('T')[0])
    
    const endDate = new Date()
    await endDateInput.fill(endDate.toISOString().split('T')[0])
    
    // Generate report
    const createReportButton = page.getByText('Criar Relatório')
    await createReportButton.click()
    
    await expect(page.getByText('Gerando relatório...')).toBeVisible()
    
    // Wait for report generation
    await expect(page.getByText('Relatório gerado com sucesso')).toBeVisible({ timeout: 15000 })
    
    // Should provide download link
    const downloadButton = page.getByText('Baixar Relatório')
    await expect(downloadButton).toBeVisible()
    
    // Test download
    const downloadPromise = page.waitForEvent('download')
    await downloadButton.click()
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/rfq.*report.*\.pdf/)
  })

  // ============================================================================
  // ERROR HANDLING AND EDGE CASES
  // ============================================================================

  test('handles RFQ errors and edge cases', async ({ page }) => {
    await page.getByText('Materiais').click()
    
    // Try to create RFQ without selecting materials
    const createRFQButton = page.getByText('Criar RFQ')
    await expect(createRFQButton).toBeDisabled()
    
    // Select material and proceed
    const materialCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]')
    await materialCheckbox.check()
    
    await createRFQButton.click()
    
    // Try to send without required fields
    const sendButton = page.getByText('Enviar RFQ')
    await expect(sendButton).toBeDisabled()
    
    // Fill minimum required fields
    await page.getByLabel('Título da RFQ').fill('Test RFQ')
    
    // Still disabled without suppliers
    await expect(sendButton).toBeDisabled()
    
    // Select supplier
    const supplierCheckbox = page.getByLabelText('Selecionar Steel Corp')
    await supplierCheckbox.check()
    
    // Now should be enabled
    await expect(sendButton).toBeEnabled()
    
    // Test deadline validation
    const deadlineInput = page.getByLabel('Prazo de Resposta')
    
    // Try past date
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    await deadlineInput.fill(pastDate.toISOString().split('T')[0])
    
    await expect(page.getByText('O prazo deve ser uma data futura')).toBeVisible()
    await expect(sendButton).toBeDisabled()
    
    // Fix date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    await deadlineInput.fill(futureDate.toISOString().split('T')[0])
    
    // Should be valid now
    await expect(sendButton).toBeEnabled()
  })
})