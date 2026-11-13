const stripYamlFrontmatter = (input: string): string => {
  return input.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
}

const stripInlineMarkdown = (line: string): string => {
  const escaped: string[] = []
  let out = line.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, (_m, ch: string) => {
    const token = `\uE000ESC${escaped.length}\uE001`
    escaped.push(ch)
    return token
  })

  // Inline code spans: keep inner text and strip surrounding backticks.
  out = out.replace(/(`+)([^`]*?)\1/g, '$2')

  // Images: ![alt](url) -> alt
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  out = out.replace(/!\[([^\]]*)\]\[[^\]]*\]/g, '$1')

  // Links: [text](url) -> text (or url when text is empty)
  out = out.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_m, text: string, url: string) => {
    const trimmedText = text.trim()
    if (trimmedText) return text
    return url.trim().replace(/^<|>$/g, '')
  })
  out = out.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')

  // Highlight, strikethrough, bold, and italic (avoid intra-word underscores and spaced arithmetic).
  out = out.replace(/==([^=\n]+)==/g, '$1')
  out = out.replace(/~~([^~\n]+)~~/g, '$1')
  out = out.replace(/\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*/g, '$1')
  out = out.replace(/__(?!\s)([^_\n]+?)(?<!\s)__/g, '$1')
  out = out.replace(/\*(?!\s)([^*\n]*?\S)\*/g, '$1')
  out = out.replace(/(^|[^\p{L}\p{N}_])_(?!\s)([^_\n]*?\S)_(?=$|[^\p{L}\p{N}_])/gu, '$1$2')

  // Line breaks and simple inline HTML tags.
  out = out.replace(/<br\s*\/?>/gi, '\n')
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<\/?[a-z][a-z0-9-]*(?:\s+[^>]*)?>/gi, '')

  // Restore backslash-escaped Markdown punctuation as literal characters.
  out = out.replace(/\uE000ESC(\d+)\uE001/g, (_m, idx: string) => escaped[Number(idx)] ?? '')

  return out
}

const isTableSeparatorRow = (line: string): boolean => {
  const trimmed = line.trim()
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(trimmed) || /^\|?\s*:?-{3,}:?\s*\|$/.test(trimmed)
}

const formatTableRow = (line: string): string => {
  const trimmed = line.trim()
  const content = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  return content
    .split('|')
    .map((cell) => stripInlineMarkdown(cell).trim())
    .join(' | ')
}

/**
 * Converts a Markdown document into clean plain text for pasting into hospital EHR systems.
 */
export const markdownToPlainText = (markdown: string): string => {
  if (!markdown) return ''

  const normalized = stripYamlFrontmatter(markdown).replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const result: string[] = []
  let inCodeBlock = false
  let inMathBlock = false

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!
    const trimmed = rawLine.trim()

    if (/^```/.test(trimmed)) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      result.push(rawLine)
      continue
    }

    if (/^\$\$/.test(trimmed)) {
      inMathBlock = !inMathBlock
      continue
    }

    if (inMathBlock) {
      result.push(rawLine)
      continue
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed) || /^___+$/.test(trimmed)) {
      result.push('---')
      continue
    }

    if (isTableSeparatorRow(rawLine)) continue

    if (trimmed.startsWith('|')) {
      result.push(formatTableRow(rawLine))
      continue
    }

    let line = rawLine

    // Headings: remove leading # markers
    line = line.replace(/^#{1,6}\s+/, '')

    // Blockquotes: remove leading > markers
    line = line.replace(/^>\s*/, '')

    // Task lists: convert - [ ] and - [x] to readable status
    line = line.replace(/^(\s*)[-*+]\s+\[\s*\]\s+/, '$1[ ] ')
    line = line.replace(/^(\s*)[-*+]\s+\[[xX]\]\s+/, '$1[X] ')

    // Bullet lists: normalize bullet characters to standard hyphen
    line = line.replace(/^(\s*)[*+]\s+/, '$1- ')

    // Strip inline formatting (bold, italic, links, inline code, html)
    line = stripInlineMarkdown(line)

    result.push(line)
  }

  // Join lines with single line break, collapsing multiple blank lines into one
  return result
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
