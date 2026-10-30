Notas do pacote 0.0.8 publicado no GitHub em 30 de outubro de 2026. As revisões posteriores da interface nesta branch não estão incluídas nesse ZIP. O pacote reúne correções na exibição progressiva das informações e ajustes no acompanhamento da entrega.

## Alterações

- **Polling automático de 60 segundos:** a consulta independente da PiP passa de 20 para 60 segundos. Atualizações recebidas do próprio site continuam sendo aproveitadas e a atualização manual permanece disponível.
- **Pausa após quatro falhas:** interrompe novas consultas e mostra uma orientação discreta para abrir o pedido no iFood e atualizar a página. Uma resposta válida do site permite retomar. A conclusão ou o cancelamento encerra o polling do pedido.
- **Recolhido por padrão:** cada abertura começa no modo compacto. O código de entrega compartilha espaço com a previsão durante a entrega, sem aumentar a janela.
- **Expansão com informações adicionais:** mostra a faixa prometida, os horários dos eventos recebidos e detalhes do trajeto e do entregador, conforme disponíveis.
- **Textos adequados a qualquer pedido:** “Preparando o pedido” e “Pedido concluído”, sem pressupor que a compra seja de comida.
- **Informações liberadas por etapa:** a presença de um campo na resposta não basta para exibi-lo. Identificação do pedido, entregador, veículo, trajeto e código respeitam o estado confirmado pelos eventos.
- **Código de entrega no momento correto:** fica oculto antes da saída e deixa de aparecer após validação ou conclusão.
- **Confirmação sem antecipação:** a criação e o recebimento do pedido não destacam a etapa de confirmação da loja.
- **Modo completo mais ajustado ao conteúdo:** a altura inicial é calculada pelas informações disponíveis. Novos detalhes podem compartilhar uma linha na janela curta, sem reservar um grande espaço vazio para dados futuros.
- **Simulação interativa em tempo real:** ferramenta de desenvolvimento com eventos programados a partir do horário atual, janela de entrega de 20 a 30 minutos e informações liberadas progressivamente.

## Distribuição e validação

O ZIP contém somente nove arquivos de produção: manifest, script compilado, ícones, traduções e licença. Não inclui testes, capturas, simulador, `store-assets` ou dependências.

**Arquivo:** `ifood-pip-0.0.8-chrome-web-store.zip` · **Tamanho:** 40.669 bytes · **SHA-256:** `28b6b2d9265902294e0a3e87c607b84c22ff9d5ebb27373e7e76c51538b32118`.

Os testes usam dados sintéticos. O registro das verificações executadas e de seus limites está em [tests/VALIDATION.md](../tests/VALIDATION.md). A geração deste pacote não publica automaticamente uma nova versão no GitHub nem na Chrome Web Store.
