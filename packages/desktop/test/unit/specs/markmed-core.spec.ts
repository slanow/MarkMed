// @vitest-environment node
import fs from 'node:fs/promises'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  detectPendriveMountTarget
} from '../../../src/main/filesystem/pendriveEject'
import {
  HIDDEN_CONFIG_DIR_NAME,
  HIDDEN_IMAGES_DIR_NAME,
  PORTABLE_POINTER_FILENAME,
  resolvePortableUserDataDir,
  seedHiddenConfigDirectories
} from '../../../src/main/filesystem/hiddenDirs'
import { ApplicationStateStore, RecoveryStore } from '../../../src/main/applicationState/storage'
import { createStateId } from '../../../src/main/applicationState/identity'
import { createEmptyApplicationState } from '@shared/applicationState/defaults'
import { RecoveryStatus } from '@shared/types/applicationState'

const tempDirs: string[] = []
const makeTempDir = (prefix: string): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('MarkMed pendrive auto-unmount & eject', () => {
  it('detects Linux removable mounts (/run/media, /media, /mnt) including escaped spaces', () => {
    const procMounts = [
      '/dev/nvme0n1p2 / ext4 rw,relatime 0 0',
      '/dev/sdb1 /run/media/ronald/PENDRIVE\\040MED vfat rw,nosuid,nodev 0 0'
    ].join('\n')

    const target = detectPendriveMountTarget(
      ['/run/media/ronald/PENDRIVE MED/markmed-linux-0.26.4.AppImage'],
      { platform: 'linux', procMountsContent: procMounts }
    )
    expect(target).toEqual({
      mountPoint: '/run/media/ronald/PENDRIVE MED',
      device: '/dev/sdb1',
      label: 'PENDRIVE MED (/run/media/ronald/PENDRIVE MED)'
    })

    const localTarget = detectPendriveMountTarget(['/home/ronald/Documentos/Prontuarios'], {
      platform: 'linux',
      procMountsContent: procMounts
    })
    expect(localTarget).toBeNull()
  })

  it('detects Windows removable drives (non-C:) and macOS /Volumes mounts', () => {
    expect(
      detectPendriveMountTarget(['E:\\MarkMed\\Prontuarios'], { platform: 'win32' })
    ).toEqual({
      mountPoint: 'E:\\',
      device: 'E:',
      label: 'E:'
    })
    expect(detectPendriveMountTarget(['C:\\Users\\med\\Documents'], { platform: 'win32' })).toBeNull()

    expect(
      detectPendriveMountTarget(['/Volumes/PLANTAO_USB/MarkMed.app'], { platform: 'darwin' })
    ).toEqual({
      mountPoint: '/Volumes/PLANTAO_USB',
      label: 'PLANTAO_USB'
    })
  })


})

describe('MarkMed first-run hidden folders & live storage retargeting', () => {
  it('seeds .markmed-user-data and .markmed-imagens and resolves portable pointer', async() => {
    const baseDir = makeTempDir('mm-base-')
    const tempRuntimeDir = makeTempDir('mm-runtime-')
    const pointerPath = path.join(baseDir, PORTABLE_POINTER_FILENAME)

    await fs.writeFile(
      path.join(tempRuntimeDir, 'preferences.json'),
      JSON.stringify({ firstRunSetupCompleted: true, autoSave: true }),
      'utf8'
    )

    const { configDir, imagesDir } = await seedHiddenConfigDirectories({
      baseDir,
      sourceUserDataDir: tempRuntimeDir,
      pointerTargetPath: pointerPath
    })

    expect(configDir).toBe(path.join(baseDir, HIDDEN_CONFIG_DIR_NAME))
    expect(imagesDir).toBe(path.join(baseDir, HIDDEN_IMAGES_DIR_NAME))

    const seededDataCenter = JSON.parse(
      readFileSync(path.join(configDir, 'dataCenter.json'), 'utf8')
    )
    expect(seededDataCenter.imageFolderPath).toBe(imagesDir)

    const resolved = resolvePortableUserDataDir({
      appPath: path.join(baseDir, 'resources', 'app.asar'),
      defaultAppDataDir: tempRuntimeDir
    })
    expect(resolved).toBe(configDir)
  })

  it('retargets ApplicationStateStore and RecoveryStore to the newly created hidden config directory', async() => {
    const initialDir = makeTempDir('mm-init-state-')
    const retargetedDir = makeTempDir('mm-retargeted-state-')

    const stateStore = new ApplicationStateStore(initialDir)
    const recoveryStore = new RecoveryStore(initialDir)

    stateStore.retargetDirectory(retargetedDir)
    recoveryStore.retargetDirectory(retargetedDir)

    const sessionId = createStateId()
    const winId = createStateId()
    const docId = createStateId()
    const state = createEmptyApplicationState(sessionId, Date.now())
    await stateStore.write(state)

    expect(() =>
      readFileSync(path.join(initialDir, 'state', 'application-state.json'), 'utf8')
    ).toThrow()
    const persisted = JSON.parse(
      readFileSync(path.join(retargetedDir, 'state', 'application-state.json'), 'utf8')
    )
    expect(persisted.session.id).toBe(sessionId)

    await recoveryStore.write({
      schemaVersion: 1,
      status: RecoveryStatus.DISCARDED,
      ownerWindowId: winId,
      documentId: docId,
      contentRevision: 1,
      updatedAtMs: Date.now()
    })

    const records = await recoveryStore.readWindow(winId)
    expect(records).toHaveLength(1)
    expect(records[0].documentId).toBe(docId)
  })
})
