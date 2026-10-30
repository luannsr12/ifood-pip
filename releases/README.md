# Pacotes de distribuição

| Versão | Pacote | Situação |
| --- | --- | --- |
| 0.0.8 | [ifood-pip-0.0.8-chrome-web-store.zip](ifood-pip-0.0.8-chrome-web-store.zip) | [Publicada no GitHub](https://github.com/luannsr12/ifood-pip/releases/tag/0.0.8) |
| 0.0.7 | [ifood-pip-0.0.7-chrome-web-store.zip](ifood-pip-0.0.7-chrome-web-store.zip) | [Publicada no GitHub](https://github.com/luannsr12/ifood-pip/releases/tag/0.0.7) |

As notas da 0.0.8 estão em [NOTES-0.0.8.md](NOTES-0.0.8.md). As notas da 0.0.7 permanecem como registro histórico do que foi publicado. Os pacotes publicados não são sobrescritos. As revisões de interface posteriores à publicação não integram esses arquivos.

## Conteúdo

Cada ZIP tem o `manifest.json` na raiz e exatamente nove arquivos:

```text
manifest.json
content.js
icons/icon16.png
icons/icon48.png
icons/icon128.png
_locales/pt_BR/messages.json
_locales/en/messages.json
_locales/es/messages.json
LICENSE
```

Não entram `src/`, `scripts/`, `tests/`, `test-results/`, `store-assets/`, dependências, configurações locais, documentação de desenvolvimento ou os próprios pacotes de release.

## Preparação e conferência

Antes de empacotar, execute `npm run build`, `npm test` e `npm run check`. Manifest e package.json devem indicar a mesma versão. Gere o ZIP usando somente a lista acima, nunca compactando o repositório inteiro.

Confira a versão do manifest extraído, as referências aos ícones e ao script, a lista de entradas e os hashes de cada arquivo em relação à árvore de trabalho. A versão 0.0.8 deve conter `POLL_INTERVAL = 60000` no script compilado. O hash do ZIP pode ser obtido com `Get-FileHash -Algorithm SHA256` no PowerShell.

## Download e instalação

Na página de uma release publicada, o arquivo em **Assets** é o pacote pronto. Os links automáticos **Source code** incluem o repositório completo.

Para usar manualmente, extraia o pacote, abra `chrome://extensions` ou `edge://extensions`, ative o modo do desenvolvedor e escolha **Carregar sem compactação**. Selecione a pasta com o manifest. O mesmo ZIP pode ser enviado à Chrome Web Store; a criação do arquivo não representa publicação nem aprovação na loja.
