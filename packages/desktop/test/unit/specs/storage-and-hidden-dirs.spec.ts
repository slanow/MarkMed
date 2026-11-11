import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { evaluateDiskSpace, getStorageSpaceInfo } from '../../../src/main/ipc/storage'
import {
  HIDDEN_CONFIG_DIR_NAME,
  HIDDEN_IMAGES_DIR_NAME,
  PORTABLE_POINTER_FILENAME,
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
})
