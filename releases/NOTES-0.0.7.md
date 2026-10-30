O iFood PiP 0.0.7 aprimora o acompanhamento em mini janela, corrige a abertura durante a navegação interna do iFood e ajusta a apresentação das previsões de entrega.

## Novidades

- **Modo compacto com composição própria:** status e previsão lado a lado, identificação da loja e do entregador, marca iFood, ícones e progresso por etapas. O modo completo mantém os detalhes do pedido, do entregador e do código de entrega.
- **Alternância entre os modos:** expansão e recolhimento na mesma janela, sem reiniciar o acompanhamento. A preferência de visualização é salva para a próxima abertura.
- **Interface refinada:** remoção do card externo e da rolagem, melhor aproveitamento do espaço e imagens de substituição em SVG quando a loja ou o entregador não possuem foto disponível.

## Correções

- O botão da mini janela passa a aparecer ao navegar internamente até um pedido, sem precisar atualizar a página.
- Antes da saída para entrega, os dois modos exibem a faixa completa de horários informada pela loja, como **13:30 – 14:00**.
- A contagem regressiva, como **~8 min**, começa a partir do horário da saída para entrega. A atribuição do entregador e a retirada na loja não iniciam o contador.
- Atualizações do pedido, troca de modo e reabertura da mini janela preservam a referência de início da estimativa.
- Os estados de atribuição, aceite, deslocamento e chegada do entregador mantêm suas identificações específicas.
- O redimensionamento foi ajustado para evitar deslocamento progressivo da janela e variação acumulada de largura na escala de exibição do Windows.

## Manutenção e qualidade

- Código reorganizado em módulos de integração, estado, polling, preferências e interface, com build estático sem dependências adicionais.
- Traduções centralizadas nos catálogos de português brasileiro, inglês e espanhol, preservando a seleção manual de idioma.
- Documentação técnica, instruções de desenvolvimento e política de privacidade atualizadas.
- Validação com 14 testes automatizados, regressão de navegação interna no Edge e simulação de 30 cenários de eventos nos dois modos, totalizando 60 estados renderizados.

## Pacote de distribuição

O arquivo **ifood-pip-0.0.7-chrome-web-store.zip** contém somente o manifest, o script de produção, os ícones, os catálogos de tradução e a licença. Não inclui testes, capturas, `store-assets`, dependências ou arquivos de desenvolvimento.

Para baixar a extensão pronta, utilize esse arquivo na seção **Assets** desta versão. Os links automáticos **Source code** disponibilizam o repositório completo, não o pacote de distribuição. Para instalação manual no Chrome ou Edge, extraia o ZIP e selecione a pasta em **Carregar sem compactação**, na página de extensões do navegador.

**SHA-256:** `5f88247f3f53d9b46c226572e0bc061a9d0f1ebaa5825395ff823f0f0fd0c0e9`

A estimativa de trajeto é aproximada e depende dos dados disponibilizados pelo iFood. Os testes de eventos utilizaram dados sintéticos; o pacote foi validado com carregamento real no Edge. Este lançamento no GitHub não representa publicação ou aprovação na Chrome Web Store.
