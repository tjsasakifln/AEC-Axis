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

### **✅ Implemented (Phase 1)**
- [x] **Authentication and Account Management**
  - Company and user registration
  - Secure JWT authentication
  - Organizational profile management

- [x] **Core Infrastructure**
  - REST API with FastAPI
  - PostgreSQL database
  - Automated tests (100% endpoint coverage)
  - Microservices architecture

- [x] **Project Management**
  - Complete CRUD operations for projects
  - Multi-tenancy with company isolation
  - Comprehensive test coverage
  - UUID-based primary keys for security

- [x] **Supplier Management**
  - Complete CRUD operations for suppliers
  - CNPJ validation and uniqueness per company
  - Email validation and secure authentication
  - Cross-company access prevention

### **✅ Implemented (Phase 2 - MVP Core)**
- [x] **IFC Processing Pipeline**
  - Secure upload to AWS S3
  - Asynchronous processing with IfcOpenShell
  - Intelligent quantity extraction from BIM models
  - Real-time SQS message queue processing
  - Complete materials extraction and management

- [x] **Frontend Application**
  - React 18 + TypeScript responsive interface
  - Authentication system with JWT token management
  - Project dashboard with table view and creation modal
  - Private route protection and secure navigation
  - Complete integration with backend API

- [x] **IFC Files Management**
  - File upload with validation (format, size, integrity)
  - Drag-and-drop interface support
  - Processing status tracking in real-time
  - Secure file storage and retrieval
  - GET endpoint for listing project files

- [x] **Project Details Page**
  - IFC file visualization and status tracking
  - Material quantities table with editing capabilities
  - RFQ generation interface with supplier selection

### **✅ Implemented (Phase 3 - MVP Complete)**
- [x] **Quotation System**
  - Automatic RFQ generation and email distribution
  - Public interface for supplier quote submissions
  - JWT-based secure access tokens for suppliers
  - Real-time WebSocket notifications

- [x] **Quote Comparison Dashboard**
  - Intelligent comparative matrix view
  - Visual highlighting of best prices per material
  - Dynamic supplier columns based on submissions
  - Company-isolated security model
  - Real-time quote aggregation and analysis

### **📅 Roadmap (Phase 4)**
- [ ] **Analytics and Intelligence**
  - Supplier reliability scoring
  - Predictive price analysis
  - Performance reports and KPI tracking

---

## 🎯 **Milestones and KPIs**

### **MVP Completed (Q4 2024)**
- ✅ **Complete BIM-to-Quotation workflow** implemented
- ✅ **Supplier quote submission system** operational
- ✅ **Comparative dashboard** for intelligent procurement decisions
- ✅ **100% test coverage** on all critical endpoints

### **Go-to-Market (Q1 2025)**
- **10 construction companies** in the Founders Program
- **100 RFQs** processed through the platform
- **95% success rate** in IFC processing

### **Expansion (Q2-Q4 2025)**
- **50+ active companies** on the platform
- **$1M+ volume** of processed quotations
- **Series A** for national expansion

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
- **LinkedIn**: Connect for pitch deck and demonstration

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
# Backend tests (from root directory)
python -m pytest backend/tests/

# Frontend tests
cd frontend
npm test
```

---

## 📄 **Technical Documentation**

- **[PRD.md](PRD.md)**: Product Requirements Document
- **[CLAUDE.md](CLAUDE.md)**: Technical Conventions and Architecture
- **API Documentation**: Available at `/docs` (Swagger UI)

---

## 📊 **Code Metrics**
- **Test Coverage**: 100% (67 tests passing, all critical endpoints)
- **Backend**: Python FastAPI with 10 complete API modules
- **Frontend**: React 18 + TypeScript with complete quote workflow
- **Performance**: <200ms p95 response time (target)
- **Documentation**: 100% of endpoints documented in Swagger UI

---

*AEC Axis - Building the Future of Construction*

**© 2025 AEC Axis. All rights reserved. Proprietary software.**