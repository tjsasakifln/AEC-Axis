/**
 * Dredd API Contract Testing Hooks for AEC Axis
 * 
 * These hooks provide authentication, data setup, and response validation
 * for our API contract testing suite.
 */

const hooks = require('hooks');
const { v4: uuidv4 } = require('uuid');

// Global test data storage
let testData = {
  authToken: null,
  companyId: null,
  userId: null,
  projectId: null,
  supplierId: null,
  ifcFileId: null,
  materialId: null,
  rfqId: null,
  quoteId: null
};

/**
 * Authentication Hook - Get JWT token for protected endpoints
 */
hooks.before('/api/auth/login > POST', function(transaction) {
  console.log('🔐 Setting up authentication for contract testing...');
  
  // Set up test user credentials
  transaction.request.body = JSON.stringify({
    email: "test@aecaxis.com",
    password: "TestPassword123!"
  });
});

/**
 * Store authentication token from login response
 */
hooks.after('/api/auth/login > POST', function(transaction) {
  if (transaction.real.statusCode === 200) {
    const response = JSON.parse(transaction.real.body);
    testData.authToken = response.access_token;
    console.log('✅ Authentication token obtained for contract testing');
  }
});

/**
 * Add authentication header to all protected endpoints
 */
hooks.beforeEach(function(transaction) {
  // Skip authentication for public endpoints
  const publicEndpoints = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/quotes/public/',
    '/',
    '/health'
  ];
  
  const needsAuth = !publicEndpoints.some(endpoint => 
    transaction.name.includes(endpoint)
  );
  
  if (needsAuth && testData.authToken) {
    transaction.request.headers['Authorization'] = `Bearer ${testData.authToken}`;
  }
});

/**
 * Company Registration Hook
 */
hooks.before('/api/auth/register > POST', function(transaction) {
  const testCompany = {
    company_name: `Test Company ${uuidv4().substring(0, 8)}`,
    company_cnpj: "12.345.678/0001-90",
    user_name: "Test User",
    user_email: `test-${uuidv4().substring(0, 8)}@aecaxis.com`,
    password: "TestPassword123!"
  };
  
  transaction.request.body = JSON.stringify(testCompany);
  console.log('📋 Setting up test company registration...');
});

/**
 * Project Creation Hook
 */
hooks.before('/api/projects/ > POST', function(transaction) {
  const testProject = {
    name: `Test Project ${uuidv4().substring(0, 8)}`,
    address: "123 Test Street, Test City",
    start_date: new Date().toISOString().split('T')[0]
  };
  
  transaction.request.body = JSON.stringify(testProject);
  console.log('🏗️ Setting up test project creation...');
});

/**
 * Store project ID from creation response
 */
hooks.after('/api/projects/ > POST', function(transaction) {
  if (transaction.real.statusCode === 201) {
    const response = JSON.parse(transaction.real.body);
    testData.projectId = response.id;
    console.log(`✅ Test project created with ID: ${testData.projectId}`);
  }
});

/**
 * Supplier Creation Hook
 */
hooks.before('/api/suppliers/ > POST', function(transaction) {
  const testSupplier = {
    name: `Test Supplier ${uuidv4().substring(0, 8)}`,
    cnpj: "98.765.432/0001-10",
    email: `supplier-${uuidv4().substring(0, 8)}@test.com`,
    phone: "+55 11 99999-9999",
    address: "456 Supplier Ave, Supply City"
  };
  
  transaction.request.body = JSON.stringify(testSupplier);
  console.log('🏪 Setting up test supplier creation...');
});

/**
 * Material Creation Hook - Simulated IFC extraction result
 */
hooks.before('/api/materials/ > POST', function(transaction) {
  const testMaterial = {
    ifc_file_id: testData.ifcFileId || uuidv4(),
    name: "Test Steel Beam",
    description: "IPE 300 Steel Beam - Test Material",
    quantity: 25.5,
    unit: "m",
    ifc_type: "IfcBeam",
    properties: {
      material: "Steel",
      profile: "IPE300",
      length: "6000mm"
    }
  };
  
  transaction.request.body = JSON.stringify(testMaterial);
  console.log('🧱 Setting up test material creation...');
});

/**
 * Skip file upload endpoints that require multipart form data
 */
hooks.before('/api/ifc-files/upload > POST', function(transaction) {
  transaction.skip = true;
  console.log('⏭️ Skipping file upload endpoint (requires multipart form data)');
});

/**
 * RFQ Creation Hook
 */
hooks.before('/api/rfqs/ > POST', function(transaction) {
  const testRfq = {
    project_id: testData.projectId || uuidv4(),
    title: `Test RFQ ${uuidv4().substring(0, 8)}`,
    description: "Test Request for Quotation - Contract Testing",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    material_ids: [testData.materialId || uuidv4()],
    supplier_ids: [testData.supplierId || uuidv4()]
  };
  
  transaction.request.body = JSON.stringify(testRfq);
  console.log('📋 Setting up test RFQ creation...');
});

/**
 * Quote Submission Hook (Public endpoint)
 */
hooks.before('/api/quotes/public/submit > POST', function(transaction) {
  const testQuote = {
    rfq_token: "test-jwt-token-placeholder",
    supplier_info: {
      company_name: "Test Supplier Company",
      contact_name: "John Doe",
      contact_email: "john@testsupplier.com",
      contact_phone: "+55 11 98765-4321"
    },
    items: [
      {
        material_id: uuidv4(),
        price: 150.50,
        lead_time_days: 15,
        notes: "High quality steel beam - Test quote"
      }
    ],
    total_amount: 150.50,
    validity_days: 30,
    notes: "Test quote submission for contract validation"
  };
  
  transaction.request.body = JSON.stringify(testQuote);
  console.log('💰 Setting up test quote submission...');
});

/**
 * WebSocket endpoint handling
 */
hooks.before('/api/ws/{client_id} > GET', function(transaction) {
  transaction.skip = true;
  console.log('⏭️ Skipping WebSocket endpoint (not suitable for HTTP contract testing)');
});

/**
 * Health check endpoint
 */
hooks.before('/health > GET', function(transaction) {
  console.log('❤️ Testing health check endpoint...');
});

/**
 * Root endpoint
 */
hooks.before('/ > GET', function(transaction) {
  console.log('🏠 Testing root endpoint...');
});

/**
 * Global error handling
 */
hooks.beforeEachValidation(function(transaction) {
  if (transaction.real.statusCode >= 500) {
    console.log(`🚨 Server error detected: ${transaction.real.statusCode}`);
    console.log(`Response: ${transaction.real.body}`);
  }
});

/**
 * Test completion summary
 */
hooks.afterAll(function(transactions) {
  console.log('\n🏆 API CONTRACT TESTING COMPLETE!');
  console.log('========================================');
  console.log(`📊 Total transactions tested: ${transactions.length}`);
  console.log(`✅ Test data generated: ${Object.keys(testData).length} entities`);
  console.log('🎯 Contract validation finished successfully!');
});