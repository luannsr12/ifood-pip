# iFood PiP — 0.0.6

Pasta pronta para instalação local no Chrome ou Edge. Não precisa de Node.js, servidor, API local ou build.

O manifesto está na versão **0.0.6**, com Manifest V3, idioma padrão **en** e metadados localizados em `_locales/en`, `_locales/pt_BR` e `_locales/es`. Não solicita permissões adicionais além da execução declarada nas páginas de pedido do iFood. Os ícones usados pelo navegador são PNG; o original vetorial está em `icons/icon.svg`.

Política pública de privacidade: [English / Português / Español](https://ifood-pip-privacy-006-20261027.luanalvesnsr124025.chatgpt.site).

## Instalar

1. Abra `edge://extensions` ou `chrome://extensions`.
2. Desative a versão anterior do iFood PiP, se estiver instalada, para evitar duas versões atuando na mesma página.
3. Com o modo do desenvolvedor ativado, escolha **Carregar sem compactação**.
4. Selecione esta pasta, que contém `manifest.json`.
5. Abra um pedido real no iFood e **recarregue a página de acompanhamento** após instalar.
6. Aguarde a consulta de eventos feita pelo próprio iFood e clique em **Mini janela do pedido**.

Mantenha esta pasta no mesmo local enquanto a extensão estiver instalada.

## Dados e autenticação

A extensão só executa em `https://www.ifood.com.br/pedido/*`, identificando o pedido na rota `/pedido/{id}/acompanhar`.

Ela observa a requisição GET que o próprio frontend faz para:

```text
https://www.ifood.com.br/site-api/v1/customers/me/orders/{id}/events
```

Os headers e a configuração da requisição original ficam apenas na memória. Enquanto a mini janela está aberta, a extensão pode repetir essa mesma consulta autenticada a cada aproximadamente 20 segundos, sem recarregar a aba. Não solicita tokens ao usuário nem armazena credenciais.

Nome e foto da loja vêm do bloco do DOM que contém `Pedido Nº`, de outros elementos identificados na página ou de uma resposta de detalhes já consultada pelo site. A imagem também é reconhecida quando o iFood a representa como `div[role="img"][src]`. Fotos do entregador, veículo, código e ETA usam os campos disponíveis nos eventos. Dados ausentes não são inventados; imagens indisponíveis recebem um ícone de reserva. O status visível no DOM pode avançar um resumo HTTP atrasado: preparação na página aparece como preparação na PiP, mesmo se o último evento ainda for confirmado.

A contagem **Chega em ~X min** aparece somente depois da saída para entrega e não usa a janela padrão da loja nem `newEta`. O tempo restante é calculado por **distância loja → destino ÷ velocidade média + 2 minutos − tempo decorrido desde a saída**. Moto usa 22 km/h, bicicleta 12 km/h e carro 18 km/h. Quando há apenas coordenadas, usa-se distância geográfica × 1,3, identificada como aproximada; não há consulta de trânsito ou geocodificação externa.

O horário de saída é extraído dos eventos de despacho/início de deslocamento, com retirada como alternativa. A extensão observa também os detalhes oficiais da API v3 para obter as coordenadas. Abrir a PiP ou repetir uma consulta não reinicia o relógio. Se faltar distância, veículo ou horário de saída, a janela informa o dado ausente e mostra **Em rota de entrega**, sem inventar minutos.

Antes da saída, o **intervalo de horário** informado pelo iFood aparece grande, com “Previsão de entrega” como legenda menor. O cálculo é atualizado a cada 10 segundos. Se o tempo calculado de trajeto for ultrapassado, aparece **Pedido atrasado** com a indicação de que se trata da estimativa local. A etapa atual tem preenchimento sólido que cresce até 100% e reinicia em zero, sem retroceder.

## Durante o uso

No rodapé da PiP há um seletor discreto **EN / PT / ES** para English, Português e Español. O padrão da primeira abertura é inglês; a troca é imediata. Somente o idioma escolhido é salvo localmente no navegador (`ifood-pip-language`) para as próximas aberturas. Os dados do pedido e a autenticação continuam apenas em memória.

A janela abre em aproximadamente **350 × 310 px**, com margens externas reduzidas e card aproveitando a área interna. O botão nativo de voltar à aba é ocultado quando o navegador oferece suporte. O botão próprio **Ver pedido** continua disponível. A interface é compacta e sem rolagem; a moldura nativa do navegador permanece.

- Mantenha a aba original aberta. Ela pode ficar em segundo plano.
- Fechar ou recarregar a aba também fecha a janela PiP.
- Se ainda não houver requisição capturada, aguarde o iFood atualizar ou recarregue a página.
- Se a sessão expirar, volte à página do iFood para que o site renove sua autenticação.
- O código de entrega desaparece após validação, entrega ou cancelamento.

Este pacote não inclui simulador, capturas de pedidos, eventos de exemplo, testes ou endereços locais. Requer navegador com suporte a Document Picture-in-Picture (Chrome 116+ ou Edge compatível).

Projeto independente, sem vínculo com o iFood. A logo SVG usa o desenho disponibilizado pelo [Simple Icons](https://simpleicons.org/?q=ifood).
