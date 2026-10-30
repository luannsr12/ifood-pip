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
| `src/visibility.js` | Regras de visibilidade de cada informação conforme os eventos |
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

A PiP sempre abre no modo recolhido, sem restaurar o modo da abertura anterior. O expandido solicita 350 px e o recolhido, 390 px de largura; o compacto solicita 142 px de altura. O completo calcula a altura conforme a previsão, os detalhes e os avisos presentes. Cada modo usa sua largura própria, somando a moldura nativa medida para evitar deriva de arredondamento. O compacto mantém a altura de 142 px. A previsão permanece ao lado do status; loja e número do pedido dividem a mesma linha. Abaixo da barra, os dados do entregador aparecem em quatro células de medidas estáveis: nome/foto, veículo e distância com larguras iguais (95 px na largura nominal) e código com 74 px. Sem código ou distância, a respectiva célula permanece vazia e reservada. A distância exibida vem dos metros informados pelo iFood, sem inventar um percurso. Sem entregador, essa linha não existe e a distribuição vertical do conteúdo usa a altura disponível. O nome compacto é primeiro nome e inicial do segundo; o nome completo continua no expandido e no título acessível. A política de altura fixa foi escolhida porque o Chromium exige gesto para redimensionar a PiP. A minutagem fica limitada a dois dígitos; acima de 99 minutos é usada a faixa real da loja. O completo apresenta as etapas com nomes e ícones, a faixa prometida à direita do status durante a entrega, um resumo de uma linha do trajeto e os dados do entregador e código. A previsão principal mantém a faixa da loja antes da saída. Não há grade de detalhes abaixo do código nem linha adicional sobre a origem da estimativa. Mensagens de falha são pequenas e visíveis nos dois modos. Não há card externo nem rolagem.

A presença de um campo na API ou no DOM não basta para exibi-lo. A política em `visibility.js` libera identidade/previsão após a identificação do estado do pedido, dados do entregador após atribuição ou etapa de entrega, trajeto apenas na saída e código somente durante transporte/chegada, nunca após validação ou conclusão. Criação e recebimento não destacam a etapa “Confirmado” antes do evento de confirmação.

O tamanho é calculado ao alternar a PiP, com altura mínima de 280 px no expandido para acomodar eventos posteriores sem depender de redimensionamento automático. Se novas informações chegam enquanto uma janela completa curta permanece aberta, entregador e código podem compartilhar uma linha. A faixa da loja permanece junto ao status no card. O teste de eventos percorre oito transições nos três idiomas mantendo a altura inicial, sem cliques artificiais de redimensionamento. A linha de código mantém separação visual do rodapé; a chave usa o vermelho dos demais ícones. O verde das barras é compartilhado pelos dois modos.

A alternância atualiza o mesmo DOM e chama `resizeTo()` diretamente no clique. As medidas externas são obtidas após dois frames de renderização ou no primeiro clique de alternância: medir logo na resolução de `requestWindow()` pode retornar dimensões transitórias. A moldura externa medida é somada à largura de cada modo para evitar deriva por arredondamento em escalas fracionárias do Windows. O teste verifica coordenadas de tela ao alternar repetidamente. A extensão não fecha/reabre a PiP para alternar e permite que o navegador preserve sua colocação anterior (`preferInitialWindowPlacement: false`).

