# Documento de Requisitos de Produto (PRD) - AEC Axis MVP v1.0

## 1. Visão Geral e Estratégia

### Objetivos de Negócio
O objetivo principal deste produto é transformar a gestão da cadeia de suprimentos na construção civil de um centro de custo reativo para uma fonte proativa de vantagem competitiva. Para este MVP, nosso objetivo quantificável é reduzir em 80% o tempo gasto por Gerentes de Suprimentos na tarefa específica de extrair quantitativos de modelos BIM e solicitar cotações iniciais.

### Enquadramento Estratégico
Este projeto ataca o ponto cego de US$ 1,6 trilhão da indústria da construção: a interface arcaica entre projeto, suprimentos e logística. Nossa tese contrariante é que o maior ganho de produtividade reside em comprar e movimentar materiais de forma mais inteligente.

O projeto se alinha com três ondas de mercado que criam uma urgência única:
- A mandatoriedade da digitalização (Decreto BIM nº 11.888/2024)
- A ascensão da construção industrializada
- O imperativo de conformidade ESG

### Métricas de Sucesso (KPIs)
O sucesso do MVP será medido pelos seguintes indicadores:

**KPI Primário (Adoção de Mercado):**
- Garantir a participação de 10 construtoras de médio porte no "Programa Fundadores" dentro do primeiro trimestre após o lançamento do MVP.

**KPI Secundário (Engajamento):**
- Atingir a marca de 100 Pedidos de Cotação (RFQs) gerados através da plataforma dentro do mesmo período.

**KPI Terciário (Qualidade):**
- Manter uma taxa de sucesso de 95% no processamento de arquivos IFC válidos enviados por nossos usuários do programa fundador.

## 2. Persona e Jornada do Utilizador

### Persona Primária: O Usuário-Campeão
**Gerente de Suprimentos/Compras:** Este profissional vive pressionado por custo, prazo e qualidade. Sua rotina diária é um caos de telefonemas, e-mails e planilhas para rastrear pedidos, negociar com fornecedores e apagar incêndios quando materiais atrasam ou chegam com especificações erradas. Ele é frequentemente responsabilizado por atrasos, mas carece das ferramentas para garantir previsibilidade.

### Épicos e Histórias de Utilizador

#### **Épico 1: Gestão de Projetos e Arquivos**
**História 1.1: Criação de um Novo Projeto**
- **Como** Gerente de Suprimentos, **quero** criar um novo projeto com nome, endereço e data de início, **para** organizar meus arquivos e cotações.
- **Critérios de Aceitação (AC):**
    - AC 1: A interface deve apresentar um formulário para criação de projeto contendo os campos: `name` (Texto, obrigatório), `address` (Texto, opcional) e `start_date` (Seletor de Data, opcional).
    - AC 2: Ao submeter o formulário, um novo registro de projeto é criado no banco de dados, associado à `company_id` do usuário autenticado.
    - AC 3: Após a criação bem-sucedida, o usuário é redirecionado para a página do projeto recém-criado.
- **Casos de Exceção (EC):**
    - EC 1: Se o campo `name` estiver em branco, uma mensagem de validação "O nome do projeto é obrigatório" deve ser exibida.
    - EC 2: Em caso de falha de rede, uma notificação de erro "Falha na comunicação com o servidor. Verifique sua conexão e tente novamente" deve ser exibida.

**História 1.2: Upload de Arquivo IFC**
- **Como** Gerente de Suprimentos, **quero** fazer o upload de um arquivo IFC para um projeto existente, **para que** a plataforma possa processá-lo.
- **Critérios de Aceitação (AC):**
    - AC 1: A interface de upload deve suportar arrastar e soltar (drag-and-drop) e seleção via explorador de arquivos, com validação síncrona de formato (`.ifc`), tamanho (máx. 500 MB) e compatibilidade (IFC 2x3, IFC4).
    - AC 2: Uma barra de progresso visual deve ser exibida em tempo real durante o upload para o storage.
    - AC 3: Após o upload bem-sucedido, o arquivo deve aparecer na lista de arquivos do projeto com o status "Processando".
