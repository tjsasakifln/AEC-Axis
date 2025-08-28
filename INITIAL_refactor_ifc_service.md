# INITIAL: Refatoração do ifc_service.py - Otimização do Processamento IFC

## FEATURE

Refatorar completamente o módulo `backend/app/services/ifc_service.py` aplicando padrões de arquitetura enterprise, implementando processamento assíncrono, separação de responsabilidades, tratamento robusto de erros, e otimizações de performance para escalabilidade.

### Contexto e Problema Atual
O arquivo `backend/app/services/ifc_service.py` possui várias limitações arquiteturais críticas:

1. **Operações Síncronas:** Upload para S3 é bloqueante (linha 97-108)
2. **Responsabilidades Misturadas:** Lógica de storage, processamento e notificação no mesmo método
3. **Tratamento de Erro Limitado:** Sem retry, circuit breaker, ou recovery automático
4. **Falta de Testabilidade:** Dependências diretas do AWS sem injeção de dependência
5. **Performance:** Sem otimizações para arquivos grandes (>100MB)

### Riscos do Estado Atual
- Timeouts HTTP para uploads grandes
- Falhas de AWS se tornam falhas diretas do usuário
- Código rígido para testes unitários
- Impossibilidade de escalar horizontalmente

## REQUISITOS TÉCNICOS

### 1. Separação de Responsabilidades - Pattern Strategy

**Arquivo Principal:** `backend/app/services/ifc_service.py`

**Nova Estrutura de Arquivos:**
```
backend/app/services/ifc/
├── __init__.py
├── ifc_service.py                 # Orchestrator principal
├── storage/
│   ├── __init__.py
│   ├── base_storage.py           # Interface abstrata
│   ├── s3_storage.py             # Implementação S3
│   └── local_storage.py          # Implementação local (testes)
├── processing/
│   ├── __init__.py
│   ├── base_processor.py         # Interface abstrata
│   ├── ifcopenshell_processor.py # Implementação IfcOpenShell
│   └── mock_processor.py         # Implementação mock (testes)
└── notification/
    ├── __init__.py
    ├── base_notifier.py          # Interface abstrata
    ├── sqs_notifier.py           # Implementação SQS
    └── webhook_notifier.py       # Implementação webhook
```

**Interface Base - Storage:**
```python
# backend/app/services/ifc/storage/base_storage.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import asyncio

class IFCStorageInterface(ABC):
    """Interface abstrata para storage de arquivos IFC."""
    
    @abstractmethod
    async def upload_file(
        self, 
        file_content: bytes, 
        object_key: str, 
        metadata: Dict[str, str]
    ) -> str:
        """
        Upload arquivo para storage.
        
        Returns:
            URL ou identificador do arquivo armazenado
        """
        pass
    
    @abstractmethod
    async def get_presigned_url(self, object_key: str, expires_in: int = 3600) -> str:
        """Gera URL pré-assinada para acesso ao arquivo."""
        pass
    
    @abstractmethod
    async def delete_file(self, object_key: str) -> bool:
        """Remove arquivo do storage."""
        pass
    
    @abstractmethod
    async def file_exists(self, object_key: str) -> bool:
        """Verifica se arquivo existe no storage."""
        pass
```

