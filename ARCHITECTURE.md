# Desenvolvimento do iFood PiP

## Organização

O manifest executa `content.js` no mundo `MAIN`, em `document_start`, nas páginas de `https://www.ifood.com.br/*`. A inicialização precisa preceder a navegação interna da página inicial até o pedido: limitar o match a `/pedido/*` deixava o script ausente no documento SPA e exigia F5. O botão e a abertura da PiP continuam restritos a `/pedido/<id>/acompanhar`. A observação de `fetch` e XHR permanece no mesmo contexto, antes das primeiras consultas do pedido. Credenciais continuam apenas em memória.

| Fonte | Responsabilidade |
| --- | --- |
| `src/app.js` | Inicialização, composição dos módulos, navegação e ciclo de vida da PiP |
| `src/launcher.js` | Botão da página e feedback no Shadow DOM |
| `src/traffic.js` | Observação de fetch/XHR, captura de detalhes e repetição autenticada |
| `src/polling.js` | Um único timer na PiP, exclusão de consultas simultâneas e tratamento de falhas |
| `src/order.js` | Normalização, conciliação de etapas, distâncias e resumo de eventos |
| `src/page.js` | Leitura complementar do DOM do iFood |
| `src/arrival.js` | Regras de previsão e estimativa de percurso |
| `src/view.js`, `src/pip.css` | DOM e apresentação dos modos completo e compacto |
| `src/preferences.js` | Preferências locais validadas e tolerância a storage indisponível |
| `src/i18n.js`, `src/format.js` | Mensagens, interpolação e formatação com Intl |

Cada módulo recebe suas dependências explicitamente. Existe um estado de sessão privado, criado pela inicialização; regras de eventos não acessam esse estado. Não há objetos adicionados ao escopo global, mensagens entre mundos ou dependências de frameworks.

## Build e Manifest V3

`node scripts/build.cjs` gera um único script clássico estático, com um pequeno carregador local de módulos CommonJS. Não há `eval`, importações dinâmicas, servidor ou dependências de build. Isso evita presumir suporte a módulos ES no carregamento declarativo de content scripts.

Os três catálogos e o CSS são incorporados no pacote. `_locales` é a única fonte editável de traduções; o build apenas gera a cópia distribuída. Não é necessário expor arquivos com `web_accessible_resources`, buscar traduções pelo site ou solicitar permissões. `chrome.i18n.getMessage()` continua sendo usado implicitamente pelo manifest para nome/descrição; a interface usa os catálogos para permitir escolher outro idioma.

Depois de editar fontes, execute:

```sh
npm run build
npm test
npm run check
git diff --check
```

O pacote gerado é versionado para permitir carregar a extensão sem ferramentas de desenvolvimento. `npm run check` detecta pacote desatualizado.

## Internacionalização

Adicione a mesma chave semântica aos três `_locales/*/messages.json`, no formato Chrome `{ "message": "..." }`. Mensagens dinâmicas usam placeholders nomeados como `$count$` e a declaração Chrome `placeholders` correspondente. Consuma com `t('pip_expand')` ou `t(message('order_arrives', {count: 5}))`. Use `textContent` para inserir conteúdo dinâmico.

O idioma padrão é português brasileiro. Preferências válidas anteriores (`pt`, `en`, `es`) são preservadas. Mensagens ausentes no idioma selecionado caem em português; os testes exigem catálogos completos. As durações atuais usam a unidade invariável `min`; o tradutor também aceita uma mensagem `<chave>_one` para a forma singular, quando necessária. Horários e números são formatados separadamente, com Intl e o locale escolhido.

As expressões em português que permanecem em `page.js` são contratos de reconhecimento da página do iFood, não traduções de interface. Nomes, códigos e dados do serviço não são traduzidos. Eventos e consultas guardam timestamps numéricos, formatados somente na apresentação.

## Previsão e eventos de entrega

Antes de `DISPATCHED`/`GOING_TO_DESTINATION` (incluindo o alias `DELIVERY_GOING_TO_DESTINATION`), a interface mantém a faixa inteira fornecida pela loja. Um `newEta` isolado não substitui a faixa por horário final nem por minutos restantes. Mesmo quando a faixa termina, ela continua visível, com indicação de atraso por cor, sem um contador pré-saída.

`COLLECTED` e `DELIVERY_COLLECTED` representam retirada na loja e permanecem na fase anterior à saída; `collectedAt` não serve como início da estimativa de trajeto. O relógio é ancorado no primeiro timestamp válido de saída/ida ao destino. Atualização, eventos posteriores, mudança de modo e reabertura não reiniciam essa referência. Se faltarem horário de saída, distância ou veículo, não é fabricada uma contagem.

