import { createHash } from 'crypto'
import { mkdirSync, symlinkSync, unlinkSync } from 'fs'
import os from 'os'
import path from 'path'
import { app } from 'electron'
import EnvPaths from 'common/envPaths'
import { ensureDirSync } from 'common/filesystem'

const supportsSymlinks = (directory: string): boolean => {
  const probe = path.join(directory, `.markmed-lock-probe-${process.pid}-${Date.now()}`)
  try {
    mkdirSync(directory, { recursive: true })
    symlinkSync('probe', probe)
    return true
  } catch {
    return false
  } finally {
    try {
      unlinkSync(probe)
    } catch {
      // Probe file was not created or was already removed.
    }
  }
}

/**
 * Keeps Chromium runtime state (including POSIX `SingletonLock` symlinks) off
 * filesystems like FAT32/exFAT pendrives that forbid symlinks on Linux/macOS.
 */
export const resolveElectronUserDataPath = (
  userDataPath: string,
  options: {
    platform?: NodeJS.Platform
    tempDir?: string
    symlinkProbe?: (dir: string) => boolean
  } = {}
): string => {
  const platform = options.platform ?? process.platform
  if (platform === 'win32') return userDataPath

  const canSymlink = options.symlinkProbe ?? supportsSymlinks
  if (canSymlink(userDataPath)) return userDataPath

  const uid = typeof process.getuid === 'function' ? process.getuid() : 'user'
  const digest = createHash('sha256').update(path.resolve(userDataPath)).digest('hex').slice(0, 12)
  const runtimeDir = path.join(options.tempDir ?? os.tmpdir(), `markmed-runtime-${uid}-${digest}`)
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 })
  return runtimeDir
}

class AppPaths extends EnvPaths {
  /**
   * Configure and sets all application paths.
   *
   * @param userDataPath The user data path or empty string for default.
   */
  constructor(userDataPath: string = '') {
    if (!userDataPath) {
      userDataPath = app.getPath('userData')
    }

    const electronUserDataPath = resolveElectronUserDataPath(userDataPath)
    super(userDataPath, electronUserDataPath)

    // Changing the user data directory is only allowed during application bootstrap.
    app.setPath('userData', this.electronUserDataPath)
  }
}

export const ensureAppDirectoriesSync = (paths: AppPaths): void => {
  ensureDirSync(paths.userDataPath)
  ensureDirSync(paths.logPath)
  ensureDirSync(paths.electronUserDataPath)
}

export default AppPaths