**Implementação S3 com Async:**
```python
# backend/app/services/ifc/storage/s3_storage.py
import asyncio
import aiofiles
from concurrent.futures import ThreadPoolExecutor
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from .base_storage import IFCStorageInterface

class S3IFCStorage(IFCStorageInterface):
    """Implementação S3 com suporte assíncrono e retry logic."""
    
    def __init__(self, bucket_name: str, aws_client, retry_config: dict = None):
        self.bucket_name = bucket_name
        self.client = aws_client
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.retry_config = retry_config or {
            'max_attempts': 3,
            'base_delay': 1.0,
            'max_delay': 60.0,
            'exponential_base': 2,
            'jitter': True
        }
    
    async def upload_file(
        self, 
        file_content: bytes, 
        object_key: str, 
        metadata: Dict[str, str]
    ) -> str:
        """Upload com retry exponencial e jitter."""
        
        for attempt in range(self.retry_config['max_attempts']):
            try:
                # Usar thread executor para operação bloqueante do boto3
                await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._sync_upload,
                    file_content,
                    object_key,
                    metadata
                )
                return f"s3://{self.bucket_name}/{object_key}"
                
            except ClientError as e:
                if attempt == self.retry_config['max_attempts'] - 1:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"S3 upload failed after {self.retry_config['max_attempts']} attempts: {str(e)}"
                    )
                
                # Calcular delay com jitter
                delay = self._calculate_retry_delay(attempt)
                await asyncio.sleep(delay)
    
    def _sync_upload(self, file_content: bytes, object_key: str, metadata: Dict[str, str]):
        """Operação síncrona de upload para ser executada no thread pool."""
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=object_key,
            Body=file_content,
            ContentType='application/x-step',
            Metadata=metadata
        )
    
    def _calculate_retry_delay(self, attempt: int) -> float:
        """Calcula delay com exponential backoff e jitter."""
        base_delay = self.retry_config['base_delay']
        exponential_delay = base_delay * (self.retry_config['exponential_base'] ** attempt)
        delay = min(exponential_delay, self.retry_config['max_delay'])
        
        if self.retry_config['jitter']:
            import random
            delay *= (0.5 + random.random() * 0.5)  # Jitter entre 50-100%
        
        return delay
```

### 2. Processamento IFC Assíncrono com Circuit Breaker

**Interface de Processamento:**
```python
# backend/app/services/ifc/processing/base_processor.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class MaterialQuantity:
    """Representa um material extraído do IFC."""
    description: str
    quantity: float
    unit: str
    ifc_element_type: str
    properties: Dict[str, Any]

class IFCProcessorInterface(ABC):
    """Interface para processadores de arquivo IFC."""
    
    @abstractmethod
    async def process_file(self, file_path: str, file_metadata: Dict[str, str]) -> List[MaterialQuantity]:
        """
        Processa arquivo IFC e extrai quantitativos.
        
        Args:
            file_path: Caminho ou URL do arquivo IFC
            file_metadata: Metadados do arquivo
            
        Returns:
            Lista de materiais extraídos
        """
        pass
    
    @abstractmethod
    async def validate_ifc_file(self, file_path: str) -> bool:
        """Valida se arquivo é um IFC válido."""
        pass
```

**Implementação com Circuit Breaker:**
```python
# backend/app/services/ifc/processing/ifcopenshell_processor.py
import asyncio
from typing import List
import ifcopenshell
from circuitbreaker import circuit

from .base_processor import IFCProcessorInterface, MaterialQuantity

class IfcOpenShellProcessor(IFCProcessorInterface):
    """Processador IFC usando IfcOpenShell com circuit breaker."""
    
    def __init__(self, timeout_seconds: int = 300):
        self.timeout_seconds = timeout_seconds
    
    @circuit(failure_threshold=5, recovery_timeout=60)
    async def process_file(self, file_path: str, file_metadata: Dict[str, str]) -> List[MaterialQuantity]:
        """Processa IFC com timeout e circuit breaker."""
        
        try:
            # Executar processamento IFC em thread separada devido à natureza bloqueante
            return await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, 
                    self._process_ifc_sync, 
                    file_path, 
                    file_metadata
                ),
                timeout=self.timeout_seconds
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail=f"IFC processing timed out after {self.timeout_seconds} seconds"
            )
    
    def _process_ifc_sync(self, file_path: str, file_metadata: Dict[str, str]) -> List[MaterialQuantity]:
        """Processamento síncrono do IFC para ser executado em thread separada."""
        
        # Download file if S3 URL
        local_file_path = self._ensure_local_file(file_path)
        
        try:
            ifc_file = ifcopenshell.open(local_file_path)
            materials = []
            
            # Extrair elementos específicos para galpões logísticos
            target_elements = [
                'IfcBeam',      # Vigas
                'IfcColumn',    # Pilares  
                'IfcWall',      # Paredes
                'IfcSlab',      # Lajes
                'IfcRoof',      # Cobertura
            ]
            
            for element_type in target_elements:
                elements = ifc_file.by_type(element_type)
                for element in elements:
                    material = self._extract_material_from_element(element, element_type)
                    if material:
                        materials.append(material)
            
            return materials
            
        finally:
            # Cleanup temporary file if downloaded
            if local_file_path != file_path:
                self._cleanup_temp_file(local_file_path)
    
    def _extract_material_from_element(self, element, element_type: str) -> MaterialQuantity:
        """Extrai material de um elemento IFC específico."""
        # Implementar lógica de extração baseada no tipo de elemento
        # Focando em aço e concreto pré-moldado para galpões
        pass
```

