# Validação da refatoração — 30/10/2026

## Executado

- Regressão de navegação SPA: página inicial → acompanhamento sem F5, atualização apenas da URL, voltar/avançar, `replaceState`, substituição do body, ausência de botões/interceptadores duplicados, acesso direto e reload passaram no Edge com injeção real pelo manifest.
- O ciclo `pagehide`/`pageshow` com `persisted: true` foi simulado duas vezes no teste de navegação para conferir a reativação dos listeners sem reinstalar fetch. Isso não significa que o navegador utilizou seu BFCache real durante o teste.
- O teste completo da PiP também começa na página inicial e navega internamente para o pedido antes de capturar a primeira requisição. Não usa recarregamento nem injeção manual de script.

- `npm run build`, `npm test` (24 testes), `npm run check` e `git diff --check`: passaram.
- `npm run test:events`: 30 cenários de eventos, cada um em completo e compacto; 60 capturas reais de PiP, sem erros JavaScript. Inclui os 27 marcos reconhecidos, geração/validação de código e atualização de ETA. Faixa completa nos estados anteriores à saída, retirada sem contagem, estimativa ancorada na saída, fallback SVG de loja/entregador e ausência de scroll/sobreposição foram verificados. Galeria: `test-results/events/index.html`.
- Testes de tempo verificam início na saída, decremento após um/dois minutos e preservação da âncora em novos resumos/eventos. Janela vencida continua visível antes da saída e ausência de dados não gera uma estimativa inventada.
- Edge instalado, em perfil temporário, com carregamento real da extensão pelo manifest: passou, sem erros JavaScript.
- Abertura/fechamento da Document PiP, alternâncias, reabertura recolhida preservando o idioma e tratamento de `resizeTo` recusado: passaram no teste completo.
- O compacto solicita 350 × 164 px. O completo calcula a altura pela previsão, histórico recebido, entregador, código e avisos presentes. A largura é compartilhada para conservar a posição horizontal; o navegador pode arredondar as medidas em alguns pixels na escala do Windows.
- A revisão removeu o card externo e recompôs o compacto em grade: marca, avatar, status com ícone e previsão lado a lado, barra com quatro etapas e ícones, controles. O código de entrega só pode aparecer após a saída, quando disponível, e fica oculto após validação ou conclusão. Testes verificam ausência de rolagem horizontal/vertical, visibilidade do rodapé e borda/margem externas nulas nos dois modos.
- Em nove alternâncias medidas no Edge, screenX e screenY permaneceram constantes em cada execução. Na regressão final da 0.0.8, foram x=1154/y=547, com borda direita constante em x=1521. Não houve deriva progressiva de largura, deslocamento para o centro ou reabertura da janela. A API mantém a colocação escolhida pelo navegador; não permite forçar novas coordenadas por `moveTo()`/`moveBy()`.
- Mudanças para inglês e espanhol com atualização imediata, português padrão, idioma salvo e ausência de novas requisições ao alternar os modos: passaram.
- A regressão no Edge passou com polling real de 60 s e transporte sintético: a PiP consultou em segundo plano, o contador diminuiu após um minuto e não houve novas consultas durante 62 s após o fechamento. O teste de agendamento também confirma o intervalo de 60.000 ms. Registro local: `test-results/polling-60s-validation.log`.
- HTTP 429, entrega concluída, eventos vazios e nome longo: passaram no navegador. Não houve rolagem horizontal no compacto.
- Inspeção visual das capturas de preparação, percurso, erro, nome longo, conclusão e modo completo: realizada.
- Testes de módulo verificaram separadamente fetch e XHR, cópia dos headers, credentials, exclusão de chamadas simultâneas, timers, backoff, código de entrega validado, progressão sem regressão e estimativas ancoradas na saída.
- `node tests/recovery.cjs`: passou no Edge com PiP real, relógio controlado e transporte sintético. Uma falha manual e três callbacks automáticos produziram quatro falhas consecutivas (HTTP, rede e JSON inválido); não restou timer e o botão de atualização foi desabilitado. A mensagem de pausa permaneceu visível e sem cortes nos dois modos. Uma resposta válida da página retomou o agendamento; `COMPLETED` encerrou consultas automáticas/manuais e exibiu “Pedido concluído”. Uma preferência antiga de modo completo não impediu a abertura recolhida. Capturas: `test-results/recovery-*.png`.

## Limites

Na evolução local do simulador em tempo real, a interface ganhou regras explícitas para impedir informações antecipadas. Foram verificados: início sem código/entregador, geração do código somente na saída, confirmação somente após o evento correspondente e payloads progressivos do cenário. Um teste adicional percorreu oito transições com a mesma janela completa curta, sem redimensionamento por cliques, verificando rodapé, código e entregador sem cortes. O layout completo usa a área disponível para mostrar histórico e trajeto; se novos dados chegam à janela curta, prioriza os detalhes mais relevantes.

O teste interativo iniciado em 30/10/2026 às 11:11 (America/Sao_Paulo) confirmou no navegador a passagem para `CONFIRMED`, a faixa `11:31 – 11:41`, código e entregador ocultos e polling pelo contexto PiP. Isso confirma o início do teste; não representa observação manual de todos os 23 minutos e 30 segundos em tempo real.

O site e os pedidos eram sintéticos. Na PiP, o teste substitui exclusivamente o transporte fetch por respostas em memória; os headers são sintéticos. Não foi validada uma sessão autenticada ou uma entrega real no iFood, a rede real com aba minimizada, Chrome, versões antigas do Edge/Chrome ou todos os sistemas operacionais.

As tentativas iniciais de interceptar HTTP da PiP com Playwright não responderam nesse alvo auxiliar. O teste de navegador documenta a substituição do transporte para não confundir essa limitação com uma validação da API real do iFood.

As capturas ficam em `test-results/`, ignorado pelo Git. `product-compact.png` e `product-complete.png` mostram o mesmo pedido em português nos dois modos. São capturas da PiP real, com dados sintéticos. A versão de distribuição em preparação é 0.0.8; a última publicação no GitHub é 0.0.7. O empacotamento local não cria uma publicação na loja.