A API bloqueia `moveTo()` e `moveBy()`: a posição inicial e o encaixe exato no canto pertencem ao navegador/usuário. Não existe promessa de reposicionar programaticamente a janela em outros navegadores. A API de abertura existe desde Chrome 116; redimensionamento por gesto está disponível desde Chrome 121. Referência: [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) e [restrições de posicionamento](https://wicg.github.io/document-picture-in-picture/#positioning).

Polling automático a cada 60 s, com timers e fetch na PiP. Atualizações recentes do site adiam a consulta independente; HTTP 429 também usa 60 s. A atualização manual pode consultar imediatamente. Trocar idioma ou modo não agenda timers, descarta dados nem repete requisições. Fechar a PiP limpa o timer de consulta e o relógio de renderização. Sair da página desconecta o observador e limpa os timers de navegação/DOM. Não há alteração dos endpoints ou dos headers capturados.

`pollFailures` conta falhas consecutivas, incluindo HTTP, rede e formato inválido. Uma consulta bem-sucedida zera a contagem. Na quarta falha, nenhum novo timer é agendado e o botão Atualizar é desabilitado; fechar e reabrir a PiP não contorna essa pausa. Uma resposta válida observada na página zera as falhas e permite retomar. Conclusão ou cancelamento, vindos dos eventos ou do status explícito na página, marcam `pollCompleted` e encerram consultas automáticas e manuais para o pedido. A navegação para outro pedido limpa esses estados. As requisições realizadas pelo próprio site não são bloqueadas.

Mudanças de URL no mesmo documento são detectadas pelo evento `navigation.currententrychange`, sem sobrescrever `history.pushState` ou `replaceState`, e por `popstate`. O observador do DOM e a checagem periódica existente permanecem como apoio. Ao sair da rota, o botão é ocultado e a PiP é fechada; voltar não reinstala os interceptadores de tráfego. Uma restauração do documento por BFCache reativa apenas o acompanhamento de navegação/DOM, depois da limpeza de `pagehide`.

## Testes e depuração

### Simulação interativa em tempo real

`npm run simulate:realtime` abre um perfil isolado do Edge com a extensão real e uma página de pedido fictício. Requer Playwright instalado (ou disponível em `NODE_PATH`). Todo o tráfego desse contexto é interceptado; não usa conta, pagamento ou API real do iFood. A PiP usa o mesmo adaptador de transporte sintético dos testes, preservando seus timers e interface reais.

Ao iniciar, o pedido recebe um UUID e o horário atual. A janela da loja é de T+20 a T+30 minutos. Timers Node.js em `tests/simulation/scenario.cjs` emitem confirmação em 30 s, preparo em 2 min, atribuição em 8 min, chegada à loja em 12 min, retirada em 14 min, saída em 15 min, chegada ao destino em 22 min e conclusão em 23 min e 30 s. A rota fictícia de 2,2 km foi escolhida para uma estimativa aproximada de 8 minutos após a saída.

Os payloads também são progressivos: não incluem entregador antes da atribuição, trajeto antes da saída nem código antes do evento de geração na saída. O código é validado aos 23 minutos e deixa de aparecer. O cenário não pré-carrega informações futuras na interface.

O painel mostra relógio, agenda e eventos realizados, permite reiniciar o pedido ou encerrar a simulação e oferece pausa das consultas da aba para observar o polling independente da PiP. Fechar só a PiP não reinicia o cenário; fechar a aba encerra o ambiente. Logs, estado e capturas iniciais ficam em `test-results/realtime/`, ignorado pelo Git. Nenhum arquivo do simulador entra no ZIP de produção.

`npm test` cobre contratos dos catálogos, preferências, fallback, interpolação, normalização, progressão sem regressão, código validado, estimativas e agendamento. Os dados são sintéticos.

`npm run test:navigation` usa Playwright/Edge para verificar página inicial → acompanhamento sem reload, mudanças de URL sem mutação de DOM, voltar/avançar, `replaceState`, recriação do botão após substituição do body, ausência de duplicatas, permanência do mesmo interceptador de fetch e acesso direto/recarregado. O navegador usa perfil temporário e respostas sintéticas.

`npm run test:events` simula todos os 27 marcos reconhecidos e três casos de metadados (código gerado, código validado e ETA atualizado), nos dois modos. As 60 capturas, o relatório JSON e uma galeria comparativa são gerados em `test-results/events/`. O teste confere faixa completa antes da saída, contagem somente na fase de entrega, SVGs de fallback, código validado oculto, ausência de chaves de tradução, de sobreposição entre status/entregador e de rolagem.

`node tests/browser.cjs` é um teste opcional com Playwright e Edge instalados. Pode usar `NODE_PATH` para uma instalação existente do Playwright. Ele carrega a extensão pelo manifest em um perfil temporário, simula o site e as respostas HTTP e captura os layouts em `test-results/` (ignorado pelo Git). Na PiP, o adaptador `fetch` é simulado em memória porque a interceptação HTTP do Playwright não respondeu corretamente nesse alvo auxiliar; Request, headers, callbacks, timers e DOM são os da extensão real. Não utiliza a conta nem pedidos reais. O perfil temporário é removido ao terminar.

Para depurar manualmente, recarregue a extensão em `edge://extensions` ou `chrome://extensions`, recarregue o pedido e inspecione separadamente a aba e a janela PiP. Confira a origem das consultas, o intervalo, o encerramento, nomes longos, dados ausentes, HTTP 429, storage bloqueado, preferências e ambos os tamanhos. Não copie headers de sessão para logs ou issues.
