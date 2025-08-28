import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Complete IFC Workflow E2E Tests
 * Tests the full journey from IFC file upload to 3D visualization and material extraction
 */

test.describe('IFC Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a project
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
  // COMPLETE IFC UPLOAD TO VISUALIZATION WORKFLOW
  // ============================================================================

  test('complete IFC workflow from upload to 3D visualization', async ({ page }) => {
    // Step 1: Navigate to Files tab
    await page.getByText('Arquivos').click()
    
    await expect(page.getByText('Arquivos do Projeto')).toBeVisible()
    
    // Step 2: Upload IFC file
    const fileInput = page.locator('input[type="file"]')
    
    // Create a mock IFC file for testing
    const testFilePath = path.join(__dirname, '../../test-fixtures/sample.ifc')
    await fileInput.setInputFiles(testFilePath)
    
    // Step 3: Verify upload progress
    await expect(page.getByText('Enviando arquivo...')).toBeVisible()
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    
    // Step 4: Wait for upload completion
    await expect(page.getByText('Upload concluído')).toBeVisible({ timeout: 10000 })
    
    // Step 5: Wait for processing
    await expect(page.getByText('Processando arquivo...')).toBeVisible()
    
    // Step 6: Wait for processing completion
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    // Step 7: Verify 3D viewer appears
    const ifcViewer = page.locator('[data-testid="ifc-viewer"]')
    await expect(ifcViewer).toBeVisible()
    
    // Step 8: Verify viewer controls
    await expect(page.getByLabelText('Zoom in')).toBeVisible()
    await expect(page.getByLabelText('Zoom out')).toBeVisible()
    await expect(page.getByLabelText('Reset view')).toBeVisible()
    await expect(page.getByLabelText('Toggle wireframe')).toBeVisible()
    
    // Step 9: Test viewer interactions
    await page.getByLabelText('Zoom in').click()
    await page.waitForTimeout(500)
    
    await page.getByLabelText('Reset view').click()
    await page.waitForTimeout(500)
    
    // Step 10: Verify material extraction
    await page.getByText('Materiais').click()
    
    // Should see extracted materials from IFC
    await expect(page.getByText('Materiais extraídos do arquivo IFC')).toBeVisible()
    
    // Should have material entries
    const materialRows = page.locator('table tbody tr')
    const materialCount = await materialRows.count()
    expect(materialCount).toBeGreaterThan(0)
    
    // Step 11: Verify material properties
    const firstMaterial = materialRows.first()
    
    // Should have material name
    const materialName = await firstMaterial.locator('td').first().textContent()
    expect(materialName).toBeTruthy()
    
    // Should have quantity
    const quantityCell = firstMaterial.locator('td').nth(1)
    const quantity = await quantityCell.textContent()
    expect(quantity).toMatch(/\d+/)
    
    // Should have unit
    const unitCell = firstMaterial.locator('td').nth(2)
    const unit = await unitCell.textContent()
    expect(unit).toBeTruthy()
  })

  // ============================================================================
  // FILE VALIDATION AND ERROR HANDLING
  // ============================================================================

  test('validates file type and size', async ({ page }) => {
    await page.getByText('Arquivos').click()
    
    // Test with invalid file type
    const fileInput = page.locator('input[type="file"]')
    const invalidFilePath = path.join(__dirname, '../../test-fixtures/invalid.txt')
    
    await fileInput.setInputFiles(invalidFilePath)
    
    await expect(page.getByText('Formato de arquivo não suportado')).toBeVisible()
    await expect(page.getByText('Apenas arquivos IFC são aceitos')).toBeVisible()
  })

  test('handles large file uploads', async ({ page }) => {
    await page.getByText('Arquivos').click()
    
    // Simulate large file (this would be a very large IFC file in reality)
    const fileInput = page.locator('input[type="file"]')
    const largeFilePath = path.join(__dirname, '../../test-fixtures/large-sample.ifc')
    
    await fileInput.setInputFiles(largeFilePath)
    
    // Should show progress for large files
    await expect(page.getByText('Enviando arquivo...')).toBeVisible()
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    
    // Should handle large file processing
    await expect(page.getByText('Processando arquivo grande... Isso pode levar alguns minutos.')).toBeVisible()
  })

  test('handles corrupted IFC files gracefully', async ({ page }) => {
    await page.getByText('Arquivos').click()
    
    const fileInput = page.locator('input[type="file"]')
    const corruptedFilePath = path.join(__dirname, '../../test-fixtures/corrupted.ifc')
    
    await fileInput.setInputFiles(corruptedFilePath)
    
    await expect(page.getByText('Upload concluído')).toBeVisible()
    
    // Should detect corruption during processing
    await expect(page.getByText('Erro no processamento')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Arquivo IFC corrompido ou inválido')).toBeVisible()
    
    // Should offer options to try again
    await expect(page.getByText('Tentar novamente')).toBeVisible()
    await expect(page.getByText('Escolher outro arquivo')).toBeVisible()
  })

  // ============================================================================
  // 3D VIEWER FUNCTIONALITY
  // ============================================================================

  test('3D viewer controls and interactions', async ({ page }) => {
    // First upload and process a file
    await page.getByText('Arquivos').click()
    
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../../test-fixtures/sample.ifc')
    await fileInput.setInputFiles(testFilePath)
    
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    const ifcViewer = page.locator('[data-testid="ifc-viewer"]')
    await expect(ifcViewer).toBeVisible()
    
    // Test zoom controls
    await page.getByLabelText('Zoom in').click({ clickCount: 3 })
    await page.waitForTimeout(1000)
    
    await page.getByLabelText('Zoom out').click({ clickCount: 2 })
    await page.waitForTimeout(1000)
    
    // Test view reset
    await page.getByLabelText('Reset view').click()
    await page.waitForTimeout(1000)
    
    // Test wireframe toggle
    await page.getByLabelText('Toggle wireframe').click()
    await page.waitForTimeout(500)
    
    // Verify wireframe mode is active
    await expect(page.getByText('Modo aramado ativo')).toBeVisible()
    
    // Toggle back to solid mode
    await page.getByLabelText('Toggle wireframe').click()
    await expect(page.getByText('Modo sólido ativo')).toBeVisible()
    
    // Test view modes
    const viewModeSelect = page.locator('select[aria-label="Modo de visualização"]')
    await viewModeSelect.selectOption('top')
    await page.waitForTimeout(500)
    
    await viewModeSelect.selectOption('side')
    await page.waitForTimeout(500)
    
    await viewModeSelect.selectOption('perspective')
    await page.waitForTimeout(500)
  })

  test('3D model selection and highlighting', async ({ page }) => {
    // Upload and process file
    await page.getByText('Arquivos').click()
    
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../../test-fixtures/sample.ifc')
    await fileInput.setInputFiles(testFilePath)
    
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    const ifcViewer = page.locator('[data-testid="ifc-viewer"]')
    await expect(ifcViewer).toBeVisible()
    
    // Click on a model element (simulated click on canvas)
    await ifcViewer.click({ position: { x: 200, y: 200 } })
    
    // Should show selection info panel
    await expect(page.getByText('Elemento Selecionado')).toBeVisible()
    
    // Should display element properties
    await expect(page.getByText('Propriedades')).toBeVisible()
    await expect(page.getByText('Material:')).toBeVisible()
    await expect(page.getByText('Dimensões:')).toBeVisible()
    
    // Test element highlighting by material type
    const highlightButton = page.getByText('Destacar Materiais Similares')
    await highlightButton.click()
    
    // Should highlight similar elements
    await expect(page.getByText('Elementos destacados')).toBeVisible()
    
    // Clear selection
    await page.getByText('Limpar Seleção').click()
    await expect(page.getByText('Elemento Selecionado')).not.toBeVisible()
  })

  // ============================================================================
  // MATERIAL EXTRACTION AND MANAGEMENT
  // ============================================================================

  test('material extraction and editing workflow', async ({ page }) => {
    // Upload and process file
    await page.getByText('Arquivos').click()
    
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../../test-fixtures/sample.ifc')
    await fileInput.setInputFiles(testFilePath)
    
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    // Navigate to materials
    await page.getByText('Materiais').click()
    
    await expect(page.getByText('Materiais extraídos do arquivo IFC')).toBeVisible()
    
    // Test material editing
    const firstMaterialRow = page.locator('table tbody tr').first()
    const editButton = firstMaterialRow.getByLabelText('Editar material')
    await editButton.click()
    
    // Should open inline editing
    const nameInput = firstMaterialRow.getByLabelText('Nome do material')
    await expect(nameInput).toBeVisible()
    
    // Edit material properties
    await nameInput.fill('Viga de Aço Estrutural H200x100 - Editado')
    
    const quantityInput = firstMaterialRow.getByLabelText('Quantidade')
    await quantityInput.fill('25')
    
    const unitSelect = firstMaterialRow.getByLabelText('Unidade')
    await unitSelect.selectOption('pcs')
    
    // Save changes
    const saveButton = firstMaterialRow.getByLabelText('Salvar alterações')
    await saveButton.click()
    
    // Verify changes
    await expect(page.getByText('Viga de Aço Estrutural H200x100 - Editado')).toBeVisible()
    await expect(page.getByText('25')).toBeVisible()
    
    // Test material cost estimation
    const costInput = firstMaterialRow.getByLabelText('Custo estimado')
    await costInput.fill('1250.00')
    await saveButton.click()
    
    // Should calculate total cost
    await expect(page.getByText('Total: R$ 31.250,00')).toBeVisible()
  })

  test('bulk material operations', async ({ page }) => {
    // Upload and process file
    await page.getByText('Arquivos').click()
    
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(__dirname, '../../test-fixtures/sample.ifc')
    await fileInput.setInputFiles(testFilePath)
    
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    await page.getByText('Materiais').click()
    
    // Test bulk selection
    const selectAllCheckbox = page.getByLabelText('Selecionar todos os materiais')
    await selectAllCheckbox.check()
    
    // All material checkboxes should be checked
    const materialCheckboxes = page.locator('table tbody tr input[type="checkbox"]')
    const checkboxCount = await materialCheckboxes.count()
    
    for (let i = 0; i < checkboxCount; i++) {
      await expect(materialCheckboxes.nth(i)).toBeChecked()
    }
    
    // Test bulk actions
    await expect(page.getByText('Ações em Lote')).toBeVisible()
    await expect(page.getByText('Exportar Selecionados')).toBeVisible()
    await expect(page.getByText('Criar RFQ')).toBeVisible()
    
    // Test bulk export
    await page.getByText('Exportar Selecionados').click()
    
    await expect(page.getByText('Opções de Exportação')).toBeVisible()
    
    const excelOption = page.getByLabelText('Excel (.xlsx)')
    await excelOption.check()
    
    await page.getByText('Exportar').click()
    
    // Should initiate download
    const downloadPromise = page.waitForEvent('download')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/materiais.*\.xlsx/)
  })

  // ============================================================================
  // MULTIPLE FILE MANAGEMENT
  // ============================================================================

  test('manages multiple IFC files in same project', async ({ page }) => {
    await page.getByText('Arquivos').click()
    
    // Upload first file
    const fileInput = page.locator('input[type="file"]')
    const file1Path = path.join(__dirname, '../../test-fixtures/building1.ifc')
    await fileInput.setInputFiles(file1Path)
    
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    // Upload second file
    const file2Path = path.join(__dirname, '../../test-fixtures/building2.ifc')
    await fileInput.setInputFiles(file2Path)
    
    await expect(page.getByText('Upload concluído')).toBeVisible()
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 30000 })
    
    // Should see both files listed
    await expect(page.getByText('building1.ifc')).toBeVisible()
    await expect(page.getByText('building2.ifc')).toBeVisible()
    
    // Test file switching in 3D viewer
    const file1Button = page.getByText('Visualizar building1.ifc')
    await file1Button.click()
    
    await expect(page.getByText('Carregando building1.ifc...')).toBeVisible()
    await expect(page.locator('[data-testid="ifc-viewer"]')).toBeVisible()
    
    const file2Button = page.getByText('Visualizar building2.ifc')
    await file2Button.click()
    
    await expect(page.getByText('Carregando building2.ifc...')).toBeVisible()
    
    // Test combined view
    const combineButton = page.getByText('Visualização Combinada')
    await combineButton.click()
    
    await expect(page.getByText('Carregando visualização combinada...')).toBeVisible()
    await expect(page.getByText('Arquivos combinados: 2')).toBeVisible()
  })

  // ============================================================================
  // PERFORMANCE AND OPTIMIZATION
  // ============================================================================

  test('handles large IFC files with performance optimization', async ({ page }) => {
    await page.getByText('Arquivos').click()
    
    // Upload large file
    const fileInput = page.locator('input[type="file"]')
    const largeFilePath = path.join(__dirname, '../../test-fixtures/large-building.ifc')
    await fileInput.setInputFiles(largeFilePath)
    
    await expect(page.getByText('Upload concluído')).toBeVisible()
    
    // Should show performance optimization options
    await expect(page.getByText('Arquivo grande detectado')).toBeVisible()
    await expect(page.getByText('Aplicar otimizações de performance?')).toBeVisible()
    
    // Accept optimization
    await page.getByText('Sim, Otimizar').click()
    
    // Should show optimization progress
    await expect(page.getByText('Otimizando modelo...')).toBeVisible()
    await expect(page.getByText('Reduzindo geometria...')).toBeVisible()
    
    // Wait for processing
    await expect(page.getByText('Arquivo processado com sucesso')).toBeVisible({ timeout: 60000 })
    
    // Viewer should load with LOD (Level of Detail) controls
    const ifcViewer = page.locator('[data-testid="ifc-viewer"]')
    await expect(ifcViewer).toBeVisible()
    
    await expect(page.getByText('Nível de Detalhe')).toBeVisible()
    
    const lodSlider = page.locator('input[aria-label="Nível de detalhe"]')
    await expect(lodSlider).toBeVisible()
    
    // Test LOD adjustment
    await lodSlider.fill('0.5')
    await page.waitForTimeout(1000)
    
    await expect(page.getByText('Modelo simplificado para melhor performance')).toBeVisible()
  })
})