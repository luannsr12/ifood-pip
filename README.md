<div align="center">
  <img src="store-assets/store-logo-300.png" alt="Ícone do iFood PiP" width="104" />

  # iFood PiP

  **Seu pedido em uma janela flutuante. Seu computador continua livre.**

  Acompanhe o iFood enquanto trabalha, estuda, navega ou usa outros aplicativos — sem precisar manter a aba do pedido em primeiro plano.

  **Versão 0.0.8 em preparação** · **Manifest V3** · **Apache 2.0**

  <a href="https://chromewebstore.google.com/detail/ifood-pip-%E2%80%94-pedido-em-min/gkmphecdhlchhmdjfmpjlomoiflhhjbj">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png?hl=pt-br"
         alt="Disponível na Chrome Web Store"
         width="150">
  </a>
  
   <br>
   
</div>

---

![Apresentação do iFood PiP](store-assets/promo-pt-large.png)

## O problema que resolve

Acompanhar uma entrega pelo navegador não deveria exigir que você fique preso à página do pedido. Com o **iFood PiP**, o acompanhamento fica em uma pequena janela independente, que pode permanecer visível sobre outros aplicativos e atualizar as informações sem que você precise voltar à aba do iFood a todo momento.

## Funcionalidades

- **Janela flutuante de verdade:** utiliza a API *Document Picture-in-Picture* para mostrar o acompanhamento fora da aba original, inclusive sobre outros programas.
- **Atualizações automáticas:** consulta os eventos a cada **60 segundos**, enquanto a mini janela está aberta. Respostas recebidas do próprio site também atualizam a interface; o botão **Atualizar** permite uma consulta imediata.
- **Informações em um só lugar:** mostra etapas do pedido e, quando disponíveis, dados da loja, do entregador, do veículo e da entrega.
- **Previsão de chegada:** apresenta a faixa de entrega informada pelo iFood e, após a saída para entrega, pode calcular uma **estimativa local aproximada** usando os dados disponíveis.
- **Previsão por etapa:** antes da saída, mantém a faixa completa da loja (por exemplo, `13:30 – 14:00`) nos dois modos. A contagem `~8 min` começa no horário da saída para entrega; atribuição do entregador e retirada na loja não iniciam o relógio.
- **Privacidade por padrão:** não tem servidor do desenvolvedor, anúncios nem ferramentas de análise; os dados do pedido não são enviados a um serviço externo do projeto.
- **Três idiomas:** português, inglês e espanhol, com seleção diretamente na mini janela.
- **Dois modos:** a PiP sempre abre recolhida. O controle no canto superior expande o acompanhamento com horários dos eventos, faixa prometida, trajeto e detalhes do entregador disponíveis naquele momento.
- **Consultas com limite:** quatro falhas consecutivas pausam as consultas da extensão e exibem uma orientação discreta para abrir o pedido no iFood e atualizar a página. Uma resposta válida do site libera novamente as consultas. Pedidos concluídos ou cancelados encerram o polling.
- **Informações no momento certo:** entregador, veículo, trajeto e código aparecem conforme os eventos permitem. O código fica disponível durante a entrega e desaparece após a validação ou conclusão. O modo completo começa menor e acomoda os detalhes que surgirem.

## Prévia

As imagens abaixo são materiais ilustrativos de apresentação. As capturas dos layouts atuais e suas limitações estão descritas em [tests/VALIDATION.md](tests/VALIDATION.md).

| Acompanhamento | Progresso da entrega |
|:---:|:---:|
| <img src="store-assets/screenshot-pt-01.png" alt="iFood PiP mostrando o acompanhamento do pedido" width="390" /> | <img src="store-assets/screenshot-pt-02.png" alt="iFood PiP mostrando outra etapa do pedido" width="390" /> |

## Instalação

### Pacote pronto (Edge ou Chrome)

