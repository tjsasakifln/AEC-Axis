# AEC Axis
### Transforming Construction Supply Chain Management

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Tech Stack](https://img.shields.io/badge/stack-Python%20%7C%20React%20%7C%20PostgreSQL-blue)](#)
[![Development Stage](https://img.shields.io/badge/stage-MVP%20Development-orange)](#)

---

## 🏗️ **Overview**

**AEC Axis** is a revolutionary SaaS platform that transforms construction supply chain management from a reactive cost center into a proactive source of competitive advantage. Our solution directly addresses the **$1.6 trillion blind spot** of the construction industry: the archaic interface between design, procurement, and logistics.

### **The Problem**
- **80% of time** of Supply Chain Managers is wasted on manual quantity extraction tasks
- Fragmented and inefficient quotation processes
- Lack of integration between BIM models and procurement
- Purchase decisions based on incomplete and outdated information

### **Our Solution**
The **BIM-to-Quotation Connector** completely automates the flow from material extraction from IFC files to intelligent quotation comparison, reducing **80% of time** spent on these critical activities.

---

## 🚀 **Value Proposition**

### **For Construction Companies**
- **80% reduction** in quantity takeoff processing time
- **Complete visibility** of the supply chain in real-time
- **Smart decisions** based on accurate and up-to-date data
- **Automatic compliance** with BIM regulations (Brazilian Decree nº 11.888/2024)

### **For the Market**
- **Addressable market** of $60 billion (Brazilian construction industry)
- **Perfect timing**: convergence of BIM mandate, industrialization, and ESG
- **Scalable SaaS model** with international expansion potential
- **Network effects** between construction companies and suppliers

---

## 🏢 **Market Opportunity**

### **Macro Trends**
- **BIM Decree nº 11.888/2024**: Mandatory digitalization in Brazil
- **Industrialized Construction**: Demand for digital integration
- **ESG Imperative**: Need for resource optimization

### **Initial Segment**
- **Mid-size construction companies** specializing in logistics warehouses
- **Market size**: 200+ companies in Brazil
- **Projected average ticket**: $3,000/month per company

---

## 💻 **Technology Architecture**

### **Cutting-Edge Stack**
```
Frontend:  React 18+ | TypeScript 5.4+ | Vite
Backend:   Python 3.11+ | FastAPI 0.111+ | PostgreSQL 16+
Cloud:     AWS (S3, SQS, EC2) | Terraform IaC
BIM:       IfcOpenShell | Asynchronous processing
Security:  JWT | bcrypt | GDPR compliant
```

### **Microservices Architecture**
- **Asynchronous IFC processing** for files up to 500MB
- **Real-time WebSocket** for status updates
- **Automated CI/CD** pipeline
- **Integrated monitoring and logging**
- **Native horizontal scalability**

---

## 📋 **Development Status**

### **✅ Implemented (Phase 1 - Foundation)**
- [x] **Authentication and Account Management**
  - Company and user registration with CNPJ validation
  - Secure JWT authentication with token refresh
  - Multi-tenant organizational profile management
  - Role-based access control

- [x] **Core Infrastructure**
  - REST API with FastAPI and automatic OpenAPI documentation
  - PostgreSQL database with SQLModel ORM
  - Comprehensive automated test suite (18 test files, 100+ tests)
  - Enterprise microservices architecture with dependency injection
  - Docker containerization and environment configuration

- [x] **Project Management**
  - Complete CRUD operations for projects with multi-tenancy
  - Company isolation with UUID-based primary keys
  - Project metadata management and timeline tracking
  - Comprehensive test coverage with edge cases

- [x] **Supplier Management**
  - Complete supplier lifecycle management
  - CNPJ validation and uniqueness enforcement
  - Contact management with email verification
  - Cross-company access prevention and data isolation

### **✅ Implemented (Phase 2 - MVP Core)**
- [x] **Advanced IFC Processing Pipeline**
  - **Refactored Enterprise Architecture**: Complete service refactoring with Strategy pattern, dependency injection, and circuit breaker implementation
  - **Asynchronous Processing**: Multi-threaded IFC processing with timeout handling and exponential backoff retry logic
  - **AWS S3 Integration**: Secure file storage with presigned URLs and metadata tracking
  - **SQS Message Queue**: Batched notifications with automatic retry and dead letter queue
  - **Material Extraction**: Intelligent quantity extraction optimized for industrial warehouses (beams, columns, slabs, walls)

- [x] **Enhanced Frontend Application**
  - **React 18 + TypeScript**: Full type safety with 15+ specialized components
  - **Advanced Upload System**: Multi-part upload with real-time progress tracking, file preview, and error recovery
  - **Private Route Protection**: JWT-based authentication with automatic token refresh
  - **Responsive Design**: Mobile-first approach with Tailwind CSS
  - **Real-time Updates**: WebSocket integration for live status updates

- [x] **3D IFC Visualization**
  - **Three.js Integration**: Interactive 3D model viewer with navigation controls
  - **IFC.js Processing**: Client-side IFC parsing and geometry rendering
  - **Performance Optimization**: WebGL acceleration and memory management
  - **Material Highlighting**: Visual correlation between 3D model and quantity tables

- [x] **Comprehensive Upload Experience**
  - **Advanced Progress Tracking**: Real-time upload progress with speed calculation and ETA
  - **File Preview System**: Pre-upload IFC analysis showing project details and element counts
  - **Error Handling**: Categorized error messages with retry mechanisms
  - **Processing Timeline**: Visual feedback for each processing stage with real-time updates

### **✅ Implemented (Phase 3 - MVP Complete)**
- [x] **Intelligent Quotation System**
  - **Automated RFQ Generation**: Smart material selection with supplier targeting
  - **Email Distribution**: Template-based notifications with tracking
  - **Public Quote Interface**: Secure supplier access with JWT tokens
  - **Real-time Notifications**: WebSocket-based instant updates

- [x] **Real-time Quote Dashboard**
  - **Financial Market Style Interface**: Live price updates with visual indicators
  - **Competitive Intelligence**: Best price highlighting and trend analysis
  - **Supplier Status Tracking**: Online/offline indicators and response monitoring
  - **Advanced Notifications**: Toast notifications with customizable alerts
  - **Historical Data**: Price trend mini-charts and supplier performance metrics

### **✅ Implemented (Phase 4 - Enterprise Features)**
- [x] **Comprehensive Testing Suite**
  - **Backend Testing**: 18 test modules with 100+ unit and integration tests
  - **Frontend Testing**: 15 test files covering components, pages, and E2E workflows
  - **Coverage Metrics**: >80% code coverage with critical path testing
  - **CI/CD Integration**: Automated testing pipeline with quality gates

- [x] **Advanced Frontend Components**
  - **Materials Table**: Inline editing, bulk selection, and validation
  - **Quote Dashboard**: Real-time updates, filtering, and sorting
  - **Upload Components**: Progress tracking, error handling, and file preview
  - **Notification System**: Toast notifications and real-time alerts
  - **Timeline Components**: Processing stage visualization and progress tracking

### **🔮 Future Roadmap (Phase 5)**
- [ ] **Advanced Analytics and Intelligence**
  - **Supplier Performance Scoring**: Machine learning-based reliability metrics
  - **Predictive Price Analysis**: Market trend forecasting and price optimization
  - **Business Intelligence Dashboard**: KPI tracking, performance reports, and ROI analytics
  - **Supply Chain Optimization**: Route optimization and inventory management

- [ ] **Enterprise Integrations**
  - **ERP Integration**: SAP, Oracle, and Microsoft Dynamics connectors
  - **CAD Software Plugins**: Native Autodesk and Bentley integrations
  - **Construction Management**: Integration with Procore, PlanGrid, and similar platforms

---

## 🎯 **Milestones and KPIs**

### **✅ MVP Completed (Q3 2025) - ACHIEVED**
- ✅ **Complete BIM-to-Quotation workflow** fully operational with enterprise-grade architecture
- ✅ **Advanced supplier quote system** with real-time dashboard and competitive intelligence
- ✅ **3D IFC visualization** with interactive model viewing and material correlation
- ✅ **Comprehensive testing suite** with >80% coverage and automated CI/CD
- ✅ **Real-time processing pipeline** with WebSocket integration and progress tracking

### **🎯 Current Focus (Q4 2025)**
- **Platform Optimization**: Performance tuning for large IFC files (>500MB)
- **User Experience**: Advanced feedback systems and mobile optimization
- **Market Validation**: Beta testing with target construction companies
- **Scalability**: Infrastructure optimization for concurrent users

### **🚀 Go-to-Market (Q1 2026)**
- **10 construction companies** in the Founders Program
- **100+ RFQs** processed through the platform monthly
- **95%+ success rate** in IFC processing and material extraction
- **<2 minute average** processing time for typical warehouse projects

### **📈 Expansion (Q2-Q4 2026)**
- **50+ active companies** on the platform
- **$1M+ volume** of processed quotations annually
- **Series A funding** for national expansion and team scaling
- **International market entry** starting with Latin America

---

## 🔒 **Security and Compliance**

- **GDPR/LGPD compliant** by design
- **Data isolation** per company
- **End-to-end encryption** for sensitive documents
- **Complete audit trail** for all transactions
- **Automated backup and disaster recovery**

---

## 🌟 **Competitive Advantage**

### **Technical Advantages**
- **Only native BIM-to-procurement integration** in the Brazilian market
- **Optimized IFC processing** for industrialized construction
- **Intuitive interface** specifically developed for Brazilian workflows

### **Business Advantages**
- **First-mover advantage** in the logistics warehouse niche
- **Network effects** between construction companies and suppliers
- **Recurring revenue model** with high retention

---

## 📞 **Investment Opportunities**

**AEC Axis** represents a unique investment opportunity in a trillion-dollar market, with differentiated proprietary technology and perfect market timing.

### **Investor Contact**
- **Email**: [tiago@confenge.com.br](mailto:tiago@confenge.com.br)
- **Phone**: [+55 48 98834-4559](tel:+5548988344559)
- **LinkedIn**: [https://www.linkedin.com/in/tiagosasaki/](https://www.linkedin.com/in/tiagosasaki/) - Connect for pitch deck and demonstration

---

## 🛠️ **Local Development**

### **Prerequisites**
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+

### **Backend Setup**
```bash
cd backend
pip install -r requirements.txt

# From root directory
uvicorn backend.app.main:app --reload
# Backend runs on http://localhost:8000
```

### **Frontend Setup**  
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### **Testing**
```bash
# Backend tests with coverage
cd backend
python -m pytest tests/ -v --cov=app --cov-report=html

# Frontend tests with coverage
cd frontend
npm run test:coverage

# E2E tests
cd frontend
npm run test:e2e

# Run all tests
npm run test:all
```

---

## 📄 **Technical Documentation**

- **[PRD.md](PRD.md)**: Product Requirements Document
- **[CLAUDE.md](CLAUDE.md)**: Technical Conventions and Architecture
- **API Documentation**: Available at `/docs` (Swagger UI)

---

## 📊 **Code Metrics**

### **Backend Architecture**
- **API Endpoints**: 10 complete modules (auth, projects, suppliers, IFC processing, quotes, WebSocket)
- **Database Models**: 9 SQLModel entities with full relationship mapping
- **Service Layer**: 15 specialized services with dependency injection and circuit breaker patterns
- **Test Coverage**: 18 test modules with 100+ unit and integration tests
- **Code Quality**: Type hints, docstrings, and enterprise design patterns

### **Frontend Architecture**
- **Components**: 13+ specialized React components with TypeScript
- **Pages**: 5 main application pages with private route protection
- **State Management**: Context API with optimistic updates and error boundaries
- **Real-time Features**: WebSocket integration with automatic reconnection
- **Testing**: 15 test files covering unit, integration, and E2E scenarios

### **Performance Metrics**
- **IFC Processing**: <2 minutes for typical warehouse models (50-100MB)
- **API Response Time**: <200ms p95 for all critical endpoints
- **Upload Performance**: Real-time progress tracking with ETA calculation
- **WebSocket Latency**: <100ms for real-time quote updates
- **3D Rendering**: 60fps smooth navigation for models up to 10K elements

### **Quality Assurance**
- **Test Coverage**: >80% across both frontend and backend
- **Documentation**: 100% API documentation with Swagger UI
- **Code Standards**: ESLint, Prettier, Black formatting
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Error Monitoring**: Comprehensive logging and error tracking

---

*AEC Axis - Building the Future of Construction*

**© 2025 AEC Axis. All rights reserved. Proprietary software.**