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
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  return inner
    .split('|')
    .map((cell) => stripInlineMarkdown(cell.trim()))
    .join(' | ')
}

/**
 * Convert a Markdown document into clean plain text (.txt) without formatting
 * markers, suitable for pasting into plain-text clinical/hospital systems.
 */
export const markdownToPlainText = (markdown: string): string => {
  if (!markdown) return ''

  const normalized = stripYamlFrontmatter(markdown.replace(/\r\n?/g, '\n'))
  const lines = normalized.split('\n')
  const output: string[] = []

  let inFence = false
  let fenceChar = ''
  let fenceLen = 0

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? ''
    const trimmed = rawLine.trim()

    // Toggle fenced code blocks (``` or ~~~) without emitting fence lines.
    const fenceMatch = rawLine.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? ''
      if (!inFence) {
        inFence = true
        fenceChar = marker[0] ?? ''
        fenceLen = marker.length
        continue
      }
      if (marker[0] === fenceChar && marker.length >= fenceLen && trimmed === marker) {
        inFence = false
        fenceChar = ''
        fenceLen = 0
        continue
      }
    }

    if (inFence) {
      output.push(rawLine)
      continue
    }

    // Reference-style link definitions: [id]: https://...
    if (/^\s*\[[^\]]+\]:\s+\S+/.test(rawLine)) {
      continue
    }

    // Setext heading underline (=== or ---) following a non-empty text line.
    const prevLine = output[output.length - 1]
    if (
      prevLine !== undefined &&
      prevLine.trim() !== '' &&
      /^\s*(?:={2,}|-{2,})\s*$/.test(rawLine)
    ) {
      continue
    }

    // Horizontal rules: ---, ***, ___
    if (/^\s*(?:[-*_]\s*){3,}$/.test(rawLine)) {
      output.push('')
      continue
    }

    // Strip blockquote prefixes (`> > text` -> `text`).
    let line = rawLine.replace(/^\s*(?:>\s?)+/, '')

    // Table rows & separator lines.
    if (line.includes('|') && /^\s*\|/.test(line)) {
      if (isTableSeparatorRow(line)) continue
      output.push(formatTableRow(line))
      continue
    }
    if (isTableSeparatorRow(line)) {
      continue
    }

    // Strip ATX heading hashes (`### Conduta ###` -> `Conduta`).
    line = line.replace(/^\s*#{1,6}\s+(.*?)\s*#*\s*$/, '$1')

    // Normalize task list items (`- [ ] Item` / `- [x] Item`) and bullet markers.
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/)
    if (taskMatch) {
      const indent = taskMatch[1] ?? ''
      const check = (taskMatch[2] ?? '').toLowerCase() === 'x' ? '[x]' : '[ ]'
      const body = stripInlineMarkdown(taskMatch[3] ?? '')
      output.push(`${indent}${check} ${body}`)
      continue
    }

    const bulletMatch = line.match(/^(\s*)[*+]\s+(.*)$/)
    if (bulletMatch) {
      const indent = bulletMatch[1] ?? ''
      const body = stripInlineMarkdown(bulletMatch[2] ?? '')
      output.push(`${indent}- ${body}`)
      continue
    }

    output.push(stripInlineMarkdown(line))
  }

  return output
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
