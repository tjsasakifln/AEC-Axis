## FEATURE:
Implementar um visualizador 3D interativo para arquivos IFC na página de detalhes do projeto. O visualizador deve carregar o modelo IFC associado ao projeto e renderizá-lo em um canvas WebGL, permitindo que o usuário navegue (zoom, pan, órbita) pelo modelo 3D diretamente no navegador.

## REQUISITOS TÉCNICOS:
- **Frontend:**
  - [cite_start]A integração deve ocorrer no componente `frontend/src/pages/project-detail.tsx`.
  - Utilizar a biblioteca **Three.js** para a criação da cena 3D e renderização.
  - Utilizar a biblioteca **IFC.js (web-ifc-viewer)** para carregar, processar e exibir a geometria do arquivo .ifc.
  - O visualizador deve ser contido em um novo componente React, por exemplo, `frontend/src/components/ifc-viewer.tsx`.
  - Adicionar um estado de "loading" enquanto o modelo 3D está sendo carregado e processado.
- **Backend:**
  - Nenhuma alteração direta nos endpoints é necessária para o MVP desta feature. O frontend irá solicitar o arquivo IFC já armazenado (provavelmente via S3) e processá-lo no lado do cliente.
  - [cite_start]O `backend/app/worker.py` [cite: 98] [cite_start]e o `backend/app/services/ifc_service.py` [cite: 99] servem como referência de como os dados do IFC são manipulados, mas o parsing para visualização será feito no cliente com IFC.js.

## DOCUMENTATION:
- **IFC.js Documentation:** A IA deve consultar a documentação oficial do IFC.js para entender a API do `web-ifc-viewer`, especialmente os métodos de carregamento de modelo (`loadIfcUrl`) e navegação. (Link: https://ifcjs.github.io/info/docs/Guide/web-ifc-viewer/Introduction)
- **Three.js Documentation:** Usar como referência para manipulação da cena, câmera e controles. (Link: https://threejs.org/docs/)

## EXAMPLES:
- [cite_start]Siga o padrão de componentes funcionais do React e hooks, como visto em `frontend/src/components/materials-table.tsx` [cite: 25] [cite_start]e `frontend/src/pages/project-detail.tsx`.
- [cite_start]A estrutura de comunicação com a API para buscar a URL do arquivo IFC deve seguir o padrão estabelecido em `frontend/src/services/api.ts`[cite: 15].

## OTHER CONSIDERATIONS:
- **Performance:** A implementação deve ser otimizada para carregar e renderizar modelos IFC de forma eficiente. O uso de Web Workers pelo IFC.js é altamente recomendado para não bloquear a thread principal do navegador.
- **Testes:** Conforme apontado na análise estratégica, a cobertura de testes no frontend é uma prioridade. É **obrigatório** criar testes para o novo componente `ifc-viewer.tsx`. Os testes devem verificar:
  - Se o componente renderiza o canvas.
  - Se o estado de "loading" é exibido corretamente.
  - Se a função de carregamento do modelo é chamada após a renderização do componente.
- **Gerenciamento de Memória:** Garantir que a cena 3D e os recursos do WebGL sejam devidamente descartados (`dispose`) quando o componente for desmontado para evitar vazamentos de memória (memory leaks).