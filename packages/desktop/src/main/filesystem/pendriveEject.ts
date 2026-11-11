import { spawn } from 'child_process'
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

/**
 * Spawns a detached helper that waits briefly for MarkMed (and any AppImage FUSE
 * mount) to finish exiting, flushes filesystem buffers (`sync`), and unmounts/ejects
 * the pendrive mount point cleanly.
 */
export const scheduleDetachedPendriveUnmount = (
  target: PendriveMountTarget,
  platform: NodeJS.Platform = process.platform
): void => {
  try {
    if (platform === 'win32') {
      const drive = (target.device || target.mountPoint.slice(0, 2)).replace(/\\+$/, '')
      const psScript = [
        'Start-Sleep -Milliseconds 900;',
        `$drive = '${drive.replace(/'/g, "''")}';`,
        '(New-Object -ComObject Shell.Application).Namespace(17).ParseName($drive).InvokeVerb("Eject")'
      ].join(' ')
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psScript],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }
      )
      child.unref()
      return
    }

    if (platform === 'darwin') {
      const child = spawn(
        '/bin/sh',
        ['-c', 'sleep 0.9 && sync && diskutil unmount "$1" >/dev/null 2>&1', '_', target.mountPoint],
        {
          detached: true,
          stdio: 'ignore'
        }
      )
      child.unref()
      return
    }

    // Linux: wait 0.9s for MarkMed and any AppImage FUSE mount on the pendrive to release open FDs,
    // then run `sync` and try `udisksctl`, `gio mount -u`, and `umount`.
    const script = [
      'sleep 0.9',
      'sync',
      'if [ -n "$2" ] && command -v udisksctl >/dev/null 2>&1; then udisksctl unmount -b "$2" >/dev/null 2>&1 && exit 0; fi',
      'if command -v gio >/dev/null 2>&1; then gio mount -u "$1" >/dev/null 2>&1 && exit 0; fi',
      'umount "$1" >/dev/null 2>&1 || umount -l "$1" >/dev/null 2>&1'
    ].join('; ')

    const child = spawn('/bin/sh', ['-c', script, '_', target.mountPoint, target.device ?? ''], {
      detached: true,
      stdio: 'ignore',
      cwd: '/'
    })
    child.unref()
  } catch {
    // Unmount is best-effort during application shutdown.
  }
}
