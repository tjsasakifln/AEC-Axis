# Visão Geral do Projeto

Este projeto, "AEC Axis", é uma aplicação web SaaS (Software as a Service) projetada para otimizar a cadeia de suprimentos da construção civil. O escopo inicial (MVP) é o "Conector BIM-para-Cotação", que automatiza a extração de quantitativos de materiais de arquivos IFC e agiliza o processo de solicitação de cotações a fornecedores.

A arquitetura é baseada em microsserviços com um backend Python (FastAPI) e um frontend TypeScript (React).

# Fontes de Verdade do Projeto

Para garantir a consistência, a seguinte hierarquia de documentação deve ser respeitada:

1.  **PRD.md (Documento de Requisitos de Produto)**: Esta é a fonte canónica e única de verdade para "o quê" estamos a construir. Ele contém a visão do produto, os KPIs, os épicos, as histórias de utilizador detalhadas com critérios de aceitação, os requisitos de sistema, o design das telas e o plano de desenvolvimento. **Toda a implementação de funcionalidades deve seguir estritamente as especificações contidas neste documento.**
2.  **CLAUDE.md (este ficheiro)**: Esta é a constituição técnica do projeto. Define "como" o código deve ser escrito, incluindo a stack tecnológica, a estrutura de ficheiros, os comandos e as convenções de estilo.

# Stack Tecnológico

Aderir estritamente às seguintes tecnologias e versões para garantir a consistência:

  - **Backend:** Python 3.11+, FastAPI 0.111.0+
  - **Frontend:** Node.js 20.x+, React 18+, TypeScript 5.4+
  - **Base de Dados:** PostgreSQL 16+
  - **Infraestrutura:** AWS (S3 para storage, SQS para filas de mensagens)
  - **Infraestrutura como Código (IaC):** Terraform 1.5+
  - **Gestor de Pacotes:** `pip` com `requirements.txt` (Backend), `npm` (Frontend)

# Estrutura de Ficheiros

Aderir à seguinte estrutura de diretórios para manter a organização do código:

```
/
├── .github/workflows/         # Pipelines de CI/CD
├── backend/
│   ├── app/
│   │   ├── api/               # Endpoints da API (FastAPI)
│   │   ├── core/              # Configurações e lógica de negócio central
│   │   ├── db/                # Modelos de dados e sessões do banco de dados
│   │   ├── services/          # Lógica de serviços (ex: processamento IFC)
│   │   └── security.py        # Funções de hash e verificação de senhas
│   ├── tests/                 # Testes unitários e de integração (pytest)
│   └── requirements.txt       # Dependências do backend
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes de UI reutilizáveis
│   │   ├── pages/             # Componentes que representam rotas/páginas completas
│   │   └── services/          # Lógica de chamadas de API para o backend
│   ├── package.json
└── CLAUDE.md                  # Este ficheiro
```

# Comandos Comuns

Utilizar os seguintes comandos para tarefas de desenvolvimento, teste e execução. Não tentar comandos alternativos.

## Backend

```bash
# Instalar dependências
pip install -r backend/requirements.txt

# Iniciar servidor de desenvolvimento
uvicorn backend.app.main:app --reload

# Executar testes
pytest backend/tests
```

## Frontend

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Executar testes
npm test
```

# Diretrizes de Estilo e Convenções

Todo o código gerado deve seguir estas regras para garantir a legibilidade e manutenibilidade:

## Python

  - Seguir rigorosamente o guia de estilo PEP 8.
  - Utilizar `type hints` em todas as assinaturas de funções.
  - Adicionar `docstrings` no formato Google Style para todas as funções e módulos públicos.

## TypeScript/React

  - Utilizar Prettier para formatação automática de código (configurado no projeto).
  - Preferir importações nomeadas (`import { a } from 'b'`) em vez de importações padrão.

## Nomes de Ficheiros

  - Utilizar `kebab-case` para todos os ficheiros (ex: `user-service.ts`, `ifc-processor.py`).

# Etiqueta do Repositório (Git)

Manter um histórico de commits limpo e organizado é fundamental. Seguir este fluxo de trabalho:

## Nomes de Ramos (Branches)

  - `feature/TICKET-123-descricao-curta`
  - `fix/TICKET-456-corrigir-bug-login`
  - `docs/TICKET-789-atualizar-readme`

## Mensagens de Commit

Seguir o formato **Conventional Commits**. Exemplos:

  - `feat: Adicionar endpoint de upload de arquivos IFC`
  - `fix: Corrigir validação de formato de e-mail no registro`
  - `docs: Adicionar documentação da API de projetos`

## Atualização de Ramos

  - Utilizar `git rebase` em vez de `git merge` para atualizar os ramos de funcionalidades a partir do ramo `main`, para manter um histórico linear.