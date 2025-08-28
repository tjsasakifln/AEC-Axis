// ============================================================================
// MOCK DATA FACTORY FOR CONSISTENT TEST DATA
// Based on PRP requirements and actual API interfaces
// ============================================================================

import {
  Project,
  CreateProjectRequest,
  IFCFile,
  Material,
  UpdateMaterialRequest,
  Supplier,
  CreateRFQRequest,
  QuoteDetails,
  QuoteSubmissionRequest,
  QuoteItemSubmission,
  QuoteDashboardData,
  DashboardMaterial,
  DashboardQuoteItem,
  SupplierInfo,
  ProjectInfo,
  MaterialInfo,
  RFQ
} from '../services/api'

// ============================================================================
// PROJECT DATA FACTORIES
// ============================================================================

export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: `project-${Date.now()}`,
  name: 'Galpão Industrial Santos',
  address: 'Rua Industrial, 123, Santos, SP, CEP: 11070-100',
  start_date: '2025-08-01',
  created_at: '2025-08-01T10:00:00Z',
  status: 'ACTIVE',
  ...overrides
})

export const createMockProjectList = (count: number = 3): Project[] => {
  const baseProjects = [
    {
      name: 'Galpão Industrial Santos',
      address: 'Rua Industrial, 123, Santos, SP',
    },
    {
      name: 'Armazém Logístico Campinas',
      address: 'Av. das Indústrias, 456, Campinas, SP',
    },
    {
      name: 'Centro de Distribuição Guarulhos',
      address: 'Estrada do Aeroporto, 789, Guarulhos, SP',
    }
  ]

  return Array.from({ length: count }, (_, index) => 
    createMockProject({
      id: `project-${index + 1}`,
      name: baseProjects[index % baseProjects.length].name,
      address: baseProjects[index % baseProjects.length].address,
      created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
    })
  )
}

export const createMockCreateProjectRequest = (
  overrides: Partial<CreateProjectRequest> = {}
): CreateProjectRequest => ({
  name: 'Novo Projeto de Teste',
  address: 'Endereço de Teste, 123',
  start_date: '2025-09-01',
  ...overrides
})

// ============================================================================
// IFC FILE DATA FACTORIES
// ============================================================================

export const createMockIFCFile = (overrides: Partial<IFCFile> = {}): IFCFile => ({
  id: `ifc-${Date.now()}`,
  filename: 'warehouse-sample.ifc',
  file_size: 1024000, // 1MB
  upload_date: '2025-08-28T14:00:00Z',
  status: 'COMPLETED',
  s3_key: 'projects/project-1/ifc-files/warehouse-sample.ifc',
  ...overrides
})

export const createMockIFCFileList = (
  projectId: string = 'project-1',
  count: number = 2
): IFCFile[] => {
  const statuses: IFCFile['status'][] = ['COMPLETED', 'PROCESSING', 'PENDING', 'ERROR']
  const filenames = [
    'warehouse-main-structure.ifc',
    'warehouse-mep-systems.ifc',
    'warehouse-architectural.ifc',
    'warehouse-structural.ifc'
  ]

  return Array.from({ length: count }, (_, index) =>
    createMockIFCFile({
      id: `ifc-${projectId}-${index + 1}`,
      filename: filenames[index % filenames.length],
      status: statuses[index % statuses.length],
      file_size: 500000 + (index * 250000), // Varying file sizes
      upload_date: new Date(Date.now() - (index * 2 * 60 * 60 * 1000)).toISOString(), // 2h apart
    })
  )
}

// ============================================================================
// MATERIAL DATA FACTORIES
// ============================================================================

export const createMockMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: `material-${Date.now()}`,
  description: 'Viga de Aço IPE 300',
  quantity: 24,
  unit: 'un',
  ifc_file_id: 'ifc-1',
  created_at: '2025-08-28T14:30:00Z',
  ...overrides
})

export const createMockMaterialList = (
  ifcFileId: string = 'ifc-1',
  count: number = 5
): Material[] => {
  const materialTemplates = [
    { description: 'Viga de Aço IPE 300', quantity: 24, unit: 'un' },
    { description: 'Telha Metálica Trapezoidal', quantity: 850, unit: 'm²' },
    { description: 'Pilar de Concreto 30x30cm', quantity: 12, unit: 'un' },
    { description: 'Chapa de Aço Galvanizado 2mm', quantity: 320, unit: 'm²' },
    { description: 'Parafuso Estrutural M16x50mm', quantity: 144, unit: 'un' },
    { description: 'Solda Eletrodo E7018 3.2mm', quantity: 25, unit: 'kg' },
    { description: 'Concreto Usinado FCK 25MPa', quantity: 45, unit: 'm³' },
  ]

  return Array.from({ length: count }, (_, index) => {
    const template = materialTemplates[index % materialTemplates.length]
    return createMockMaterial({
      id: `material-${ifcFileId}-${index + 1}`,
      ifc_file_id: ifcFileId,
      description: template.description,
      quantity: template.quantity,
      unit: template.unit,
      created_at: new Date(Date.now() - (index * 30 * 60 * 1000)).toISOString(), // 30min apart
    })
  })
}