- **Casos de Exceção (EC):**
    - EC 1: Se o arquivo exceder 500 MB, exibir: "Erro: O arquivo excede o limite de 500MB".
    - EC 2: Se o formato não for `.ifc`, exibir: "Erro: Formato de arquivo inválido. Por favor, envie um arquivo .ifc".
    - EC 3: Se a verificação de integridade no backend falhar, o status do arquivo deve ser "Erro", com a mensagem: "Erro: O arquivo parece estar corrompido ou não é um arquivo IFC válido".
    - EC 4: Se a conexão for interrompida durante o upload, exibir: "Erro: Falha no upload. Verifique sua conexão com a internet e tente novamente".

#### **Épico 2: Extração e Verificação de Quantitativos**
**História 2.1: Processamento Automático do IFC**
- **Como** Gerente de Suprimentos, **quero** que a plataforma processe o arquivo IFC e extraia automaticamente os quantitativos de materiais, **para** eliminar a extração manual.
- **Critérios de Aceitação (AC):**
    - AC 1: O status do arquivo na UI deve mudar de "Processando" para "Concluído" (ou "Erro") em tempo real via WebSocket.
    - AC 2: Os quantitativos extraídos devem ser persistidos no banco de dados, associados ao `ifc_file_id`.
    - AC 3: A lógica de extração deve identificar elementos relevantes (e.g., IfcBeam, IfcColumn, IfcWall) e extrair quantidades com base em materiais associados (foco em aço e concreto pré-moldado).

**História 2.2: Visualização e Edição de Quantitativos**
- **Como** Gerente de Suprimentos, **quero** visualizar os quantitativos extraídos em uma tabela, com a opção de editar ou remover itens, **para** garantir a precisão antes de solicitar cotações.
- **Critérios de Aceitação (AC):**
    - AC 1: Quando um arquivo IFC estiver "Concluído", uma tabela de materiais deve ser exibida com as colunas editáveis: "Descrição", "Quantidade" e "Unidade".
    - AC 2: Cada linha da tabela deve ter um ícone de "lixeira" para remover o item, com um diálogo de confirmação.
    - AC 3: Todas as edições e remoções devem ser salvas de forma assíncrona, com feedback visual de sucesso.

#### **Épico 3: Gestão de Fornecedores e Geração de RFQ**
**História 3.1: Cadastro de Fornecedores**
- **Como** Gerente de Suprimentos, **quero** adicionar fornecedores à minha conta com Nome, CNPJ e e-mail.
- **Critérios de Aceitação (AC):**
    - AC 1: A plataforma deve fornecer uma interface CRUD completa para fornecedores, associados à `company_id` do usuário.
    - AC 2: O formulário de cadastro deve conter os campos: `name` (Texto, obrigatório), `cnpj` (Texto, obrigatório, com validação de formato e unicidade), e `email` (Texto, obrigatório, com validação de formato).

**História 3.2: Geração de Pedido de Cotação (RFQ)**
- **Como** Gerente de Suprimentos, **quero** selecionar materiais, selecionar fornecedores e gerar um Pedido de Cotação (RFQ) com um único clique, **para** otimizar meu tempo.
- **Critérios de Aceitação (AC):**
    - AC 1: A tabela de materiais deve incluir um checkbox em cada linha.
    - AC 2: A interface deve permitir a seleção de um ou mais fornecedores cadastrados.
    - AC 3: Um botão "Gerar RFQ" deve permanecer desabilitado até que pelo menos um material e um fornecedor sejam selecionados.
    - AC 4: Ao clicar em "Gerar RFQ", o sistema deve criar os registros `rfqs` e `rfq_items` e disparar um e-mail com um link único e seguro para cada fornecedor selecionado.

