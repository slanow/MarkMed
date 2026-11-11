## Novidades e Correções — MarkMed v0.24.1

### Identidade Visual e Interface

- **Rebranding completo para MarkMed:** novo nome, ícones de aplicativo (`.png`, `.ico`, `.icns`), arquivo `.desktop` e instaladores atualizados a partir da logo oficial do MarkMed.
- **Tela de inicialização animada:** adicionada tela de abertura com animação de formação da logo por camadas (anel, cruz médica, caduceu, asas e `#`), nome **MarkMed** e versão atual, com suporte a tema claro/escuro e fechamento rápido por clique ou teclado.
- **Barra de título corrigida:**
  - Alinhamento vertical do contador de palavras (`Palavras 0`) com o botão de menu sanduíche (`≡`).
  - Logo do **MarkMed** adicionada à esquerda do menu sanduíche, com posicionamento ajustado para o menu suspenso.

### Modo Portátil e Links do Projeto

- **Suporte aprimorado para pendrive:** detecção automática da pasta `markmed-user-data` ao lado do `.AppImage` no Linux e do `-portable.exe` no Windows, salvando preferências e dados de forma portátil.
- **Links externos atualizados:** referências de documentação, menu Ajuda, reporte de erros e templates do GitHub atualizados para `https://github.com/slanow/MarkMed`.
- **Workflow de build e release:** adicionado suporte a executável portátil de arquivo único no Windows (`markmed-win-x64-0.24.1-portable.exe`) e publicação automática de releases.

> Baseado no [MarkText](https://github.com/marktext/marktext) sob licença MIT.
