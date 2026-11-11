import { registerBootInfo } from './bootInfo'
import { registerFsHandlers, type FileOperations } from './fs'
import { registerPathHandlers } from './paths'
import { registerRipgrepHandlers } from './ripgrep'
import { registerUploaderHandlers } from './uploader'
import { registerFontsHandlers } from './fonts'
import { registerShellHandlers } from './shell'
import { registerWindowHandlers } from './window'
import { registerCmdHandlers } from './cmd'
import { registerI18nHandlers } from './i18n'
import { registerDialogHandlers } from './dialog'
import { registerDiagramHandlers } from './diagram'
import { registerLinkHtmlHandler } from './linkHtml'
import { registerImageClipboardHandlers } from './clipboardImage'
import { registerSetupHandlers } from './setup'
import { registerStorageHandlers } from './storage'
import { registerBackupHandlers } from './backup'
import type Accessor from '../app/accessor'

export interface SandboxIpcContext {
  fileOperations?: FileOperations
  getAccessor?: () => Accessor
}

export const registerSandboxIpcHandlers = (context?: SandboxIpcContext): void => {
  registerBootInfo()
  registerFsHandlers(context?.fileOperations)
  registerPathHandlers()
  registerRipgrepHandlers()
  registerUploaderHandlers()
  registerFontsHandlers()
  registerShellHandlers()
  registerWindowHandlers()
  registerCmdHandlers()
  registerI18nHandlers()
  registerDialogHandlers()
  registerDiagramHandlers()
  registerLinkHtmlHandler()
  registerImageClipboardHandlers()
  if (context?.getAccessor) {
    const getAccessor = context.getAccessor
    registerSetupHandlers(getAccessor)
    registerStorageHandlers(() => getAccessor().paths.userDataPath)
    registerBackupHandlers(getAccessor)
  }
}
