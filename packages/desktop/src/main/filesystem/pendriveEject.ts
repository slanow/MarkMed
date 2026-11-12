import fs from 'fs'
import path from 'path'

export interface PendriveMountTarget {
  mountPoint: string
  device?: string
  label: string
}

const unescapeMountPath = (raw: string): string => {
  return raw.replace(/\\([0-7]{3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
}

/**
 * Resolves a removable/pendrive mount point from candidate paths used by the
 * current MarkMed session (portable executable dir, userData dir, or open folders).
 */
export const detectPendriveMountTarget = (
  candidatePaths: readonly string[],
  options: {
    platform?: NodeJS.Platform
    procMountsContent?: string
  } = {}
): PendriveMountTarget | null => {
  const platform = options.platform ?? process.platform
  const normalizedCandidates = candidatePaths
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())

  if (normalizedCandidates.length === 0) return null

  if (platform === 'win32') {
    for (const candidate of normalizedCandidates) {
      const match = candidate.match(/^([A-Za-z]:)(?:[\\/]|$)/)
      if (!match) continue
      const drive = match[1].toUpperCase()
      if (drive !== 'C:') {
        return {
          mountPoint: `${drive}\\`,
          device: drive,
          label: drive
        }
      }
    }
    return null
  }

  if (platform === 'darwin') {
    for (const candidate of normalizedCandidates) {
      const resolved = path.posix.normalize(candidate)
      const match = resolved.match(/^(\/Volumes\/[^/]+)(?:\/|$)/)
      if (match && match[1] !== '/Volumes/Macintosh HD') {
        const mountPoint = match[1]
        return {
          mountPoint,
          label: path.posix.basename(mountPoint)
        }
      }
    }
    return null
  }

  // Linux: check `/proc/mounts` first for mounts under `/run/media/`, `/media/`, or `/mnt/`
  let mountsRaw = options.procMountsContent
  if (mountsRaw === undefined) {
    try {
      mountsRaw = fs.readFileSync('/proc/mounts', 'utf8')
    } catch {
      mountsRaw = ''
    }
  }

  const parsedMounts: Array<{ device: string; mountPoint: string }> = []
  for (const line of mountsRaw.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 2) continue
    const device = unescapeMountPath(parts[0])
    const mountPoint = unescapeMountPath(parts[1])
    if (
      mountPoint.startsWith('/run/media/') ||
      mountPoint.startsWith('/media/') ||
      mountPoint.startsWith('/mnt/')
    ) {
      parsedMounts.push({ device, mountPoint })
    }
  }
  // Longest mountPoint first so nested mounts match accurately.
  parsedMounts.sort((a, b) => b.mountPoint.length - a.mountPoint.length)

  for (const candidate of normalizedCandidates) {
    const resolved = path.posix.normalize(candidate)
    for (const entry of parsedMounts) {
      if (resolved === entry.mountPoint || resolved.startsWith(`${entry.mountPoint}/`)) {
        return {
          mountPoint: entry.mountPoint,
          device: entry.device,
          label: `${path.posix.basename(entry.mountPoint)} (${entry.mountPoint})`
        }
      }
    }

    const fallbackMatch = resolved.match(
      /^(\/run\/media\/[^/]+\/[^/]+|\/media\/[^/]+\/[^/]+|\/media\/[^/]+|\/mnt\/[^/]+)(?:\/|$)/
    )
    if (fallbackMatch) {
      const mountPoint = fallbackMatch[1]
      return {
        mountPoint,
        label: `${path.posix.basename(mountPoint)} (${mountPoint})`
      }
    }
  }

  return null
}