#### **Épico 4: Recebimento e Comparação de Cotações**
**História 4.1: Preenchimento da Cotação pelo Fornecedor**
- **Como** Fornecedor, **quero** receber um e-mail com um link único para uma página onde posso preencher preços e prazos, sem precisar criar uma conta.
- **Critérios de Aceitação (AC):**
    - AC 1: O e-mail deve conter um link com um JSON Web Token (JWT) como parâmetro de autenticação.
    - AC 2: A página acessada deve exibir os detalhes do RFQ e uma tabela de materiais, sem revelar outros fornecedores.
    - AC 3: Para cada item, devem existir campos para `price` (numérico, moeda) e `lead_time_days` (inteiro).
    - AC 4: Ao submeter, os dados são salvos nas tabelas `quotes` e `quote_items`, e o link de acesso se torna inválido para submissões futuras.

**História 4.2: Dashboard Comparativo de Cotações**
- **Como** Gerente de Suprimentos, **quero** visualizar todas as cotações recebidas em um dashboard comparativo, **para** tomar a melhor decisão de compra.
- **Critérios de Aceitação (AC):**
    - AC 1: Uma nova seção na página do projeto deve exibir o dashboard comparativo para cada RFQ.
    - AC 2: O dashboard deve ser uma matriz com materiais nas linhas e fornecedores nas colunas.
    - AC 3: Cada célula deve exibir o `price` e `lead_time_days` ofertados.
    - AC 4: O cabeçalho de cada coluna de fornecedor deve exibir o nome e seu `reliability_score` (valor estático no MVP).
    - AC 5: Para cada linha, a célula com o menor preço deve ser destacada visualmente (e.g., fundo verde claro).

## 3. Escopo da Solução

### Funcionalidades (O que está dentro)
O escopo do MVP está estritamente limitado à funcionalidade "Conector BIM-para-Cotação":
1.  **Autenticação e Gestão de Contas:** Autenticação de usuário e gestão de contas de empresa.
2.  **Gestão de Projetos:** Criação e gestão de projetos.
3.  **Processamento IFC:** Upload, validação, processamento assíncrono e interface de edição de quantitativos extraídos.
4.  **Gestão de Fornecedores:** CRUD de fornecedores e interface pública para submissão de cotações.
5.  **Sistema de Cotações:** Geração de RFQs e dashboard comparativo em tempo real.

### Não-Objetivos (O que está fora)
- Cálculo dinâmico do "Score de Confiabilidade" do Fornecedor (será um valor estático/placeholder).
- Integração com sistemas ERP ou financeiros.
- Funcionalidades de gestão de pedidos de compra (Purchase Orders) ou controle de estoque.
- Qualquer tipo de aplicativo móvel.
- Módulos de gestão financeira, de cronograma ou de mão de obra.
- Suporte a outros formatos de arquivo além do IFC.

## 4. Requisitos de Sistema e Lógica de Negócio

### Arquitetura e Fluxo de Dados Essencial
O sistema utilizará uma arquitetura de microsserviços desacoplados. O pipeline de processamento IFC, a operação mais intensiva, será assíncrono para garantir a responsividade da interface do usuário.
1.  **Upload:** O frontend valida formato/tamanho e faz o upload do arquivo `.ifc` diretamente para um storage de arquivos (e.g., AWS S3) usando uma URL pré-assinada.
2.  **Enfileiramento:** O microsserviço de Projetos envia uma mensagem para uma fila (e.g., AWS SQS) contendo o ID do arquivo.
3.  **Processamento:** Um microsserviço "worker" independente consome a mensagem da fila, baixa o arquivo do storage e usa a biblioteca `IfcOpenShell` para extrair os quantitativos.
4.  **Persistência:** Os dados extraídos são salvos no banco de dados (PostgreSQL), e o status do arquivo é atualizado para "Concluído" ou "Erro".
5.  **Notificação:** O worker publica um evento que é enviado via WebSocket para o frontend, atualizando a interface do usuário em tempo real.

