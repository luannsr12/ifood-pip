# Validação da refatoração — 30/10/2026

## Executado

- Regressão de navegação SPA: página inicial → acompanhamento sem F5, atualização apenas da URL, voltar/avançar, `replaceState`, substituição do body, ausência de botões/interceptadores duplicados, acesso direto e reload passaram no Edge com injeção real pelo manifest.
- O ciclo `pagehide`/`pageshow` com `persisted: true` foi simulado duas vezes no teste de navegação para conferir a reativação dos listeners sem reinstalar fetch. Isso não significa que o navegador utilizou seu BFCache real durante o teste.
- O teste completo da PiP também começa na página inicial e navega internamente para o pedido antes de capturar a primeira requisição. Não usa recarregamento nem injeção manual de script.

- `npm run build`, `npm test` (14 testes), `npm run check` e `git diff --check`: passaram.
- `npm run test:events`: 30 cenários de eventos, cada um em completo e compacto; 60 capturas reais de PiP, sem erros JavaScript. Inclui os 27 marcos reconhecidos, geração/validação de código e atualização de ETA. Faixa completa nos estados anteriores à saída, retirada sem contagem, estimativa ancorada na saída, fallback SVG de loja/entregador e ausência de scroll/sobreposição foram verificados. Galeria: `test-results/events/index.html`.
- Testes de tempo verificam início na saída, decremento após um/dois minutos e preservação da âncora em novos resumos/eventos. Janela vencida continua visível antes da saída e ausência de dados não gera uma estimativa inventada.
- Edge instalado, em perfil temporário, com carregamento real da extensão pelo manifest: passou, sem erros JavaScript.
- Abertura/fechamento da Document PiP, 9 alternâncias iniciais, reabertura com modo e idioma escolhidos e tratamento de `resizeTo` recusado: passaram.
- Após a revisão visual, o compacto solicita 350 × 164 px, e o completo 350 × 310 px. A largura é compartilhada para conservar a posição horizontal; o navegador pode arredondar as medidas em alguns pixels na escala do Windows.
- A revisão removeu o card externo e recompôs o compacto em grade: marca, avatar, status com ícone e previsão lado a lado, barra com quatro etapas e ícones, controles. O código de entrega aparece na chegada. Testes verificam ausência de rolagem horizontal/vertical, visibilidade do rodapé e borda/margem externas nulas nos dois modos.
- Em nove alternâncias medidas no Edge, screenX e screenY permaneceram constantes em cada execução. Nas execuções finais, foram x=1156/y=456 e x=1155/y=457, com a borda direita variando no máximo 1 px por arredondamento. Não houve deriva progressiva de largura, deslocamento para o centro ou reabertura da janela. A API mantém a colocação escolhida pelo navegador; não permite forçar novas coordenadas por `moveTo()`/`moveBy()`.
- Mudanças para inglês e espanhol com atualização imediata, português padrão, idioma salvo e ausência de novas requisições ao alternar os modos: passaram.
- Polling após 22 s com a aba original em segundo plano, atualização em modo compacto e ausência de consultas durante 22 s após fechar: passaram, com transporte sintético na PiP.
- HTTP 429, entrega concluída, eventos vazios e nome longo: passaram no navegador. Não houve rolagem horizontal no compacto.
- Inspeção visual das capturas de preparação, percurso, erro, nome longo, conclusão e modo completo: realizada.
- Testes de módulo verificaram separadamente fetch e XHR, cópia dos headers, credentials, exclusão de chamadas simultâneas, timers, backoff, código de entrega validado, progressão sem regressão e estimativas ancoradas na saída.

## Limites

O site e os pedidos eram sintéticos. Na PiP, o teste substitui exclusivamente o transporte fetch por respostas em memória; os headers são sintéticos. Não foi validada uma sessão autenticada ou uma entrega real no iFood, a rede real com aba minimizada, Chrome, versões antigas do Edge/Chrome ou todos os sistemas operacionais.

As tentativas iniciais de interceptar HTTP da PiP com Playwright não responderam nesse alvo auxiliar. O teste de navegador documenta a substituição do transporte para não confundir essa limitação com uma validação da API real do iFood.

As capturas ficam em `test-results/`, ignorado pelo Git. `product-compact.png` e `product-complete.png` mostram o mesmo pedido em português nos dois modos. São capturas da PiP real, com dados sintéticos. A versão do manifest permanece 0.0.6; esta alteração não cria uma publicação na loja.