export const createMockUpdateMaterialRequest = (
  overrides: Partial<UpdateMaterialRequest> = {}
): UpdateMaterialRequest => ({
  description: 'Viga de Aço IPE 350 (Atualizada)',
  quantity: 30,
  unit: 'un',
  ...overrides
})

// ============================================================================
// SUPPLIER DATA FACTORIES
// ============================================================================

export const createMockSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: `supplier-${Date.now()}`,
  name: 'Metalúrgica Industrial LTDA',
  email: 'vendas@metalurgica.com.br',
  phone: '(11) 3456-7890',
  address: 'Rua da Indústria, 100, São Paulo, SP',
  created_at: '2025-08-01T09:00:00Z',
  ...overrides
})

export const createMockSupplierList = (count: number = 4): Supplier[] => {
  const supplierTemplates = [
    {
      name: 'Metalúrgica Industrial LTDA',
      email: 'vendas@metalurgica.com.br',
      phone: '(11) 3456-7890',
    },
    {
      name: 'Estruturas e Soldas São Paulo',
      email: 'contato@estruturas-sp.com.br', 
      phone: '(11) 2234-5678',
    },
    {
      name: 'Fornecedor de Aço Premium',
      email: 'premium@aco-premium.com.br',
      phone: '(11) 9876-5432',
    },
    {
      name: 'Telhas e Coberturas Industriais',
      email: 'info@telhas-industriais.com.br',
      phone: '(11) 5555-4444',
    }
  ]

  return Array.from({ length: count }, (_, index) => {
    const template = supplierTemplates[index % supplierTemplates.length]
    return createMockSupplier({
      id: `supplier-${index + 1}`,
      name: template.name,
      email: template.email,
      phone: template.phone,
      address: `Rua ${template.name}, ${100 + (index * 50)}, São Paulo, SP`,
      created_at: new Date(Date.now() - (index * 7 * 24 * 60 * 60 * 1000)).toISOString(), // 1 week apart
    })
  })
}

// ============================================================================
// RFQ DATA FACTORIES
// ============================================================================

export const createMockRFQ = (overrides: Partial<RFQ> = {}): RFQ => ({
  id: `rfq-${Date.now()}`,
  status: 'OPEN',
  project_id: 'project-1',
  created_at: '2025-08-28T15:00:00Z',
  ...overrides
})

export const createMockRFQList = (projectId: string = 'project-1', count: number = 3): RFQ[] => {
  const statuses = ['OPEN', 'CLOSED', 'DRAFT']
  
  return Array.from({ length: count }, (_, index) =>
    createMockRFQ({
      id: `rfq-${projectId}-${index + 1}`,
      project_id: projectId,
      status: statuses[index % statuses.length],
      created_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(), // 1 day apart
    })
  )
}

export const createMockCreateRFQRequest = (
  overrides: Partial<CreateRFQRequest> = {}
): CreateRFQRequest => ({
  project_id: 'project-1',
  material_ids: ['material-1', 'material-2', 'material-3'],
  supplier_ids: ['supplier-1', 'supplier-2'],
  ...overrides
})

// ============================================================================
// QUOTE DATA FACTORIES
// ============================================================================

export const createMockQuoteItemSubmission = (
  overrides: Partial<QuoteItemSubmission> = {}
): QuoteItemSubmission => ({
  rfq_item_id: 'rfq-item-1',
  price: 1500.00,
  lead_time_days: 15,
  ...overrides
})

export const createMockQuoteSubmissionRequest = (
  itemCount: number = 3,
  overrides: Partial<QuoteSubmissionRequest> = {}
): QuoteSubmissionRequest => ({
  items: Array.from({ length: itemCount }, (_, index) =>
    createMockQuoteItemSubmission({
      rfq_item_id: `rfq-item-${index + 1}`,
      price: 1000 + (index * 500),
      lead_time_days: 10 + (index * 5),
    })
  ),
  ...overrides
})

export const createMockSupplierInfo = (overrides: Partial<SupplierInfo> = {}): SupplierInfo => ({
  id: 'supplier-1',
  name: 'Metalúrgica Industrial LTDA',
  email: 'vendas@metalurgica.com.br',
  cnpj: '12.345.678/0001-90',
  ...overrides
})

export const createMockDashboardQuoteItem = (
  overrides: Partial<DashboardQuoteItem> = {}
): DashboardQuoteItem => ({
  price: 1500.00,
  lead_time_days: 15,
  submitted_at: '2025-08-28T16:00:00Z',
  supplier: createMockSupplierInfo(),
  ...overrides
})

export const createMockDashboardMaterial = (
  overrides: Partial<DashboardMaterial> = {}
): DashboardMaterial => ({
  id: 'material-1',
  rfq_item_id: 'rfq-item-1',
  description: 'Viga de Aço IPE 300',
  quantity: 24,
  unit: 'un',
  quotes: [
    createMockDashboardQuoteItem({
      supplier: createMockSupplierInfo({ id: 'supplier-1', name: 'Metalúrgica A' }),
      price: 1500.00,
    }),
    createMockDashboardQuoteItem({
      supplier: createMockSupplierInfo({ id: 'supplier-2', name: 'Metalúrgica B' }),
      price: 1400.00, // Lower price for testing "best price" highlighting
    }),
  ],
  ...overrides
})