Os estados do entregador preservam os rótulos de atribuição, aceite, deslocamento, chegada à loja e retirada, em vez de apresentar todos como “indo ao restaurante”. Imagens ausentes usam SVGs locais de loja e retrato de entregador; o fallback permanece enquanto uma imagem real carrega. O compacto mostra o retrato e o nome resumidos, reutilizando o mesmo componente do completo.

## Modos e ciclo de vida

O primeiro uso mantém o modo completo. Ambos solicitam 350 px de largura: o compacto pede 164 px de altura e o completo, 310 px. A largura compartilhada mantém a ancoragem horizontal durante a alternância. O compacto tem uma grade própria: identidade e marca no topo, status e previsão lado a lado, barra com quatro etapas e ícones, controles na base. O código substitui a previsão quando o entregador chega. Detalhes do percurso, entregador e mensagens extensas ficam no completo; erros no compacto têm indicador curto e descrição acessível. Não há card externo nem rolagem nos dois modos. A preferência é independente do pedido e salva em `ifood-pip-mode`.

A alternância atualiza o mesmo DOM e chama `resizeTo()` diretamente no clique. As medidas externas são obtidas no primeiro clique de alternância, depois que a moldura nativa está visível: medir logo na resolução de `requestWindow()` pode retornar dimensões transitórias. A largura externa é reutilizada para evitar deriva por arredondamento em escalas fracionárias do Windows. O teste verifica coordenadas de tela ao alternar repetidamente. A extensão não fecha/reabre a PiP para alternar e permite que o navegador preserve sua colocação anterior (`preferInitialWindowPlacement: false`).

A API bloqueia `moveTo()` e `moveBy()`: a posição inicial e o encaixe exato no canto pertencem ao navegador/usuário. Não existe promessa de reposicionar programaticamente a janela em outros navegadores. A API de abertura existe desde Chrome 116; redimensionamento por gesto está disponível desde Chrome 121. Referência: [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) e [restrições de posicionamento](https://wicg.github.io/document-picture-in-picture/#positioning).

Polling continua a cada 20 s, com timers e fetch na PiP. Atualizações recentes do site adiam a consulta independente; HTTP 429 usa 60 s. Trocar idioma ou modo não agenda timers, descarta dados nem repete requisições. Fechar a PiP limpa o timer de consulta e o relógio de renderização. Sair da página desconecta o observador e limpa os timers de navegação/DOM. Não há alteração dos endpoints ou dos headers capturados.

Mudanças de URL no mesmo documento são detectadas pelo evento `navigation.currententrychange`, sem sobrescrever `history.pushState` ou `replaceState`, e por `popstate`. O observador do DOM e a checagem periódica existente permanecem como apoio. Ao sair da rota, o botão é ocultado e a PiP é fechada; voltar não reinstala os interceptadores de tráfego. Uma restauração do documento por BFCache reativa apenas o acompanhamento de navegação/DOM, depois da limpeza de `pagehide`.

## Testes e depuração

`npm test` cobre contratos dos catálogos, preferências, fallback, interpolação, normalização, progressão sem regressão, código validado, estimativas e agendamento. Os dados são sintéticos.

`npm run test:navigation` usa Playwright/Edge para verificar página inicial → acompanhamento sem reload, mudanças de URL sem mutação de DOM, voltar/avançar, `replaceState`, recriação do botão após substituição do body, ausência de duplicatas, permanência do mesmo interceptador de fetch e acesso direto/recarregado. O navegador usa perfil temporário e respostas sintéticas.

`npm run test:events` simula todos os 27 marcos reconhecidos e três casos de metadados (código gerado, código validado e ETA atualizado), nos dois modos. As 60 capturas, o relatório JSON e uma galeria comparativa são gerados em `test-results/events/`. O teste confere faixa completa antes da saída, contagem somente na fase de entrega, SVGs de fallback, código validado oculto, ausência de chaves de tradução, de sobreposição entre status/entregador e de rolagem.

`node tests/browser.cjs` é um teste opcional com Playwright e Edge instalados. Pode usar `NODE_PATH` para uma instalação existente do Playwright. Ele carrega a extensão pelo manifest em um perfil temporário, simula o site e as respostas HTTP e captura os layouts em `test-results/` (ignorado pelo Git). Na PiP, o adaptador `fetch` é simulado em memória porque a interceptação HTTP do Playwright não respondeu corretamente nesse alvo auxiliar; Request, headers, callbacks, timers e DOM são os da extensão real. Não utiliza a conta nem pedidos reais. O perfil temporário é removido ao terminar.

Para depurar manualmente, recarregue a extensão em `edge://extensions` ou `chrome://extensions`, recarregue o pedido e inspecione separadamente a aba e a janela PiP. Confira a origem das consultas, o intervalo, o encerramento, nomes longos, dados ausentes, HTTP 429, storage bloqueado, preferências e ambos os tamanhos. Não copie headers de sessão para logs ou issues.
