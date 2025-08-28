# Exemplos de Código - AEC Axis

Esta pasta contém exemplos de código que demonstram diferentes componentes e funcionalidades do sistema AEC Axis.

## 📋 Arquivos Disponíveis

### Frontend (React/TypeScript)

#### `materials-table.tsx`
**Componente de tabela interativa para gerenciamento de materiais**
- Exibe materiais extraídos de arquivos IFC em formato de tabela
- Permite edição inline de campos (descrição, quantidade, unidade)
- Funcionalidade de seleção múltipla de materiais
- Operações CRUD completas (criar, ler, atualizar, deletar)
- Integração com API de materiais
- Interface responsiva com estados de carregamento e erro

**Principais funcionalidades:**
- Edição de células por clique duplo
- Validação de dados de entrada
- Confirmação de exclusão
- Seleção individual e em lote
- Estados de loading e error handling

#### `projects.tsx`
**Dashboard completo de gerenciamento de projetos**
- Lista paginada de projetos com filtros e busca
- Cards de resumo com métricas (projetos totais, RFQs ativas, projetos concluídos)
- Modais para criação e edição de projetos
- Menu de ações contextual para cada projeto
- Filtros por status e busca textual
- Sistema de paginação responsivo

**Principais funcionalidades:**
- Criação, edição e arquivamento de projetos
- Busca por nome e endereço
- Filtros por status de RFQ
- Navegação entre páginas
- Isolamento de dados por empresa
- Interface moderna com gradientes e animações

#### `quote-dashboard.tsx`
**Dashboard comparativo de cotações**
- Visualização lado a lado de cotações de múltiplos fornecedores
- Comparação de preços, prazos de entrega e datas de submissão
- Destaque visual para menores preços
- Tabela responsiva com informações detalhadas
- Estados de carregamento e tratamento de erros

**Principais funcionalidades:**
- Comparação visual de cotações
- Identificação automática do menor preço
- Exibição de informações do fornecedor
- Formatação de moeda e datas
- Interface responsiva

### Backend (Python/FastAPI)

#### `test_projects.py`
**Suite completa de testes para funcionalidades de projetos**
- Testes de CRUD para projetos (criação, leitura, atualização, exclusão)
- Testes de autenticação e autorização
- Validação de isolamento entre empresas
- Testes de paginação, busca e filtros
- Cenários de edge cases e casos de falha

**Principais categorias de teste:**
- Operações básicas (CRUD)
- Segurança e isolamento de dados
- Funcionalidades de busca e filtro
- Paginação e ordenação
- Casos de erro e validação

#### `test_quotes.py`
**Suite de testes para sistema de cotações**
- Testes de submissão de cotações via token JWT
- Validação de tokens (expiração, assinatura, uso único)
- Testes de visualização de detalhes do RFQ
- Testes do dashboard comparativo de cotações
- Cenários de segurança e isolamento entre empresas

**Principais categorias de teste:**
- Autenticação por JWT para fornecedores
- Submissão e validação de cotações
- Dashboard comparativo
- Segurança e controle de acesso
- Edge cases e cenários de falha

## 🎯 Casos de Uso

### Para Desenvolvedores Frontend
- **`materials-table.tsx`**: Exemplo de tabela editável com operações CRUD
- **`projects.tsx`**: Dashboard completo com paginação, filtros e modais
- **`quote-dashboard.tsx`**: Comparação de dados em formato tabular

### Para Desenvolvedores Backend
- **`test_projects.py`**: Testes abrangentes para APIs REST
- **`test_quotes.py`**: Testes de segurança e autenticação JWT

## 🔧 Tecnologias Demonstradas

- **React Hooks**: useState, useEffect para gerenciamento de estado
- **TypeScript**: Tipagem estática e interfaces
- **JWT**: Autenticação segura para fornecedores
- **Pytest**: Framework de testes para Python
- **FastAPI**: Endpoints REST com validação automática
- **SQLModel**: ORM para interação com banco de dados

## 📚 Padrões de Código

Todos os exemplos seguem as convenções estabelecidas no projeto:
- Nomenclatura consistente em português
- Tratamento de erros adequado
- Responsividade e acessibilidade
- Isolamento de dados por empresa
- Validação de entrada
- Estados de carregamento
- Testes abrangentes

## 🚀 Como Usar

1. **Para componentes React**: Importe e adapte conforme sua necessidade
2. **Para testes**: Execute com `pytest` no ambiente virtual do backend
3. **Para referência**: Use como base para implementar funcionalidades similares

---

*Estes exemplos fazem parte do sistema AEC Axis - uma plataforma de gestão de projetos de engenharia com foco em cotações automatizadas.*