### Requisitos de Dados e Modelo de Entidades
O sistema utilizará um banco de dados PostgreSQL. As entidades centrais são:
- **`users`**: Armazena dados dos usuários e sua associação a uma `company`.
- **`companies`**: Armazena dados das empresas clientes.
- **`projects`**: Contém informações dos projetos, associados a uma `company`.
- **`ifc_files`**: Rastreia os arquivos enviados, seu caminho no storage e o status do processamento.
- **`materials`**: Armazena os quantitativos extraídos de um `ifc_file`.
- **`suppliers`**: Lista de fornecedores, associados a uma `company`.
- **`rfqs`**: Registra um Pedido de Cotação, associado a um `project`.
- **`rfq_items`**: Tabela de junção que conecta `materials` a um `rfq`.
- **`quotes`**: Resposta de um `supplier` a um `rfq`.
- **`quote_items`**: Detalhes de preço e prazo para cada item em uma `quote`.

### Lógica de Negócio Crítica
**Segurança do Link de Cotação:** Para garantir a integridade do processo de cotação e evitar submissões múltiplas, o link enviado ao fornecedor usará um JWT com um identificador único (`jti`). Ao receber a cotação, o sistema verifica a validade do token e armazena o `jti` utilizado. Qualquer tentativa subsequente de usar um token com o mesmo `jti` será rejeitada, tornando o link de uso único.

### Requisitos de Desempenho
- **Processamento de Arquivos:** O pipeline de processamento assíncrono de IFC deve ser capaz de processar um arquivo IFC de 100MB em menos de 5 minutos, desde o final do upload até a notificação de conclusão ao usuário.
- **Tempo de Resposta da API:** Todos os endpoints da API para interações de usuário (criação de projeto, geração de RFQ, etc.) devem ter um tempo de resposta p95 (percentil 95) inferior a 200ms.

### Conformidade e Segurança
- **Privacidade de Dados:** O sistema deve ser tratado em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil.
- **Confidencialidade Comercial:** Os dados de cotações são comercialmente sensíveis. A arquitetura deve garantir que um fornecedor nunca possa visualizar os dados de outro.

## 5. Design e Fluxo de Telas (Wireframes em Texto)

### Tela 1: Dashboard de Projetos (`/projects`)
- **Header:** [Logo "AEC Axis"] [Menu: "Projetos"] [Espaçamento] [Ícone de Notificações]
- **Conteúdo Principal:**
    - **Título:** `<h1>Meus Projetos</h1>`
    - **Ação:** Botão `[+ Novo Projeto]` que abre um modal de criação.
    - **Tabela de Projetos:**
        - **Estado Padrão:** Tabela com colunas: "NOME DO PROJETO", "STATUS", "DATA DE CRIAÇÃO", "AÇÕES". Cada linha é clicável e navega para a página do projeto.
        - **Estado Vazio:** Componente com ícone, `<h2>Você ainda não tem projetos.</h2>` e `<p>Clique em "+ Novo Projeto" para começar.</p>`.

### Tela 2: Página de um Projeto (`/projects/{projectId}`)
- **Seção 1: Arquivos IFC**
    - **Título:** `<h2>Arquivos BIM (IFC)</h2>`
    - **Upload:** Área de "arrastar e soltar" com texto "Arraste e solte seu arquivo .ifc aqui, ou clique para selecionar". Informação de "Tamanho máximo: 500MB".
    - **Lista de Arquivos:** Colunas: "NOME DO ARQUIVO", "DATA DO UPLOAD", "STATUS".
        - **Status "Processando":** Texto com ícone de spinner animado.
        - **Status "Concluído":** Texto com ícone de check verde.
        - **Status "Erro":** Texto com ícone de alerta vermelho; um tooltip exibe a mensagem de erro.
