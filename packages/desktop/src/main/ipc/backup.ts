import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type Accessor from '../app/accessor'
import { createEncryptedBackup, decryptBackupArchive } from '../backup/encryptedBackup'
import type {
  CreateBackupRequest,
  CreateBackupResult,
  DecryptBackupRequest,
  DecryptBackupResult
} from '@shared/types/markmed'

export const registerBackupHandlers = (getAccessor: () => Accessor): void => {
  ipcMain.handle('mt::backup::pick-source-folder', async(event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('mt::backup::pick-archive-file', async(event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      filters: [{ name: 'Backup MarkMed (.mmbak)', extensions: ['mmbak'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('mt::backup::pick-restore-folder', async(event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(
    'mt::backup::create',
    async(event, request: CreateBackupRequest): Promise<CreateBackupResult> => {
      try {
        const accessor = getAccessor()
        const win = BrowserWindow.fromWebContents(event.sender)
        const sources: Array<{ label: string; dirPath: string }> = []

        for (const dir of request.sourceDirs) {
          if (typeof dir === 'string' && dir.trim() && fs.existsSync(dir)) {
            sources.push({ label: path.basename(dir) || 'prontuarios', dirPath: dir })
          }
        }

        if (request.includeImagesFolder) {
          const imagesDir = (await accessor.dataCenter.getItem('imageFolderPath')) as string
          if (imagesDir && fs.existsSync(imagesDir)) {
            sources.push({ label: 'imagens', dirPath: imagesDir })
          }
        }

        if (request.includeConfigFolder) {
          const configDir = accessor.paths.userDataPath
          if (configDir && fs.existsSync(configDir)) {
            sources.push({ label: 'configuracoes', dirPath: configDir })
          }
        }

        if (sources.length === 0) {
          return {
            ok: false,
            error: 'Selecione ao menos uma pasta válida para fazer o backup.'
          }
        }

        const defaultName = `MarkMed_Backup_${dayjs().format('YYYY-MM-DD_HH-mm')}.mmbak`
        const saveChoice = await dialog.showSaveDialog(win as BrowserWindow, {
          defaultPath: defaultName,
          filters: [{ name: 'Backup Criptografado MarkMed', extensions: ['mmbak'] }]
        })
        if (saveChoice.canceled || !saveChoice.filePath) {
          return { ok: false, canceled: true }
        }

        const archivePath = saveChoice.filePath.toLowerCase().endsWith('.mmbak')
          ? saveChoice.filePath
          : `${saveChoice.filePath}.mmbak`

        const result = await createEncryptedBackup({
          sources,
          archivePath,
          password: request.password
        })

        return {
          ok: true,
          archivePath,
          fileCount: result.fileCount,
          totalBytes: result.totalBytes
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle(
    'mt::backup::decrypt',
    async(_event, request: DecryptBackupRequest): Promise<DecryptBackupResult> => {
      try {
        if (!request.archivePath || !fs.existsSync(request.archivePath)) {
          return { ok: false, error: 'Selecione um arquivo .mmbak válido.' }
        }
        if (!request.destinationDir || !request.destinationDir.trim()) {
          return { ok: false, error: 'Selecione a pasta de destino para restaurar.' }
        }

        const restoreSubfolder = path.join(
          request.destinationDir,
          `MarkMed_Backup_Restaurado_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`
        )

        const result = await decryptBackupArchive({
          archivePath: request.archivePath,
          destinationDir: restoreSubfolder,
          password: request.password
        })

        return {
          ok: true,
          restoredDir: result.restoredDir,
          fileCount: result.fileCount
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )
}
