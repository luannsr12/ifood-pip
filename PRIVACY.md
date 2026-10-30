# Política de Privacidade — iFood PiP

**Versão da extensão:** 0.0.9

**Última atualização:** 30 de outubro de 2026

O **iFood PiP** é uma extensão independente que permite acompanhar pedidos do iFood em uma janela flutuante (*Document Picture-in-Picture*), inclusive enquanto você utiliza outros aplicativos.

A privacidade faz parte do funcionamento do projeto: **a extensão não possui servidores próprios, não inclui anúncios ou ferramentas de análise e não envia informações dos pedidos ao desenvolvedor**.

Esta política descreve o comportamento da versão 0.0.9.

## 1. Onde a extensão funciona

A extensão é inicializada nas páginas do domínio oficial `https://www.ifood.com.br/*` para detectar a navegação interna até um pedido sem exigir recarregamento. O botão e a mini janela são disponibilizados somente nas páginas de acompanhamento de pedidos.

A observação de rede reconhece os endpoints de eventos e detalhes de pedidos do iFood; não armazena o histórico de navegação nem os conteúdos das demais páginas. As consultas periódicas independentes só ocorrem enquanto a mini janela está aberta.

Ela não solicita acesso ao histórico de navegação, a outras abas ou a sites não relacionados ao iFood.

## 2. Informações utilizadas

Para montar e atualizar a mini janela, a extensão pode processar informações já disponibilizadas na página e nas respostas dos serviços do próprio iFood, como:

- Identificador, situação, etapas e horários do pedido;
- Nome e imagem do estabelecimento;
- Nome, imagem e tipo de veículo do entregador, quando disponíveis;
- Previsões de entrega, distâncias e coordenadas relacionadas ao percurso, quando disponíveis;
- Código de entrega e outros detalhes apresentados no acompanhamento, quando disponíveis;
- Informações de autenticação e cabeçalhos usados pelas requisições que o próprio site realiza, estritamente para consultar a atualização do pedido na sessão já aberta.

Esses dados são utilizados para exibir o acompanhamento e, quando aplicável, calcular uma estimativa local aproximada de chegada.

**Eles não são coletados nem recebidos pelo desenvolvedor.**

## 3. Comunicação com serviços externos

A extensão observa as consultas realizadas pela página do iFood. Enquanto a mini janela está aberta, pode repetir consultas aos **serviços do próprio iFood**, usando a sessão autenticada existente, com intervalo automático de **60 segundos**. Atualizações recentes da página podem adiar consultas redundantes; o usuário também pode solicitar uma atualização manual.

As imagens do estabelecimento ou do entregador podem ser carregadas dos endereços HTTPS fornecidos pelo iFood, inclusive de serviços de distribuição de imagens (CDNs). Essas requisições seguem o funcionamento normal do navegador e estão sujeitas às práticas dos respectivos serviços.

A extensão **não envia pedidos, identificadores, códigos de entrega, coordenadas, credenciais ou dados pessoais para servidores do desenvolvedor**.

Não há serviço de telemetria, publicidade ou análise de uso integrado ao projeto.

O simulador de desenvolvimento usa dados fictícios e um perfil isolado do navegador, sem se comunicar com a API real do iFood. Logs e capturas locais desse teste ficam na pasta `test-results/` do ambiente de desenvolvimento. O simulador e seus artefatos não integram o pacote distribuído da extensão.

## 4. Armazenamento e retenção

Os dados do acompanhamento e as informações necessárias para repetir as consultas do iFood permanecem **temporariamente na memória da página**.

Não são gravados pela extensão em banco de dados, arquivo ou armazenamento remoto do desenvolvedor. O fechamento ou recarregamento da página encerra esse estado temporário.

A preferência persistida intencionalmente pela extensão é o idioma selecionado (**português, inglês ou espanhol**), na chave `ifood-pip-language`, no `localStorage` do site do iFood. A PiP sempre abre recolhida. A chave antiga `ifood-pip-mode`, caso exista de uma versão anterior, não é mais lida nem gravada.

Essas preferências podem permanecer salvas após o fechamento da janela e podem ser apagadas ao limpar os dados do site no navegador.

Ao fechar a mini janela, a extensão interrompe suas consultas periódicas independentes. A página original do iFood, se continuar aberta, pode seguir realizando suas próprias requisições normalmente.

Quatro falhas consecutivas também pausam as consultas independentes, incluindo o botão de atualização. A PiP orienta abrir o pedido no iFood e atualizar a página; uma resposta válida observada no site permite retomar. Ao concluir ou cancelar o pedido, as consultas da extensão são encerradas para esse pedido durante a sessão da página.

## 5. Compartilhamento e comercialização

O desenvolvedor não recebe, vende, comercializa nem compartilha dados de acompanhamento obtidos pela extensão.

A comunicação necessária ao funcionamento acontece com o iFood e, para exibir imagens, com os endereços fornecidos pelo serviço.

O uso do próprio site do iFood continua sujeito aos termos e à política de privacidade do iFood, independentemente desta extensão.

## 6. Controle do usuário

Você pode fechar a mini janela a qualquer momento, interrompendo as atualizações independentes da extensão.

Também pode desativar ou desinstalar o iFood PiP nas configurações de extensões do navegador e apagar a preferência de idioma limpando os dados do site `www.ifood.com.br`.

## 7. Alterações nesta política

Esta política poderá ser atualizada caso o funcionamento da extensão seja modificado.

Alterações relevantes serão documentadas neste arquivo do repositório.

## 8. Contato e transparência

O código-fonte do iFood PiP está disponível neste repositório.

Dúvidas sobre privacidade ou relatos de problemas podem ser enviados pela seção **Issues** do projeto no GitHub.

## 9. Independência

O **iFood PiP** é um projeto independente, não desenvolvido, patrocinado ou endossado pelo iFood.

Os nomes e marcas citados pertencem aos respectivos titulares.
