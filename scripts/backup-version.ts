import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

interface PackageManifest {
  version: string
}

const rootDir = process.cwd()
const desktopPkg = JSON.parse(
  readFileSync(path.join(rootDir, 'packages', 'desktop', 'package.json'), 'utf8')
) as PackageManifest

const version = process.argv[2] ?? desktopPkg.version
const backupDir = path.join(rootDir, 'backups', version)
mkdirSync(backupDir, { recursive: true })

// Archive the committed source tree so every version has an offline snapshot.
const archivePath = path.join(backupDir, `MarkMed-${version}-source.tar.gz`)
execFileSync('git', ['archive', '--format=tar.gz', `--prefix=MarkMed-${version}/`, '-o', archivePath, 'HEAD'], {
  cwd: rootDir,
  stdio: 'inherit'
})

// Copy any built executables/installers matching this version from dist/ or <version>/.
const candidateDirs = [path.join(rootDir, 'dist'), path.join(rootDir, version)]
const artifactExts = new Set(['.AppImage', '.exe', '.zip', '.deb', '.rpm', '.dmg', '.tar.gz'])

for (const dir of candidateDirs) {
  if (!existsSync(dir)) continue
  for (const entry of readdirSync(dir)) {
    const ext = entry.endsWith('.tar.gz') ? '.tar.gz' : path.extname(entry)
    if (!artifactExts.has(ext) || !entry.includes(version)) continue
    const src = path.join(dir, entry)
    const dest = path.join(backupDir, entry)
    if (!existsSync(dest)) {
      copyFileSync(src, dest)
    }
  }
}

// Tag locally under backup/v<version> so release.yml (`v*`) is not triggered automatically.
const tagName = `backup/v${version}`
const existingTag = execFileSync('git', ['tag', '--list', tagName], { cwd: rootDir, encoding: 'utf8' }).trim()
if (!existingTag) {
  execFileSync('git', ['tag', '-a', tagName, '-m', `Backup of MarkMed ${version}`], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

console.log(`Backup created at: ${backupDir}`)
