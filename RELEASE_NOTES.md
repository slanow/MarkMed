## Novidades e Melhorias — MarkMed v0.26.4

- **Programa muito mais leve e enxuto:** remoção de dependências mortas (`keytar`, `axios`, `pako`, `ms`, pacotes duplicados do motor de renderização) e exclusão de módulos de desenvolvimento duplicados dentro do pacote final (`app.asar`), reduzindo drasticamente o tamanho do instalador e do AppImage.
- **Remoção completa de rastros antigos e funções de patrocinadores legados:** removidos scripts, fotos de patrocinadores/contribuidores antigos, páginas web legadas e referências residuais, direcionando todos os links de ajuda para a Wiki oficial do MarkMed.
- **Terminologia médica e organização visual:**
  - Termos adaptados para a rotina clínica (_Prontuários_, _Novo Prontuário_, _Prontuário vazio_, _Digite / para inserir campos ou modelos..._).
  - **Árvore de pastas hierárquica com guias verticais:** pastas e subpastas agora possuem indentação progressiva e linhas-guia verticais para facilitar a visualização do caminho dos prontuários.
- **Correções de bugs e estabilidade:**
  - **Botão Nova Pasta:** corrigido para realmente criar uma nova pasta dentro da pasta atual (ou permitir escolher onde criar se nenhuma pasta estiver aberta).
  - **Conflito de salvamento automático:** corrigido o falso aviso _"foi alterado no disco. Deseja recarregar?"_ durante o auto-salvar por tempo (`5s`) combinado com salvamento ao pressionar `Enter`.
  - **Lembrete seguro para ejetar o pendrive:** substituída a tentativa de desmontagem automática por um aviso claro ao fechar o MarkMed usando um pendrive, com link direto para o tutorial na Wiki e fechamento instantâneo e limpo sem travamentos.
  - **Configuração inicial no pendrive/PC:** ao autorizar a criação das pastas ocultas (`.markmed-user-data` e `.markmed-imagens`), todos os serviços internos passam a gravar imediatamente na nova pasta oculta sem depender de reinicialização.
  - **Auto-renomeação imediata ao pressionar `Enter`** e proteção no extrator de nome do paciente.
  - **Correção de vazamento de memória na árvore lateral.**
