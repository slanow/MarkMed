## Novidades e Melhorias — MarkMed v0.26.0

### Modo Pendrive, Organização e Espaço em Disco

- **Configuração inicial de pastas ocultas (`.markmed-user-data` e `.markmed-imagens`):** ao iniciar pela primeira vez (ou em **Arquivo → Configurar Pastas Iniciais...**), o MarkMed permite criar automaticamente com sua autorização as pastas de configurações e imagens já ocultas no Windows (`attrib +h`) e no Linux/macOS (iniciadas com `.`), além de trazer link direto para o guia passo a passo na Wiki caso prefira configurar manualmente.
- **Aviso de pouco espaço e barra de armazenamento no rodapé:** verificação automática de espaço livre na inicialização com alerta quando o pendrive ou disco estiver com pouco espaço, acompanhada de uma barra discreta no rodapé mostrando porcentagem usada, valores livres/totais e botão rápido para ocultar (reexibível em **Preferências**).

### Segurança, Privacidade e Fluxo Clínico

- **Backup criptografado de pacientes (`.mmbak`) e descriptografador integrado:** gere pacotes `.mmbak` protegidos por senha com criptografia forte (**AES-256-GCM + scrypt**) para enviar suas evoluções e imagens com segurança para a nuvem (Google Drive/OneDrive) em conformidade com a LGPD, e restaure/descriptografe o backup dentro do próprio MarkMed sempre que precisar (botão de cadeado na barra lateral ou em **Arquivo → Backup Criptografado de Pacientes...**).
- **Nome automático pela primeira linha + data e hora no arquivo salvo:** ao digitar o nome do paciente na primeira linha do prontuário, o arquivo é renomeado/sugerido automaticamente no formato `<Nome-Paciente>_YYYY-MM-DD_HH-mm.md`, mantendo a data e a hora apenas no nome do arquivo salvo (sem poluir o corpo do texto).
- **Barra lateral ativada por padrão + botão rápido:** a barra lateral de arquivos já abre visível por padrão e conta com botão dedicado de **Mostrar/Ocultar** na barra superior.

> Baseado no [MarkText](https://github.com/marktext/marktext) sob licença MIT.
