import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import { isOsx } from '../config'

export const addToDictionary = (win: BrowserWindow, word: string): boolean => {
  return win.webContents.session.addWordToSpellCheckerDictionary(word)
}

export const removeFromDictionary = (win: BrowserWindow, word: string): boolean => {
  return win.webContents.session.removeWordFromSpellCheckerDictionary(word)
}

export const getCustomDictionaryWords = async(win: BrowserWindow): Promise<string[]> => {
  return win.webContents.session.listWordsInSpellCheckerDictionary()
}

export const setSpellCheckerEnabled = (win: BrowserWindow, enabled: boolean): boolean => {
  win.webContents.session.setSpellCheckerEnabled(enabled)
  return win.webContents.session.isSpellCheckerEnabled() === enabled
}

export const switchLanguage = (win: BrowserWindow, lang: string): void => {
  win.webContents.session.setSpellCheckerLanguages([lang])
}

/**
 * Returns the list of available spellchecker languages, or empty on macOS
 * where the OS spellchecker is used and language is auto-detected.
 */
export const getAvailableDictionaries = (win: BrowserWindow): string[] => {
  if (!win.webContents.session.isSpellCheckerEnabled) {
    console.warn('Spell Checker not available but dictionaries requested.')
    return []
  } else if (isOsx) {
    return []
  }

  const availableLanguages = win.webContents.session.availableSpellCheckerLanguages

  return availableLanguages.length > 0 ? availableLanguages : ['en-US']
}

/**
 * Matches a system/UI locale (e.g. `pt-BR`, `pt_BR`, `pt`, `es-419`) against
 * Chromium's available spellchecker dictionaries (`availableSpellCheckerLanguages`).
 */
export const resolveSystemSpellcheckerLanguage = (
  systemLocale: string,
  availableDictionaries: readonly string[]
): string => {
  const normalized = (systemLocale || '').trim().replace(/_/g, '-')
  if (availableDictionaries.length === 0) {
    if (/^pt(?:-|$)/i.test(normalized)) return 'pt-BR'
    if (normalized.length >= 2) return normalized
    return 'en-US'
  }

  const lowerTarget = normalized.toLowerCase()
  const exact = availableDictionaries.find((item) => item.toLowerCase() === lowerTarget)
  if (exact) return exact

  const baseLang = lowerTarget.split('-')[0]
  if (baseLang === 'pt') {
    const ptBr = availableDictionaries.find((item) => item.toLowerCase() === 'pt-br')
    if (ptBr) return ptBr
  }

  if (baseLang) {
    const prefixMatch = availableDictionaries.find(
      (item) => item.toLowerCase() === baseLang || item.toLowerCase().startsWith(`${baseLang}-`)
    )
    if (prefixMatch) return prefixMatch
  }

  return availableDictionaries.includes('en-US') ? 'en-US' : availableDictionaries[0]
}

const registerSpellcheckerHandlers = (): void => {
  ipcMain.handle('mt::spellchecker-remove-word', async(e, word: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    return removeFromDictionary(win, word)
  })
  ipcMain.handle('mt::spellchecker-switch-language', async(e, lang: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) switchLanguage(win, lang)
    return null
  })
  ipcMain.handle('mt::spellchecker-get-available-dictionaries', async(e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return []
    return getAvailableDictionaries(win)
  })
  // We have to set a language or call `switchLanguage` on Linux and Windows.
  ipcMain.handle('mt::spellchecker-set-enabled', async(e, enabled: boolean) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    if (!setSpellCheckerEnabled(win, enabled)) {
      log.warn(`Failed to (de-)activate spell checking on editor (id=${win.id}).`)
      return false
    }
    return true
  })
  ipcMain.handle('mt::spellchecker-get-custom-dictionary-words', async(e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return []
    return getCustomDictionaryWords(win)
  })
}

export default registerSpellcheckerHandlers