export const createMockQuoteDashboardData = (
  overrides: Partial<QuoteDashboardData> = {}
): QuoteDashboardData => ({
  rfq_id: 'rfq-1',
  project: {
    id: 'project-1',
    name: 'Galpão Industrial Santos',
    address: 'Rua Industrial, 123, Santos, SP',
  },
  materials: [
    createMockDashboardMaterial({
      id: 'material-1',
      description: 'Viga de Aço IPE 300',
    }),
    createMockDashboardMaterial({
      id: 'material-2',
      description: 'Telha Metálica Trapezoidal',
      quantity: 850,
      unit: 'm²',
      quotes: [
        createMockDashboardQuoteItem({
          supplier: createMockSupplierInfo({ id: 'supplier-1', name: 'Telhas Premium' }),
          price: 25.50,
        }),
      ],
    }),
  ],
  ...overrides
})

// ============================================================================
// WEBSOCKET MESSAGE FACTORIES
// ============================================================================

export const createMockWebSocketMessage = (type: string, data: any = {}) => ({
  type,
  ...data,
  timestamp: new Date().toISOString(),
})

export const createMockIFCStatusUpdate = (ifcFileId: string, status: IFCFile['status']) =>
  createMockWebSocketMessage('ifc_status_update', {
    ifc_file_id: ifcFileId,
    status,
  })

export const createMockQuoteReceived = (rfqId: string, supplierId: string, price: number) =>
  createMockWebSocketMessage('quote_received', {
    rfq_id: rfqId,
    supplier_id: supplierId,
    price,
  })

// ============================================================================
// FILE UPLOAD MOCKS
// ============================================================================

export const createMockFile = (
  filename: string = 'test-warehouse.ifc',
  content: string = 'mock ifc file content',
  type: string = 'application/x-step'
): File => {
  return new File([content], filename, { type })
}

export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) {
        yield files[i]
      }
    },
  }

  // Add indexed properties
  files.forEach((file, index) => {
    ;(fileList as any)[index] = file
  })

  return fileList as FileList
}

// ============================================================================
// ERROR RESPONSE FACTORIES
// ============================================================================

export const createMockErrorResponse = (
  status: number = 500,
  message: string = 'Internal Server Error',
  details?: any
) => ({
  response: {
    status,
    data: {
      detail: message,
      ...details,
    },
  },
})

export const createMockValidationError = (field: string, message: string) =>
  createMockErrorResponse(422, 'Validation Error', {
    validation_errors: [{ field, message }],
  })

// ============================================================================
// CONVENIENCE FUNCTIONS FOR TESTING SCENARIOS
// ============================================================================

/**
 * Create a complete project scenario with IFC files, materials, and RFQs
 */
export const createMockProjectScenario = (projectId: string = 'project-1') => {
  const project = createMockProject({ id: projectId })
  const ifcFiles = createMockIFCFileList(projectId, 2)
  const materials = createMockMaterialList(ifcFiles[0].id, 5)
  const suppliers = createMockSupplierList(3)
  const rfqs = createMockRFQList(projectId, 2)

  return {
    project,
    ifcFiles,
    materials,
    suppliers,
    rfqs,
  }
}

/**
 * Create a complete quote dashboard scenario
 */
export const createMockQuoteDashboardScenario = (rfqId: string = 'rfq-1') => {
  const dashboardData = createMockQuoteDashboardData({ rfq_id: rfqId })
  
  return {
    dashboardData,
    wsMessages: [
      createMockQuoteReceived(rfqId, 'supplier-1', 1450.00),
      createMockQuoteReceived(rfqId, 'supplier-2', 1600.00),
    ],
  }
}

// ============================================================================
// EXPORT ALL FACTORIES
// ============================================================================

export default {
  // Projects
  createMockProject,
  createMockProjectList,
  createMockCreateProjectRequest,
  
  // IFC Files  
  createMockIFCFile,
  createMockIFCFileList,
  
  // Materials
  createMockMaterial,
  createMockMaterialList,
  createMockUpdateMaterialRequest,
  
  // Suppliers
  createMockSupplier,
  createMockSupplierList,
  
  // RFQs and Quotes
  createMockRFQ,
  createMockRFQList,
  createMockCreateRFQRequest,
  createMockQuoteDashboardData,
  createMockDashboardMaterial,
  createMockQuoteItemSubmission,
  
  // WebSocket Messages
  createMockWebSocketMessage,
  createMockIFCStatusUpdate,
  createMockQuoteReceived,
  
  // Files
  createMockFile,
  createMockFileList,
  
  // Errors
  createMockErrorResponse,
  createMockValidationError,
  
  // Scenarios
  createMockProjectScenario,
  createMockQuoteDashboardScenario,
}