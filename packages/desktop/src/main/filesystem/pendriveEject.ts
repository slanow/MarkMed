import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { buildCleanAppImageRelaunchEnv } from './hiddenDirs'

export interface PendriveMountTarget {
  mountPoint: string
  device?: string
  label: string
}

export interface DetachedUnmountCommand {
  command: string
  args: string[]
  env: NodeJS.ProcessEnv
  cwd?: string
  windowsHide?: boolean
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
 * Strips AppImage FUSE environment overrides so host tools (`udisksctl`, `gio`,
 * `eject`) dynamically link against system libraries rather than the bundled
 * AppImage runtime that must tear down before the drive can unmount.
 */
export const buildCleanHostUnmountEnv = (
  env: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const cleanEnv = buildCleanAppImageRelaunchEnv(env)
  delete cleanEnv.GIO_MODULE_DIR
  delete cleanEnv.GTK_PATH
  delete cleanEnv.GDK_PIXBUF_MODULE_FILE
  return cleanEnv
}

/**
 * Builds the detached OS command that waits for MarkMed (and any AppImage or
 * portable wrapper) to release open handles, flushes buffers, unmounts, and
 * safely powers off / ejects the USB pendrive.
 */
export const buildDetachedPendriveUnmountCommand = (
  target: PendriveMountTarget,
  options: {
    platform?: NodeJS.Platform
    mainPid?: number
    env?: NodeJS.ProcessEnv
  } = {}
): DetachedUnmountCommand => {
  const platform = options.platform ?? process.platform
  const mainPid = options.mainPid ?? process.pid
  const cleanEnv = buildCleanHostUnmountEnv(options.env)

  if (platform === 'win32') {
    const drive = (target.device || target.mountPoint.slice(0, 2)).replace(/\\+$/, '')
    const escapedDrive = drive.replace(/'/g, "''")
    const psScript = [
      `$pidWait = ${Number.isFinite(mainPid) ? Math.trunc(mainPid) : 0};`,
      'if ($pidWait -gt 0) { $i = 0; while ((Get-Process -Id $pidWait -ErrorAction SilentlyContinue) -and $i -lt 40) { Start-Sleep -Milliseconds 250; $i++ } };',
      'Start-Sleep -Milliseconds 900;',
      `$drive = '${escapedDrive}';`,
      '$shell = New-Object -ComObject Shell.Application;',
      'for ($try = 0; $try -lt 8; $try++) {',
      '  $item = $shell.Namespace(17).ParseName($drive);',
      '  if ($item) { $item.InvokeVerb("Eject") };',
      '  Start-Sleep -Milliseconds 600;',
      '  $di = New-Object System.IO.DriveInfo($drive);',
      '  if (-not $di.IsReady) { break }',
      '}'
    ].join(' ')

    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psScript],
      env: cleanEnv,
      cwd: path.win32.dirname(process.env.SystemRoot || 'C:\\Windows'),
      windowsHide: true
    }
  }

  if (platform === 'darwin') {
    const script = [
      'MNT="$1"; PID="$2"',
      'i=0; while [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && [ $i -lt 50 ]; do sleep 0.15; i=$((i+1)); done',
      'sleep 0.3',
      'sync',
      'for t in 1 2 3 4 5 6; do diskutil eject "$MNT" >/dev/null 2>&1 && exit 0; diskutil unmountDisk "$MNT" >/dev/null 2>&1 && break; diskutil unmount "$MNT" >/dev/null 2>&1 && break; sleep 0.3; done',
      'diskutil eject "$MNT" >/dev/null 2>&1 || true'
    ].join('; ')

    return {
      command: '/bin/sh',
      args: ['-c', script, '_', target.mountPoint, String(mainPid)],
      env: cleanEnv,
      cwd: '/'
    }
  }