A `0.0.8` está disponível como [ZIP de distribuição](releases/ifood-pip-0.0.8-chrome-web-store.zip), com polling de 60 segundos. A última versão publicada no GitHub permanece acessível em [Releases](https://github.com/luannsr12/ifood-pip/releases/latest). Em **Assets**, escolha `ifood-pip-<versão>-chrome-web-store.zip`; os links automáticos **Source code** incluem o repositório completo. Consulte [releases/README.md](releases/README.md) para o conteúdo e a validação dos pacotes.

1. Baixe o ZIP de distribuição e extraia os arquivos.
2. Acesse `edge://extensions` no Microsoft Edge ou `chrome://extensions` no Google Chrome.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta que contém o `manifest.json`.
5. Entre no iFood e abra o acompanhamento do pedido. A navegação interna não exige atualizar a página.
6. Aguarde o carregamento das informações e clique em **Mini janela do pedido**.

**Requisitos:** navegador compatível com *Document Picture-in-Picture* (Chrome 116+ ou versão compatível do Edge), acesso a uma conta do iFood e um pedido com página de acompanhamento disponível.

Para usar o código-fonte, clone ou extraia o repositório e selecione a pasta raiz no passo 4. Ao instalar ou atualizar uma extensão descompactada com o iFood já aberto, recarregue essa aba uma vez para carregar o script novo. Isso não é necessário ao navegar até os pedidos nas visitas seguintes.

## Como funciona

A extensão é inicializada em `https://www.ifood.com.br/*` para acompanhar a navegação interna do site. O botão e a mini janela ficam disponíveis **somente nas páginas de acompanhamento de pedido**. Assim, entrar pelo início do iFood e abrir um pedido não exige atualizar a página.

Ela observa as requisições feitas pela própria página para obter os eventos do pedido. Com a mini janela aberta, pode repetir essas consultas diretamente ao iFood a cada 60 segundos, utilizando a sessão já autenticada no navegador. Atualizações recentes do site adiam consultas redundantes; isso não altera a frequência de requisições do próprio iFood. O relógio visual da estimativa pode mudar sem disparar uma requisição de rede.

A janela usa a API *Document Picture-in-Picture* do navegador. Isso permite acompanhar o pedido enquanto você utiliza outras abas **ou outros aplicativos**, sem deixar a página de rastreamento visível na tela.

> **Importante:** a aba original do pedido precisa continuar **aberta**, mas pode ficar em segundo plano. Fechar ou recarregar essa aba também encerra a mini janela. A previsão calculada pela extensão é uma aproximação, não uma estimativa oficial de trânsito em tempo real.

## Privacidade

O iFood PiP foi pensado para funcionar sem coleta de dados pelo desenvolvedor:

- Não solicita login, senha ou token fora da autenticação normal do iFood.
- Mantém as informações do pedido e os dados de autenticação observados **em memória** durante o uso.
- Comunica-se com os serviços do próprio iFood e com os endereços de imagens necessários para exibir o acompanhamento; **não envia dados do pedido para servidores do desenvolvedor**.
- Armazena localmente o idioma escolhido (`ifood-pip-language`). A visualização começa recolhida em cada abertura.
- Não inclui rastreadores, anúncios ou telemetria do projeto.

Leia também a [Política de Privacidade](PRIVACY.md).

## Contribuições

Sugestões, correções e melhorias são bem-vindas. Você pode abrir uma *issue* para relatar um problema ou enviar um *pull request* com uma proposta de alteração.

Para usar o código deste repositório, carregue a pasta como extensão descompactada. O `content.js` gerado está incluído; não é necessário instalar dependências para usar a extensão.

Para desenvolver, use Node.js 20+ e execute `npm run build`, `npm test` e `npm run check`. Não há pacotes a instalar. Edite `src/`, os estilos e `_locales/`, gere novamente o pacote, recarregue a extensão e a aba do pedido. Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para organização, traduções e testes de navegador.

Para o teste interativo, `npm run simulate:realtime` abre um pedido fictício no Edge e reproduz cerca de 23 minutos de eventos em tempo real. Essa ferramenta requer Playwright; ela não faz pedidos reais nem integra o ZIP de produção. Os comandos completos estão no [README dos testes](tests/README.md).

## Licença

Este projeto é disponibilizado como software de código aberto sob a **[Apache License 2.0](LICENSE)**. Consulte o arquivo `LICENSE` para os termos completos.

## Aviso

**iFood PiP é um projeto independente.** Não é desenvolvido, mantido, patrocinado ou endossado pelo iFood. A marca iFood pertence aos seus respectivos titulares. A licença deste repositório não concede direitos sobre marcas de terceiros.

---

<div align="center">
  <sub>Feito para você acompanhar a entrega sem interromper o que está fazendo.</sub>
</div>
