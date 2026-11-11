## Novidades e Melhorias — MarkMed v0.26.2

### 1. Interface e Criação Rápida de Prontuários e Pastas

- **Barra de título limpa e sem sobreposição:** agora exibe apenas o **nome do arquivo** (sem o caminho das pastas) e trunca nomes longos com reticências (`...`), nunca sobrepondo os botões `Palavras`, `Auto-salvar` e `Copiar TXT` mesmo quando a janela é reduzida.
- **Botões rápidos na barra lateral (`Abrir Pasta`, `Criar Pasta` e `Criar Arquivo`):** adicionados botões de 1 clique na tela inicial da barra lateral e no cabeçalho da pasta aberta (`+` arquivo e `+` pasta) para criar prontuários e subpastas imediatamente.

### 2. Prontuário Hospitalar (`Copiar TXT`), Ortografia e Atalhos

- **`Copiar TXT` sem linhas em branco extras entre parágrafos:** corrigido o espaçamento ao colar no sistema eletrônico do hospital — agora cada parágrafo usa quebra de linha simples (`\n`), sem deixar buracos entre os parágrafos.
- **Corretor ortográfico sempre ativado por padrão no idioma do sistema:** já inicia ativo automaticamente no idioma do computador (como `pt-BR`).
- **`Ctrl + P` (`Cmd + P`) para Imprimir:** restaurado o atalho universal `Ctrl + P` para impressão; a **Abertura Rápida** de arquivos foi movida para `Ctrl + Alt + P` (`Cmd + Option + P`).

### 3. Modo Pendrive Mais Seguro e Sem Reinicialização

- **Auto-ejetar / desmontar (`umount`) o pendrive ao fechar o MarkMed:** ao fechar o aplicativo usando arquivos ou configurações em um pendrive, o MarkMed explica as vantagens (evitar corrupção de arquivos e lembrar você de remover o pendrive do PC do hospital pelo sigilo médico) e permite **Desmontar Pendrive e Sair** com 1 clique. Pode ser desativado em _Preferências → Geral_.
- **Criação das pastas iniciais sem fechar o programa:** ao criar `.markmed-user-data` e `.markmed-imagens` na primeira abertura, o MarkMed aplica as pastas imediatamente na sessão atual, sem fechar ou reiniciar o aplicativo.
- **Metadados de fornecedor no Windows + guia SmartScreen:** incluídos metadados de identificação no executável Windows e instruções passo a passo (**"Mais informações" → "Executar assim mesmo"**) na documentação e na Wiki.

> Baseado no [MarkText](https://github.com/marktext/marktext) sob licença MIT.
