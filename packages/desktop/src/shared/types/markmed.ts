export interface FirstRunSetupStatus {
  needsSetup: boolean
  isPortable: boolean
  suggestedBaseDir: string
  activeUserDataDir: string
  configDirName: string
  imagesDirName: string
  wikiUrl: string
}

export interface FirstRunSetupResult {
  ok: boolean
  configDir: string
  imagesDir: string
  requiresRestart: boolean
  error?: string
}

export interface StorageSpaceInfo {
  targetPath: string
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usedPercent: number
  isLowSpace: boolean
  isCriticalSpace: boolean
}

export interface CreateBackupRequest {
  sourceDirs: string[]
  includeImagesFolder: boolean
  includeConfigFolder: boolean
  password: string
}

export interface CreateBackupResult {
  ok: boolean
  canceled?: boolean
  archivePath?: string
  fileCount?: number
  totalBytes?: number
  error?: string
}

export interface DecryptBackupRequest {
  archivePath: string
  destinationDir: string
  password: string
}

export interface DecryptBackupResult {
  ok: boolean
  canceled?: boolean
  restoredDir?: string
  fileCount?: number
  error?: string
}

export interface AutoRenameResult {
  status: 'renamed' | 'unchanged' | 'skipped' | 'failed'
  pathname?: string
  filename?: string
  savedMarkdown?: string
  reason?: string
}
