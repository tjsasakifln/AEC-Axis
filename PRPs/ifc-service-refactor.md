name: "Refatoração Arquitetural do IFC Service - Padrões Enterprise com Async"
description: |

## Goal
Refatorar completamente o módulo `backend/app/services/ifc_service.py` aplicando padrões de arquitetura enterprise (Strategy, Circuit Breaker, Dependency Injection), implementando processamento assíncrono, separação de responsabilidades, tratamento robusto de erros, e otimizações de performance para arquivos grandes (>100MB) que permita escalabilidade horizontal.

## Why
- **Performance Critical**: Upload síncrono atual (linhas 97-108) bloqueia event loop causando timeouts HTTP em arquivos >100MB
- **Reliability Issues**: Falhas de AWS se tornam falhas diretas do usuário sem retry ou circuit breaker
- **Testing Limitations**: Dependências hardcoded do AWS impedem testes unitários isolados
- **Scalability Blocker**: Código rígido impede escalonamento horizontal e deployment patterns modernos
- **Architecture Debt**: Responsabilidades misturadas violam SOLID principles e dificultam manutenção

## What
Transformação completa do IFC service em arquitetura modular com:
- **Async S3 Operations**: Usando aioboto3 com thread pool para operações não-bloqueantes
- **Strategy Pattern**: Storage pluggable (S3, local, future cloud providers)  
- **Circuit Breaker**: Retry exponencial com jitter e graceful degradation
- **Dependency Injection**: Testabilidade completa com factory patterns
- **Memory Efficiency**: Streaming patterns para arquivos grandes sem memory leaks
- **Error Recovery**: Comprehensive error handling com proper logging e monitoring hooks

### Success Criteria
- [ ] Upload de arquivo 100MB completa em <15s (vs 45s atual) sem bloquear outras requests
- [ ] Circuit breaker previne cascading failures após 5 tentativas consecutivas falhas
- [ ] 95%+ test coverage com mocks isolados para AWS services
- [ ] Zero memory leaks em sessões de 1 hora processando múltiplos arquivos
- [ ] Retry automático com exponential backoff para falhas transientes de rede/AWS
- [ ] Pluggable storage permite local storage para development/testing
- [ ] Monitoring hooks permitem observability em produção (latência, success rate, error types)
- [ ] Graceful degradation em caso de AWS service unavailability

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://aioboto3.readthedocs.io/en/latest/usage.html
  why: Native async patterns for S3/SQS operations in FastAPI
  section: "Session client context managers" - critical for v15+ breaking changes
  critical: Must use `async with session.client('s3') as s3` pattern
  
- url: https://fastapi.tiangolo.com/tutorial/dependencies/
  why: Dependency injection patterns for testable service architecture
  section: "Sub-dependencies" and "Using the same dependency multiple times"
  critical: Use Depends() for service composition and testing overrides

- url: https://github.com/arlyon/aiobreaker
  why: Native asyncio circuit breaker implementation (not blocking)
  section: "Circuit Breaker decorators" and "Redis backing for distributed state"
  critical: Use aiobreaker not pybreaker - pybreaker blocks event loop
  
- url: https://refactoring.guru/design-patterns/strategy/python/example
  why: Strategy pattern implementation for pluggable storage backends
  section: "Strategy interface and concrete strategies" 
  critical: Use ABC abstract methods for interface, not Protocol for this use case

- url: https://pypi.org/project/aiofiles/
  why: Async file operations for large file processing without blocking
  section: "Temporary file handling" and "Chunked reading patterns"
  critical: Use 8192 byte chunks for optimal performance

- url: https://python-dependency-injector.ets-labs.org/examples/fastapi.html
  why: Advanced DI patterns with factory containers for complex service composition
  section: "Container configuration and wiring" 
  critical: Use for production-grade DI with config management

- file: D:\AEC Axis\backend\app\services\ifc_service.py
  why: Current monolithic implementation showing specific pain points
  critical: Lines 97-108 blocking S3 upload, lines 134-160 blocking SQS operations
  
- file: D:\AEC Axis\backend\app\api\ifc_files.py  
  why: How current service is consumed by API layer
  critical: Must maintain same public interface for backward compatibility