- **Seção 2: Quantitativos Extraídos**
    - **Visibilidade:** Renderizada apenas se houver um arquivo "Concluído".
    - **Título:** `<h2>Quantitativos de Materiais</h2>`
    - **Ações:** Botão `[Gerar Cotação]`, inicialmente desabilitado.
    - **Tabela de Materiais:** Colunas: [Checkbox], "MATERIAL (DESCRIÇÃO)", "QUANTIDADE", "UNIDADE", "AÇÕES" (ícone de lixeira). Campos editáveis in-loco. O botão "Gerar Cotação" é habilitado quando um ou mais checkboxes são marcados.

### Tela 3: Dashboard Comparativo de Cotações (Renderizado na Página do Projeto)
- **Visibilidade:** Renderizada apenas se houver pelo menos um RFQ gerado.
- **Header:** `<h2>Comparativo de Cotações - RFQ #{rfq.id}</h2>`
- **Conteúdo Principal:** Tabela/matriz.
    - **Cabeçalho:** Primeira coluna fixa "MATERIAL". Colunas subsequentes dinâmicas para cada fornecedor que respondeu. O cabeçalho da coluna do fornecedor exibe `<strong>{supplier.name}</strong>` e `<span>Score: {supplier.reliability_score}%</span>`.
    - **Linhas:** Cada linha é um material do RFQ.
    - **Células de Dados:** Na interseção material/fornecedor, exibe `<strong>Preço: R$ {quote_item.price}</strong>` e `<span>Prazo: {quote_item.lead_time_days} dias</span>`.
    - **Destaque Visual:** A célula com o menor `price` em cada linha deve ter um fundo verde claro.

## 6. Plano de Desenvolvimento Faseado

### Fase 1 (Sprints 1-2): Fundação, Autenticação e Gestão de Projetos
- **Objetivo:** Estabelecer a infraestrutura, banco de dados e funcionalidades essenciais de contas e projetos.
- **Entregáveis:** Infraestrutura de nuvem, schema do DB, microsserviço de autenticação, CRUD de projetos, frontend para Login, Registro e Dashboard de Projetos (Tela 1).

### Fase 2 (Sprints 3-4): O Coração do Processamento IFC
- **Objetivo:** Implementar o pipeline completo de processamento de arquivos IFC.
- **Entregáveis:** Lógica de upload para storage, configuração de fila de mensagens (SQS), worker de processamento com IfcOpenShell, serviço de notificação WebSocket, frontend da Página de Projeto (Tela 2) com upload e visualização de status em tempo real.

### Fase 3 (Sprints 5-6): Da Cotação à Resposta do Fornecedor
- **Objetivo:** Construir o fluxo de criação de RFQs e a interface pública para fornecedores.
- **Entregáveis:** CRUD de fornecedores, lógica de criação de RFQ, integração com serviço de e-mail, lógica de geração de token JWT de uso único, página pública para submissão de cotações, endpoint de backend para receber cotações com validação de `jti`.

### Fase 4 (Sprints 7-8): A Entrega de Valor e Refinamento
- **Objetivo:** Entregar a visualização comparativa e refinar a experiência do usuário.
- **Entregáveis:** Frontend do Dashboard Comparativo (Tela 3) populado em tempo real, lógica de destaque visual, placeholder do score, ciclo de refinamento de UI/UX, configuração de logging/monitoramento básicos.

## 7. Contexto Adicional

### Pressupostos
- Assumimos que as empresas no nosso nicho "cabeça de ponte" utilizam BIM e podem exportar modelos para o formato IFC.
- Assumimos que a biblioteca de código aberto `IfcOpenShell` é suficientemente robusta para analisar os arquivos IFC gerados pelas ferramentas de software mais comuns.
- Assumimos que os fornecedores estarão dispostos a interagir com um link de cotação digital enviado por e-mail.

### Questões Abertas
- Qual é a lista exata e priorizada de materiais e suas unidades padrão a serem extraídos para o nicho de galpões logísticos?
- Qual serviço de terceiros será utilizado para o envio de e-mails transacionais (e.g., AWS SES, SendGrid)?
- Como será a estrutura de precificação do AEC Axis após o término do "Programa Fundadores"?