### 3. Sistema de Notificação Desacoplado

**SQS Notifier Assíncrono:**
```python
# backend/app/services/ifc/notification/sqs_notifier.py
import json
import asyncio
from .base_notifier import NotificationInterface

class SQSNotifier(NotificationInterface):
    """Notificador SQS com batching e retry."""
    
    def __init__(self, sqs_client, queue_url: str, batch_size: int = 10):
        self.sqs_client = sqs_client
        self.queue_url = queue_url
        self.batch_size = batch_size
        self.pending_messages = []
        self._batch_timer = None
    
    async def notify_processing_complete(
        self, 
        ifc_file_id: str, 
        status: str, 
        materials: List[MaterialQuantity] = None,
        error_message: str = None
    ):
        """Envia notificação de processamento completo."""
        
        message = {
            "type": "ifc_processing_complete",
            "ifc_file_id": ifc_file_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "materials_count": len(materials) if materials else 0,
            "error_message": error_message
        }
        
        await self._queue_message(message)
    
    async def _queue_message(self, message: dict):
        """Adiciona mensagem ao batch para envio eficiente."""
        self.pending_messages.append(message)
        
        if len(self.pending_messages) >= self.batch_size:
            await self._flush_batch()
        else:
            # Configurar timer para flush automático
            if not self._batch_timer:
                self._batch_timer = asyncio.create_task(self._auto_flush())
    
    async def _flush_batch(self):
        """Envia batch de mensagens para SQS."""
        if not self.pending_messages:
            return
        
        messages_to_send = self.pending_messages[:self.batch_size]
        self.pending_messages = self.pending_messages[self.batch_size:]
        
        # Reset timer
        if self._batch_timer:
            self._batch_timer.cancel()
            self._batch_timer = None
        
        # Enviar usando send_message_batch para eficiência
        entries = [
            {
                'Id': f"msg_{i}",
                'MessageBody': json.dumps(msg)
            }
            for i, msg in enumerate(messages_to_send)
        ]
        
        await asyncio.get_event_loop().run_in_executor(
            None,
            self.sqs_client.send_message_batch,
            {'QueueUrl': self.queue_url, 'Entries': entries}
        )
```

### 4. Orchestrator Principal Refatorado