  const script = [
    // Close inherited Electron/AppImage FDs (notably AppImage keepalive FD 1023) immediately so FUSE unmounts on exit.
    'exec 1023>&- 2>/dev/null || true',
    'for fd in /proc/$$/fd/*; do n="${fd##*/}"; case "$n" in [0-9]*) [ "$n" -gt 2 ] && eval "exec ${n}>&-" 2>/dev/null || true ;; esac; done',
    'MNT="$1"; DEV="$2"; PID="$3"',
    // Wait until MarkMed exits so Chromium child processes and AppImage FUSE release all pendrive FDs.
    'i=0; while [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && [ $i -lt 60 ]; do sleep 0.15; i=$((i+1)); done',
    'sleep 0.35',
    'sync',
    'if [ -z "$DEV" ]; then DEV="$(awk -v m="$MNT" \'{gsub(/\\\\040/," ",$2); if($2==m){print $1; exit}}\' /proc/mounts 2>/dev/null || true)"; fi',
    'PARENT_DEV=""',
    'if [ -n "$DEV" ] && command -v lsblk >/dev/null 2>&1; then PK="$(lsblk -no PKNAME "$DEV" 2>/dev/null | head -n1 || true)"; if [ -n "$PK" ]; then PARENT_DEV="/dev/$PK"; fi; fi',
    'is_mounted() { awk -v m="$1" \'BEGIN{f=1} {gsub(/\\\\040/," ",$2); if($2==m){f=0; exit}} END{exit f}\' /proc/mounts 2>/dev/null; }',
    't=0; while is_mounted "$MNT" && [ $t -lt 15 ]; do ' +
      'if [ -n "$DEV" ] && command -v udisksctl >/dev/null 2>&1; then udisksctl unmount -b "$DEV" --no-user-interaction >/dev/null 2>&1 || true; fi; ' +
      'if is_mounted "$MNT" && command -v gio >/dev/null 2>&1; then gio mount -u "$MNT" >/dev/null 2>&1 || true; fi; ' +
      'if is_mounted "$MNT"; then umount "$MNT" >/dev/null 2>&1 || true; fi; ' +
      'if ! is_mounted "$MNT"; then break; fi; ' +
      'sleep 0.25; t=$((t+1)); ' +
    'done',
    'if is_mounted "$MNT"; then umount -l "$MNT" >/dev/null 2>&1 || true; fi',
    'sync',
    'if [ -n "$PARENT_DEV" ] && command -v udisksctl >/dev/null 2>&1; then udisksctl power-off -b "$PARENT_DEV" --no-user-interaction >/dev/null 2>&1 && exit 0; fi',
    'if [ -n "$DEV" ] && command -v udisksctl >/dev/null 2>&1; then udisksctl power-off -b "$DEV" --no-user-interaction >/dev/null 2>&1 && exit 0; fi',
    'if command -v eject >/dev/null 2>&1; then EJT="${PARENT_DEV:-${DEV:-$MNT}}"; eject "$EJT" >/dev/null 2>&1 || true; fi'
  ].join('; ')

  return {
    command: '/bin/sh',
    args: ['-c', script, '_', target.mountPoint, target.device ?? '', String(mainPid)],
    env: cleanEnv,
    cwd: '/'
  }
}

/**
 * Spawns a detached helper that waits for MarkMed (and any AppImage FUSE
 * mount) to finish exiting, flushes filesystem buffers (`sync`), unmounts,
 * and safely ejects/powers off the pendrive.
 */
export const scheduleDetachedPendriveUnmount = (
  target: PendriveMountTarget,
  platform: NodeJS.Platform = process.platform,
  mainPid: number = process.pid
): void => {
  try {
    const spec = buildDetachedPendriveUnmountCommand(target, { platform, mainPid })
    const child = spawn(spec.command, spec.args, {
      detached: true,
      stdio: 'ignore',
      env: spec.env,
      cwd: spec.cwd,
      windowsHide: spec.windowsHide
    })
    child.unref()
  } catch {
    // Unmount is best-effort during application shutdown.
  }
}