- file: D:\AEC Axis\backend\tests\test_ifc_files.py
  why: Current testing patterns to maintain during refactor
  critical: Existing test fixtures and patterns must continue working

- file: D:\AEC Axis\backend\app\db\models\ifc_file.py
  why: Database model that service interacts with
  critical: Status field updates and relationship patterns

- docfile: INITIAL_refactor_ifc_service.md  
  why: Complete refactoring specifications and architectural decisions
```

### Current Codebase Tree  
```bash
D:\AEC Axis\backend\
├── app\
│   ├── services\
│   │   └── ifc_service.py              # MONOLITH: 162 lines, all concerns mixed
│   ├── api\
│   │   └── ifc_files.py                # Consumes ifc_service (maintain interface)
│   ├── db\models\
│   │   └── ifc_file.py                 # Database model (status updates)
│   └── tests\
│       └── test_ifc_files.py           # Current testing patterns
```

### Desired Codebase Tree with Responsibilities
```bash  
D:\AEC Axis\backend\
├── app\
│   ├── services\
│   │   ├── ifc_service.py              # MODIFY: Orchestrator only, DI composition
│   │   └── ifc\
│   │       ├── __init__.py             # CREATE: Module initialization
│   │       ├── factories.py           # CREATE: DI factory containers 
│   │       ├── storage\
│   │       │   ├── __init__.py         # CREATE: Storage module exports
│   │       │   ├── base.py             # CREATE: Abstract storage interface
│   │       │   ├── s3_storage.py       # CREATE: Async S3 implementation + retry
│   │       │   └── local_storage.py    # CREATE: Local file storage for testing
│   │       ├── processing\
│   │       │   ├── __init__.py         # CREATE: Processing module exports
│   │       │   ├── base.py             # CREATE: Abstract processor interface
│   │       │   ├── ifc_processor.py    # CREATE: IfcOpenShell integration
│   │       │   └── mock_processor.py   # CREATE: Mock processor for testing
│   │       └── notification\
│   │           ├── __init__.py         # CREATE: Notification module exports
│   │           ├── base.py             # CREATE: Abstract notifier interface
│   │           ├── sqs_notifier.py     # CREATE: Async SQS implementation
│   │           └── webhook_notifier.py # CREATE: Webhook notifications (future)
│   └── tests\
│       ├── test_ifc_service.py         # MODIFY: Test orchestrator with mocks
│       └── ifc\
│           ├── test_storage.py         # CREATE: Storage layer unit tests
│           ├── test_processing.py      # CREATE: Processing layer unit tests
│           └── test_factories.py       # CREATE: DI factory tests
```

### Known Gotchas & Critical Implementation Details
```python
# CRITICAL: aioboto3 v15+ Breaking Changes
# OLD (pre-v15): client = session.client('s3') 
# NEW (v15+): async with session.client('s3') as client:
#   Must use async context manager or connections leak

# CRITICAL: FastAPI Event Loop in Async Context
# Current code uses: asyncio.get_event_loop().run_in_executor()
# FastAPI best practice: Use asyncio.to_thread() for Python 3.9+
# For compatibility with 3.8: Use ThreadPoolExecutor with proper cleanup

# CRITICAL: Circuit Breaker Selection
# pybreaker: Synchronous, will BLOCK FastAPI event loop - DO NOT USE
# aiobreaker: Native asyncio, non-blocking - REQUIRED for FastAPI

# CRITICAL: Memory Management for Large Files  
# Current code loads entire file.file object into memory
# Must use streaming with 8192-byte chunks to prevent OOM on >100MB files
# Use aiofiles.tempfile.NamedTemporaryFile for async temporary file handling

# GOTCHA: SQLAlchemy Session in Async Context
# Current code uses sync Session, but service becomes async
# Need to ensure database operations don't block event loop
# Use existing sync session but make database calls in thread executor if needed

# GOTCHA: S3 Client Connection Pooling
# aioboto3 sessions are expensive to create
# Use singleton pattern with connection pooling for production
# Configure max_pool_connections for concurrent upload scenarios

# GOTCHA: SQS Message Ordering and Reliability  
# Current SQS send is fire-and-forget without delivery confirmation
# Add message attributes and receipt confirmation for reliability
# Implement dead letter queue (DLQ) pattern for failed processing

