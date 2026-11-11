import crypto from 'crypto'
import fsPromises from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import zlib from 'zlib'

const scryptAsync = promisify(crypto.scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>
const gzipAsync = promisify(zlib.gzip)
const gunzipAsync = promisify(zlib.gunzip)

const FILE_MAGIC = Buffer.from('MMBK1', 'ascii')
const ARCHIVE_MAGIC = Buffer.from('MMAR', 'ascii')
const SALT_BYTES = 16
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16
const KEY_BYTES = 32

const IGNORED_NAMES = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db'])

interface ArchiveEntry {
  relPath: string
  data: Buffer
}

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  scryptAsync(password, salt, KEY_BYTES, { N: 16384, r: 8, p: 1 })

const collectDirectoryEntries = async(
  rootDir: string,
  prefixFolder: string
): Promise<ArchiveEntry[]> => {
  const entries: ArchiveEntry[] = []

  const walk = async(currentDir: string): Promise<void> => {
    const dirItems = await fsPromises.readdir(currentDir, { withFileTypes: true })
    for (const item of dirItems) {
      if (IGNORED_NAMES.has(item.name)) continue
      const fullPath = path.join(currentDir, item.name)
      if (item.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!item.isFile()) continue
      if (item.name.toLowerCase().endsWith('.mmbak')) continue

      const relFromRoot = path.relative(rootDir, fullPath).split(path.sep).join('/')
      if (!relFromRoot || relFromRoot.startsWith('..')) continue
      const relPath = prefixFolder ? `${prefixFolder}/${relFromRoot}` : relFromRoot
      const data = await fsPromises.readFile(fullPath)
      entries.push({ relPath, data })
    }
  }

  await walk(rootDir)
  return entries
}

const packArchiveEntries = (entries: readonly ArchiveEntry[]): Buffer => {
  const chunks: Buffer[] = []
  const countBuf = Buffer.allocUnsafe(4)
  countBuf.writeUInt32BE(entries.length, 0)
  chunks.push(ARCHIVE_MAGIC, countBuf)

  for (const entry of entries) {
    const pathBuf = Buffer.from(entry.relPath, 'utf8')
    const headerBuf = Buffer.allocUnsafe(8)
    headerBuf.writeUInt32BE(pathBuf.length, 0)
    headerBuf.writeUInt32BE(entry.data.length, 4)
    chunks.push(headerBuf, pathBuf, entry.data)
  }
  return Buffer.concat(chunks)
}

const unpackArchiveEntries = (buffer: Buffer): ArchiveEntry[] => {
  if (buffer.length < 8 || !buffer.subarray(0, 4).equals(ARCHIVE_MAGIC)) {
    throw new Error('Formato interno de backup inválido.')
  }
  const entryCount = buffer.readUInt32BE(4)
  let offset = 8
  const entries: ArchiveEntry[] = []

  for (let i = 0; i < entryCount; i++) {
    if (offset + 8 > buffer.length) {
      throw new Error('Arquivo de backup truncado ou corrompido.')
    }
    const pathLen = buffer.readUInt32BE(offset)
    const dataLen = buffer.readUInt32BE(offset + 4)
    offset += 8
    if (offset + pathLen + dataLen > buffer.length) {
      throw new Error('Arquivo de backup truncado ou corrompido.')
    }
    const relPath = buffer.subarray(offset, offset + pathLen).toString('utf8')
    offset += pathLen
    const data = buffer.subarray(offset, offset + dataLen)
    offset += dataLen
    entries.push({ relPath, data })
  }

  return entries
}

const resolveSafeRestorePath = (destRoot: string, relPath: string): string => {
  const segments = relPath.split('/').filter((seg) => seg.length > 0 && seg !== '.')
  if (segments.length === 0 || segments.some((seg) => seg === '..' || seg.includes('\0'))) {
    throw new Error(`Caminho inseguro detectado no backup: ${relPath}`)
  }
  const resolvedRoot = path.resolve(destRoot)
  const target = path.resolve(resolvedRoot, ...segments)
  if (!target.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Caminho fora da pasta de destino: ${relPath}`)
  }
  return target
}

const sanitizeSourceLabel = (label: string): string => {
  const withoutControl = Array.from(label)
    .map((ch) => (ch.charCodeAt(0) < 32 ? '_' : ch))
    .join('')
  return withoutControl.replace(/[<>:"/\\|?*]/g, '_') || 'pasta'
}

export const createEncryptedBackup = async(options: {
  sources: Array<{ label: string; dirPath: string }>
  archivePath: string
  password: string
}): Promise<{ fileCount: number; totalBytes: number }> => {
  if (!options.password) {
    throw new Error('Informe uma senha para criptografar o backup.')
  }

  const allEntries: ArchiveEntry[] = []
  const usedLabels = new Set<string>()
  const multiSource = options.sources.length > 1

  for (const source of options.sources) {
    let safeLabel = sanitizeSourceLabel(source.label)
    if (usedLabels.has(safeLabel)) {
      let suffix = 2
      while (usedLabels.has(`${safeLabel}-${suffix}`)) suffix++
      safeLabel = `${safeLabel}-${suffix}`
    }
    usedLabels.add(safeLabel)
    const prefix = multiSource ? safeLabel : ''
    const entries = await collectDirectoryEntries(source.dirPath, prefix)
    allEntries.push(...entries)
  }

  if (allEntries.length === 0) {
    throw new Error('Nenhum arquivo encontrado nas pastas selecionadas para backup.')
  }

  const packed = packArchiveEntries(allEntries)
  const compressed = await gzipAsync(packed)

  const salt = crypto.randomBytes(SALT_BYTES)
  const iv = crypto.randomBytes(IV_BYTES)
  const key = await deriveKey(options.password, salt)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()])
  const authTag = cipher.getAuthTag()

  const output = Buffer.concat([FILE_MAGIC, salt, iv, authTag, encrypted])
  await fsPromises.mkdir(path.dirname(options.archivePath), { recursive: true })
  await fsPromises.writeFile(options.archivePath, output)

  const totalBytes = allEntries.reduce((sum, entry) => sum + entry.data.length, 0)
  return { fileCount: allEntries.length, totalBytes }
}

export const decryptBackupArchive = async(options: {
  archivePath: string
  destinationDir: string
  password: string
}): Promise<{ fileCount: number; restoredDir: string }> => {
  if (!options.password) {
    throw new Error('Informe a senha para descriptografar o backup.')
  }

  const raw = await fsPromises.readFile(options.archivePath)
  const headerSize = FILE_MAGIC.length + SALT_BYTES + IV_BYTES + AUTH_TAG_BYTES
  if (raw.length < headerSize || !raw.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC)) {
    throw new Error('Arquivo inválido: não é um backup criptografado do MarkMed (.mmbak).')
  }

  let offset = FILE_MAGIC.length
  const salt = raw.subarray(offset, offset + SALT_BYTES)
  offset += SALT_BYTES
  const iv = raw.subarray(offset, offset + IV_BYTES)
  offset += IV_BYTES
  const authTag = raw.subarray(offset, offset + AUTH_TAG_BYTES)
  offset += AUTH_TAG_BYTES
  const ciphertext = raw.subarray(offset)

  const key = await deriveKey(options.password, salt)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let compressed: Buffer
  try {
    compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch {
    throw new Error('Senha incorreta ou arquivo de backup corrompido.')
  }

  const packed = await gunzipAsync(compressed)
  const entries = unpackArchiveEntries(packed)

  const resolvedDest = path.resolve(options.destinationDir)
  await fsPromises.mkdir(resolvedDest, { recursive: true })

  for (const entry of entries) {
    const targetPath = resolveSafeRestorePath(resolvedDest, entry.relPath)
    await fsPromises.mkdir(path.dirname(targetPath), { recursive: true })
    await fsPromises.writeFile(targetPath, entry.data)
  }

  return { fileCount: entries.length, restoredDir: resolvedDest }
}
