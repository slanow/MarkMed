## Novidades e Melhorias — MarkMed v0.26.3

- **Desmontagem e ejeção segura do pendrive aprimoradas:** ao fechar o MarkMed usando um pendrive (`.AppImage` no Linux ou portátil no Windows/macOS), o processo agora aguarda o encerramento completo das janelas/FUSE, limpa variáveis do AppImage, executa `sync`, tenta desmontar repetidamente e aciona `udisksctl power-off` / `Shell.Application` Eject / `diskutil eject` para ejetar a unidade com segurança.
- **Botão `Criar Arquivo` com a mesma função do `Ctrl + T`:** na barra lateral sem pasta aberta, clicar em **Criar Arquivo** agora abre imediatamente um novo prontuário em branco no editor, sem obrigar escolher uma pasta antes.
- **Padronização de nomenclatura (`Novo Arquivo`):** substituído o texto **"Nova Aba"** por **"Novo Arquivo"** no menu _Arquivo_, na paleta de comandos e nos botões do editor.
- **Detector de força da senha no Backup Criptografado (`.mmbak`):** adicionada barra visual indicativa (_Fraca_, _Razoável_, _Boa_, _Forte_) ao definir a senha do backup — apenas informativa, **sem nunca obrigar** o uso de senha forte caso o usuário prefira uma senha curta.

> Baseado no [MarkText](https://github.com/marktext/marktext) sob licença MIT.