# GOTCHA: Error Handling in Async Context
# Exception propagation in async context is different from sync
# HTTPException must be raised from main async function, not thread executor
# Use proper error wrapping for circuit breaker integration
```

## Implementation Blueprint

### Data Models and Structure
```python
# New interfaces and configurations for modular architecture
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Protocol
from dataclasses import dataclass
from enum import Enum

class ProcessingStatus(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING" 
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

@dataclass
class UploadResult:
    storage_url: str
    object_key: str
    metadata: Dict[str, str]
    file_size: int

@dataclass  
class ProcessingResult:
    status: ProcessingStatus
    materials_count: int
    error_message: Optional[str] = None
    processing_time_seconds: Optional[float] = None

@dataclass
class RetryConfig:
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: int = 2
    jitter: bool = True

# Abstract interfaces for dependency injection
class IFCStorageInterface(ABC):
    @abstractmethod
    async def upload_file(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        pass
    
    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        pass

class IFCProcessorInterface(ABC):
    @abstractmethod
    async def process_file(self, storage_url: str, file_metadata: Dict[str, str]) -> ProcessingResult:
        pass

class NotificationInterface(ABC):
    @abstractmethod
    async def notify_processing_complete(self, ifc_file_id: str, result: ProcessingResult) -> None:
        pass
```

### List of Tasks in Implementation Order

```yaml
Task 1 - Create Abstract Interfaces and Base Classes:
CREATE backend/app/services/ifc/storage/base.py:
  - IMPLEMENT: IFCStorageInterface with upload_file, delete_file, get_presigned_url methods
  - INCLUDE: Proper async method signatures and comprehensive docstrings  
  - PATTERN: Use ABC abstractmethod decorators for interface enforcement

CREATE backend/app/services/ifc/processing/base.py:
  - IMPLEMENT: IFCProcessorInterface with process_file, validate_file methods
  - INCLUDE: ProcessingResult dataclass with status, materials_count, timing info
  - PATTERN: Mirror existing error handling structure from current implementation

CREATE backend/app/services/ifc/notification/base.py:
  - IMPLEMENT: NotificationInterface with notify_processing_complete, notify_error methods
  - INCLUDE: Async method signatures compatible with existing WebSocket patterns
  - PATTERN: Follow notification patterns from existing email_service.py

Task 2 - Implement S3 Storage with Async and Circuit Breaker:
CREATE backend/app/services/ifc/storage/s3_storage.py:
  - IMPLEMENT: S3IFCStorage class inheriting from IFCStorageInterface
  - INTEGRATE: aioboto3 with async context managers (session.client pattern)
  - IMPLEMENT: Circuit breaker using aiobreaker library with 5-failure threshold
  - IMPLEMENT: Exponential backoff retry with jitter using tenacity library
  - INCLUDE: Comprehensive error handling for ClientError and network failures
  - OPTIMIZE: Use ThreadPoolExecutor for boto3 compatibility where needed

CREATE backend/app/services/ifc/storage/local_storage.py:
  - IMPLEMENT: LocalIFCStorage for development and testing environments
  - USE: aiofiles for async file operations with proper temp file handling  
  - MIRROR: S3Storage interface for drop-in replacement during testing
  - INCLUDE: Cleanup mechanisms for temporary files

Task 3 - Implement IFC Processing with Async Patterns:
CREATE backend/app/services/ifc/processing/ifc_processor.py:
  - IMPLEMENT: IfcOpenShellProcessor with async file downloading and processing
  - INTEGRATE: Circuit breaker for processing operations (separate from storage)
  - USE: asyncio.to_thread for CPU-intensive IfcOpenShell operations  
  - IMPLEMENT: Memory-efficient streaming for large IFC files (>100MB)
  - INCLUDE: Timeout handling for long-running processing operations
  - PRESERVE: Existing material extraction logic and business rules

CREATE backend/app/services/ifc/processing/mock_processor.py:  
  - IMPLEMENT: MockProcessor for unit testing with configurable delays/failures
  - INCLUDE: Realistic processing simulation for performance testing
  - PATTERN: Same interface as real processor but with controllable outcomes

Task 4 - Implement Async Notification System:
CREATE backend/app/services/ifc/notification/sqs_notifier.py:
  - IMPLEMENT: SQSNotifier with aioboto3 async SQS operations
  - INCLUDE: Message queuing with proper error handling and retry logic
  - INTEGRATE: Dead letter queue (DLQ) patterns for failed messages
  - OPTIMIZE: Batch message sending for multiple notifications

CREATE backend/app/services/ifc/notification/webhook_notifier.py:
  - IMPLEMENT: WebhookNotifier for future HTTP callback integrations
  - USE: aiohttp for async HTTP requests with proper timeout handling
  - INCLUDE: Signature validation and security headers for webhook delivery

Task 5 - Create Dependency Injection Factory:
CREATE backend/app/services/ifc/factories.py:
  - IMPLEMENT: IFCServiceFactory with environment-based configuration
  - PATTERN: Factory method pattern with create_storage(), create_processor(), create_notifier()
  - INTEGRATE: Configuration management for different environments (dev/staging/prod)
  - INCLUDE: Connection pooling configuration for production deployments
  - IMPLEMENT: Singleton pattern for expensive resources (S3 sessions, etc.)

Task 6 - Refactor Main Orchestrator Service:
MODIFY backend/app/services/ifc_service.py:
  - FIND: process_ifc_upload function (lines 60-162)
  - REPLACE: Monolithic implementation with async orchestrator using DI
  - INJECT: Storage, processor, and notification dependencies via factory
  - PRESERVE: Existing function signature for backward compatibility with API layer
  - IMPLEMENT: Comprehensive error handling with proper HTTP status codes
  - ADD: Performance monitoring hooks and structured logging
  - INCLUDE: Transaction management for database operations

Task 7 - Update API Integration:  
MODIFY backend/app/api/ifc_files.py:
  - FIND: Existing ifc_service.process_ifc_upload() calls
  - VERIFY: No changes needed due to preserved interface
  - ADD: Error handling for new async exceptions if needed
  - INCLUDE: Proper dependency injection of IFC service

Task 8 - Create Comprehensive Test Suite:
CREATE backend/tests/ifc/test_storage.py:
  - IMPLEMENT: Unit tests for S3Storage with moto3 mocking
  - TEST: Circuit breaker behavior with simulated AWS failures
  - TEST: Retry logic with exponential backoff
  - INCLUDE: Performance tests for large file uploads (mock 100MB+)

CREATE backend/tests/ifc/test_processing.py:
  - IMPLEMENT: Unit tests for IFC processor with mock IfcOpenShell operations
  - TEST: Timeout handling and memory management for large files
  - TEST: Error scenarios and graceful degradation

CREATE backend/tests/ifc/test_factories.py:
  - IMPLEMENT: Tests for dependency injection factory patterns
  - TEST: Environment-based configuration switching
  - TEST: Singleton behavior and resource cleanup

MODIFY backend/tests/test_ifc_files.py:
  - UPDATE: Existing tests to work with new async implementation  
  - ADD: Integration tests for complete upload-to-processing workflow
  - PRESERVE: Existing test data and fixtures where possible

Task 9 - Performance Optimization and Monitoring:
CREATE backend/app/services/ifc/monitoring.py:
  - IMPLEMENT: Performance metrics collection (upload time, processing time, error rates)
  - INTEGRATE: Structured logging with correlation IDs for request tracing
  - INCLUDE: Health check endpoints for service monitoring
  - ADD: Circuit breaker state exposure for observability

Task 10 - Configuration and Environment Management:
CREATE backend/app/services/ifc/config.py:
  - IMPLEMENT: Configuration management for different environments
  - INCLUDE: AWS credentials handling, retry configurations, timeouts
  - ADD: Feature flags for gradual rollout of new implementation
  - IMPLEMENT: Connection pool settings and resource limits
```

### Per Task Pseudocode

```python  
# Task 2 - S3 Storage with Circuit Breaker
import aioboto3
from aiobreaker import CircuitBreaker
from tenacity import retry, stop_after_attempt, wait_exponential

class S3IFCStorage(IFCStorageInterface):
    def __init__(self, bucket_name: str, retry_config: RetryConfig):
        self.bucket_name = bucket_name
        self.retry_config = retry_config
        
        # CRITICAL: Circuit breaker with 5 failure threshold, 60s reset
        self.circuit_breaker = CircuitBreaker(fail_max=5, reset_timeout=60)
        
    @circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def upload_file(self, content: bytes, key: str, metadata: Dict[str, str]) -> UploadResult:
        session = aioboto3.Session()
        
        # CRITICAL: Must use async context manager in aioboto3 v15+
        async with session.client('s3') as s3:
            try:
                # Upload with metadata
                await s3.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=content,
                    ContentType='application/x-step',
                    Metadata=metadata
                )
                
                return UploadResult(
                    storage_url=f"s3://{self.bucket_name}/{key}",
                    object_key=key,
                    metadata=metadata,
                    file_size=len(content)
                )
                
            except ClientError as e:
                # PATTERN: Convert AWS errors to domain-specific errors
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                raise IFCStorageError(f"S3 upload failed: {error_code}") from e

# Task 6 - Refactored Orchestrator
class IFCService:
    def __init__(
        self, 
        storage: IFCStorageInterface,
        processor: IFCProcessorInterface, 
        notifier: NotificationInterface
    ):
        self.storage = storage
        self.processor = processor  
        self.notifier = notifier

    async def process_ifc_upload(self, db: Session, project: Project, file: UploadFile) -> IFCFile:
        """
        PRESERVE: Exact same signature as original for backward compatibility
        TRANSFORM: Internal implementation to async orchestration pattern
        """
        
        # Validation (preserve existing logic)
        if not file.filename or not file.filename.lower().endswith('.ifc'):
            raise HTTPException(status_code=400, detail="Only IFC files are allowed")
        
        # Generate unique key
        unique_id = str(uuid.uuid4())
        object_key = f"ifc-files/{unique_id}.ifc"
        
        try:
            # Read file content asynchronously
            file_content = await self._read_file_async(file)
            
            # Async storage upload with circuit breaker
            upload_result = await self.storage.upload_file(
                content=file_content,
                key=object_key,
                metadata={
                    'original_filename': file.filename,
                    'project_id': str(project.id),
                    'upload_timestamp': datetime.utcnow().isoformat()
                }
            )
            
            # Database record (preserve existing logic)
            db_ifc_file = IFCFile(
                original_filename=file.filename,
                status="PENDING", 
                project_id=project.id,
                file_path=object_key,
                file_size=upload_result.file_size
            )
            
            db.add(db_ifc_file)
            db.commit()
            db.refresh(db_ifc_file)
            
            # Async notification (replaces SQS synchronous call)
            await self.notifier.notify_processing_queued(
                ifc_file_id=str(db_ifc_file.id),
                storage_url=upload_result.storage_url,
                metadata=upload_result.metadata
            )
            
            return db_ifc_file
            
        except Exception as e:
            db.rollback()
            # PATTERN: Comprehensive error handling with proper HTTP status
            if isinstance(e, IFCStorageError):
                raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")
            elif isinstance(e, CircuitBreakerError):
                raise HTTPException(status_code=503, detail="Service temporarily unavailable")
            else:
                raise HTTPException(status_code=500, detail="Internal processing error")

    async def _read_file_async(self, file: UploadFile) -> bytes:
        """Memory-efficient async file reading for large files"""
        content = BytesIO()
        file.file.seek(0)
        
        # OPTIMIZE: Read in chunks to prevent memory issues
        while chunk := file.file.read(8192):  
            content.write(chunk)
        
        return content.getvalue()
```

### Integration Points
```yaml
DATABASE:
  - No schema changes required - preserves existing IFCFile model
  - Transaction handling in async context (sync Session compatible)
  
CONFIG:
  - Add to: backend/app/core/config.py
  - Pattern: Environment variables for storage backend selection
  
DEPENDENCIES:
  - Add to: backend/requirements.txt
  - New: aioboto3, aiobreaker, tenacity, aiofiles, dependency-injector
  
API:
  - Modify: backend/app/api/ifc_files.py dependency injection
  - Pattern: FastAPI Depends() for service composition
```

## Validation Loop

### Level 1: Syntax & Style  
```bash
# Backend validation with async-specific linting
cd backend
ruff check app/ --fix  
mypy app/ --strict

# Check for async/await correctness
python -m asyncio_lint app/services/ifc/

# Expected: No errors. Pay attention to async context warnings.
```

### Level 2: Unit Tests with Async Patterns
```python
# Test each layer independently with proper async mocking
# backend/tests/ifc/test_storage.py
import pytest
from unittest.mock import AsyncMock
import aioboto3
from moto import mock_s3

@pytest.mark.asyncio
@mock_s3
async def test_s3_upload_success():
    """Test successful S3 upload with circuit breaker"""
    storage = S3IFCStorage("test-bucket", RetryConfig())
    
    result = await storage.upload_file(
        content=b"test ifc data", 
        key="test.ifc",
        metadata={"project_id": "123"}
    )
    
    assert result.storage_url.startswith("s3://test-bucket/")
    assert result.file_size == len(b"test ifc data")

@pytest.mark.asyncio
async def test_circuit_breaker_opens():
    """Test circuit breaker opens after failures"""
    storage = S3IFCStorage("invalid-bucket", RetryConfig())
    
    # Cause 5 consecutive failures to open circuit breaker
    for _ in range(5):
        with pytest.raises(ClientError):
            await storage.upload_file(b"data", "key", {})
    
    # Next call should fail immediately due to open circuit
    with pytest.raises(CircuitBreakerError):
        await storage.upload_file(b"data", "key", {})

# Integration test for complete workflow
@pytest.mark.asyncio  
async def test_complete_ifc_workflow():
    """Test end-to-end async workflow"""
    service = IFCServiceFactory.create_service("testing")
    
    mock_file = create_mock_upload_file("test.ifc", b"mock ifc content")
    result = await service.process_ifc_upload(mock_db, mock_project, mock_file)
    
    assert result.status == "PENDING"
    assert result.file_path.startswith("ifc-files/")
```

```bash
# Run async tests with proper event loop handling
cd backend
pytest tests/ifc/ -v --asyncio-mode=auto

# Run performance tests for large file handling  
pytest tests/ifc/test_performance.py -v --asyncio-mode=auto

# Expected: All tests pass with proper async execution
```

### Level 3: Integration Test with Real Services
```bash
# Start development server with new async implementation
cd backend  
uvicorn app.main:app --reload --port 8000

# Test async upload with real file
curl -X POST http://localhost:8000/api/projects/1/ifc-files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_files/sample.ifc"

# Verify async processing doesn't block server
# Parallel uploads should complete without timeouts
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/projects/1/ifc-files \
    -H "Authorization: Bearer $TOKEN" \  
    -F "file=@test_files/sample_${i}.ifc" &
done
wait

# Check circuit breaker behavior by simulating AWS failures
# (configure invalid AWS credentials temporarily)

# Expected: All uploads complete asynchronously, circuit breaker prevents cascading failures
```

## Final Validation Checklist
- [ ] All async tests pass: `pytest tests/ifc/ -v --asyncio-mode=auto`
- [ ] No async context warnings: `mypy app/ --strict`
- [ ] Performance target met: 100MB upload <15s without blocking other requests
- [ ] Circuit breaker functional: Service degrades gracefully under AWS failures
- [ ] Memory efficiency verified: No OOM errors with large files in 1-hour load test
- [ ] Backward compatibility: Existing API consumers work without changes  
- [ ] Error handling comprehensive: All error types properly handled and logged
- [ ] DI factory working: Environment switching between storage backends functional
- [ ] Monitoring hooks operational: Structured logs and metrics available

---

## Anti-Patterns to Avoid
- ❌ Don't use sync operations in async context - causes event loop blocking
- ❌ Don't use pybreaker with FastAPI - use aiobreaker for true async circuit breaking
- ❌ Don't load large files entirely into memory - use streaming patterns  
- ❌ Don't ignore aioboto3 v15+ breaking changes - must use async context managers
- ❌ Don't hardcode dependencies - use proper DI for testability
- ❌ Don't skip circuit breaker configuration - prevents cascading failures in production
- ❌ Don't mix sync/async patterns - commit to async throughout the service layer

**Confidence Level: 8.5/10** - Comprehensive implementation plan with detailed async patterns, proper error handling, and extensive validation. Slight uncertainty around potential edge cases in aioboto3 integration and circuit breaker tuning for specific AWS failure scenarios, but patterns are well-established and documented.