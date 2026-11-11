import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createEncryptedBackup,
  decryptBackupArchive
} from '../../../src/main/backup/encryptedBackup'

const tempDirs: string[] = []

const createTempDir = async(prefix: string): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(async() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('encryptedBackup (.mmbak)', () => {
  it('encrypts text + binary files with password and decrypts accurately', async() => {
    const sourcePatients = await createTempDir('mm-patients-')
    const sourceImages = await createTempDir('mm-images-')
    const outDir = await createTempDir('mm-out-')
    const restoreDir = await createTempDir('mm-restore-')

    await fs.mkdir(path.join(sourcePatients, '2026-11'), { recursive: true })
    await fs.writeFile(
      path.join(sourcePatients, '2026-11', 'Joao_2026-11-11_04-10.md'),
      '# João Silva\n\nEvolução estável.\n',
      'utf8'
    )
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x42])
    await fs.writeFile(path.join(sourceImages, 'raiox.png'), pngHeader)

    const archivePath = path.join(outDir, 'backup.mmbak')
    const created = await createEncryptedBackup({
      sources: [
        { label: 'prontuarios', dirPath: sourcePatients },
        { label: 'imagens', dirPath: sourceImages }
      ],
      archivePath,
      password: 'SenhaSegura@Plantao2026'
    })

    expect(created.fileCount).toBe(2)
    const rawArchive = await fs.readFile(archivePath)
    expect(rawArchive.subarray(0, 5).toString('ascii')).toBe('MMBK1')
    expect(rawArchive.toString('utf8')).not.toContain('João Silva')

    await expect(
      decryptBackupArchive({
        archivePath,
        destinationDir: restoreDir,
        password: 'SenhaErrada'
      })
    ).rejects.toThrow(/Senha incorreta/i)

    const decrypted = await decryptBackupArchive({
      archivePath,
      destinationDir: restoreDir,
      password: 'SenhaSegura@Plantao2026'
    })

    expect(decrypted.fileCount).toBe(2)
    const restoredMd = await fs.readFile(
      path.join(restoreDir, 'prontuarios', '2026-11', 'Joao_2026-11-11_04-10.md'),
      'utf8'
    )
    expect(restoredMd).toBe('# João Silva\n\nEvolução estável.\n')
    const restoredImg = await fs.readFile(path.join(restoreDir, 'imagens', 'raiox.png'))
    expect(restoredImg.equals(pngHeader)).toBe(true)
  })
})