**IFC Service Refatorado:**
```python
# backend/app/services/ifc/ifc_service.py
import uuid
from typing import Dict, Any
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.models.project import Project
from app.db.models.ifc_file import IFCFile
from .storage.base_storage import IFCStorageInterface  
from .processing.base_processor import IFCProcessorInterface
from .notification.base_notifier import NotificationInterface

class IFCService:
    """Orchestrator principal para operações com arquivos IFC."""
    
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
        Processa upload de arquivo IFC com arquitetura assíncrona e robusta.
        
        Fluxo:
        1. Validação de arquivo
        2. Upload assíncrono para storage
        3. Criação de record no DB
        4. Enfileiramento para processamento
        """
        
        # Validação
        await self._validate_ifc_file(file)
        
        # Gerar identificador único
        unique_id = str(uuid.uuid4())
        object_key = f"ifc-files/{unique_id}.ifc"
        
        # Ler conteúdo do arquivo
        file_content = await file.read()
        file.file.seek(0)  # Reset para outros usos
        
        # Metadata
        metadata = {
            'original_filename': file.filename,
            'project_id': str(project.id),
            'file_size': str(len(file_content)),
            'upload_timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            # Upload assíncrono para storage
            storage_url = await self.storage.upload_file(
                file_content=file_content,
                object_key=object_key,
                metadata=metadata
            )
            
            # Criar record no database
            db_ifc_file = IFCFile(
                original_filename=file.filename,
                status="PENDING",
                project_id=project.id,
                file_path=object_key,
                file_size=len(file_content)
            )
            
            db.add(db_ifc_file)
            db.commit()
            db.refresh(db_ifc_file)
            
            # Enfileirar para processamento assíncrono
            await self.notifier.notify_processing_queued(
                ifc_file_id=str(db_ifc_file.id),
                storage_url=storage_url,
                metadata=metadata
            )
            
            return db_ifc_file
            
        except Exception as e:
            db.rollback()
            # Cleanup storage se necessário
            try:
                await self.storage.delete_file(object_key)
            except:
                pass  # Log error but don't fail the main operation
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing IFC upload: {str(e)}"
            )
    
    async def _validate_ifc_file(self, file: UploadFile):
        """Validação robusta de arquivo IFC."""
        
        # Validar extensão
        if not file.filename or not file.filename.lower().endswith('.ifc'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only IFC files are allowed"
            )
        
        # Validar tamanho
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)     # Reset
        
        max_size = 500 * 1024 * 1024  # 500MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {max_size / (1024*1024)}MB"
            )
        
        # Validação de header IFC (primeiros bytes)
        header = await file.read(1024)
        file.file.seek(0)  # Reset
        
        if not header.startswith(b'ISO-10303'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IFC file format"
            )
```

### 5. Dependency Injection e Factory Pattern

**Service Factory:**
```python
# backend/app/services/ifc/factory.py
import os
from .ifc_service import IFCService
from .storage.s3_storage import S3IFCStorage
from .storage.local_storage import LocalIFCStorage
from .processing.ifcopenshell_processor import IfcOpenShellProcessor
from .notification.sqs_notifier import SQSNotifier

class IFCServiceFactory:
    """Factory para criar instâncias do IFC Service com as dependências corretas."""
    
    @staticmethod
    def create_ifc_service(environment: str = "production") -> IFCService:
        """Cria serviço IFC configurado para o ambiente específico."""
        
        if environment == "production":
            return IFCServiceFactory._create_production_service()
        elif environment == "development": 
            return IFCServiceFactory._create_development_service()
        elif environment == "testing":
            return IFCServiceFactory._create_testing_service()
        else:
            raise ValueError(f"Unknown environment: {environment}")
    
    @staticmethod
    def _create_production_service() -> IFCService:
        """Configuração para produção com AWS."""
        import boto3
        
        s3_client = boto3.client('s3')
        sqs_client = boto3.client('sqs')
        
        storage = S3IFCStorage(
            bucket_name=os.getenv('AWS_S3_BUCKET_NAME'),
            aws_client=s3_client
        )
        
        processor = IfcOpenShellProcessor(timeout_seconds=300)
        
        notifier = SQSNotifier(
            sqs_client=sqs_client,
            queue_url=os.getenv('AWS_SQS_QUEUE_URL')
        )
        
        return IFCService(storage=storage, processor=processor, notifier=notifier)
```

## DOCUMENTATION

### Guia de Migração

**Passo 1: Backup e Preparação**
1. Backup do arquivo atual `ifc_service.py`
2. Criar nova estrutura de diretórios
3. Implementar interfaces base

**Passo 2: Implementação Gradual**
1. Implementar S3Storage assíncrono
2. Migrar lógica de upload para novo service
3. Adicionar testes unitários para cada componente
4. Implementar factory para injeção de dependência

