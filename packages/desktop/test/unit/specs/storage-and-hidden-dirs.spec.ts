import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({}))

import { resolveElectronUserDataPath } from '../../../src/main/app/paths'
import EnvPaths from '../../../src/common/envPaths'
import {
  detectPendriveMountTarget
} from '../../../src/main/filesystem/pendriveEject'
import { evaluatePasswordStrength } from '../../../src/renderer/src/util/passwordStrength'
import { resolveSystemSpellcheckerLanguage } from '../../../src/main/spellchecker'
import { evaluateDiskSpace, getStorageSpaceInfo } from '../../../src/main/ipc/storage'
import {
  HIDDEN_CONFIG_DIR_NAME,
  HIDDEN_IMAGES_DIR_NAME,
  PORTABLE_POINTER_FILENAME,
  buildCleanAppImageRelaunchEnv,
  resolvePortableUserDataDir,
  seedHiddenConfigDirectories
} from '../../../src/main/filesystem/hiddenDirs'

const tempDirs: string[] = []

const createTempDir = async(prefix: string): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(async() => {
  delete process.env.PORTABLE_EXECUTABLE_DIR
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('storage space calculation and hidden directories setup', () => {
  it('evaluates normal, low (<10% or <1GiB), and critical (<5% or <300MiB) space thresholds', () => {
    const normal = evaluateDiskSpace('/pendrive', 4096, 8_000_000, 4_000_000)
    expect(normal.usedPercent).toBe(50)
    expect(normal.isLowSpace).toBe(false)
    expect(normal.isCriticalSpace).toBe(false)

    // ~7.5% free out of ~32 GiB -> low, not critical
    const low = evaluateDiskSpace('/pendrive', 4096, 8_000_000, 600_000)
    expect(low.usedPercent).toBe(93)
    expect(low.isLowSpace).toBe(true)
    expect(low.isCriticalSpace).toBe(false)

    // ~2% free -> critical
    const critical = evaluateDiskSpace('/pendrive', 4096, 8_000_000, 160_000)
    expect(critical.isLowSpace).toBe(true)
    expect(critical.isCriticalSpace).toBe(true)
  })

  it('reads real statfs space info for an existing directory', async() => {
    const dir = await createTempDir('mm-space-')
    const info = await getStorageSpaceInfo(dir)
    expect(info).not.toBeNull()
    if (!info) return
    expect(info.totalBytes).toBeGreaterThan(0)
    expect(info.usedPercent).toBeGreaterThanOrEqual(0)
    expect(info.usedPercent).toBeLessThanOrEqual(100)
  })

  it('creates hidden .markmed-user-data and .markmed-imagens folders and resolves them via CLI', async() => {
    const pendriveDir = await createTempDir('mm-pendrive-')
    const initialUserData = await createTempDir('mm-seed-src-')
    await fs.writeFile(
      path.join(initialUserData, 'preferences.json'),
      JSON.stringify({ firstRunSetupCompleted: true }),
      'utf8'
    )

    const pointerFile = path.join(pendriveDir, PORTABLE_POINTER_FILENAME)
    const { configDir, imagesDir } = await seedHiddenConfigDirectories({
      baseDir: pendriveDir,
      sourceUserDataDir: initialUserData,
      pointerTargetPath: pointerFile
    })

    expect(path.basename(configDir)).toBe(HIDDEN_CONFIG_DIR_NAME)
    expect(path.basename(imagesDir)).toBe(HIDDEN_IMAGES_DIR_NAME)

    const dataCenterRaw = JSON.parse(
      await fs.readFile(path.join(configDir, 'dataCenter.json'), 'utf8')
    ) as Record<string, unknown>
    expect(dataCenterRaw.imageFolderPath).toBe(imagesDir)

    process.env.PORTABLE_EXECUTABLE_DIR = pendriveDir
    const resolved = resolvePortableUserDataDir({
      appPath: pendriveDir,
      defaultAppDataDir: initialUserData
    })
    expect(resolved).toBe(configDir)
  })

  it('redirects electron runtime userData away from non-symlink filesystems like FAT32/exFAT pendrives', async() => {
    const pendriveConfig = await createTempDir('mm-exfat-')
    const tmpBase = await createTempDir('mm-tmp-')

    expect(
      resolveElectronUserDataPath(pendriveConfig, {
        platform: 'linux',
        tempDir: tmpBase,
        symlinkProbe: () => true
      })
    ).toBe(pendriveConfig)

    const fallback = resolveElectronUserDataPath(pendriveConfig, {
      platform: 'linux',
      tempDir: tmpBase,
      symlinkProbe: () => false
    })
    expect(fallback.startsWith(tmpBase)).toBe(true)
    expect(fallback).not.toBe(pendriveConfig)

    expect(
      resolveElectronUserDataPath(pendriveConfig, {
        platform: 'win32',
        tempDir: tmpBase,
        symlinkProbe: () => false
      })
    ).toBe(pendriveConfig)
  })

  it('strips AppImage FUSE environment variables for clean relaunch', () => {
    const cleaned = buildCleanAppImageRelaunchEnv({
      APPIMAGE: '/pendrive/markmed.AppImage',
      APPDIR: '/tmp/.mount_markme123',
      ARGV0: 'markmed',
      OWD: '/pendrive',
      PATH: '/tmp/.mount_markme123:/tmp/.mount_markme123/usr/sbin:/usr/bin',
      LD_LIBRARY_PATH: '/tmp/.mount_markme123/usr/lib',
      XDG_DATA_DIRS: '/tmp/.mount_markme123/usr/share:/usr/share',
      HOME: '/home/doctor'
    })

    expect(cleaned.APPIMAGE).toBeUndefined()
    expect(cleaned.APPDIR).toBeUndefined()
    expect(cleaned.ARGV0).toBeUndefined()
    expect(cleaned.OWD).toBeUndefined()
    expect(cleaned.PATH).toBe('/usr/bin')
    expect(cleaned.LD_LIBRARY_PATH).toBeUndefined()
    expect(cleaned.XDG_DATA_DIRS).toBe('/usr/share')
    expect(cleaned.HOME).toBe('/home/doctor')
  })

  it('detects removable pendrive mounts on Linux, Windows, and macOS', () => {
    const procMounts = [
      '/dev/nvme0n1p2 / ext4 rw,relatime 0 0',
      '/dev/sdb1 /run/media/ronald/MARKMED exfat rw,nosuid,nodev,relatime 0 0'
    ].join('\n')

    const linuxTarget = detectPendriveMountTarget(
      ['/run/media/ronald/MARKMED/Pacientes/João.md'],
      { platform: 'linux', procMountsContent: procMounts }
    )
    expect(linuxTarget).toEqual({
      mountPoint: '/run/media/ronald/MARKMED',
      device: '/dev/sdb1',
      label: 'MARKMED (/run/media/ronald/MARKMED)'
    })

    const nonRemovableLinux = detectPendriveMountTarget(
      ['/home/ronald/Documentos/Pacientes'],
      { platform: 'linux', procMountsContent: procMounts }
    )
    expect(nonRemovableLinux).toBeNull()

    const winTarget = detectPendriveMountTarget(
      ['E:\\Prontuarios\\consulta.md'],
      { platform: 'win32' }
    )
    expect(winTarget?.mountPoint).toBe('E:\\')

    const winSystemDrive = detectPendriveMountTarget(
      ['C:\\Users\\Doctor\\Documents'],
      { platform: 'win32' }
    )
    expect(winSystemDrive).toBeNull()

    const macTarget = detectPendriveMountTarget(
      ['/Volumes/MARKMED_USB/Pacientes'],
      { platform: 'darwin' }
    )
    expect(macTarget?.mountPoint).toBe('/Volumes/MARKMED_USB')
  })

  it('retargets EnvPaths userDataPath live without restarting the process', () => {
    const envPaths = new EnvPaths('/tmp/initial-user-data')
    expect(envPaths.preferencesPath).toBe('/tmp/initial-user-data')

    envPaths.retargetUserDataPath('/pendrive/.markmed-user-data')
    expect(envPaths.userDataPath).toBe('/pendrive/.markmed-user-data')
    expect(envPaths.dataCenterPath).toBe('/pendrive/.markmed-user-data')
    expect(envPaths.preferencesPath).toBe('/pendrive/.markmed-user-data')
  })

  it('resolves system locale to a supported spellchecker dictionary tag', () => {
    expect(resolveSystemSpellcheckerLanguage('pt-BR', ['en-US', 'pt-BR', 'es-ES'])).toBe('pt-BR')
    expect(resolveSystemSpellcheckerLanguage('pt_BR.UTF-8', ['en-US', 'pt-BR'])).toBe('pt-BR')
    expect(resolveSystemSpellcheckerLanguage('es', ['en-US', 'es-ES'])).toBe('es-ES')
    expect(resolveSystemSpellcheckerLanguage('pt-BR', [])).toBe('pt-BR')
  })


  it('evaluates backup password strength levels cleanly for advisory display', () => {
    expect(evaluatePasswordStrength('123').level).toBe('weak')
    expect(evaluatePasswordStrength('aaaaaaa').level).toBe('weak')
    expect(evaluatePasswordStrength('medico1').level).toBe('fair')
    expect(evaluatePasswordStrength('Medico1234').level).toBe('good')
    expect(evaluatePasswordStrength('Plantao#2026!UTI').level).toBe('strong')
  })
})
