# Validação da versão 0.0.9 — 30/10/2026

## Build e pacote

- `npm run build`, `npm test` e `npm run check`: passaram, com 29 testes de módulo.
- O ZIP foi extraído e os hashes dos nove arquivos foram comparados com os arquivos de produção locais. Manifest e projeto indicam 0.0.9; o pacote mantém o idioma padrão `pt_BR`, nenhuma permissão adicional e polling de 60.000 ms.
- O conteúdo é restrito ao manifest, script compilado, três ícones, três catálogos e licença. Testes, capturas, simulador, dependências e `store-assets` não entram no ZIP.
- Tamanho e SHA-256 estão em [NOTES-0.0.9.md](../releases/NOTES-0.0.9.md). Os pacotes anteriores permanecem intactos.

## Interface no Edge

As suítes de navegador carregaram a extensão extraída do ZIP pelo manifest em um perfil temporário do Edge. Foram usados pedidos e respostas sintéticos.

- 30 cenários de eventos nos dois modos, totalizando 60 estados, além de nomes longos, campos ausentes, veículos e limites de estimativa.
- Português, inglês e espanhol: mesmas dimensões da grade e das etapas, sem chaves de tradução visíveis ou rolagem.
- Expandido: faixa da loja à direita do status durante a entrega, uma única linha de contexto sob a estimativa, sem a grade inferior e sem a linha adicional sobre a origem da previsão. Antes da saída, a faixa permanece como previsão principal.
- Código visível nos dois modos durante transporte/chegada quando disponível; oculto antes da saída, após validação e após conclusão. No expandido, foram conferidos o rótulo, os dígitos e a separação do rodapé.
- Etapas do expandido com fonte de 12 px e ícones de 16 px acima dos nomes, centralizados sob suas barras. Nomes/status usam 14 px e a previsão principal, 24 px. Textos secundários visíveis têm pelo menos 11 px.
- Recolhido: 390 × 142 px solicitados, status de 20 px, somente barras de progresso e a mesma composição aprovada. Nome/foto, veículo e distância compartilham três colunas iguais; o código mantém 74 px. A mudança visual compartilhada desta etapa é o verde das barras.
- Nome compacto com primeiro nome e inicial do segundo; truncamento por caracteres quando necessário. Foram conferidos “Matheus A.”, nomes maiores, distância ausente e distâncias curtas e longas.
- Oito transições em uma janela expandida mantida aberta, nos três idiomas, sem novos cliques para redimensionar. Rodapé, entregador, código e faixa de horários permaneceram visíveis.
- Alternância repetida na mesma PiP, sem requisições extras por troca de modo ou idioma e sem deriva das coordenadas medidas. A API mantém o controle da colocação exata da janela.
- Inspeção das capturas de percurso, chegada, preparação e dos dois modos: realizada. As barras usam o verde revisado e a chave do expandido usa o vermelho dos demais ícones.

A pasta `test-results/` foi esvaziada antes desta rodada. A galeria atual fica em `test-results/events/index.html`; comparações de idiomas e nomes ficam em `languages.html` e `stress.html`. Capturas e relatórios permanecem locais e são ignorados pelo Git.

## Navegação e consultas

- Navegação interna da página inicial até o pedido sem F5, alteração apenas da URL, voltar/avançar, `replaceState`, substituição do body, acesso direto e reload: passaram, sem botões ou interceptadores duplicados.
- A simulação de `pagehide`/`pageshow` com `persisted: true` verificou a reativação dos listeners. Ela não comprova uso do BFCache real pelo navegador.
- Respostas de detalhes recebidas separadamente dos eventos atualizaram nome e veículo do entregador sem mudança de status.
- Quatro falhas consecutivas, incluindo HTTP, rede e JSON inválido, interromperam consultas automáticas/manuais. Uma resposta válida da página retomou o agendamento; conclusão encerrou as consultas.
- Polling real de 60 segundos com a PiP em primeiro plano e a aba original em segundo plano, decremento da estimativa e 62 segundos sem novas consultas após fechar a PiP: verificados na suíte completa.
- Reabertura recolhida com idioma preservado, erro HTTP 429 e recusa de redimensionamento: passaram.
- Testes de módulo também cobrem fetch/XHR, headers e credentials, exclusão de consultas simultâneas, regras de visibilidade, progressão dos eventos e estimativas ancoradas na saída.

O registro do teste completo fica em `test-results/browser.log`; a conferência do ZIP, em `test-results/release-0.0.9/package-validation.json`.

## Limites

O transporte da PiP é substituído por respostas em memória nos testes. Interface, Request, timers e callbacks pertencem à extensão real. Não foram validados uma sessão autenticada ou entrega real no iFood, rede real com a aba minimizada, Chrome, versões antigas dos navegadores ou todos os sistemas operacionais.

O empacotamento e a publicação no GitHub não representam publicação ou aprovação na Chrome Web Store.
