const CREATION_STAMP_PATTERN = /_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})(?=\.[^./\\]+$|$)/
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g
const LEADING_MARKDOWN_SYNTAX = /^(?:[#>*-]|\d+[.)]|\[[ xX]\])+\s*/
const MARKDOWN_EXTENSIONS_RE = /\.(md|markdown|mdown|mkd|mkdn|txt)$/i
const METADATA_OR_DIVIDER_LINE_RE = /^(?:\*\*Data\/Hora:\*\*|Data\/Hora:|[-*_]{3,})\s*/i

const stripControlChars = (input: string): string =>
  Array.from(input)
    .map((ch) => (ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')

const pad2 = (value: number): string => String(value).padStart(2, '0')

export const formatDateStamp = (date: Date): string => {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  return `${year}-${month}-${day}_${hours}-${minutes}`
}

export const formatDisplayDateTime = (date: Date): string => {
  const day = pad2(date.getDate())
  const month = pad2(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export const createInitialPatientNoteMarkdown = (
  date: Date = new Date(),
  patientTitle = ''
): string => {
  const heading = patientTitle.trim()
  return `# ${heading}\n\n**Data/Hora:** ${formatDisplayDateTime(date)}\n\n`
}

/**
 * Extracts a safe filename slug from the first non-empty line of a document.
 * Strips leading Markdown tokens (`#`, `*`, `>`, list bullets) and OS-forbidden chars.
 */
export const extractPatientNameFromMarkdown = (markdown: string): string | null => {
  const lines = markdown.split(/\r?\n/)
  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || METADATA_OR_DIVIDER_LINE_RE.test(trimmed)) {
      continue
    }

    let cleaned = trimmed
    while (LEADING_MARKDOWN_SYNTAX.test(cleaned)) {
      cleaned = cleaned.replace(LEADING_MARKDOWN_SYNTAX, '').trim()
    }
    if (!cleaned || METADATA_OR_DIVIDER_LINE_RE.test(cleaned)) {
      continue
    }

    cleaned = stripControlChars(cleaned)
      .replace(/[*_`~]/g, '')
      .replace(INVALID_FILENAME_CHARS, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')

    if (!cleaned) continue
    if (cleaned.length > 60) {
      cleaned = cleaned.slice(0, 60).replace(/-+$/g, '')
    }
    if (cleaned) return cleaned
  }
  return null
}

export const extractCreationStampFromFilename = (filename: string): string | null => {
  const match = CREATION_STAMP_PATTERN.exec(filename)
  return match?.[1] ?? null
}

export const buildDatedPatientFilename = (options: {
  currentFilename: string
  patientName: string
  createdAt?: Date
}): string => {
  const extMatch = /(\.[^./\\]+)$/.exec(options.currentFilename)
  const ext = extMatch?.[1] ?? '.md'
  const stamp =
    extractCreationStampFromFilename(options.currentFilename) ??
    formatDateStamp(options.createdAt ?? new Date())
  return `${options.patientName}_${stamp}${ext}`
}

/**
 * Skips auto-renaming for non-markdown files, dotfiles, or README files so
 * configuration and documentation files are never touched.
 */
export const shouldAutoRenamePath = (
  pathname: string,
  _workspaceRoots?: readonly string[]
): boolean => {
  if (!pathname) return false
  const normalizedPath = pathname.replace(/\\/g, '/')
  const basename = normalizedPath.split('/').pop() ?? ''
  if (!basename || basename.startsWith('.') || /^readme(\.|$)/i.test(basename)) {
    return false
  }
  const hasExtension = basename.includes('.')
  if (hasExtension && !MARKDOWN_EXTENSIONS_RE.test(basename)) {
    return false
  }
  return true
}
