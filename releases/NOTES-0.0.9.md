A versão 0.0.9 aprimora a organização e a legibilidade da mini janela, com uma composição mais compacta e correções na atualização dos dados do entregador.

## Interface e legibilidade

- **Modo recolhido reorganizado:** status principal em destaque, loja e número do pedido alinhados na mesma linha e quatro barras de progresso sem nomes ou ícones de etapas. A marca iFood e os controles permanecem acessíveis no rodapé.
- **Dados do entregador em uma linha própria:** foto/nome, veículo e distância usam três células de largura igual; o código de entrega ocupa uma quarta célula de largura fixa. Veículo e distância mantêm ícone e texto centralizados na mesma linha. Campos ausentes preservam o espaço das respectivas células.
- **Identificação mais clara:** o nome do entregador é apresentado como primeiro nome e inicial do segundo no recolhido. Nomes longos de lojas e entregadores recebem reticências por caracteres, preservando o nome completo no expandido e na descrição ao passar o cursor.
- **Tipografia maior e consistente:** todos os status do recolhido compartilham a mesma regra de fonte. O expandido apresenta informações secundárias mais legíveis e mantém o card de progresso, com ícones maiores acima dos nomes, centralizados sob cada barra.
- **Código de entrega nos dois modos:** o expandido mantém a seção identificada com rótulo, chave no vermelho da interface e dígitos, com mais espaço antes do rodapé. A exibição respeita a saída para entrega, a disponibilidade do código e sua validação, assim como no recolhido.
- **Expandido mais objetivo:** a faixa de horários fica à direita do status no card de progresso durante a entrega. Abaixo da estimativa, uma única linha reúne distância, veículo e horário de saída quando disponíveis. Informações duplicadas e a grade inferior foram removidas.
- **Progresso com melhor presença visual:** as barras dos dois modos usam um verde mais vivo, sem efeitos de brilho.
- **Textos revisados nos três idiomas:** português, inglês e espanhol mantêm a mesma grade e dimensões. No recolhido, a chegada usa “Chegou por aí” e a estimativa em rota usa “Chega em ~ 10 minutos”, conforme o tempo disponível.

## Previsões e estabilidade

- **Minutagem limitada a dois dígitos no recolhido:** estimativas entre 1 e 99 minutos usam a contagem; valores maiores mantêm a faixa de horários informada pela loja. A contagem continua restrita à saída para entrega e ancorada nesse evento.
- **Altura compacta estável:** a janela solicita 390 × 142 px desde a abertura. Antes da atribuição do entregador, o conteúdo ocupa a altura disponível sem reservar uma linha vazia. A chegada de novos dados não depende de um clique para aumentar a janela.
- **Alternância na mesma janela:** as dimensões de cada modo consideram a moldura nativa para evitar deriva de tamanho. As coordenadas permaneceram estáveis nos testes do Edge; o posicionamento exato continua sob controle do navegador.

## Correções

- Corrigida a atualização da interface quando nome, veículo ou outros detalhes do entregador chegam em respostas separadas dos eventos. Novos detalhes passam a aparecer mesmo sem uma mudança de status.
- Corrigida a formatação de distâncias curtas positivas, que podiam ser arredondadas para “0km”. A apresentação agora preserva a precisão necessária e respeita o idioma selecionado.
- Ajustados os horários dos pedidos sintéticos para manter a janela de entrega entre 20 e 30 minutos após o início dos testes.

O polling permanece em 60 segundos, com pausa após quatro falhas consecutivas e encerramento após conclusão ou cancelamento. A abertura continua no modo recolhido, preservando o idioma salvo.

## Download e instalação

Baixe **ifood-pip-0.0.9-chrome-web-store.zip** na seção **Assets** desta release. Esse é o pacote pronto da extensão; os arquivos automáticos **Source code** incluem o repositório completo.

Para instalação manual no Chrome ou Edge, extraia o ZIP, abra a página de extensões, ative o modo do desenvolvedor e selecione **Carregar sem compactação**. Ao atualizar uma instalação local com o iFood já aberto, recarregue a extensão e a aba do pedido para carregar o novo script.

O pacote contém somente nove arquivos de produção: manifest, script compilado, três ícones, três catálogos de tradução e licença. Não inclui testes, capturas, `test-results`, `store-assets`, simulador ou dependências de desenvolvimento.

**Arquivo:** `ifood-pip-0.0.9-chrome-web-store.zip` · **Tamanho:** 43.130 bytes · **SHA-256:** `a64ca335211ef57b518cbb9639cc4462f374861aacb10f45dbf99a223d2fe5d3`.

## Validação

Foram executados 29 testes de módulo e verificações no Edge com dados sintéticos, incluindo 30 cenários de eventos nos dois modos, os três idiomas, nomes longos, visibilidade progressiva, navegação interna e recuperação após falhas. O polling real de 60 segundos e a interrupção após fechar a PiP também foram verificados. Isso não representa validação de uma entrega autenticada real no iFood.

A publicação no GitHub disponibiliza o pacote para download e não representa uma publicação automática na Chrome Web Store.

[Comparação das alterações entre 0.0.8 e 0.0.9](https://github.com/luannsr12/ifood-pip/compare/0.0.8...0.0.9).