**Passo 3: Testing**
1. Testes unitários com mocks para cada interface
2. Testes de integração com LocalStorage
3. Testes de performance com arquivos grandes
4. Testes de circuit breaker e retry logic

**Passo 4: Deploy e Monitoring**
1. Deploy em ambiente de staging
2. Monitorar métricas de performance
3. Rollout gradual em produção
4. Monitoramento de errors e latência

### Métricas de Performance

**Antes da Refatoração:**
- Upload 100MB: ~45s (síncrono)
- Falha em 1 retry = falha do usuário
- Memory leak em processamento longo
- Impossível testar isoladamente

**Após Refatoração (Esperado):**
- Upload 100MB: ~15s (assíncrono + paralelo)
- Circuit breaker evita cascading failures
- Memory footprint otimizado
- 95% test coverage

## EXAMPLES

### Exemplo de Uso - Novo Service

```python
# Em production
from app.services.ifc.factory import IFCServiceFactory

ifc_service = IFCServiceFactory.create_ifc_service("production")

# Upload assíncrono
result = await ifc_service.process_ifc_upload(db, project, file)

# Em testes
test_service = IFCServiceFactory.create_ifc_service("testing")
```

### Exemplo de Teste Unitário

```python
# test_ifc_service.py
@pytest.fixture
def mock_storage():
    return Mock(spec=IFCStorageInterface)

@pytest.fixture  
def mock_processor():
    return Mock(spec=IFCProcessorInterface)

@pytest.fixture
def mock_notifier():
    return Mock(spec=NotificationInterface)

@pytest.fixture
def ifc_service(mock_storage, mock_processor, mock_notifier):
    return IFCService(
        storage=mock_storage,
        processor=mock_processor, 
        notifier=mock_notifier
    )

@pytest.mark.asyncio
async def test_upload_success(ifc_service, mock_storage, mock_notifier):
    # Arrange
    mock_storage.upload_file.return_value = "s3://bucket/file.ifc"
    mock_notifier.notify_processing_queued.return_value = None
    
    file_mock = Mock()
    file_mock.filename = "test.ifc"
    file_mock.read.return_value = b"ISO-10303..." # Valid IFC header
    
    # Act
    result = await ifc_service.process_ifc_upload(mock_db, mock_project, file_mock)
    
    # Assert  
    mock_storage.upload_file.assert_called_once()
    mock_notifier.notify_processing_queued.assert_called_once()
    assert result.status == "PENDING"
```

### Exemplo de Circuit Breaker em Ação

```python
# Simulação de falha e recovery
processor = IfcOpenShellProcessor()

# Primeira falha - circuit fechado
try:
    await processor.process_file("corrupted.ifc", {})
except:
    pass

# Após 5 falhas consecutivas - circuit aberto
# Próximas chamadas falham imediatamente sem processar

# Após 60s de recovery_timeout - circuit meio-aberto
# Próxima chamada de sucesso fecha o circuit novamente
```

## OTHER CONSIDERATIONS

### Backwards Compatibility
- Manter endpoint atual funcionando durante transição
- Feature flag para alternar entre implementação antiga e nova
- Migração gradual de dados existentes

### Performance Monitoring
- Métricas de latência para cada componente (storage, processing, notification)
- Circuit breaker metrics (estado, falhas, recovery time)
- Memory usage durante processamento de arquivos grandes
- Throughput de uploads paralelos

### Security
- Validação robusta de arquivo IFC (header, estrutura interna)
- Sanitização de metadados de arquivo
- Rate limiting por usuário/empresa
- Audit trail para operações críticas

### Cost Optimization
- S3 Intelligent Tiering para arquivos antigos
- Compressão de arquivos grandes
- Cleanup automático de arquivos temporários
- SQS batching para reduzir custos de API calls

### Future Enhancements
- Support para IFC 5.0 quando disponível
- ML-based quality validation de arquivos IFC
- Parallel processing de múltiplos arquivos
- Edge caching para arquivos IFC frequentemente acessados
- Streaming processing para arquivos muito grandes (>1GB)