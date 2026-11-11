import fsPromises from 'fs/promises'
import path from 'path'
import { ipcMain } from 'electron'
import type { StorageSpaceInfo } from '@shared/types/markmed'

const ONE_GIB = 1024 * 1024 * 1024
const CRITICAL_FREE_BYTES = 300 * 1024 * 1024

export const evaluateDiskSpace = (
  targetPath: string,
  bsize: number,
  blocks: number,
  bavail: number
): StorageSpaceInfo => {
  const totalBytes = Math.max(0, Number(bsize) * Number(blocks))
  const freeBytes = Math.max(0, Number(bsize) * Number(bavail))
  const usedBytes = Math.max(0, totalBytes - freeBytes)
  const usedPercent =
    totalBytes > 0 ? Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100))) : 0

  const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 1
  const isCriticalSpace =
    totalBytes > 0 && (freeBytes < CRITICAL_FREE_BYTES || freeRatio < 0.05)
  const isLowSpace =
    isCriticalSpace || (totalBytes > 0 && (freeBytes < ONE_GIB || freeRatio < 0.1))

  return {
    targetPath,
    totalBytes,
    freeBytes,
    usedBytes,
    usedPercent,
    isLowSpace,
    isCriticalSpace
  }
}

export const getStorageSpaceInfo = async(targetPath: string): Promise<StorageSpaceInfo | null> => {
  let candidate = path.resolve(targetPath)
  for (let i = 0; i < 6; i++) {
    try {
      const stats = await fsPromises.statfs(candidate)
      return evaluateDiskSpace(candidate, stats.bsize, stats.blocks, stats.bavail)
    } catch {
      const parent = path.dirname(candidate)
      if (parent === candidate) break
      candidate = parent
    }
  }
  return null
}

export const registerStorageHandlers = (getFallbackPath: () => string): void => {
  ipcMain.handle('mt::storage::get-space-info', (_event, targetPath?: string) => {
    const resolvedTarget =
      typeof targetPath === 'string' && targetPath.trim().length > 0
        ? targetPath
        : getFallbackPath()
    return getStorageSpaceInfo(resolvedTarget)
  })
}
