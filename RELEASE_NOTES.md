## Novidades e Correções — MarkMed v0.26.1

### Correções para Modo Pendrive (FAT32 / exFAT e AppImage)

- **Compatibilidade total com pendrives FAT32 / exFAT no Linux:** corrigido o erro que impedia o MarkMed de abrir quando `.markmed-user-data` ficava em um pendrive FAT32/exFAT (onde o sistema de arquivos não permite o link simbólico `SingletonLock` do Chromium). Suas preferências, estado e logs continuam portáteis dentro da pasta oculta do pendrive, enquanto o lock interno do navegador usa um diretório temporário local.
- **Reinício automático limpo no `.AppImage` e no Windows Portátil:** corrigido o erro de montagem FUSE (`Cannot mount AppImage`) após autorizar a criação das pastas iniciais pela primeira vez, garantindo que o aplicativo reinicie normalmente direto no executável portátil.

### Recursos da linha 0.26

- **Pastas ocultas automáticas no pendrive (`.markmed-user-data` e `.markmed-imagens`)** com assistente de primeira execução e link direto para a Wiki.
- **Aviso de pouco espaço + barra de armazenamento no rodapé** com porcentagem, valores livre/total e opção de ocultar.
- **Backup criptografado de pacientes (`.mmbak` em AES-256-GCM) e descriptografador integrado** dentro do MarkMed.
- **Nome automático pela 1ª linha (`<Nome-Paciente>_YYYY-MM-DD_HH-mm.md`)**, mantendo a data e a hora apenas no nome do arquivo salvo.
- **Barra lateral ativada por padrão** com botão rápido de mostrar/ocultar na barra superior.

> Baseado no [MarkText](https://github.com/marktext/marktext) sob licença MIT.
