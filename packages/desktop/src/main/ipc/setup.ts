import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type Accessor from '../app/accessor'
import {
  HIDDEN_CONFIG_DIR_NAME,
  HIDDEN_IMAGES_DIR_NAME,
  LEGACY_CONFIG_DIR_NAME,
  PORTABLE_POINTER_FILENAME,
  getPortableBaseDir,
  isPortableExecution,
  seedHiddenConfigDirectories
} from '../filesystem/hiddenDirs'
import type { FirstRunSetupResult, FirstRunSetupStatus } from '@shared/types/markmed'

export const WIKI_SETUP_URL = 'https://github.com/slanow/MarkMed/wiki/Pastas-e-Configuracao-Inicial'

const getSuggestedBaseDirectory = (): string => {
  if (isPortableExecution()) {
    return getPortableBaseDir(app.getAppPath())
  }
  return path.join(app.getPath('documents'), 'MarkMed')
}

const getPointerFilePath = (): string => {
  if (isPortableExecution()) {
    return path.join(getPortableBaseDir(app.getAppPath()), PORTABLE_POINTER_FILENAME)
  }
  return path.join(app.getPath('appData'), 'markmed', PORTABLE_POINTER_FILENAME)
}

const hasPortableFoldersInBase = (baseDir: string): boolean => {
  return (
    fs.existsSync(path.join(baseDir, HIDDEN_CONFIG_DIR_NAME)) ||
    fs.existsSync(path.join(baseDir, LEGACY_CONFIG_DIR_NAME))
  )
}

export const registerSetupHandlers = (getAccessor: () => Accessor): void => {
  ipcMain.handle('mt::setup::get-initial-status', (): FirstRunSetupStatus => {
    const accessor = getAccessor()
    const isPortable = isPortableExecution()
    const suggestedBaseDir = getSuggestedBaseDirectory()
    const completed = !!accessor.preferences.getItem<boolean>('firstRunSetupCompleted')
    const alreadyUsingPortableConfig = hasPortableFoldersInBase(
      getPortableBaseDir(app.getAppPath())
    )

    return {
      needsSetup: !completed && !alreadyUsingPortableConfig,
      isPortable,
      suggestedBaseDir,
      activeUserDataDir: accessor.paths.userDataPath,
      configDirName: HIDDEN_CONFIG_DIR_NAME,
      imagesDirName: HIDDEN_IMAGES_DIR_NAME,
      wikiUrl: WIKI_SETUP_URL
    }
  })

  ipcMain.handle('mt::setup::pick-base-directory', async(event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      defaultPath: getSuggestedBaseDirectory(),
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(
    'mt::setup::create-hidden-folders',
    async(_event, baseDir: string): Promise<FirstRunSetupResult> => {
      try {
        const accessor = getAccessor()
        const resolvedBase =
          typeof baseDir === 'string' && baseDir.trim().length > 0
            ? path.resolve(baseDir)
            : getSuggestedBaseDirectory()

        accessor.preferences.setItem('firstRunSetupCompleted', true)

        const { configDir, imagesDir } = await seedHiddenConfigDirectories({
          baseDir: resolvedBase,
          sourceUserDataDir: accessor.paths.userDataPath,
          pointerTargetPath: getPointerFilePath()
        })

        accessor.paths.retargetUserDataPath(configDir)
        accessor.preferences.retargetDirectory(configDir)
        await accessor.dataCenter.setItem('imageFolderPath', imagesDir)

        return {
          ok: true,
          configDir,
          imagesDir,
          requiresRestart: false
        }
      } catch (error) {
        return {
          ok: false,
          configDir: '',
          imagesDir: '',
          requiresRestart: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  ipcMain.handle('mt::setup::skip-setup', (): void => {
    const accessor = getAccessor()
    accessor.preferences.setItem('firstRunSetupCompleted', true)
  })
}
