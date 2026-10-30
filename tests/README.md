# Testes e simulação

## Verificações sem dependências adicionais

Com Node.js 20+ na raiz do repositório:

```sh
npm run build
npm test
npm run check
git diff --check
```

Os 29 testes atuais verificam traduções, preferência de idioma, normalização e ordem dos eventos, histórico recebido, visibilidade por etapa, estimativas ancoradas na saída, agendamento de polling, limite de quatro falhas, encerramento na conclusão e o cenário de tempo real com relógio controlado. O polling de produção está configurado para 60.000 ms; o relógio usado nesses testes não precisa esperar um minuto real.

## Testes no navegador

Requerem Playwright e Microsoft Edge instalados. Se o Playwright estiver em outra instalação, configure `NODE_PATH` para o respectivo `node_modules`. Eles abrem um perfil temporário e carregam a extensão pelo manifest.

| Comando | Escopo |
| --- | --- |
| `npm run test:navigation` | Entrada pelo início do site, navegação interna, voltar/avançar, recriação do botão e acesso direto |
| `npm run test:events` | 30 cenários nos dois modos, 60 capturas, visibilidade progressiva e oito transições em uma janela completa curta |
| `node tests/browser.cjs` | PiP real, idiomas, modos, posição, polling em segundo plano e interrupção das consultas ao fechar |
| `node tests/recovery.cjs` | Quatro falhas HTTP/rede/JSON, pausa automática, aviso nos dois modos, retomada pelo site, conclusão e compacto padrão |

O teste completo aguarda até 65 segundos pela consulta periódica e observa mais 62 segundos após fechar a PiP. Esse tempo faz parte da verificação do intervalo real de 60 segundos.

O teste de recuperação usa relógio controlado e executa os callbacks de consulta agendados para verificar as quatro falhas sem esperar quatro minutos. A interface é a PiP real do Edge; o transporte usa respostas sintéticas.

As verificações de interface também conferem ícones visíveis nas quatro etapas, fonte de 12 px e ícones de 16 px acima dos nomes no expandido, apenas barras de progresso no compacto e nenhum texto visível abaixo de 11 px no expandido.

Os pedidos e as respostas são sintéticos. Na PiP, somente o transporte de teste é adaptado; interface, Request, headers, timers e callbacks pertencem à extensão real. Nenhum desses testes confirma uma entrega autenticada real no iFood.

## Simulação interativa

```sh
npm run simulate:realtime
```

O teste começa com o horário atual e uma janela de entrega de T+20 a T+30 minutos. Timers Node.js confirmam o pedido em 30 segundos, iniciam o preparo em 2 minutos, atribuem o entregador em 8 minutos, registram a retirada em 14 minutos e a saída em 15 minutos. O código só é gerado na saída. A chegada ocorre em 22 minutos, a validação em 23 minutos e a conclusão em 23 minutos e 30 segundos.

O painel permite reiniciar, encerrar ou pausar as consultas da aba para observar o polling independente da PiP. Fechar apenas a PiP não reinicia o pedido. Fechar a aba encerra o ambiente.

## Resultados

`test-results/events/index.html` reúne as capturas comparativas. `test-results/events/languages.html` compara o expandido nos três idiomas, com as mesmas dimensões de etapas. `test-results/events/stress.html` mostra os nomes longos e os limites de minutagem. `test-results/realtime/latest.json` identifica a sessão interativa mais recente; o estado e as capturas ficam em sua subpasta. Tudo em `test-results/` é ignorado pelo Git e excluído do ZIP de produção.

Consulte [VALIDATION.md](VALIDATION.md) para saber o que foi executado e quais limitações permanecem.
