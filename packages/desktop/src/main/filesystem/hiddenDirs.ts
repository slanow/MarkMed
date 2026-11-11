import { execFile } from 'child_process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { isDirectory } from 'common/filesystem'

const execFileAsync = promisify(execFile)

export const HIDDEN_CONFIG_DIR_NAME = '.markmed-user-data'
export const LEGACY_CONFIG_DIR_NAME = 'markmed-user-data'
export const HIDDEN_IMAGES_DIR_NAME = '.markmed-imagens'
export const PORTABLE_POINTER_FILENAME = '.markmed-portable.json'

interface PortablePointerPayload {
  configDir: string
  imagesDir?: string
}

export const isPortableExecution = (): boolean =>
  Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.APPIMAGE)

export const getPortableBaseDir = (appPath: string): string => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR
  }
  if (process.env.APPIMAGE) {
    return path.dirname(process.env.APPIMAGE)
  }
  return path.join(appPath, '..', '..')
}

export const markPathHiddenOnWindows = async(
  targetPath: string,
  platform: NodeJS.Platform = process.platform
): Promise<void> => {
  if (platform !== 'win32') return
  try {
    await execFileAsync('attrib', ['+h', targetPath], { windowsHide: true })
  } catch {
    // Hidden attribute is best-effort; folder functionality does not depend on it.
  }
}

export const createHiddenDirectory = async(
  dirPath: string,
  platform: NodeJS.Platform = process.platform
): Promise<void> => {
  await fsPromises.mkdir(dirPath, { recursive: true })
  await markPathHiddenOnWindows(dirPath, platform)
}

const readPointerConfigDir = (pointerPath: string): string | null => {
  try {
    if (!fs.existsSync(pointerPath)) return null
    const raw = fs.readFileSync(pointerPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PortablePointerPayload>
    if (typeof parsed.configDir === 'string' && isDirectory(parsed.configDir)) {
      return path.resolve(parsed.configDir)
    }
  } catch {
    // Ignore malformed pointer files and continue checking other locations.
  }
  return null
}

/**
 * Resolves an existing portable or user-configured hidden config directory before
 * Electron initializes `userData`. Supports `.markmed-user-data`, legacy
 * `markmed-user-data`, and `.markmed-portable.json` pointer files.
 */
export const resolvePortableUserDataDir = (options: {
  appPath: string
  defaultAppDataDir: string
}): string | null => {
  const baseDir = getPortableBaseDir(options.appPath)
  const candidates = [
    path.join(baseDir, HIDDEN_CONFIG_DIR_NAME),
    path.join(baseDir, LEGACY_CONFIG_DIR_NAME)
  ]
  for (const candidate of candidates) {
    if (isDirectory(candidate)) {
      return candidate
    }
  }

  const pointerCandidates = [
    path.join(baseDir, PORTABLE_POINTER_FILENAME),
    path.join(options.defaultAppDataDir, 'markmed', PORTABLE_POINTER_FILENAME),
    path.join(options.defaultAppDataDir, 'MarkMed', PORTABLE_POINTER_FILENAME)
  ]
  for (const pointerFile of pointerCandidates) {
    const target = readPointerConfigDir(pointerFile)
    if (target) return target
  }
  return null
}

export const writePortablePointer = async(
  pointerPath: string,
  payload: PortablePointerPayload
): Promise<void> => {
  await fsPromises.mkdir(path.dirname(pointerPath), { recursive: true })
  await fsPromises.writeFile(pointerPath, JSON.stringify(payload, null, 2), 'utf8')
  await markPathHiddenOnWindows(pointerPath)
}

export const copyJsonIfPresent = async(srcFile: string, destFile: string): Promise<void> => {
  if (!fs.existsSync(srcFile) || fs.existsSync(destFile)) return
  try {
    const content = await fsPromises.readFile(srcFile, 'utf8')
    await fsPromises.writeFile(destFile, content, 'utf8')
  } catch {
    // Missing or unreadable seed files will simply regenerate defaults.
  }
}

export const seedHiddenConfigDirectories = async(options: {
  baseDir: string
  sourceUserDataDir: string
  pointerTargetPath: string
}): Promise<{ configDir: string; imagesDir: string }> => {
  const resolvedBase = path.resolve(options.baseDir)
  const configDir = path.join(resolvedBase, HIDDEN_CONFIG_DIR_NAME)
  const imagesDir = path.join(resolvedBase, HIDDEN_IMAGES_DIR_NAME)

  await createHiddenDirectory(configDir)
  await createHiddenDirectory(imagesDir)

  await copyJsonIfPresent(
    path.join(options.sourceUserDataDir, 'preference.json'),
    path.join(configDir, 'preference.json')
  )
  await copyJsonIfPresent(
    path.join(options.sourceUserDataDir, 'preferences.json'),
    path.join(configDir, 'preferences.json')
  )

  const targetDataCenterFile = path.join(configDir, 'dataCenter.json')
  let dataCenterObj: Record<string, unknown> = {}
  const srcDataCenter = path.join(options.sourceUserDataDir, 'dataCenter.json')
  try {
    if (fs.existsSync(srcDataCenter)) {
      dataCenterObj = JSON.parse(await fsPromises.readFile(srcDataCenter, 'utf8')) as Record<
        string,
        unknown
      >
    }
  } catch {
    dataCenterObj = {}
  }
  dataCenterObj.imageFolderPath = imagesDir
  await fsPromises.writeFile(targetDataCenterFile, JSON.stringify(dataCenterObj, null, 2), 'utf8')

  await writePortablePointer(options.pointerTargetPath, { configDir, imagesDir })
  return { configDir, imagesDir }
}
